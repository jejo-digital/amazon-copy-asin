'use strict';

let marketplaces;
let selectedMarketplace;

let selectedCategory;

let marketplaceAsins;
let categoryAsins;
let bsrs = {};


const marketplacesTableBody = document.querySelector('#marketplaces tbody');
const categoriesTable = document.querySelector('#categories');
const categoriesTableBody = categoriesTable.lastElementChild;
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
marketplaces = deduplicateArray(manifest.content_scripts[0].matches.map(pattern => pattern.match(/(?<=amazon\.).+?(?=\/)/)[0]));
marketplacesTableBody.innerHTML = marketplaces.map(marketplace => `
  <tr>
    <td>
      ${marketplace}
    </td>
  </tr>
`).join('');


// select marketplace or category from URL
{
  const urlSearchParams = new URL(location.href).searchParams;

  // marketplace in URL?
  const urlMarketplace = urlSearchParams.get('marketplace');
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

  // category in URL?
  const urlCategory = urlSearchParams.get('category');
  l(urlCategory);
  if (urlCategory == null) {
    selectedCategory = '';
  }
  else {
    selectedCategory = CATEGORIES.includes(urlCategory) ? urlCategory : '';
  }
  l(selectedCategory);




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




// show categories
categoriesTableBody.innerHTML = CATEGORIES.map(category => `
  <tr>
    <td>
      ${getCategoryBadgeHTML(category, `
        display: inline-block;
        vertical-align: middle;
        position: relative;
        top: -2px;
      `)}
      ${category}
    </td>
  </tr>
`).join('');

// select category from URL, if exists
if (selectedCategory === '') {
  categoriesTable.firstElementChild.firstElementChild.classList.add('table-active');
}
else {
  categoriesTableBody.children[CATEGORIES.indexOf(selectedCategory)].classList.add('table-active');
}




const port = chrome.runtime.connect();
port.onMessage.addListener(function(msg) {
  cg('port.onMessage()', msg);

  switch (msg.id) {
    case 'asins_for_marketplace':
      // close possible opened Edit dialog
      $(document.querySelector('#asinsDialog.show')).modal('hide');

      marketplaceAsins = msg.payload.asins ?? {};
      filterAsinsByCategory();
      sortAsinsByBSR();
      showAsins();
      asinButtonsGroup.disabled = false;
    break;

    default:
      l('message not processed');
    break;
  }
});




function filterAsinsByCategory() {
  let entries = Object.entries(marketplaceAsins);
  if (selectedCategory !== '') {
    entries = entries.filter(([, asinData]) => asinData.categories?.[selectedCategory] ?? false);
  }
  categoryAsins = entries.map(([asinValue]) => asinValue);
}




function showAsins() {
  l('showAsins()', marketplaceAsins);

  asinsTableBody.innerHTML = categoryAsins.map(asin => `
    <tr>
      <td>
        ${marketplaceAsins[asin].isCopied ? asin : `<s>${asin}</s>`}
      </td>
      <td>
        ${bsrs[selectedMarketplace]?.[asin] ?? ''}
      </td>
    </tr>
  `).join('');
}




// select marketplace
marketplacesTableBody.addEventListener('click', function({target}) {
  const clickedItemInfo = getItemInfoFromElem(target);
  l(clickedItemInfo);
  if (clickedItemInfo === null) {
    return;
  }

  selectedMarketplace = marketplaces[clickedItemInfo.rowIndex];
  l(selectedMarketplace);

  // request ASINs from BG page
  port.postMessage({
    id: 'get_asins_for_marketplace',
    payload: {
      marketplace: selectedMarketplace,
    },
  });
});




// select category
categoriesTable.addEventListener('click', function({target}) {
  const clickedItemInfo = getItemInfoFromElem(target);
  l(clickedItemInfo);
  if (clickedItemInfo === null) {
    return;
  }

  selectedCategory = clickedItemInfo.bodyIndex === 0 ? '' : CATEGORIES[clickedItemInfo.rowIndex];
  l(selectedCategory);

  filterAsinsByCategory();
  sortAsinsByBSR();
  showAsins();
});




// return body and row indices of clicked row, or null if row is already selected
function getItemInfoFromElem(elem) {
  // 1. elem is <tbody> after selecting several rows with mouse
  // 2. <span> may exists in row
  if (!(elem.nodeName === 'TD' || elem.nodeName === 'SPAN')) {
    return null;
  }

  const tableRow = elem.parentElement;
  if (tableRow.classList.contains('table-active')) {
    // this row is already selected
    return null;
  }

  const tableBody = tableRow.parentElement;

  // mark only one row in entire table as selected
  tableBody.parentElement.querySelector('.table-active')?.classList.remove('table-active');
  tableRow.classList.add('table-active');

  return {
    bodyIndex: Number(tableBody.dataset.index),
    rowIndex: tableRow.sectionRowIndex,
  };
}




// dev
Object.defineProperty(window, 's', {
  get() {
    cg('current situation');
    l('marketplaceAsins', marketplaceAsins);
    l('categoryAsins', categoryAsins);
    l('bsrs', bsrs);
    l('selectedMarketplace', selectedMarketplace);
    l('selectedCategory', selectedCategory);
    l('options', options);
    console.groupEnd();
  },
});
