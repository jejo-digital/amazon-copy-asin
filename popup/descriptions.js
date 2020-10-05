'use strict';

const categoriesDialog = document.querySelector('#categoriesDialog');
const categoriesDialogTableBody = categoriesDialog.querySelector('tbody');

document.querySelector('#editCategories').addEventListener('click', function() {
  updateCategoryDescriptionsInDialog();
  $('#categoriesDialog').modal();
});




categoriesDialog.querySelector('form').addEventListener('submit', function(event) {
  event.preventDefault();

  const categoryDescriptions = Array.from(categoriesDialogTableBody.rows).reduce(function(acc, row) {
    const val = row.querySelector('input').value.trim();
    if (val.length > 0) {
      acc[CATEGORY_NAMES[row.sectionRowIndex]] = val;
    }
    return acc;
  }, {});
  l(categoryDescriptions);

  port.postMessage({
    id: 'set_category_descriptions',
    payload: {
      categoryDescriptions,
    },
  });

  $('#categoriesDialog').modal('hide');
});




// show category descriptions in table from main page
function updateCategoryDescriptionsInTable() {
  for (const row of categoriesTableBody.rows) {
    const categoryName = CATEGORY_NAMES[row.sectionRowIndex];
    row.querySelector('span:last-child').textContent = categoryDescriptions[categoryName] ?? categoryName;
  }
}



// show category descriptions in table from Categories dialog
function updateCategoryDescriptionsInDialog() {
  for (const row of categoriesDialogTableBody.rows) {
    row.querySelector('input').value = categoryDescriptions[CATEGORY_NAMES[row.sectionRowIndex]] ?? '';
  }
}
