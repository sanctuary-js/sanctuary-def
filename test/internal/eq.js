'use strict';

const assert = require ('assert');

const Z = require ('sanctuary-type-classes');


//    eq :: a -> b -> Undefined !
module.exports = function eq(actual) {
  assert.strictEqual (arguments.length, eq.length);
  return function eq$1(expected) {
    assert.strictEqual (arguments.length, eq$1.length);
    assert.strictEqual (Z.toString (actual), Z.toString (expected));
    assert.strictEqual (Z.equals (actual, expected), true);
  };
};
