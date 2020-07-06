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
const isHighlightNotCopiedProductsCheckbox = document.querySelector('#isHighlightNotCopiedProducts');

const isHighlightSponsoredProductsCheckbox = document.querySelector('#isHighlightSponsoredProducts');

const isHideSponsoredProductsCheckbox = document.querySelector('#isHideSponsoredProducts');
const isHideCopiedProductsCheckbox = document.querySelector('#isHideCopiedProducts');




function showOptions() {
  l('showOptions()');

  isHighlightCopiedProductsCheckbox.checked = options.isHighlightCopiedProducts;
  isHighlightNotCopiedProductsCheckbox.checked = options.isHighlightNotCopiedProducts;

  isHighlightSponsoredProductsCheckbox.checked = options.isHighlightSponsoredProducts;

  isHideSponsoredProductsCheckbox.checked = options.isHideSponsoredProducts;
  isHideCopiedProductsCheckbox.checked = options.isHideCopiedProducts;
}




// options change
document.querySelector('form').addEventListener('input', function({target: checkbox}) {
  const optionName = checkbox.id;
  options[optionName] = checkbox.checked;

  // save options
  chrome.storage.sync.set({
    options,
  });

  // send options to BG page and other popup tabs or popups
  chrome.runtime.sendMessage({
    id: 'options',
    payload: {
      options,
    },
  });
});




chrome.runtime.onMessage.addListener(function(msg) {
  cg('runtime.onMessage()');
  l(msg);

  switch (msg.id) {
    case 'options':
      options = msg.payload.options;
      showOptions();
    break;

    default:
      l('message not processed');
    break;
  }
});




document.querySelector('#clearAllAsins').addEventListener('click', function() {
  if (!confirm('ALL ASINs in ALL marketplaces will be deleted. Are you sure?')) {
    return;
  }
  port.postMessage({
    id: 'clear_all_asins',
  });
});
