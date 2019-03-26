'use strict';

const fs = require ('fs');
const path = require ('path');
const vm = require ('vm');

const version = (require ('../package.json')).version;
const throws = require ('./internal/throws');


suite ('NODE_ENV', () => {

  const source = fs.readFileSync (path.join (__dirname, '..', 'index.js'), 'utf8');

  const invalid = new TypeError (`Invalid value

NullaryType :: String -> String -> Array Type -> (Any -> Boolean) -> Type
               ^^^^^^
                 1

1)  null :: Null

The value at position 1 is not a member of ‘String’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#String for information about the String type.
`);

  test ('typeof process === "undefined"', () => {
    const context = {
      module: {exports: {}},
      require: require,
    };
    vm.runInNewContext (source, context);

    throws (() => { context.module.exports.NullaryType (null); }) (invalid);
  });

  test ('typeof process !== "undefined" && process == null', () => {
    const context = {
      module: {exports: {}},
      process: null,
      require: require,
    };
    vm.runInNewContext (source, context);

    throws (() => { context.module.exports.NullaryType (null); }) (invalid);
  });

  test ('typeof process !== "undefined" && process != null && process.env == null', () => {
    const context = {
      module: {exports: {}},
      process: {},
      require: require,
    };
    vm.runInNewContext (source, context);

    throws (() => { context.module.exports.NullaryType (null); }) (invalid);
  });

  test ('typeof process !== "undefined" && process != null && process.env != null && process.env.NODE_ENV == null', () => {
    const context = {
      module: {exports: {}},
      process: {env: {}},
      require: require,
    };
    vm.runInNewContext (source, context);

    throws (() => { context.module.exports.NullaryType (null); }) (invalid);
  });

  test ('typeof process !== "undefined" && process != null && process.env != null && process.env.NODE_ENV !== "production"', () => {
    const context = {
      module: {exports: {}},
      process: {env: {NODE_ENV: 'XXX'}},
      require: require,
    };
    vm.runInNewContext (source, context);

    throws (() => { context.module.exports.NullaryType (null); }) (invalid);
  });

  test ('typeof process !== "undefined" && process != null && process.env != null && process.env.NODE_ENV === "production"', () => {
    const context = {
      module: {exports: {}},
      process: {env: {NODE_ENV: 'production'}},
      require: require,
    };
    vm.runInNewContext (source, context);

    context.module.exports.NullaryType (null);
  });

});
