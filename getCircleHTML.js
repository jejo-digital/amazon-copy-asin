'use strict';

function getCircleHTML(color, {styles = '', title = ''} = {}) {
  return `
    <span title="${title}" style="
      width: 15px;
      height: 15px;
      background-color: ${color};
      border-radius: 50px;
      ${styles}
    ">
    </span>
  `;
}
