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




function showConfirmDialog(msg) {
  return new Promise(function (resolve) {
    let wasConfirmed = false;
  
    confirmDialogText.textContent = msg;
    $(confirmDialog).modal();

    const primaryButton = confirmDialog.querySelector('.btn-primary');

    primaryButton.addEventListener('click', registerConfirmation);
    $(confirmDialog).one('hidden.bs.modal', function() {
      primaryButton.removeEventListener('click', registerConfirmation);

      resolve(wasConfirmed);
    });


    function registerConfirmation() {
     wasConfirmed = true;
    }
  });
}




function deduplicateArray(array) {
  return [...new Set(array)];
}
