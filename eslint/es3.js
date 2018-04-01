'use strict';

module.exports = {
  root: true,
  extends: ['../node_modules/sanctuary-style/eslint-es3.json'],
  rules: {
    'func-call-spacing': ['off'],
    'indent': require ('./rules/indent'),
    'no-unexpected-multiline': ['off'],
  },
};
