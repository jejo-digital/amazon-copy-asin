'use strict';
const l = console.log;

const UNIQUE_STRING = 'd9735ea58f704800b5c9ae4fcc046b19';
const PRODUCT_BLOCK_SELECTOR = 'div[data-asin]';

const copyImageURL = chrome.runtime.getURL('copy.svg');
const successImageURL = chrome.runtime.getURL('success.svg');

//position: relative; margin-left: 3px; cursor: pointer;top:-10px;left:120px
// insert icons
var host = window.location.host;
if(host == 'www.amazon.com'){
  var style="position: absolute; margin-left: 3px; cursor: pointer;"
}else{
  var style="position: relative; margin-left: 10px; cursor: pointer;top:-20px;left:120px";
}
document.querySelectorAll(`${PRODUCT_BLOCK_SELECTOR} a > span.a-size-base`).forEach(function(el) {
  el.parentElement.parentElement.insertAdjacentHTML('afterEnd',`<img src="${copyImageURL}" width="25" height="25" title="Copy ASIN" style="${style}" class="${UNIQUE_STRING}" />`);
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
    }, 0.5 * 1000);
  })
});
