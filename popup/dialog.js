'use strict';

const alertDialog = document.querySelector('#alertDialog');
const alertDialogText = alertDialog.querySelector('h6');

const confirmDialog = document.querySelector('#confirmDialog');
const confirmDialogText = confirmDialog.querySelector('h6');

const textStringsDialog = document.querySelector('#textStringsDialog');
const textStringsDialogTextarea = textStringsDialog.querySelector('textarea');


function showAlertDialog(msg) {
  alertDialogText.textContent = msg;
  $(alertDialog).modal();
}




function showConfirmDialog(msg) {
  return new Promise(function(resolve) {
    let wasConfirmed = false;
  
    confirmDialogText.textContent = msg;
    $(confirmDialog).modal();

    const primaryButton = confirmDialog.querySelector('.btn-primary');

    primaryButton.addEventListener('click', registerConfirmation);
    $(confirmDialog).one('hide.bs.modal', function() {
      primaryButton.removeEventListener('click', registerConfirmation);
      resolve(wasConfirmed);
    });


    function registerConfirmation() {
     wasConfirmed = true;
    }


  });
}




function showTextStringsDialog(textStrings) {
  return new Promise(function(resolve) {
    let result = null;

    textStringsDialogTextarea.value = textStrings.join(EOL);
    $(textStringsDialog).modal();
    textStringsDialogTextarea.select();

    const primaryButton = textStringsDialog.querySelector('.btn-primary');

    primaryButton.addEventListener('click', registerPositiveAction);
    $(textStringsDialog).one('hide.bs.modal', function() {
      primaryButton.removeEventListener('click', registerPositiveAction);
      resolve(result);
      textStringsDialogTextarea.value = '';
    });


    function registerPositiveAction() {
     result = textStringsDialogTextarea.value;
    }


    $(textStringsDialog).one('shown.bs.modal', function() {
      textStringsDialogTextarea.focus();
    });
  });
}
