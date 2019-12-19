'use strict';
const l = console.log;

const UNIQUE_STRING = 'd9735ea58f704800b5c9ae4fcc046b19';
const PRODUCT_BLOCK_SELECTOR = 'div[data-asin]';
const SUCCESS_SIGNAL_TIME = 0.5; // seconds

const copyImageURL = chrome.runtime.getURL('copy.svg');
const successImageURL = chrome.runtime.getURL('success.svg');


// insert icons

const imageStyle = 'cursor: pointer; ' + (location.host === 'www.amazon.ae' ? 'position: relative; top: -20px; left: 120px;' :
                                                                              'position: absolute; margin-left: 3px;');
const imageHTML = `<img src="${copyImageURL}" width="25" height="25" title="Copy ASIN" style="${imageStyle}" class="${UNIQUE_STRING}" />`;

// search results
document.querySelectorAll(`.s-result-list ${PRODUCT_BLOCK_SELECTOR} a > span.a-size-base`).forEach(function(el) {
  el.parentElement.parentElement.insertAdjacentHTML('afterEnd', imageHTML);
});

// 'Sponsored products related to this item' & '4 stars and above' blocks
document.querySelectorAll(`li.a-carousel-card ${PRODUCT_BLOCK_SELECTOR}[data-p13n-asin-metadata] a.a-link-normal + div.a-row`).forEach(function(el) {
  el.insertAdjacentHTML('beforeEnd', imageHTML);
});


// listen for clicks
document.addEventListener('click', function(event) {
  const img = event.target;
  if (!img.classList.contains(UNIQUE_STRING)) {
    return;
  }

  // get and copy ASIN
  let asin = img.closest(PRODUCT_BLOCK_SELECTOR).dataset.asin;
  l(asin);
  if (asin === '') {
    // another way
    asin = img.previousElementSibling.firstElementChild.href.match(/\/dp\/(.+)\//)[1];
  }
  l(asin);
  navigator.clipboard.writeText(asin)
  .then(function() {
    // signal success
    img.src = successImageURL;
    setTimeout(function() {
      img.src = copyImageURL;
    }, SUCCESS_SIGNAL_TIME * 1000);
  });
});
