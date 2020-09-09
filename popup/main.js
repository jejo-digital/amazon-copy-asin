'use strict';

let marketplaces;
let selectedMarketplace;

let selectedCategory;

// asins for selected marketplace
let asins = {};
let categoryAsins;


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

const successToast = document.querySelector('#successToast');

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
  n(); l('port.onMessage()', msg);

  switch (msg.id) {
    case 'marketplace_asins':
      // close possible opened Edit dialog
      $(document.querySelector('#asinsDialog.show')).modal('hide');

      asins = msg.payload.asins ?? {};
      filterAsinsByCategory();
      sortCategoryAsinsByBSR();
      showCategoryAsins();
      asinButtonsGroup.disabled = false;
      clearMarketplaceBsrsButton.disabled = false;
    break;

    default:
      l('message not processed');
    break;
  }
});




function filterAsinsByCategory() {
  let entries = Object.entries(asins);
  if (selectedCategory !== '') {
    entries = entries.filter(([, asinData]) => asinData.categories?.[selectedCategory] ?? false);
  }
  categoryAsins = entries.map(([asinValue]) => asinValue);
}




function showCategoryAsins() {
  l('showCategoryAsins()', categoryAsins);

  asinsTableBody.innerHTML = categoryAsins.map(function(asin) {
    let bsr = asins[asin].bsr;
    if (bsr === undefined) {
      // bsr obtaining was never performed
      bsr = '';
    }
    else if (bsr === null) {
      // bsr obtained, but was absent
      bsr = `<div class="text-center" title="BSR value absent on product page">\u2717</div>`;
    }
    else if (typeof bsr === 'string') {
      // bsr obtained with error
      bsr = `<div class="text-center" title="${bsr}">\u26A0</div>`;
    }

    return `
      <tr>
        <td>
          ${asins[asin].isCopied ? asin : `<s>${asin}</s>`}
        </td>
        <td>
          ${bsr}
        </td>
      </tr>
    `;
  }).join('');
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
    id: 'get_marketplace_asins',
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
  sortCategoryAsinsByBSR();
  showCategoryAsins();
});




// return body and row indices of clicked row, or null if row is already selected
function getItemInfoFromElem(elem) {
  // this check is required because:
  // 1. elem is <tbody> after selecting several rows with mouse
  // 2. <span> may exist in row
  if (!(elem.nodeName === 'TD' || elem.nodeName === 'SPAN')) {
    return null;
  }

  const tableRow = elem.closest('tr');
  if (tableRow.classList.contains('table-active')) {
    // this row is already selected
    return null;
  }

  const tableBody = tableRow.parentElement;

  // mark only one row in entire table as selected
  tableBody.parentElement.querySelector('.table-active')?.classList.remove('table-active');
  tableRow.classList.add('table-active');

  return {
    bodyIndex: Number(tableBody.dataset.index) || 0,
    rowIndex: tableRow.sectionRowIndex,
  };
}




document.querySelector('#clearAllAsins').addEventListener('click', async function() {
  if (!await showConfirmDialog('ALL ASINs in ALL marketplaces will be deleted. Proceed?')) {
    return;
  }

  port.postMessage({
    id: 'clear_all_asins',
  });
});




function saveAsins() {
  port.postMessage({
    id: 'set_marketplace_asins',
    payload: {
      marketplace: selectedMarketplace,
      asins,
    },
  });
}




// dev
Object.defineProperty(window, 's', {
  get() {
    console.group('current situation');
    l('selectedMarketplace', selectedMarketplace);
    l('selectedCategory', selectedCategory);
    l('asins', asins);
    l('categoryAsins', categoryAsins);
    l('options', options);
    console.groupEnd();
  },
});
