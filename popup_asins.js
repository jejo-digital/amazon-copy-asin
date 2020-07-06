'use strict';

const EOL = '\n';

let marketplaces;
let selectedMarketplace;


const marketplacesTableBody = document.querySelector('#marketplaces tbody');
const asinsEdit = document.querySelector('textarea');
const saveAsinsButton = document.querySelector('#saveASINs');
const openSelectedAsinsButton = document.querySelector('#openSelectedAsins');


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
      showAsins(msg.payload.asins);
      saveAsinsButton.disabled = true;
    break;

    default:
      l('message not processed');
    break;
  }
});




function showAsins(asins) {
  l('showAsins()', asins);

  asinsEdit.value = asins?.join(EOL) ?? '';
}




// select marketplace
marketplacesTableBody.addEventListener('click', function({target}) {
  // this strange thing happens when trying to 'select' several rows with mouse
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

  asinsEdit.focus();
  openSelectedAsinsButton.disabled = false;

  // request ASINs from BG page
  port.postMessage({
    id: 'get_asins_for_marketplace',
    payload: {
      marketplace: selectedMarketplace,
    },
  });
});




asinsEdit.addEventListener('input', function() {
  saveAsinsButton.disabled = false;
});




// removes spaces and empty lines
function clearText(text) {
  return text.replace(/ /g, '').replace(/\n{2,}/g, '\n').trim();
}




// save ASINs
saveAsinsButton.addEventListener('click', function() {
  asinsEdit.value = clearText(asinsEdit.value);
  const asins = asinsEdit.value.split(EOL);
  port.postMessage({
    id: 'set_asins_for_marketplace',
    payload: {
      asins,
      marketplace: selectedMarketplace,
    },
  });

  saveAsinsButton.disabled = true;
  saveAsinsButton.value = 'Saved';
  setTimeout(() => saveAsinsButton.value = 'Save', 0.5 * 1000);
});




openSelectedAsinsButton.addEventListener('click', function() {
  l(asinsEdit.selectionStart, asinsEdit.selectionEnd);

  if (asinsEdit.selectionStart === asinsEdit.selectionEnd) {
    // no selection
    return;
  }

  // extend start of selection to start of line
  while(!(asinsEdit.selectionStart === 0 || asinsEdit.value[asinsEdit.selectionStart - 1] === EOL)) {
    --asinsEdit.selectionStart;
  }
  // extend end of selection to end of line
  while(!(asinsEdit.selectionEnd === asinsEdit.value.length || asinsEdit.value[asinsEdit.selectionEnd] === EOL)) {
    ++asinsEdit.selectionEnd;
  }

  const selectedText = clearText(asinsEdit.value.slice(asinsEdit.selectionStart, asinsEdit.selectionEnd));
  l(selectedText);

  // create tabs with selected ASINs
  for (const asin of selectedText.split(EOL)) {
    chrome.tabs.create({url: AMAZON_URL_PREFIX + selectedMarketplace + '/dp/' + asin});
  }
});
