'use strict';

const TOP_ASINS_AMOUNT = 10;

const successCopyToast = document.querySelector('#successCopyToast');
const copyTopButton = document.querySelector('#copyTop');


// copy as comma separated
document.querySelector('#copyCommaSeparated').addEventListener('click', function() {
  copyAsinsToClipboard(categoryAsins, ',');
});




// copy top ASINS
copyTopButton.value += TOP_ASINS_AMOUNT;
copyTopButton.addEventListener('click', function() {
  const currBsrs = bsrs[selectedMarketplace];
  if (currBsrs === undefined) {
    showAlertDialog('No BSR data for marketplace.');
    return;
  }

  const asinsToCopy = new Map();
  for (let i = 0; i < categoryAsins.length; ++i) {
    const row = asinsTableBody.rows[i];

    if (asinsToCopy.size === TOP_ASINS_AMOUNT) {
      // enough ASINs
      break;
    }

    const asin = categoryAsins[i];
    const bsr = currBsrs[asin];
    l(asin, bsr);

    if (bsr === undefined) {
      // we reached group of ASINs in the end that don't have BSR, no need to go further
      break;
    }

    if (asinsToCopy.has(bsr)) {
      // skip ASIN with not unique BSR
      row.classList.add('bg-warning');
      continue;
    }

    // store ASIN with unique BSR
    row.classList.add('bg-success');
    asinsToCopy.set(bsr, asin);
  }

  l(asinsToCopy);
  const arrayOfAsinsToCopy = [...asinsToCopy.values()];
  l(arrayOfAsinsToCopy);
  copyAsinsToClipboard(arrayOfAsinsToCopy, EOL);
});




async function copyAsinsToClipboard(asins, separator) {
  if (asins.length === 0) {
    showAlertDialog('Nothing to copy.');
    return;
  }

  const asinsText = asins.join(separator);
  try {
    await navigator.clipboard.writeText(asinsText);
  
    successCopyToast.querySelector('span').textContent = asins.length;
    $(successCopyToast).toast('show');
  }
  catch(err) {
    showAlertDialog('Copy error: ' + err.message);
  }
}
