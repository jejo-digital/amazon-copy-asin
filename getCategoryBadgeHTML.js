'use strict';

function getCategoryBadgeHTML(category, additionalStyles) {
  return `
    <span style="
      width: 15px;
      height: 15px;
      background-color: ${category};
      border-radius: 50px;
      ${additionalStyles}
    ">
    </span>
  `;
}
