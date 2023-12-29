import {throws} from 'assert';
import fs from 'fs';
import module from 'module';
import path from 'path';
import url from 'url';
import vm from 'vm';


const require = module.createRequire (import.meta.url);
const {version} = require ('../package.json');


suite ('NODE_ENV', () => {

  const source = fs.readFileSync (path.join (url.fileURLToPath (import.meta.url), '..', '..', 'index.js'), 'utf8');

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

    throws (() => { context.module.exports.NullaryType (null); }, invalid);
  });

  test ('typeof process !== "undefined" && process == null', () => {
    const context = {
      module: {exports: {}},
      process: null,
      require: require,
    };
    vm.runInNewContext (source, context);

    throws (() => { context.module.exports.NullaryType (null); }, invalid);
  });

  test ('typeof process !== "undefined" && process != null && process.env == null', () => {
    const context = {
      module: {exports: {}},
      process: {},
      require: require,
    };
    vm.runInNewContext (source, context);

    throws (() => { context.module.exports.NullaryType (null); }, invalid);
  });

  test ('typeof process !== "undefined" && process != null && process.env != null && process.env.NODE_ENV == null', () => {
    const context = {
      module: {exports: {}},
      process: {env: {}},
      require: require,
    };
    vm.runInNewContext (source, context);

    throws (() => { context.module.exports.NullaryType (null); }, invalid);
  });

  test ('typeof process !== "undefined" && process != null && process.env != null && process.env.NODE_ENV !== "production"', () => {
    const context = {
      module: {exports: {}},
      process: {env: {NODE_ENV: 'XXX'}},
      require: require,
    };
    vm.runInNewContext (source, context);

    throws (() => { context.module.exports.NullaryType (null); }, invalid);
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
