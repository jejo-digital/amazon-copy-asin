'use strict';

let marketplaces;
let selectedMarketplace;

let asins;
let bsrs = {};


const marketplacesTableBody = document.querySelector('#marketplaces tbody');
const asinsTableBody = document.querySelector('#asins tbody');

const asinButtonsGroup = document.querySelector('fieldset');

const asinsDialog = document.querySelector('#asinsDialog');
const asinsTextarea = document.querySelector('textarea');

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



// select marketplace from URL
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




function showAsins() {
  l('showAsins()', asins);

  asinsTableBody.innerHTML = asins.map((asin, ind) => `
    <tr>
      <td>
        ${asin}
      </td>
      <td>
        ${bsrs[selectedMarketplace]?.[asin] ?? ''}
      </td>
    </tr>
  `).join('');
}




// select marketplace
marketplacesTableBody.addEventListener('click', function({target}) {
  // this strange thing happens when trying to select several rows with mouse
  if (target.nodeName !== 'TD') {
    return;
  }

  const tableRow = target.parentElement;
  if (tableRow.classList.contains('table-active')) {
    // this marketplace is already selected
    return;
  }
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
