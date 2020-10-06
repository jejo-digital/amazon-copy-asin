'use strict';

const bsrProgressDialog = document.querySelector('#bsrProgressDialog');
const bsrProgressBar = document.querySelector('#bsrProgressDialog .progress-bar');
const bsrProgressText = document.querySelector('#bsrProgressDialog p');

const deleteMarketplaceScrapedDataButton = document.querySelector('#deleteMarketplaceScrapedData');

let isNeedToClearTopAsins = true;

let timeoutIds;


function sortCategoryAsinsByBSR() {
  categoryAsins.sort(function(asinA, asinB) {
    const bsrA = asins[asinA].bsr;
    const bsrB = asins[asinB].bsr;

    const isNoBsrA = isNoBsr(bsrA);
    const isNoBsrB = isNoBsr(bsrB);

    if (isNoBsrA && isNoBsrB) {
      return 0;
    }
    else if (isNoBsrA) {
      return +1;
    }
    else if (isNoBsrB) {
      return -1;
    }
    else {
      return bsrA - bsrB;
    }
  });
}




// BSR is absent?
function isNoBsr(bsr) {
  return (bsr === undefined) || (bsr === null) || (typeof bsr === 'string');
}




document.querySelector('#obtainBsrs').addEventListener('click', async function() {
  try {
    const result = await obtainAndSaveBsrs();
    l('resolve', result);

    showSuccessToast(`${result} BSRs obtained.`);
  }
  catch(err) {
    l('reject', err);

    if (err === Msg.CANCELLED_BY_USER) {
      return;
    }

    showAlertDialog(err);
  }
});




async function obtainAndSaveBsrs() {
  return new Promise(async function(resolve, reject) {
    try {
      const amountOfObtainedBsrs = await obtainBsrs();
      l('resolve', amountOfObtainedBsrs);
      resolve(amountOfObtainedBsrs);

      if (amountOfObtainedBsrs > 0) {
        saveAsins();
      }
    }
    catch(err) {
      l('reject', err);
      reject(err);
    }
  });
}




let abortController;


function obtainBsrs() { // and parent asins
  return new Promise(function(resolve, reject) {
    if (categoryAsins.length === 0) {
      reject(Msg.ASIN_LIST_IS_EMPTY);
      return;
    }

    const asinsToProcess = categoryAsins.filter(asin => asins[asin].bsr === undefined);
    l(asinsToProcess);

    if (asinsToProcess.length === 0) {
      reject(Msg.ALL_BSRS_ALREADY_OBTAINED);
      return;
    }

    bsrProgressBar.style.width = '0%';
    bsrProgressText.textContent = '0/' + asinsToProcess.length;
    $(bsrProgressDialog).modal();

    timeoutIds = [];
    let amountOfProcessedAsins = 0;
    let amountOfObtainedBsrs = 0;
    abortController = new AbortController();
    abortController.signal.onabort = function(event) {
      l('onabort', event);
      reject(Msg.CANCELLED_BY_USER);

      // restore ASINs backup
      asins = asinsBackup;
      sortCategoryAsinsByBSR();
      showCategoryAsins();
    };

    // backup ASINs
    const asinsBackup = JSON.parse(JSON.stringify(asins));

    for (let i = 0; i < asinsToProcess.length; ++i) {
      timeoutIds.push(setTimeout(async function() {
        const asin = asinsToProcess[i];
        n(); l('before fetch()...', i, asin)

        let response;
        try {
          response = await fetch(getAsinUrlInSelectedMarketplace(asin), {
            signal: abortController.signal,
          });
        }
        catch(err) {
          n(); l('fetch() error', err, asin);

          if (err instanceof DOMException) {
            // AbortController fired
            l('DOMException');
            return;
          }

          ++amountOfObtainedBsrs;
          asins[asin].bsr = 'Error: ' + err.message;

          sortCategoryAsinsByBSR();
          showCategoryAsins();

          updateProgress();
          checkForEndOfProcessing();
          return;
        }

        n(); l('after fetch()', i, asin);

        if (!response.ok) {
          l('!response.ok');

          ++amountOfObtainedBsrs;
          asins[asin].bsr =  'HTTP error: ' + (response.statusText || response.status);

          sortCategoryAsinsByBSR();
          showCategoryAsins();

          updateProgress();
          checkForEndOfProcessing();
          return;
        }

        // scrape BSR from page text
        let html;
        l('before response.text()', i, asin);
        try {
          html = await response.text();
        }
        catch(err) {
          l('response.text() error', err, asin);

          if (err instanceof DOMException) {
            // AbortController fired
            l('DOMException');
          }
          return;

          // should check here for errors?
        }

        n(); l('after response.text()', i, asin);
        updateProgress();

        if (html.includes('captcha')) {
          reject('Error: CAPTCHA');
          abortController.abort();
          cancelPendingBsrRequests();
          $(bsrProgressDialog).modal('hide');
          return;
        }

        // scrape parent asin
        const parentAsin = html.match(/"parent_asin":"(\w+)"/)?.[1] ?? null;
        l(parentAsin);
        asins[asin].parentAsin = parentAsin;

        // scrape BSR
        let bsr = html.match(/>[^>]+\(<a href=['"]\/gp\/bestsellers/s)?.[0] ?? null;
        l(bsr);
        if (bsr !== null) {
          // BSR is present on page
          bsr = bsr.replace(/\D/g, '');
          l(bsr);
          bsr = Number.parseInt(bsr);
        }

        ++amountOfObtainedBsrs;

        asins[asin].bsr = bsr;

        sortCategoryAsinsByBSR();
        showCategoryAsins();

        checkForEndOfProcessing();


        function updateProgress() {
          ++amountOfProcessedAsins;
          l('updateProgress()', amountOfProcessedAsins, i);
          bsrProgressBar.style.width = amountOfProcessedAsins / asinsToProcess.length * 100  + '%';
          bsrProgressText.textContent = amountOfProcessedAsins + '/' + asinsToProcess.length;
        }

      
      }, i * SCRAPE_REQUESTS_INTERVAL)); // setTimeout
    } // for


    function checkForEndOfProcessing() {
      l('checkForEndOfProcessing()', amountOfProcessedAsins, asinsToProcess.length);

      if (amountOfProcessedAsins === asinsToProcess.length) {
        // finish after small delay
        setTimeout(function() {
          l('real end');
          $(bsrProgressDialog).modal('hide');
          resolve(amountOfObtainedBsrs);
        }, 300);
        timeoutIds = [];
        l('end');
      }
    }

  
  }); // Promise
};




// cancelling
bsrProgressDialog.querySelector('button').addEventListener('click', function() {
  l('cancel');

  abortController.abort();
  cancelPendingBsrRequests();
});




function cancelPendingBsrRequests() {
  timeoutIds.forEach(id => clearTimeout(id));
  timeoutIds = [];
}




deleteMarketplaceScrapedDataButton.addEventListener('click', async function() {
  if (!await showConfirmDialog(`ALL scraped data for ASINs in selected marketplace ${(selectedCategory !== NO_CATEGORY) ? 'and category ' : ''}will be deleted. Proceed?`)) {
    return;
  }

  deleteScrapedDataFromCategoryAsins();
  saveAsins();
});





function detectTopAsins() {
  l('detectTopAsins()');

  clearTopAsins();

  const uniqueParentAsins = new Set();
  for (let i = 0; i < categoryAsins.length; ++i) {

    if (uniqueParentAsins.size === TOP_ASINS_AMOUNT) {
      // enough ASINs
      break;
    }

    const asin = categoryAsins[i];
    const asinObj = asins[asin];
    const bsr = asinObj.bsr;
    const parentAsin = asinObj.parentAsin;
    l(EOL); l(asin, bsr, parentAsin);

    if (isNoBsr(bsr)) {
      // we reached group of ASINs in the end that don't have BSR, no need to go further
      break;
    }

    // parent ASIN or main ASIN if parent ASIN is absent
    const resultAsin = parentAsin ?? asin;
    l(resultAsin);

    if (uniqueParentAsins.has(resultAsin)) {
      // skip not unique result ASIN
      topAsins[asin] = null;
      continue;
    }

    // store result ASIN
    uniqueParentAsins.add(resultAsin);
    topAsins[asin] = resultAsin;
  }

  updateOtherPopupsWithTopAsins();
}




function getTopParentAsins() {
  const result = [];
  for (const asin in topAsins) {
    const parentAsin = topAsins[asin];
    if (parentAsin !== null) {
      result.push(parentAsin);
    }
  }
  return result;
}




function deleteScrapedDataFromCategoryAsins() {
  l('deleteScrapedDataFromCategoryAsins()', selectedCategory);

  clearTopAsins();
  updateOtherPopupsWithTopAsins();

  if (selectedCategory === NO_CATEGORY) {
    // delete properties from all ASINs
    for (const asin in asins) {
      deleteScrapedDataFromAsin(asin);
    }
  }
  else {
    // delete properties from ASINs in selected category
    for (const asin of categoryAsins) {
      deleteScrapedDataFromAsin(asin);
    }
  }


  function deleteScrapedDataFromAsin(asin) {
    const asinObj = asins[asin];
    delete asinObj.bsr;
    delete asinObj.parentAsin;
    delete asinObj.inTop;
  }
}




function clearTopAsins() {
  topAsins = {};
}




function updateOtherPopupsWithTopAsins() {
  chrome.runtime.sendMessage({
    id: 'top_asins',
    payload: {
      asins: topAsins,
      marketplace: selectedMarketplace,
      category: selectedCategory,
    },
  });
}
