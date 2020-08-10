'use strict';


document.querySelector('#edit').addEventListener('click', function() {
  asinsTextarea.value = asins.join(EOL);
  $(asinsDialog).modal();
  asinsTextarea.select();
});



asinsDialog.querySelector('.btn-primary').addEventListener('click', function() {
  let asins = clearText(asinsTextarea.value);
  asins = (asins === '') ? [] : asins.split(EOL);
  l(asins);
  port.postMessage({
    id: 'set_asins_for_marketplace',
    payload: {
      asins,
      marketplace: selectedMarketplace,
    },
  });

  $(asinsDialog).modal('hide');
});




$(asinsDialog).on('shown.bs.modal', function() {
  asinsTextarea.focus();
});




$(asinsDialog).on('hide.bs.modal', function() {
  asinsTextarea.value = '';
});
