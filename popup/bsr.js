'use strict';

const bsrProgressDialog = document.querySelector('#bsrProgressDialog');
const bsrProgressBar = document.querySelector('#bsrProgressDialog .progress-bar');
const bsrProgressText = document.querySelector('#bsrProgressDialog p');

const clearMarketplaceBsrsButton = document.querySelector('#clearMarketplaceBsrs');

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


function obtainBsrs() {
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
    abortController.signal.onabort = function() {
      l('onabort', arguments);
      reject(Msg.CANCELLED_BY_USER);
    };

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

      
      }, i * options.bsrRequestsInterval)); // setTimeout
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




clearMarketplaceBsrsButton.addEventListener('click', async function() {
  const isCategorySelected = selectedCategory !== '';

  if (!await showConfirmDialog(`ALL BSRs in selected marketplace ${isCategorySelected ? 'and category ' : ''}will be deleted. Proceed?`)) {
    return;
  }

  if (isCategorySelected) {
    // delete BSRs from ASINs in selected category
    for (const asin of categoryAsins) {
      l(asin);
      delete asins[asin].bsr;
    }
  }
  else {
    // delete BSRs from all ASINs
    for (const asin in asins) {
      delete asins[asin].bsr;
    }
  }

  saveAsins();
});
