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

    // store ASIN with unique BSR
    row.classList.add('bg-success');
    topAsins.set(bsr, asin);
  }

  d(topAsins);
  const arrayOfTopAsins = [...topAsins.values()];
  d(arrayOfTopAsins);
  return arrayOfTopAsins;
}
