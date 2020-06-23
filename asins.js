'use strict';

const EOL = '\n';

let marketplaces;
let selectedMarketplace;


const marketplacesTableBody = document.querySelector('#marketplaces tbody');
const asinsEdit = document.querySelector('textarea');
const saveAsinsButton = document.querySelector('#saveASINs');


// get and show unique marketplaces
marketplaces = [...new Set(chrome.runtime.getManifest().content_scripts[0].matches.map(pattern => pattern.match(/(?<=amazon\.).+?(?=\/)/)[0]))];
marketplacesTableBody.innerHTML = marketplaces.map((marketplace, ind) => `
  <tr>
    <td>
      ${marketplace}
    </td>
  </tr>
`).join('');




chrome.runtime.onMessage.addListener(function(msg) {
  cg('runtime.onMessage()');
  l(msg);

  switch (msg.id) {
    case 'asins':
      showAsins(msg.payload.asins);
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
  l(target);
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
  saveAsinsButton.value = 'Save';

  // get ASINs from BG page
  chrome.runtime.sendMessage({
    id: 'get_asins_for_marketplace',
    payload: {
      marketplace: selectedMarketplace,
    },
  }, showAsins);
});




asinsEdit.addEventListener('input', function() {
  saveAsinsButton.disabled = false;
  saveAsinsButton.value = 'Save';
});




// save ASINs
saveAsinsButton.addEventListener('click', function() {
  const asins = asinsEdit.value.split(EOL).map(asin => asin.trim()).filter(asin => asin.length > 0);
  chrome.runtime.sendMessage({
    id: 'set_asins_for_marketplace',
    payload: {
      asins,
      marketplace: selectedMarketplace,
    },
  });

  saveAsinsButton.disabled = true;
  saveAsinsButton.value = 'Saved';
});
