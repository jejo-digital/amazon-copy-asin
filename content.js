'use strict';

const PRODUCT_IMAGE_BORDER_STYLE = '5px dashed transparent';
const PRODUCT_WITH_COPIED_ASIN_IMAGE_BORDER_COLOR = 'lime';
const PRODUCT_WITH_NOT_COPIED_ASIN_IMAGE_BORDER_COLOR = 'red';

const SPONSORED_PRODUCT_IMAGE_OUTLINE_STYLE = '5px solid yellow';

const ORGANIC_PRODUCT_NUMBER_COLOR = 'lime';
const SPONSORED_PRODUCT_NUMBER_COLOR = 'red';
const LETTER_FOR_FIRST_GROUP_OF_SPONSORED_PRODUCTS = 'A';

const MY_PRODUCT_COLOR = 'limegreen';

const UNIQUE_STRING = 'd9735ea58f704800b5c9ae4fcc046b19';
const PRODUCT_BLOCK_SELECTOR = 'div:not([data-asin=""])[data-asin]';
const CAROUSEL_VIEWPORT_HEIGHT_CHANGE = 5; // pixels

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
  'a.cerberus-asin + a',
];


// ASINs data for page marketplace
let asins;

let asinsThatHaveNotes;

let myAsins;

let options;

// info about products on page
const products = [];

// for showing product positions on page
let organicProductNumber = 1;
let sponsoredProductNumber = 1;
let isNeedNewGroupOfSponsoredProducts = true;
let letterForCurrentGroupOfSponsoredProducts;

let asin; // just temp value

let asinDialog;
let asinDialogTextarea;


// get some data from BG page
const asinsPromise = new Promise(function(resolve) {
  chrome.runtime.sendMessage({
     id: 'get_marketplace_asins',
  }, function(_asins) {
    l('on get_marketplace_asins', _asins);
    asins = _asins ?? {};
    resolve();
  });
});
const notesPromise = new Promise(function(resolve) {
  chrome.runtime.sendMessage({
     id: 'get_asins_that_have_notes',
  }, function(_asinsThatHaveNotes) {
    l('on get_asins_that_have_notes', _asinsThatHaveNotes);
    asinsThatHaveNotes = _asinsThatHaveNotes;
    resolve();
  });
});
const myAsinsPromise = new Promise(function(resolve) {
  chrome.runtime.sendMessage({
     id: 'get_my_asins',
  }, function(_myAsins) {
    l('on get_my_asins', _myAsins);
    myAsins = _myAsins;
    resolve();
  });
});
const optionsPromise = new Promise(function(resolve) {
  chrome.storage.sync.get({
    options: DEFAULT_OPTIONS,
  }, function(storage) {
    l('storage.get()', storage);
    options = storage.options;
    resolve();
  });
});

// wait for all
const dclPromise = new Promise(function(resolve) {
  document.addEventListener('DOMContentLoaded', () => resolve());
});
Promise.all([asinsPromise, notesPromise, myAsinsPromise, optionsPromise, dclPromise]).then(function() {
  l('Promise.all()');

  // process product blocks already on page
  document.querySelectorAll(`
    .s-result-list ${PRODUCT_BLOCK_SELECTOR},
    li.a-carousel-card:not(.vse-video-card) > div
  `).forEach(processProductBlock);

  toggleVideoAdImages();


  // prepare dialog
  document.body.insertAdjacentHTML('beforeEnd', DIALOG_HTML);
  asinDialog = document.body.lastElementChild;
  asinDialogTextarea = asinDialog.querySelector('textarea');
  asinDialog.querySelector('form').addEventListener('submit', onDialogSubmit);


  // wait for new products
  new MutationObserver(function(mutationRecords) {
    n(); l('observer fired');

    for (const mutationRecord of mutationRecords) {
      n(); l(mutationRecord);

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
});


// search result page?
const isSRP = location.pathname === '/s';


// toolbar with buttons
const toolbarTemplate = document.createElement('span');
toolbarTemplate.className = UNIQUE_STRING;
toolbarTemplate.style = `
  display: inline-flex;
  position: absolute;
  margin-left: 3px;
  z-index: 9;
`;
toolbarTemplate.innerHTML = `
  <img width="25" height="25" title="Can't find ASIN" data-button-id="copy" src="${chrome.runtime.getURL('img/question.svg')}" style="
    min-width: 25px;
    cursor: not-allowed;
  " />
  <img width="25" height="25" data-button-id="props" style="
    cursor: pointer;
    display: none;
  " />
  <span title="Position" style="
    font-size: 20px;
    line-height: normal;
    display: none;
    vertical-align: top;
  "></span>
  <span title="Categories" style="
    height: 32px;
    display: inline-flex;
    position: relative;
    top: -2px;
    flex-direction: column;
    flex-wrap: wrap;
  ">
  </span>
`;

const copyImageURL = chrome.runtime.getURL('img/copy.svg');
const successImageURL = chrome.runtime.getURL('img/success.svg');
const menuImageURL = chrome.runtime.getURL('img/menu.svg');
const menuWithNotesImageURL = chrome.runtime.getURL('img/notes.svg');


// prepare dialog for Categories and Notes
const DIALOG_HTML = `
  <dialog id="${UNIQUE_STRING}" style="
    position: fixed;
    top: 0;
    bottom: 0;
    width: 300px;">
    <input type="button" style="
      background-color: transparent;
      position: absolute;
      top: 2px;
      border: none;
      font-size: 23px;
      ${/mac/i.test(navigator.userAgent) ? 'left' : 'right'}: 0;"
      class="dialog-cancel" value="&times;" />
    <form method="dialog" style="margin-bottom: 0;">
      <header style="text-align: center;">
        ASIN <span></span> 
      </header>
      <main style="
        margin-top: 10px;
        margin-bottom: 10px;">
        Categories:
        <div style="
          margin-left: 10px;
          margin-bottom: 10px;
          display: flex;
          flex-direction: column;
          height: 65px;
          flex-wrap: wrap;
          text-transform: capitalize;">
          ${CATEGORIES.map(category => `
            <label>
              <input type="checkbox" data-category="${category}" />
              ${getCategoryBadgeHTML(category, `
                display: inline-block;
                vertical-align: middle;
              `)}
              ${category}
            </label>
          `).join('')}
        </div>
        <div>
          <label style="font-weight: normal;">
            Notes:
            <br />
            <textarea style="
              margin-left: 10px;
              width: 255px;
              height: 139px;" autofocus></textarea>
          </label>
        </div>
      </main>
      <footer style="text-align: right;">
        <input type="button" class="dialog-cancel" value="Cancel" />
        <input type="submit" value="Save" />
      </footer>
    </form>
  </dialog>
`;




function processProductBlock(productBlock) {
  n(); l('processProductBlock()', productBlock);

  // hacks for carousel items
  if (productBlock.nodeName === 'LI') {
    productBlock = productBlock.firstElementChild;
    l('adjust 1');
    if (productBlock?.nodeName === 'STYLE') {
      productBlock = productBlock.nextElementSibling;
      l('adjust 2');
    }
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

    prepareProductBlock(productBlock, productBlock, 'beforeEnd')

    productBlock.lastElementChild.style.right = '0';
    productBlock.lastElementChild.style.bottom = '0';

    // mark block
    productBlock.firstElementChild.classList.add(UNIQUE_STRING);

    return;
  }

  // find place to inject toolbar
  let el;
  for (const selector of BEFORE_TOOLBAR_ELEMENT_SELECTORS) {
    el = productBlock.querySelector(selector);
    if (el !== null) {
      break;
    }
  }
  if(el === null) {
    l('unknown product block');
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

  prepareProductBlock(productBlock, el, 'afterEnd');
}




function prepareProductBlock(productBlock, insertToolbarElem, position) {
  const toolbar = toolbarTemplate.cloneNode(true);
  insertToolbarElem.insertAdjacentElement(position, toolbar);

  // try to find ASIN
  let el;
  let asin;
  el = toolbar.closest(PRODUCT_BLOCK_SELECTOR);
  if (el === null) {
    el = toolbar.closest('div[data-p13n-asin-metadata]');
    if (el === null) {
      el = toolbar.previousElementSibling;
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
    asin = toolbar.previousElementSibling.href?.match(/\/dp\/(.+)\//)?.[1];
  }

  // and another one
  if (asin === undefined) {
    asin = toolbar.closest('.cerberus-asin-content')?.firstElementChild.dataset.asin;
  }

  if (asin === '') {
    // is this possible?
    return;
  }

  if (asin === undefined) {
    // could not find ASIN
    return;
  }

  // prepare toolbar for using
  toolbar.dataset.asin = asin;

  // copy ASIN button
  const copyImage = toolbar.firstElementChild;
  copyImage.title = 'Copy ASIN ' + asin;
  copyImage.style.cursor = 'pointer';
  copyImage.className = UNIQUE_STRING;

  // properties button
  const propsImage = copyImage.nextElementSibling;
  propsImage.title = 'Properties of ASIN ' + asin;
  propsImage.style.display = '';

  // store info about product in current block
  const product = {
    asin,
    block: productBlock,
    // references to toolbar elements
    copyAsinImage: toolbar.children[0],
    propertiesImage: toolbar.children[1],
    positionSpan: toolbar.children[2],
    categoriesSpan: toolbar.children[3],
  };

  // it may not be the image itself, but also DIV around or near it. for simplicity we just call it 'image'.
  let productImage = productBlock.querySelector('img').parentElement;
  if (productImage.nodeName === 'SPAN') {
    // sponsored product in the very top of page
    productImage = productBlock.previousElementSibling;
  }
  else if (productImage.nodeName === 'A') {
    if (productImage.classList.contains('a-link-normal')) {
      // carousel item
      productImage = productImage.firstElementChild;
    }
    else {
      if(productBlock.classList.contains('rvi-item')) {
        // 'Your Browsing History' carousel item
        productImage = productImage.firstElementChild;
      }
      else {
        // item in the top of page like in 'Lower Priced Items to Consider' block
        productImage = productImage.parentElement;
      }
    }
  }
  productImage.style.border = PRODUCT_IMAGE_BORDER_STYLE;

  // store reference to product image
  product.image = productImage;

  // sponsored product?
  const isSponsoredProduct = productBlock.querySelector('.s-sponsored-label-info-icon') !== null ||
                             // sponsored product in the very top of page
                             productBlock.closest('[cel_widget_id$=CreativeDesktop]') !== null;
  if (isSponsoredProduct) {
    product.isSponsored = true;
  }

  // show product number(position) on search result page only
  if (isSRP) {
    const positionSpan = toolbar.children[2];
    if (isSponsoredProduct) {
      if (isNeedNewGroupOfSponsoredProducts) {
        isNeedNewGroupOfSponsoredProducts = false;
        if (letterForCurrentGroupOfSponsoredProducts === undefined) {
          // first group
          letterForCurrentGroupOfSponsoredProducts = LETTER_FOR_FIRST_GROUP_OF_SPONSORED_PRODUCTS;
        }
        else {
          // get next letter for not first group
          letterForCurrentGroupOfSponsoredProducts = String.fromCharCode(letterForCurrentGroupOfSponsoredProducts.charCodeAt() + 1);
        }
      }

      positionSpan.textContent = letterForCurrentGroupOfSponsoredProducts + sponsoredProductNumber++;
      positionSpan.style.color = SPONSORED_PRODUCT_NUMBER_COLOR;
    }
    else {
      isNeedNewGroupOfSponsoredProducts = true;

      // skip pseudo-sponsored products
      if (productBlock.closest('[cel_widget_id=MAIN-SHOPPING_ADVISER]') === null) {
        positionSpan.textContent = organicProductNumber++;
        positionSpan.style.color = ORGANIC_PRODUCT_NUMBER_COLOR;
      }
      else {
        product.isPseudoSponsored = true;
      }
    }
  }
  products.push(product);
  updateMainPartsOfProductBlock(product);
  updateNotesPartsOfProductBlock(product);
  updateCategoryPartsOfProductBlock(product);
  updateMyAsinsPartsOfProductBlock(product);
}




// listen for toolbar and clicks of close buttons in properties dialog
document.addEventListener('click', async function({target: elem}) {
  l(elem);

  // close properties dialog
  if (elem.className === 'dialog-cancel') {
    elem.closest('dialog').close();
    return;
  }

  const parent = elem.parentElement;

  // react only to toolbar buttons
  if (!(elem.nodeName === 'IMG' && parent.classList.contains(UNIQUE_STRING))) {
    return;
  }

  asin = parent.dataset.asin;
  l(asin);
  if (asin === undefined) {
    return;
  }

  switch (elem.dataset.buttonId) {
    case 'copy':
      // copy ASIN
      try {
        await navigator.clipboard.writeText(asin);
      }
      catch(err) {
        alert('Copy error: ' + err.message);
        return;
      }

      // if ASIN was already copied, it is already marked as copied. no need to mark it again
      if (!!(asins[asin]?.isCopied)) {
        l('ASIN is already copied');
        return;
      }

      // send info about new ASIN to BG page
      chrome.runtime.sendMessage({
         id: 'set_marketplace_asin_data',
         payload: {
           asin,
           data: {
             isCopied: true,
           },
         },
      });
    break;

    case 'props':
      // show ASIN value
      asinDialog.querySelector('header span').textContent = asin;

      // show ASIN categories
      const asinCategories = asins[asin]?.categories ?? {};
      for (const inp of asinDialog.querySelectorAll('input[data-category]')) {
        inp.checked = !!asinCategories[inp.dataset.category];
      }
      asinDialog.showModal();

      // get ASIN notes
      chrome.runtime.sendMessage({
         id: 'get_asin_notes',
         payload: {
           asin,
         },
      }, function(asinNotes) {
        l(asinNotes);

        // show notes (undefined will be transfered as null that will result in empty string)
        asinDialogTextarea.value = asinNotes;
        asinDialogTextarea.select();
      });
    break;
  }
});




// save ASIN properties
function onDialogSubmit() {
  // collect categories from dialog
  const categories = Array.from(asinDialog.querySelectorAll('input[data-category]')).filter(inp => inp.checked).reduce(function(acc, inp) {
    acc[inp.dataset.category] = true;
    return acc;
  }, {});
  // save categories
  chrome.runtime.sendMessage({
     id: 'set_marketplace_asin_data',
     payload: {
       asin,
       data: {
        categories,
       },
     },
  });

  // save notes
  const notes = asinDialogTextarea.value.trim();
  chrome.runtime.sendMessage({
     id: 'set_asin_notes',
     payload: {
       asin,
       notes,
     },
  });
}




chrome.runtime.onMessage.addListener(function(msg) {
  n(); l('runtime.onMessage()', msg);

  switch (msg.id) {
    case 'marketplace_asins':
      // store new ASINs
      asins = msg.payload.asins ?? {};

      asinDialog.close();

      updateAllProductBlocks(updateMainPartsOfProductBlock);
      toggleVideoAdImages();
      updateAllProductBlocks(updateNotesPartsOfProductBlock);
      updateAllProductBlocks(updateCategoryPartsOfProductBlock);
      updateAllProductBlocks(updateMyAsinsPartsOfProductBlock);
    break;

    case 'asins_that_have_notes':
      asinsThatHaveNotes = msg.payload.asins;

      asinDialog.close();

      updateAllProductBlocks(updateNotesPartsOfProductBlock);
    break;

    case 'my_asins':
      myAsins = msg.payload.asins ?? [];

      updateAllProductBlocks(updateMyAsinsPartsOfProductBlock);
    break;

    case 'content_script_options':
      options = msg.payload.options;

      updateAllProductBlocks(updateMainPartsOfProductBlock);
      toggleVideoAdImages();
      updateAllProductBlocks(updateMyAsinsPartsOfProductBlock);
    break;

    default:
      l('message not processed');
    break;
  }
});




function updateAllProductBlocks(updateFunc) {
  for (const product of products) {
    updateFunc(product);
  }
}




function updateMainPartsOfProductBlock(product) {
  const isAsinCopied = !!(asins[product.asin]?.isCopied);

  // highlight product image with(without) copied ASIN
  let borderColor = 'transparent';
  if (isAsinCopied && options.isHighlightCopiedProducts) {
    borderColor = PRODUCT_WITH_COPIED_ASIN_IMAGE_BORDER_COLOR;
  }
  else if (!isAsinCopied && options.isHighlightNotCopiedProducts) {
    borderColor = PRODUCT_WITH_NOT_COPIED_ASIN_IMAGE_BORDER_COLOR;
  }
  product.image.style.borderColor = borderColor;

  // highlight sponsored product image
  product.image.style.outline = (options.isHighlightSponsoredProducts && product.isSponsored) ? SPONSORED_PRODUCT_IMAGE_OUTLINE_STYLE : '';

  // hide sponsored or pseudo-sponsored or copied product
  product.image.style.visibility =
    ((options.isHideSponsoredProducts && (product.isSponsored || product.isPseudoSponsored))
     ||
     (options.isHideCopiedProducts && isAsinCopied)) ? 'hidden' : '';

  // show 'copy' icon depending on whether ASIN is copied
  product.copyAsinImage.src = isAsinCopied ? successImageURL : copyImageURL;

  // show product position
  if (isSRP) {
    product.positionSpan.style.display = options.isShowProductPositions ? '' : 'none';
  }
}




function toggleVideoAdImages() {
  const style = options.isHideSponsoredProducts ? 'hidden' : '';
  for(const img of document.querySelectorAll('.sbv-product-container img')) {
    img.style.visibility = style;
  };
}




function updateNotesPartsOfProductBlock(product) {
  // show 'properties' icon depending on whether ASIN has notes
  product.propertiesImage.src = asinsThatHaveNotes.includes(product.asin) ? menuWithNotesImageURL : menuImageURL;
}




function updateCategoryPartsOfProductBlock(product) {
  // show ASIN categories
  const categories = asins[product.asin]?.categories;
  let categoriesStr;
  if (categories === undefined) {
    categoriesStr = '';
  }
  else {
    categoriesStr = CATEGORIES.filter(category => !!categories[category]).map(category => getCategoryBadgeHTML(category, `
      margin-right: 1px;
      margin-bottom: 1px;
    `)).join('');
  }
  product.categoriesSpan.innerHTML = categoriesStr;
}




function updateMyAsinsPartsOfProductBlock(product) {
  const isMyASIN = myAsins.includes(product.asin);
  // highlight product from 'My ASINs' list
  product.block.style.backgroundColor = (options.isHighlightMyProducts && isMyASIN) ? MY_PRODUCT_COLOR : '';
  // hide product from 'My ASINs' list
  product.block.style.visibility = (options.isHideMyProducts && isMyASIN) ? 'hidden' : '';
}
