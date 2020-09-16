'use strict';

document.querySelector('#editCategoryAsins').addEventListener('click', async function() {
  const asinsText = await showTextStringsDialog(categoryAsins);
  l(asinsText);
  if (asinsText === null) {
    return;
  }

  const newAsins = sanitizeTextToArray(asinsText);
  l(newAsins);

  if (selectedCategory === '') { // no category
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
      }
    }
  }
  else { // some category is selected
    // delete selected category from ASINs that are not from new ASIN list
    for (const asin in asins) {
      l(asin);
      if (!newAsins.includes(asin)) {
        delete asins[asin].categories?.[selectedCategory];
      }
    }

    n();

    // add selected category to ASINs from new ASIN list
    for (const asin of newAsins) {
      l(asin);
      if (asins[asin] === undefined) {
        // new ASIN
        asins[asin] = {
          isCopied: true,
          categories: {
            [selectedCategory]: true,
          },
        };
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

  saveAsins();
});




document.querySelector('#editMyAsins').addEventListener('click', function() {
  port.postMessage({
    id: 'get_my_asins',
  });
});
