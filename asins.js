'use strict';

const EOL = '\n';

let marketplaces;
const categories = CATEGORIES;
let asins;

let selectedMarketplace;


const marketplacesList = document.querySelector('#marketplaces');
const asinsEdit = document.querySelector('textarea');
const saveASINsButton = document.querySelector('#saveASINs');


// get and show marketplaces
marketplaces = [...new Set(chrome.runtime.getManifest().content_scripts[0].matches.map(pattern => pattern.match(/(?<=amazon\.).+?(?=\/)/)[0]))];
marketplacesList.innerHTML = marketplaces.map((marketplace, ind) => `
  <li data-ind="${ind}">
    ${marketplace}
  </li>
`).join('');




// selecting marketplace
marketplacesList.addEventListener('click', function({ target: li }) {
  const itemIndex = li.dataset.ind;
  selectedMarketplace = marketplaces[itemIndex];

  // mark only selected item
  marketplacesList.parentElement.querySelector('.selected')?.classList.remove('selected');
  li.classList.add('selected');

  asinsEdit.focus();
  saveASINsButton.disabled = false;

  // request ASINs
  chrome.runtime.sendMessage({
    id: 'get_asins_for_marketplace',
    payload: {
      marketplace: selectedMarketplace,
    },
  }, function(asins) {
    l(asins);
    // show ASINs
    asinsEdit.value = asins?.join(EOL) ?? '';
  });
});




// saving ASINs
saveASINsButton.addEventListener('click', function() {
  let asins = asinsEdit.value.trim();
  asins = asins.length === 0 ? [] : asins.split(EOL);

  chrome.runtime.sendMessage({
    id: 'save_asins_for_marketplace',
    payload: {
      asins,
      marketplace: selectedMarketplace,
    },
  });
});
