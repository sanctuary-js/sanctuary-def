'use strict';

module.exports = {
  root: true,
  extends: ['../node_modules/sanctuary-style/eslint-es6.json'],
  env: {node: true},
  rules: {
    'func-call-spacing': ['error', 'always', {allowNewlines: true}],
    'indent': require ('./rules/indent'),
    'no-extra-parens': ['off'],
    'no-unexpected-multiline': ['off'],
  },
  overrides: [
    {
      files: ['*.md'],
      plugins: ['markdown'],
      env: {node: false},
      rules: {
        'max-len': ['off'],
        'no-undef': ['off'],
        'no-unused-vars': ['off'],
        'object-shorthand': ['error', 'always'],
        'strict': ['off'],
      },
    },
  ],
};
