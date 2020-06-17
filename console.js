'use strict';

const l = console.log;
const e = console.error;
const nl = console.log.bind(null, '\n');
const cg = function(...args) {
  console.groupEnd();
  console.group(...args);
};
