'use strict';

const EOL = '\n';

let marketplaces;
const categories = CATEGORIES;

let selectedMarketplace;


const marketplacesList = document.querySelector('#marketplaces');
const asinsEdit = document.querySelector('textarea');
const saveAsinsButton = document.querySelector('#saveASINs');


// get and show marketplaces
marketplaces = [...new Set(chrome.runtime.getManifest().content_scripts[0].matches.map(pattern => pattern.match(/(?<=amazon\.).+?(?=\/)/)[0]))];
marketplacesList.innerHTML = marketplaces.map((marketplace, ind) => `
  <li data-ind="${ind}">
    ${marketplace}
  </li>
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
marketplacesList.addEventListener('click', function({target: li}) {
  // this strange thing can happen when try to 'select' several items
  if (li.nodeName === 'UL') {
    return;
  }

  const itemIndex = li.dataset.ind;
  selectedMarketplace = marketplaces[itemIndex];

  // mark only selected item
  marketplacesList.parentElement.querySelector('.selected')?.classList.remove('selected');
  li.classList.add('selected');

  asinsEdit.focus();
  saveAsinsButton.disabled = false;

  // get ASINs from BG page
  chrome.runtime.sendMessage({
    id: 'get_asins_for_marketplace',
    payload: {
      marketplace: selectedMarketplace,
    },
  }, showAsins);
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
});
