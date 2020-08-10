'use strict';


// removes spaces and empty lines
function clearText(text) {
  return text.replace(/ /g, '').replace(/\n{2,}/g, '\n').trim();
}




function getAsinUrlInSelectedMarketplace(asin) {
  return AMAZON_URL_PREFIX + selectedMarketplace + '/dp/' + asin;
}




function showAlertDialog(msg) {
  alertDialogText.textContent = msg;
  $(alertDialog).modal();
}



// todo Promise
function showConfirmDialog(msg, callback) {
  confirmDialogText.textContent = msg;
  $(confirmDialog).modal();

  const primaryButton = confirmDialog.querySelector('.btn-primary');

  primaryButton.addEventListener('click', callback);
  $(confirmDialog).one('hidden.bs.modal', function() {
    primaryButton.removeEventListener('click', callback);
  });
}
