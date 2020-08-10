'use strict';


document.querySelector('#edit').addEventListener('click', function() {
  asinsTextarea.value = categoryAsins.join(EOL);
  $(asinsDialog).modal();
  asinsTextarea.select();
});



asinsDialog.querySelector('.btn-primary').addEventListener('click', function() {
  let newAsins = clearText(asinsTextarea.value);
  newAsins = (newAsins === '') ? [] : deduplicateArray(newAsins.split(EOL));
  l(newAsins);

  if (selectedCategory === '') {
    // no category

    // delete ASINs that are not from new ASIN list
    for (const asin in marketplaceAsins) {
      if (!newAsins.includes(asin)) {
        delete marketplaceAsins[asin];
      }
    }

    // add ASINs from new ASIN list
    for (const asin of newAsins) {
      if (marketplaceAsins[asin] === undefined) {
        marketplaceAsins[asin] = {
          isCopied: true,
        };
      }
    }
  }
  else { // some category is selected
    // delete selected category from ASINs that are not from new ASIN list
    for (const asin in marketplaceAsins) {
      l(asin);
      if (!newAsins.includes(asin)) {
        delete marketplaceAsins[asin].categories?.[selectedCategory];
      }
    }

    nl();

    // add selected category to ASINs from new ASIN list
    for (const asin of newAsins) {
      l(asin);
      if (marketplaceAsins[asin] === undefined) {
        // new ASIN
        marketplaceAsins[asin] = {
          isCopied: true,
          categories: {
            [selectedCategory]: true,
          },
        };
      }
      else { // existing ASIN
        if (marketplaceAsins[asin].categories === undefined) {
          // ASIN without categories
          marketplaceAsins[asin].categories = {
            [selectedCategory]: true,
          };
        }
        else {
          // ASIN with categories
          marketplaceAsins[asin].categories[selectedCategory] = true;
        }
      }
    }
  }

  port.postMessage({
    id: 'set_asins_for_marketplace',
    payload: {
      asins: marketplaceAsins,
      marketplace: selectedMarketplace,
    },
  });

  $(asinsDialog).modal('hide');
});




$(asinsDialog).on('shown.bs.modal', function() {
  asinsTextarea.focus();
});




$(asinsDialog).on('hide.bs.modal', function() {
  asinsTextarea.value = '';
});
