'use strict';

document.querySelector('#editCategoryAsins').addEventListener('click', async function() {
  const asinsText = await showTextStringsDialog('Category ASINs', categoryAsins);
  l(asinsText);
  if (asinsText === null) {
    return;
  }

  const newAsins = sanitizeTextToArray(asinsText);
  l(newAsins);

  let isAtLeastOneAsinAdded = false;
  if (selectedCategory === NO_CATEGORY) {
    // delete ASINs that are not from new ASIN list
    for (const asin in asins) {
      if (!newAsins.includes(asin)) {
        delete asins[asin];
      }
    }

    // add ASINs from new ASIN list
    for (const asin of newAsins) {
      if (asins[asin] === undefined) {
        asins[asin] = {
          isCopied: true,
        };
        isAtLeastOneAsinAdded = true;
      }
    }
  }
  else { // category is selected
    // delete selected category from ASINs that are not from new ASIN list
    for (const asin in asins) {
      if (!newAsins.includes(asin)) {
        delete asins[asin].categories?.[selectedCategory];
      }
    }

    // add selected category to ASINs from new ASIN list
    for (const asin of newAsins) {
      if (asins[asin] === undefined) { // new ASIN
        asins[asin] = {
          isCopied: true,
          categories: {
            [selectedCategory]: true,
          },
        };
        isAtLeastOneAsinAdded = true;
      }
      else { // existing ASIN
        if (asins[asin].categories === undefined) {
          // ASIN without categories
          asins[asin].categories = {
            [selectedCategory]: true,
          };
        }
        else {
          // ASIN with categories
          asins[asin].categories[selectedCategory] = true;
        }
      }
    }
  }

  if (isAtLeastOneAsinAdded) {
    deleteScrapedDataFromCategoryAsins();
  }
  saveAsins();
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
