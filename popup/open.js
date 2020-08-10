'use strict';


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
    const startRow = range.startContainer.parentElement.parentElement;
    const endRow = range.endContainer.parentElement.parentElement;
    l(startRow, endRow);
    for (let rowIndex = startRow.sectionRowIndex; rowIndex <= endRow.sectionRowIndex; ++rowIndex) {
      selectedAsins.push(categoryAsins[rowIndex]);
    }
  }
  l(selectedAsins);

  // create tabs with selected ASINs
  for (const asin of selectedAsins) {
    chrome.tabs.create({url: getAsinUrlInSelectedMarketplace(asin), active: false});
  }
});
