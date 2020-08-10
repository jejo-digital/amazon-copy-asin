'use strict';

let marketplaces;
let selectedMarketplace;

let asins;
let bsrs = {};


const marketplacesTableBody = document.querySelector('#marketplaces tbody');
const asinsTableBody = document.querySelector('#asins tbody');
const asinsTextarea = document.querySelector('textarea');

const editButton = document.querySelector('#edit');
const asinsDialog = document.querySelector('#asinsDialog');

const openSelectedButton = document.querySelector('#openSelected');

const asinButtonsGroup = document.querySelector('fieldset');


const obtainBsrsButton = document.querySelector('#obtainBsrs');
const bsrProgressDialog = document.querySelector('#bsrProgressDialog');
const bsrProgressBar = document.querySelector('#bsrProgressDialog .progress-bar');
const bsrProgressText = document.querySelector('#bsrProgressDialog p');

const alertDialog = document.querySelector('#alertDialog');
const alertDialogText = document.querySelector('#alertDialog h6');

const confirmDialog = document.querySelector('#confirmDialog');
const confirmDialogText = document.querySelector('#confirmDialog h6');

const manifest = chrome.runtime.getManifest();

document.title = manifest.name + ' - Control panel';

// get and show unique marketplaces
marketplaces = [...new Set(manifest.content_scripts[0].matches.map(pattern => pattern.match(/(?<=amazon\.).+?(?=\/)/)[0]))];
marketplacesTableBody.innerHTML = marketplaces.map((marketplace, ind) => `
  <tr>
    <td>
      ${marketplace}
    </td>
  </tr>
`).join('');



// select marketplace
{
  // marketplace in URL?
  const urlMarketplace = new URL(location.href).searchParams.get('marketplace');
  l(urlMarketplace);
  if (urlMarketplace !== null) {
    selectMarketplace(urlMarketplace);
  }
  else {
    // try to get marketplace from active tab
    chrome.tabs.query({active: true, currentWindow: true}, function([tab]) {
      l(tab);

      const activeTabOrigin = new URL(tab.url).origin;
      l(activeTabOrigin);
      if (!activeTabOrigin.startsWith(AMAZON_URL_PREFIX)) {
        l('not Amazon tab');
        return;
      }

      selectMarketplace(getMarketplaceFromOrigin(activeTabOrigin));
    });
  }




  function selectMarketplace(marketplace) {
    l('selectMarketplace()', marketplace);

    const marketplaceIndex = marketplaces.indexOf(marketplace.toLowerCase());
    l(marketplaceIndex);
    if (marketplaceIndex === -1) {
      return;
    }

    // emulate click
    setTimeout(function() {
      marketplacesTableBody.children[marketplaceIndex].firstElementChild.click();
    });
  }
}




const port = chrome.runtime.connect();
port.onMessage.addListener(function(msg) {
  cg('port.onMessage()', msg);

  switch (msg.id) {
    case 'asins_for_marketplace':
      asins = msg.payload.asins ?? [];
      sortAsinsByBSR();
      showAsins();
      asinButtonsGroup.disabled = false;
    break;

    default:
      l('message not processed');
    break;
  }
});




function sortAsinsByBSR() {
  const currBsrs = bsrs[selectedMarketplace];
  if (currBsrs === undefined) {
    l('no BSR data for marketplace');
    return;
  }

  asins.sort(function(a, b) {
    const bsrA = currBsrs[a];
    const bsrB = currBsrs[b];

    if (bsrA === undefined && bsrB === undefined) {
      return 0;
    }
    else if (bsrA === undefined) {
      return +1;
    }
    else if (bsrB === undefined) {
      return -1;
    }
    else {
      return currBsrs[a] - currBsrs[b];
    }
  });
}




function showAsins() {
  l('showAsins()', asins);

  asinsTableBody.innerHTML = asins?.map((asin, ind) => `
    <tr>
      <td>
        ${asin}
      </td>
      <td>
        ${bsrs[selectedMarketplace]?.[asin] ?? ''}
      </td>
    </tr>
  `).join('') ?? '';
}




// select marketplace
marketplacesTableBody.addEventListener('click', function({target}) {
  // this strange thing happens when trying to select several rows with mouse
  if (target.nodeName !== 'TD') {
    return;
  }

  const tableRow = target.parentElement;
  const itemIndex = tableRow.rowIndex;
  selectedMarketplace = marketplaces[itemIndex];
  l(itemIndex, selectedMarketplace);

  // mark only selected row
  marketplacesTableBody.querySelector('.table-active')?.classList.remove('table-active');
  tableRow.classList.add('table-active');

  // request ASINs from BG page
  port.postMessage({
    id: 'get_asins_for_marketplace',
    payload: {
      marketplace: selectedMarketplace,
    },
  });
});




// removes spaces and empty lines
function clearText(text) {
  return text.replace(/ /g, '').replace(/\n{2,}/g, '\n').trim();
}




// ASINs editing
editButton.addEventListener('click', function() {
  asinsTextarea.value = asins?.join(EOL) ?? '';
  $(asinsDialog).modal();
  asinsTextarea.select();
});

asinsDialog.querySelector('.btn-primary').addEventListener('click', function() {
  let asins = clearText(asinsTextarea.value);
  asins = (asins === '') ? [] : asins.split(EOL);
  l(asins);
  port.postMessage({
    id: 'set_asins_for_marketplace',
    payload: {
      asins,
      marketplace: selectedMarketplace,
    },
  });

  $(asinsDialog).modal('hide');
});

$(asinsDialog).on('shown.bs.modal', function() {
  asinsTextarea.focus();
});

$(asinsDialog).on('hide.bs.modal', function() {
  asinsTextarea.value = '';
});




function getAsinUrlInSelectedMarketplace(asin) {
  return AMAZON_URL_PREFIX + selectedMarketplace + '/dp/' + asin;
}




openSelectedButton.addEventListener('click', function() {
  const selection = document.getSelection();
  if (selection.toString().trim() === '') {
    showAlertDialog('No selection.');
    return;
  }
  l(selection, selection.rangeCount, selection.toString());

  const selectedAsins = [];

  const range = selection.getRangeAt(0);
  l(range);

  if (!asinsTableBody.contains(range.commonAncestorContainer)) {
    showAlertDialog('Something bad selected.');
    return;
  }

  if (range.startContainer === range.endContainer) {
    // selection inside one table cell
    const tr = range.commonAncestorContainer.parentElement.parentElement;
    const asin = asins[tr.sectionRowIndex];
    selectedAsins.push(asin);
  }
  else if (range.commonAncestorContainer.nodeName === 'TR') {
    // selection of several table cells in one row
    const tr = range.commonAncestorContainer;
    const asin = asins[tr.sectionRowIndex];
    selectedAsins.push(asin);
  }
  else {
    // selection of several rows
    const startRow = range.startContainer.parentElement.parentElement;
    const endRow = range.endContainer.parentElement.parentElement;
    l(startRow, endRow);
    for (let rowIndex = startRow.sectionRowIndex; rowIndex <= endRow.sectionRowIndex; ++rowIndex) {
      selectedAsins.push(asins[rowIndex]);
    }
  }
  l(selectedAsins);

  // create tabs with selected ASINs
  for (const asin of selectedAsins) {
    chrome.tabs.create({url: getAsinUrlInSelectedMarketplace(asin), active: false});
  }
});




let timeoutIds;
let isBsrObtainingCancelled;

obtainBsrsButton.addEventListener('click', function() {
  const asinsToProcess = asins.filter(asin => bsrs[selectedMarketplace]?.[asin] === undefined);
  l(asinsToProcess);

  if (asinsToProcess.length === 0) {
    showAlertDialog('All BSRs obtained.');
    return;
  }

  bsrProgressBar.style.width = '0%';
  bsrProgressText.textContent = '0/' + asinsToProcess.length;
  $(bsrProgressDialog).modal();

  timeoutIds = [];
  isBsrObtainingCancelled = false;

  let amountOfProcessedAsins = 0;

  // init place for storing BSRs
  if (bsrs[selectedMarketplace] === undefined) {
    bsrs[selectedMarketplace] = {};
  }

  for (let i = 0; i < asinsToProcess.length; ++i) {
    timeoutIds.push(setTimeout(async function() {
      const asin = asinsToProcess[i];
      l('fetch()...', i, asin)

      let response;
      try {
        response = await fetch(getAsinUrlInSelectedMarketplace(asin));
      }
      catch(err) {
        l('fetch() error', err, asin);
        updateProgress();
        checkForEndOfProcessing();
        return;
      }
      l(response);
      const html = await response.text();
      l('after fetch()', i, asin);

      if (isBsrObtainingCancelled) {
        l('progress cancelled');
        return;
      }

      updateProgress();

      if (!response.ok) {
        l('!response.ok');
        checkForEndOfProcessing();
        return;
      }

      // scrape BSR from page text
      let bsr = html.match(/(?:SalesRank|productDetails_detailBullets_sections1).+?([\d.,]+)[^>]+<a href=['"]\/gp\/bestsellers/s)?.[1];
      l(bsr);
      if (bsr === undefined) {
        if (html.includes('captcha')) {
          cancelPendingBsrRequests();
          $(bsrProgressDialog).modal('hide');
          showAlertDialog('CAPTCHA');
          return;
        }
        // BSR is absent
        checkForEndOfProcessing();
        return;
      }

      bsr = bsr.replace(/[.,]/, '');
      l(bsr);
      bsr = Number.parseInt(bsr);

      bsrs[selectedMarketplace][asin] = bsr;
      sortAsinsByBSR();
      showAsins();

      checkForEndOfProcessing();


      function updateProgress() {
        ++amountOfProcessedAsins;
        l('updateProgress()', amountOfProcessedAsins, i);
        bsrProgressBar.style.width = amountOfProcessedAsins / asinsToProcess.length * 100  + '%';
        bsrProgressText.textContent = amountOfProcessedAsins + '/' + asinsToProcess.length;
      }


      function checkForEndOfProcessing() {
        if (amountOfProcessedAsins === asinsToProcess.length) {
          setTimeout(() => $(bsrProgressDialog).modal('hide'), 300);
        }
      }


    }, i * options.bsrRequestsInterval));
  } // for
});

// cancelling
bsrProgressDialog.querySelector('button').addEventListener('click', function() {
  isBsrObtainingCancelled = true;
  cancelPendingBsrRequests();
});

function cancelPendingBsrRequests() {
  timeoutIds.forEach(id => clearTimeout(id));
}




function showAlertDialog(msg) {
  alertDialogText.textContent = msg;
  $(alertDialog).modal();
}



// todo Promise
function showConfirmDialog(msg, callback) {
  confirmDialogText.textContent = msg;
  $(confirmDialog).modal();

  const primaryButton = confirmDialog.querySelector('.btn-primary');

  primaryButton.addEventListener('click', callback);
  $(confirmDialog).one('hidden.bs.modal', function() {
    primaryButton.removeEventListener('click', callback);
  });
}




// dev
Object.defineProperty(window, 's', {
  get() {
    cg('current situation');
    l('asins', asins);
    l('bsrs', bsrs);
    l('selectedMarketplace', selectedMarketplace);
    l('options', options);
    console.groupEnd();
  },
});
