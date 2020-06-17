'use strict';

const CAROUSEL_VIEWPORT_HEIGHT_CHANGE = 5; // pixels

const UNIQUE_STRING = 'd9735ea58f704800b5c9ae4fcc046b19';
const PRODUCT_BLOCK_SELECTOR = 'div:not([data-asin=""])[data-asin]';
const PRODUCT_IMAGE_DIV_BORDER_STYLE = '5px solid transparent';
const ASIN_COPIED_COLOR = 'green';
const ASIN_NOT_COPIED_COLOR = 'red';
const BEFORE_TOOLBAR_ELEMENT_SELECTORS = [
  'a[href$="#customerReviews"]',
  '.a-icon-row > .a-link-normal + .a-link-normal',
  '.a-row > .a-row > a',
  '.a-row > .a-link-normal + span',
  '.a-row > .a-link-normal',
  '.a-icon-prime',
  'span.a-color-price',
  'a.a-link-normal.a-text-normal',
  '.sb_1REHiRA7',
];


let asinElems = {};


let options;

// ASINs for page marketplace
let asins;

// get them
chrome.runtime.sendMessage({
   id: 'get_asins_for_marketplace',
}, function(newASINs) {
  l(newASINs);

  asins = newASINs ?? [];

  chrome.storage.sync.get({
    options: DEFAULT_OPTIONS,
  }, function(storage) {
    l('storage.get()', storage);

    options = storage.options;

    // process product blocks already on page
    document.querySelectorAll(`
      .s-result-list ${PRODUCT_BLOCK_SELECTOR},
      li.a-carousel-card:not(.vse-video-card) > div
    `).forEach(processProductBlock);
  });
});




const copyImageTemplate = document.createElement('img');
copyImageTemplate.src = chrome.runtime.getURL('/img/question.svg');
copyImageTemplate.width = 25;
copyImageTemplate.height = 25
copyImageTemplate.title = "Can't find ASIN";
copyImageTemplate.style = `
  position: absolute;
  margin-left: 3px;
  z-index: 9;
`;


const copyImageURL = chrome.runtime.getURL('img/copy.svg');
const successImageURL = chrome.runtime.getURL('img/success.svg');




// wait for new products
new MutationObserver(function(mutationRecords) {
  cg('observer fired');

  for (const mutationRecord of mutationRecords) {
    l(mutationRecord);

    const addedNode = mutationRecord.addedNodes[0];
    if (addedNode !== undefined && addedNode.className === UNIQUE_STRING) {
      l('skip our own recently added button');
      return;
    }

    const target = mutationRecord.target;
    if (target.classList.contains('a-carousel-card') &&
        !target.classList.contains('a-carousel-card-empty') &&
        target.children.length > 0) {
      processProductBlock(target);
    }
    else {
      if (target.classList.contains('a-carousel')) {
        l('new carousel', target);
        Array.from(target.children).forEach(processProductBlock);
      }
      else {
        l('unused mutation record');
      }
    }
  }
}).observe(document.body, {childList: true, subtree: true});




function processProductBlock(productBlock) {
  cg('processProductBlock()', productBlock);

  if (productBlock.nodeName === 'LI') {
    productBlock = productBlock.firstElementChild;
    l('adjust');
  }

  if (productBlock === null) {
    l('block is empty');
    return;
  }

  if (productBlock.classList.contains(UNIQUE_STRING)) {
    l('block already processed');
    return;
  }

  // 'Your Browsing History' carousel
  if (productBlock.nodeName === 'SPAN') {
    l('SPAN');
    productBlock = productBlock.parentElement;

    productBlock.style.position = 'relative';

    addUItoBlock(productBlock, productBlock, 'beforeEnd')

    productBlock.lastElementChild.style.right = '0';
    productBlock.lastElementChild.style.bottom = '0';

    // mark block
    productBlock.firstElementChild.classList.add(UNIQUE_STRING);

    return;
  }

  // find place to inject button
  let el;
  for (const selector of BEFORE_TOOLBAR_ELEMENT_SELECTORS) {
    el = productBlock.querySelector(selector);
    if (el !== null) {
      break;
    }
  }
  if(el === null) {
    e('unknown product block');
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

  // mark block
  productBlock.classList.add(UNIQUE_STRING);

  addUItoBlock(productBlock, el, 'afterEnd');
}




function addUItoBlock(productBlock, insertToolbarElem, position) {
  const copyImage = copyImageTemplate.cloneNode();
  insertToolbarElem.insertAdjacentElement(position, copyImage);

  // try to find ASIN
  let el;
  let asin;
  el = copyImage.closest(PRODUCT_BLOCK_SELECTOR);
  if (el === null) {
    el = copyImage.closest('div[data-p13n-asin-metadata]');
    if (el === null) {
      el = copyImage.previousElementSibling;
      if (el === null) {
        // unknown situation
      }
      else {
        if (el.id.startsWith('rhfAsinRow')) {
          asin = el.id.split('-')[1];
        }
      }
    }
    else {
      asin = JSON.parse(el.dataset.p13nAsinMetadata).asin;
    }
  }
  else {
    asin = el.dataset.asin;
  }

  // try another way
  if (asin === undefined) {
    asin = copyImage.previousElementSibling.href?.match(/\/dp\/(.+)\//)?.[1];
  }

  // and another one
  if (asin === undefined) {
    asin = copyImage.closest('.cerberus-asin-content')?.firstElementChild.dataset.asin;
  }

  if (asin === '') {
    // is this possible?
    return;
  }

  if (asin === undefined) {
    // could not find ASIN
    return;
  }


  // prepare copy button for using
  copyImage.dataset.asin = asin;
  copyImage.title = 'Copy ASIN ' + asin;
  copyImage.style.cursor = 'pointer';
  copyImage.className = UNIQUE_STRING;

  // store copy button image for quick access later
  if (asinElems[asin] === undefined) {
    asinElems[asin] = {
      copyImages: [],
      productImageDivs: [],
    };
  }
  asinElems[asin].copyImages.push(copyImage);

  // store product image div for quick access later
  asinElems[asin].productImageDivs.push(productBlock.querySelector('img').parentElement);

  showAsinCopyState(asin);
}




// listen for button clicks
document.addEventListener('click', async function({target: image}) {
  l(image);

  if (!image.classList.contains(UNIQUE_STRING)) {
    return;
  }

  const asin = image.dataset.asin;

  // copy ASIN
  try {
    await navigator.clipboard.writeText(asin);
  }
  catch(err) {
    alert('Copy error: ' + err.message);
  }

  // if ASIN was already copied, it is already marked as copied. no need to mark it again
  if (asins.includes(asin)) {
    l('ASIN is already copied');
    return;
  }

  // send info about new ASIN to BG page
  chrome.runtime.sendMessage({
     id: 'mark_asin_as_copied',
     payload: {
       asin,
     },
  });
});




chrome.runtime.onMessage.addListener(function(msg) {
  cg('runtime.onMessage()');
  l(msg);

  switch (msg.id) {
    case 'asins':
      // store new ASINs
      asins = msg.payload.asins ?? [];

      updateProductBlocks();
    break;

    case 'options':
      options = msg.payload.options;

      updateProductBlocks();
    break;

    default:
      l('message not processed');
    break;
  }
});




// update all product blocks on page
function updateProductBlocks() {
  for (const asin in asinElems) {
    showAsinCopyState(asin);
  }
}




function showAsinCopyState(asin) {
  const elems = asinElems[asin];
  for (let i = 0; i < elems.copyImages.length; ++i) {
    const isAsinCopied = asins.includes(asin);

    elems.copyImages[i].src = isAsinCopied ? successImageURL : copyImageURL;

    // highlight product image div ?
    if (options.isHighlightProductImages) {
      elems.productImageDivs[i].style.border = PRODUCT_IMAGE_DIV_BORDER_STYLE;
      elems.productImageDivs[i].style.borderColor = isAsinCopied ? ASIN_COPIED_COLOR : ASIN_NOT_COPIED_COLOR;
    }
    else {
      elems.productImageDivs[i].style.border = '';
    }
  }
}
