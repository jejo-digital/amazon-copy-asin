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
