'use strict';


const bsrProgressDialog = document.querySelector('#bsrProgressDialog');
const bsrProgressBar = document.querySelector('#bsrProgressDialog .progress-bar');
const bsrProgressText = document.querySelector('#bsrProgressDialog p');

let timeoutIds;
let isBsrObtainingCancelled;


function sortAsinsByBSR() {
  const currBsrs = bsrs[selectedMarketplace];
  if (currBsrs === undefined) {
    l('no BSR data for marketplace');
    return;
  }

  categoryAsins.sort(function(a, b) {
    const bsrA = currBsrs[a];
    const bsrB = currBsrs[b];

    if (bsrA === undefined && bsrB === undefined) {
      return 0;
    }
    else if (bsrA === undefined) {
      return +1;
    }
    else if (bsrB === undefined) {
      return -1;
    }
    else {
      return currBsrs[a] - currBsrs[b];
    }
  });
}




document.querySelector('#obtainBsrs').addEventListener('click', function() {
  const asinsToProcess = categoryAsins.filter(asin => bsrs[selectedMarketplace]?.[asin] === undefined);
  l(asinsToProcess);

  if (asinsToProcess.length === 0) {
    showAlertDialog('All BSRs obtained.');
    return;
  }

  bsrProgressBar.style.width = '0%';
  bsrProgressText.textContent = '0/' + asinsToProcess.length;
  $(bsrProgressDialog).modal();

  timeoutIds = [];
  isBsrObtainingCancelled = false;

  let amountOfProcessedAsins = 0;

  // init place for storing BSRs
  if (bsrs[selectedMarketplace] === undefined) {
    bsrs[selectedMarketplace] = {};
  }

  for (let i = 0; i < asinsToProcess.length; ++i) {
    timeoutIds.push(setTimeout(async function() {
      const asin = asinsToProcess[i];
      l('fetch()...', i, asin)

      let response;
      try {
        response = await fetch(getAsinUrlInSelectedMarketplace(asin));
      }
      catch(err) {
        l('fetch() error', err, asin);
        updateProgress();
        checkForEndOfProcessing();
        return;
      }
      l(response);
      const html = await response.text();
      l('after fetch()', i, asin);

      if (isBsrObtainingCancelled) {
        l('progress cancelled');
        return;
      }

      updateProgress();

      if (!response.ok) {
        l('!response.ok');
        checkForEndOfProcessing();
        return;
      }

      // scrape BSR from page text
      let bsr = html.match(/>[^>]+\(<a href=['"]\/gp\/bestsellers/s)?.[0];
      l(bsr);
      if (bsr === undefined) {
        if (html.includes('captcha')) {
          cancelPendingBsrRequests();
          $(bsrProgressDialog).modal('hide');
          showAlertDialog('CAPTCHA');
          return;
        }
        // BSR is absent
        checkForEndOfProcessing();
        return;
      }

      bsr = bsr.replace(/\D/g, '');
      l(bsr);
      bsr = Number.parseInt(bsr);

      bsrs[selectedMarketplace][asin] = bsr;
      sortAsinsByBSR();
      showAsins();

      checkForEndOfProcessing();


      function updateProgress() {
        ++amountOfProcessedAsins;
        l('updateProgress()', amountOfProcessedAsins, i);
        bsrProgressBar.style.width = amountOfProcessedAsins / asinsToProcess.length * 100  + '%';
        bsrProgressText.textContent = amountOfProcessedAsins + '/' + asinsToProcess.length;
      }


      function checkForEndOfProcessing() {
        if (amountOfProcessedAsins === asinsToProcess.length) {
          // close dialog after small delay
          setTimeout(() => $(bsrProgressDialog).modal('hide'), 300);
          timeoutIds = [];
        }
      }


    }, i * options.bsrRequestsInterval));
  } // for
});




// cancelling
bsrProgressDialog.querySelector('button').addEventListener('click', function() {
  isBsrObtainingCancelled = true;
  cancelPendingBsrRequests();
});




function cancelPendingBsrRequests() {
  timeoutIds.forEach(id => clearTimeout(id));
  timeoutIds = [];
}
