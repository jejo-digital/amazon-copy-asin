'use strict';
const l = console.log;
const e = console.error;

const SUCCESS_SIGNAL_TIME = 0.5; // seconds
const CAROUSEL_VIEWPORT_HEIGHT_CHANGE = 5; // pixels

const UNIQUE_STRING = 'd9735ea58f704800b5c9ae4fcc046b19';
const PRODUCT_BLOCK_SELECTOR = 'div[data-asin]';
const BEFORE_BUTTON_ELEMENT_SELECTORS = [
  'a[href$="#customerReviews"]',
  '.a-icon-row > .a-link-normal + .a-link-normal',
  '.a-row > .a-row > a',
  '.a-row > .a-link-normal + span',
  '.a-row > .a-link-normal',
  '.a-icon-prime',
  'span.a-color-price',
];


const copyImageURL = chrome.runtime.getURL('copy.svg');
const successImageURL = chrome.runtime.getURL('success.svg');
const buttonHTML = `<img src="${copyImageURL}" width="25" height="25" title="Copy ASIN" class="${UNIQUE_STRING}" style="
  cursor: pointer;
  position: absolute;
  margin-left: 3px;
" />`;


// add buttons to products already on page
document.querySelectorAll(`.s-result-list ${PRODUCT_BLOCK_SELECTOR},
li.a-carousel-card:not(.vse-video-card) > div`).forEach(addButtonToProductBlock);




// wait for new products
new MutationObserver(function(mutationRecords) {
  l(''); l('observer fired');

  for (const mutationRecord of mutationRecords) {
    l(''); l(mutationRecord);

    const addedNode = mutationRecord.addedNodes[0];
    if (addedNode !== undefined && addedNode.className === UNIQUE_STRING) {
      l('skip our own recently added button');
      return;
    }

    const target = mutationRecord.target;
    if (target.classList.contains('a-carousel-card') &&
        !target.classList.contains('a-carousel-card-empty') &&
        target.children.length > 0) {
      addButtonToProductBlock(target);
    }
    else {
      if (target.classList.contains('a-carousel')) {
        l('new carousel', target);
        Array.from(target.children).forEach(addButtonToProductBlock);
      }
      else {
        l('unused mutation record');
      }
    }
  }
}).observe(document.body, { childList: true, subtree: true, });




function addButtonToProductBlock(productBlock) {
  l(''); l('addButtonToProductBlock()', productBlock);

  if (productBlock.nodeName === 'LI') {
    productBlock = productBlock.firstElementChild;
    l('adjust');
  }

  if (productBlock === null) {
    l('block is empty');
    return;
  }

  if (productBlock.classList.contains(UNIQUE_STRING)) {
    l('block already has button');
    return;
  }

  // 'Your Browsing History' carousel
  if (productBlock.nodeName === 'SPAN') {
    l('SPAN');
    productBlock = productBlock.parentElement;

    productBlock.style.position = 'relative';

    productBlock.insertAdjacentHTML('beforeEnd', buttonHTML);

    productBlock.lastElementChild.style.right = '0';
    productBlock.lastElementChild.style.bottom = '0';

    productBlock.firstElementChild.classList.add(UNIQUE_STRING);

    return;
  }

  // find place to inject button
  let el;
  for (const selector of BEFORE_BUTTON_ELEMENT_SELECTORS) {
    el = productBlock.querySelector(selector);
    if (el !== null) {
      break;
    }
  }
  if(el === null) {
    e('unknown situation', productBlock);
    return;
  }

  // increase height of .a-carousel-viewport not to clip injected buttons, only once
  const carouselViewport = productBlock.closest('.a-carousel-viewport');
  if (carouselViewport !== null) {

    if (carouselViewport.style.height === '') {
      l('still no .a-carousel-viewport height');
    }
    else {
      if (carouselViewport.dataset.newHeight === undefined) {
        carouselViewport.dataset.newHeight = Number.parseInt(carouselViewport.style.height) + CAROUSEL_VIEWPORT_HEIGHT_CHANGE + 'px';
      }
      carouselViewport.style.height = carouselViewport.dataset.newHeight;
    }
  }

  // inject button
  productBlock.classList.add(UNIQUE_STRING);
  el.insertAdjacentHTML('afterEnd', buttonHTML);
}




// listen for button clicks
document.addEventListener('click', function({target: img}) {
  if (!img.classList.contains(UNIQUE_STRING)) {
    return;
  }

  // try to get ASIN
  let el;
  let asin;
  el = img.closest(PRODUCT_BLOCK_SELECTOR);
  if (el === null) {
    el = img.closest('div[data-p13n-asin-metadata]');
    if (el === null) {
      el = img.previousElementSibling;
      if (el === null) {
        throw 'unknown situation';
      }
      else {
        if (el.id.startsWith('rhfAsinRow')) {
          asin = el.id.split('-')[1]
        }
      }
    }
    else {
      asin = JSON.parse(el.dataset.p13nAsinMetadata).asin
    }
  }
  else {
    const mayBeAsin = el.dataset.asin;
    if (mayBeAsin === '') {
      asin = img.previousElementSibling.href.match(/\/dp\/(.+)\//)[1];
    }
    else {
      asin = mayBeAsin;
    }
  }

  l(asin);

  // copy ASIN
  navigator.clipboard.writeText(asin)
  .then(function() {
    // signal success
    img.src = successImageURL;
    setTimeout(function() {
      img.src = copyImageURL;
    }, SUCCESS_SIGNAL_TIME * 1000);
  });
});
