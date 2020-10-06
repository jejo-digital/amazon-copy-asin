'use strict';

let marketplaces;
let selectedMarketplace;

let selectedCategory;

// asins for selected marketplace
let asins = {};

// asins for selected marketplace and category
let categoryAsins;
let topAsins = {};

let myAsins;
let categoryDescriptions;


const marketplacesTableBody = document.querySelector('#marketplaces tbody');
const categoriesTable = document.querySelector('#categories');
const categoriesTableBody = categoriesTable.lastElementChild;
const asinsTableBody = document.querySelector('#asins tbody');

const asinButtonsGroup = document.querySelector('fieldset');

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
  const urlCategory = urlSearchParams.get('category')?.toLowerCase() ?? null;
  l(urlCategory);
  if (urlCategory == null) {
    selectedCategory = NO_CATEGORY;
  }
  else {
    selectedCategory = CATEGORY_NAMES.includes(urlCategory) ? urlCategory : NO_CATEGORY;
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
      // hide Markets table if marketplace is known, but only in popup(not in popup tab)
      if (new URL(location.href).searchParams.has('popup')) {
        marketplacesTableBody.parentElement.parentElement.style.display = 'none';
      }
    });
  }
}




// show category names in table on main page
categoriesTableBody.innerHTML = CATEGORY_NAMES.map(category => `
  <tr>
    <td class="text-truncate">
      ${getCircleHTML(category, {
        styles: `
          display: inline-block;
          vertical-align: middle;
          position: relative;
          top: -2px;
        `,
      })}
      <span>${category}</span>
    </td>
  </tr>
`).join('');

// select category from URL, if exists
if (selectedCategory === NO_CATEGORY) {
  categoriesTable.firstElementChild.nextElementSibling.classList.add('table-active');
}
else {
  categoriesTableBody.children[CATEGORY_NAMES.indexOf(selectedCategory)].classList.add('table-active');
}


// show category names in table in dialog
categoriesDialogTableBody.innerHTML = CATEGORY_NAMES.map(category => `
  <tr>
    <td class="align-middle">
      ${getCircleHTML(category, {
        styles: `
          display: inline-block;
          vertical-align: middle;
          position: relative;
          top: -2px;
        `,
      })}
      <span>${category}</span>
    </td>
    <td>
      <input type="text" class="w-100">
    </td>
  </tr>
`).join('');

// get and show category descriptions in table on main page
chrome.storage.local.get({
  categoryDescriptions: {},
}, function(storage) {
  l('storage.get()', storage);

  categoryDescriptions = storage.categoryDescriptions;
  updateCategoryDescriptionsInTable();
});




const port = chrome.runtime.connect();
port.postMessage({
  id: 'get_my_asins',
});
port.onMessage.addListener(async function(msg) {
  n(); l('port.onMessage()', msg);

  switch (msg.id) {
    case 'marketplace_asins':
      // close possible opened dialog
      $(document.querySelector('#textStringsDialog.show')).modal('hide');

      asins = msg.payload.asins ?? {};

      if (isNeedToClearTopAsins) {
        clearTopAsins();
      }
      else {
        isNeedToClearTopAsins = true;
      }

      filterAsinsByCategory();
      sortCategoryAsinsByBSR();

      asinButtonsGroup.disabled = false;
      deleteMarketplaceScrapedDataButton.disabled = false;

      if (myAsins === undefined) {
        alert('Impossible disaster!');
        return;
      }

      showCategoryAsins();
    break;

    case 'my_asins':
      updateMyAsins(msg.payload.asins);
    break;

    default:
      l('message not processed');
    break;
  }
});




chrome.runtime.onMessage.addListener(function(msg) {
  n(); l('runtime.onMessage()', msg);

  switch (msg.id) {
    case 'top_asins':
      const {marketplace, category, asins: newTopAsins} = msg.payload;
      if (!(marketplace === selectedMarketplace && category === selectedCategory)) {
        // top asins for other category or marketplace
        l('skip top ASINs');
        return;
      }
      l('store top ASINs');
      topAsins = newTopAsins;
      isNeedToClearTopAsins = false;
    break;

    case 'my_asins':
      // close possible opened dialog
      $(document.querySelector('#textStringsDialog.show')).modal('hide');

      updateMyAsins(msg.payload.asins);
    break;

    case 'category_descriptions':
      // close possible opened dialog
      $(document.querySelector('#categoriesDialog.show')).modal('hide');

      categoryDescriptions = msg.payload.categoryDescriptions;
      updateCategoryDescriptionsInTable();
    break;

    case 'options':
      options = msg.payload.options;
      showOptions();
    break;

    default:
      l('message not processed');
    break;
  }
});




function filterAsinsByCategory() {
  let entries = Object.entries(asins);
  if (selectedCategory !== NO_CATEGORY) {
    entries = entries.filter(([, asinData]) => asinData.categories?.[selectedCategory] ?? false);
  }
  categoryAsins = entries.map(([asinValue]) => asinValue);
}




function showCategoryAsins() {
  l('showCategoryAsins()', categoryAsins);

  const getBsrAbsentValueHTML = getAbsentValueHTML('BSR');
  const getParentAsinAbsentValueHTML = getAbsentValueHTML('Parent ASIN');

  asinsTableBody.innerHTML = categoryAsins.map(function(asin) {
    const asinObj = asins[asin];

    let asinHTML = asinObj.isCopied ? asin : `<s>${asin}</s>`;
    if (myAsins.includes(asin)) {
      asinHTML = `<span style="
        background-color: ${MY_PRODUCT_COLOR};
        border-radius: 0.2rem;
      " title="ASIN from 'My ASINs' list">${asinHTML}</span>`;
    }

    let bsrHTML = asinObj.bsr;
    if (bsrHTML === undefined) {
      // bsr obtaining was never performed
      bsrHTML = NEVER_SCRAPED_SYMBOL;
    }
    else if (bsrHTML === null) {
      // bsr obtained, but was absent
      bsrHTML = getBsrAbsentValueHTML;
    }
    else if (typeof bsrHTML === 'string') {
      // bsr obtained with error
      bsrHTML = `<div class="text-center" title="${bsrHTML}">\u26A0</div>`;
    }

    let parentAsinHTML = asinObj.parentAsin;
    if (parentAsinHTML === undefined) {
      // obtaining was never performed
      parentAsinHTML = NEVER_SCRAPED_SYMBOL;
    }
    else if (parentAsinHTML === null) {
      // bsr obtained, but was absent
      parentAsinHTML = getParentAsinAbsentValueHTML;
    }
    else if (parentAsinHTML === asin) {
      parentAsinHTML = `<b title="Parent ASIN is equal to main ASIN">${parentAsinHTML}</b>`;
    }

    let inTopClass;
    if (topAsins[asin] === undefined) {
      inTopClass = '';
    }
    else if (topAsins[asin] === null) {
      inTopClass = 'bg-warning';
    }
    else {
      inTopClass = 'bg-success';
    }

    return `
      <tr class="${inTopClass}">
        <td>
          ${asinHTML}
        </td>
        <td>
          ${bsrHTML}
        </td>
        <td>
          ${parentAsinHTML}
        </td>
      </tr>
    `;
  }).join('');
}




function getAbsentValueHTML(name) {
  return `<div class="text-center" title="${name} is absent on product page">${ABSENT_SYMBOL}</div>`;
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

  selectedCategory = clickedItemInfo.bodyIndex === 0 ? NO_CATEGORY : CATEGORY_NAMES[clickedItemInfo.rowIndex];
  l(selectedCategory);

  clearTopAsins();
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




document.querySelector('#deleteAllAsins').addEventListener('click', async function() {
  if (!await showConfirmDialog('ALL ASINs in ALL marketplaces will be deleted. Proceed?')) {
    return;
  }

  port.postMessage({
    id: 'delete_all_asins',
  });
});




// dev
Object.defineProperty(window, 's', {
  get() {
    console.group('current situation');
    l('selectedMarketplace', selectedMarketplace);
    l('selectedCategory', selectedCategory);
    l('asins', asins);
    l('categoryAsins', categoryAsins);
    l('myAsins', myAsins);
    l('topAsins', topAsins);
    l('isNeedToClearTopAsins', isNeedToClearTopAsins);
    l('categoryDescriptions', categoryDescriptions);
    l('options', options);
    console.groupEnd();
  },
});
