'use strict';

let options;


chrome.storage.sync.get({
  options: DEFAULT_OPTIONS,
}, function(storage) {
  l('storage.get()', storage);

  options = storage.options;
  showOptions();
});




const isHighlightCopiedProductsCheckbox = document.querySelector('#isHighlightCopiedProducts');
const isHideCopiedProductsCheckbox = document.querySelector('#isHideCopiedProducts');

const isHighlightNotCopiedProductsCheckbox = document.querySelector('#isHighlightNotCopiedProducts');

const isHighlightSponsoredProductsCheckbox = document.querySelector('#isHighlightSponsoredProducts');
const isHideSponsoredProductsCheckbox = document.querySelector('#isHideSponsoredProducts');

const isHighlightMyProductsCheckbox = document.querySelector('#isHighlightMyProducts');
const isHideMyProductsCheckbox = document.querySelector('#isHideMyProducts');

const isShowProductPositionsCheckbox = document.querySelector('#isShowProductPositions');




function showOptions() {
  l('showOptions()');

  isHighlightCopiedProductsCheckbox.checked = options.isHighlightCopiedProducts;
  isHideCopiedProductsCheckbox.checked = options.isHideCopiedProducts;

  isHighlightNotCopiedProductsCheckbox.checked = options.isHighlightNotCopiedProducts;

  isHighlightSponsoredProductsCheckbox.checked = options.isHighlightSponsoredProducts;
  isHideSponsoredProductsCheckbox.checked = options.isHideSponsoredProducts;

  isHighlightMyProductsCheckbox.checked = options.isHighlightMyProducts;
  isHideMyProductsCheckbox.checked = options.isHideMyProducts;

  isShowProductPositionsCheckbox.checked = options.isShowProductPositions;
}




// options change
document.querySelector('form').addEventListener('input', function({target: checkbox}) {
  // checkbox id is used as name in options
  options[checkbox.id] = checkbox.checked;

  // uncheck other checked checkbox in category
  const otherCheckboxInCategory = document.querySelector(`:not(#${checkbox.id})[data-product-category="${checkbox.dataset.productCategory}"]`);
  l(otherCheckboxInCategory);
  if (checkbox.checked && otherCheckboxInCategory !== null && otherCheckboxInCategory.checked) {
    otherCheckboxInCategory.checked = false;
    options[otherCheckboxInCategory.id] = false;
  }
  l(options);

  // save options
  chrome.storage.sync.set({
    options,
  }, function() {
    // send options to BG page and other popups(BG page will send it to content scripts)
    chrome.runtime.sendMessage({
      id: 'options',
      payload: {
        options,
      },
    });
  });
});
