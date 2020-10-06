'use strict';

const openTopButton = document.querySelector('#openTopParent');

openTopButton.value += TOP_ASINS_AMOUNT;


// open selected ASINs
document.querySelector('#openSelected').addEventListener('click', function() {
  const selection = document.getSelection();
  if (selection.toString().trim() === '') {
    showAlertDialog('No selection.');
    return;
  }
  l(selection, selection.rangeCount, selection.toString());

  const selectedAsins = [];

  const range = selection.getRangeAt(0);
  l(range);

  if (!asinsTableBody.contains(range.commonAncestorContainer)) {
    showAlertDialog('Something bad selected.');
    return;
  }

  if (range.startContainer === range.endContainer) {
    // selection inside one table cell
    const tr = range.commonAncestorContainer.parentElement.parentElement;
    const asin = categoryAsins[tr.sectionRowIndex];
    selectedAsins.push(asin);
  }
  else if (range.commonAncestorContainer.nodeName === 'TR') {
    // selection of several table cells in one row
    const tr = range.commonAncestorContainer;
    const asin = categoryAsins[tr.sectionRowIndex];
    selectedAsins.push(asin);
  }
  else {
    // selection of several rows
    const startRow = range.startContainer.parentElement.closest('tr');
    const endRow = range.endContainer.parentElement.closest('tr');
    l(startRow, endRow);
    for (let rowIndex = startRow.sectionRowIndex; rowIndex <= endRow.sectionRowIndex; ++rowIndex) {
      selectedAsins.push(categoryAsins[rowIndex]);
    }
  }
  l(selectedAsins);

  createAsinTabs(selectedAsins);
});




// open top ASINs
openTopButton.addEventListener('click', async function() {
  try {
    const result = await obtainAndSaveBsrs();
    l('resolve', result);
  }
  catch(err) {
    l('reject', err);

    if (err === Msg.CANCELLED_BY_USER) {
      return;
    }

    if (err !== Msg.ALL_BSRS_ALREADY_OBTAINED) {
      showAlertDialog(err);
      return;
    }
  }

  detectTopAsins();
  isNeedToClearTopAsins = false;
  createAsinTabs(getTopParentAsins());
});




function createAsinTabs(asins) {
  for (const asin of asins) {
    chrome.tabs.create({
      url: getAsinUrlInSelectedMarketplace(asin),
      active: false,
    });
  }
}
