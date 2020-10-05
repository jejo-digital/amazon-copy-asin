'use strict';

let options;


chrome.storage.sync.get({
  options: DEFAULT_OPTIONS,
}, function(storage) {
  l('storage.get()', storage);

  options = storage.options;
  showContentScriptOptions();
  showPopupOptions() 
});




const isHighlightCopiedProductsCheckbox = document.querySelector('#isHighlightCopiedProducts');
const isHighlightNotCopiedProductsCheckbox = document.querySelector('#isHighlightNotCopiedProducts');
const isHighlightSponsoredProductsCheckbox = document.querySelector('#isHighlightSponsoredProducts');
const isHighlightMyProductsCheckbox = document.querySelector('#isHighlightMyProducts');

const isHideSponsoredProductsCheckbox = document.querySelector('#isHideSponsoredProducts');
const isHideCopiedProductsCheckbox = document.querySelector('#isHideCopiedProducts');
const isHideMyProductsCheckbox = document.querySelector('#isHideMyProducts');

const isShowProductPositionsCheckbox = document.querySelector('#isShowProductPositions');

const bsrRequestsIntervalInput = document.querySelector('#bsrRequestsInterval');



function showContentScriptOptions() {
  l('showContentScriptOptions()');

  isHighlightCopiedProductsCheckbox.checked = options.isHighlightCopiedProducts;
  isHighlightNotCopiedProductsCheckbox.checked = options.isHighlightNotCopiedProducts;
  isHighlightSponsoredProductsCheckbox.checked = options.isHighlightSponsoredProducts;
  isHighlightMyProductsCheckbox.checked = options.isHighlightMyProducts;

  isHideSponsoredProductsCheckbox.checked = options.isHideSponsoredProducts;
  isHideCopiedProductsCheckbox.checked = options.isHideCopiedProducts;
  isHideMyProductsCheckbox.checked = options.isHideMyProducts;

  isShowProductPositionsCheckbox.checked = options.isShowProductPositions;
}

function showPopupOptions() {
  l('showPopupOptions()');

  bsrRequestsIntervalInput.valueAsNumber = options.bsrRequestsInterval;
}




// content script options change
document.querySelector('form').addEventListener('input', function({target: checkbox}) {
  const optionName = checkbox.id;
  options[optionName] = checkbox.checked;

  // save options
  chrome.storage.sync.set({
    options,
  }, function() {
    // send options to BG page and other popups(BG page will send it to content scripts)
    chrome.runtime.sendMessage({
      id: 'content_script_options',
      payload: {
        options,
      },
    });
  });
});

// popup options change
bsrRequestsIntervalInput.addEventListener('change', function({target: input}) {
  let val = input.valueAsNumber;
  l(val);
  if (Number.isNaN(val)) {
    val = 0;
    input.valueAsNumber = 0;
  }
  l(val);

  options.bsrRequestsInterval = val;

  // save options
  chrome.storage.sync.set({
    options,
  }, function() {
    // send options to BG page and other popups(they are not used in BG page)
    chrome.runtime.sendMessage({
      id: 'popup_options',
      payload: {
        options,
      },
    });
  });
});
