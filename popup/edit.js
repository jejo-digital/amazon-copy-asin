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

  $(asinsDialog).modal('hide');
});




$(asinsDialog).on('shown.bs.modal', function() {
  asinsTextarea.focus();
});




$(asinsDialog).on('hide.bs.modal', function() {
  asinsTextarea.value = '';
});
