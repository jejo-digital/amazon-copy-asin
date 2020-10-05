'use strict';

document.querySelector('#editMyAsins').addEventListener('click', async function() {
  const asinsText = await showTextStringsDialog('My ASINs', myAsins);
  l(asinsText);
  if (asinsText === null) {
    return;
  }

  const newAsins = sanitizeTextToArray(asinsText);
  l(newAsins);

  port.postMessage({
    id: 'set_my_asins',
    payload: {
      asins: newAsins,
    },
  });
});




function updateMyAsins(newMyAsins) {
  l('updateMyAsins()', newMyAsins);

  myAsins = newMyAsins;
  if (categoryAsins === undefined) {
    // no ASINS yet
    return;
  }
  showCategoryAsins();
}
