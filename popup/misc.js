'use strict';

// removes spaces, tabs and empty lines
function clearText(text) {
  return text.replace(/ |\t/g, '').replace(new RegExp(EOL + '{2,}', 'g'), EOL).trim();
}




function sanitizeTextToArray(text) {
  const clearedText = clearText(text);
  return (clearedText === '') ? [] : deduplicateArray(clearedText.split(EOL));
}




function getAsinUrlInSelectedMarketplace(asin) {
  return AMAZON_URL_PREFIX + selectedMarketplace + '/dp/' + asin;
}




function showSuccessToast(msg) {
  successToast.firstElementChild.textContent = msg;
  $(successToast).toast('show');
}




function deduplicateArray(array) {
  return [...new Set(array)];
}




function getTopAsins() {
  l('getTopAsins()');

  const topAsins = new Map();

  for (let i = 0; i < categoryAsins.length; ++i) {
    const row = asinsTableBody.rows[i];

    if (topAsins.size === TOP_ASINS_AMOUNT) {
      // enough ASINs
      break;
    }

    const asin = categoryAsins[i];
    const bsr = asins[asin].bsr;
    d(asin, bsr);

    if (isNoBsr(bsr)) {
      // we reached group of ASINs in the end that don't have BSR, no need to go further
      break;
    }

    if (topAsins.has(bsr)) {
      // skip ASIN with not unique BSR
      row.classList.add('bg-warning');
      continue;
    }

    // store parent ASIN(or main ASIN if it is absent) with unique BSR
    row.classList.add('bg-success');
    topAsins.set(bsr, asins[asin].parentAsin ?? asin);
  }

  d(topAsins);
  const arrayOfTopAsins = [...topAsins.values()];
  d(arrayOfTopAsins);
  return arrayOfTopAsins;
}
