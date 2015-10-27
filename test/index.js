'use strict';

/* global describe, it */

var assert = require('assert');
var vm = require('vm');

var R = require('ramda');

var def = require('..');


var eq = function(actual, expected) {
  assert.strictEqual(arguments.length, 2);
  assert.strictEqual(R.toString(actual), R.toString(expected));
};

//  errorEq :: TypeRep a -> String -> Error -> Boolean
var errorEq = R.curry(function(type, message, error) {
  return error.constructor === type && error.message === message;
});


var a     = def.types.a;
var b     = def.types.b;

var list  = R.unapply(R.identity);

var $0    = def('$0', {}, [], list);
var $1    = def('$1', {}, [a], list);
var $2    = def('$2', {}, [a, a], list);
var $3    = def('$3', {}, [a, a, a], list);
var $4    = def('$4', {}, [a, a, a, a], list);
var $5    = def('$5', {}, [a, a, a, a, a], list);
var $6    = def('$6', {}, [a, a, a, a, a, a], list);
var $7    = def('$7', {}, [a, a, a, a, a, a, a], list);
var $8    = def('$8', {}, [a, a, a, a, a, a, a, a], list);
var $9    = def('$9', {}, [a, a, a, a, a, a, a, a, a], list);
var $10   = def('$10', {}, [a, a, a, a, a, a, a, a, a, a], list);


describe('def', function() {

  it('returns a function whose length matches that of given list', function() {
    eq($0.length, 0);
    eq($1.length, 1);
    eq($2.length, 2);
    eq($3.length, 3);
    eq($4.length, 4);
    eq($5.length, 5);
    eq($6.length, 6);
    eq($7.length, 7);
    eq($8.length, 8);
    eq($9.length, 9);
    eq($10.length, 10);

    assert.throws(function() { def('f', {}, R.times(R.always(a), 11), list); },
                  errorEq(RangeError,
                          '‘def’ cannot define a function ' +
                          'with arity greater than ten'));
  });

  it('returns a curried function', function() {
    eq($2(1).length, 1);
    eq($3(1).length, 2);
    eq($4(1).length, 3);
    eq($5(1).length, 4);
    eq($6(1).length, 5);
    eq($7(1).length, 6);
    eq($8(1).length, 7);
    eq($9(1).length, 8);
    eq($10(1).length, 9);

    eq($3(1)(2).length, 1);
    eq($4(1)(2).length, 2);
    eq($5(1)(2).length, 3);
    eq($6(1)(2).length, 4);
    eq($7(1)(2).length, 5);
    eq($8(1)(2).length, 6);
    eq($9(1)(2).length, 7);
    eq($10(1)(2).length, 8);

    eq($4(1)(2)(3).length, 1);
    eq($5(1)(2)(3).length, 2);
    eq($6(1)(2)(3).length, 3);
    eq($7(1)(2)(3).length, 4);
    eq($8(1)(2)(3).length, 5);
    eq($9(1)(2)(3).length, 6);
    eq($10(1)(2)(3).length, 7);

    eq($5(1)(2)(3)(4).length, 1);
    eq($6(1)(2)(3)(4).length, 2);
    eq($7(1)(2)(3)(4).length, 3);
    eq($8(1)(2)(3)(4).length, 4);
    eq($9(1)(2)(3)(4).length, 5);
    eq($10(1)(2)(3)(4).length, 6);

    eq($6(1)(2)(3)(4)(5).length, 1);
    eq($7(1)(2)(3)(4)(5).length, 2);
    eq($8(1)(2)(3)(4)(5).length, 3);
    eq($9(1)(2)(3)(4)(5).length, 4);
    eq($10(1)(2)(3)(4)(5).length, 5);

    eq($7(1)(2)(3)(4)(5)(6).length, 1);
    eq($8(1)(2)(3)(4)(5)(6).length, 2);
    eq($9(1)(2)(3)(4)(5)(6).length, 3);
    eq($10(1)(2)(3)(4)(5)(6).length, 4);

    eq($8(1)(2)(3)(4)(5)(6)(7).length, 1);
    eq($9(1)(2)(3)(4)(5)(6)(7).length, 2);
    eq($10(1)(2)(3)(4)(5)(6)(7).length, 3);

    eq($9(1)(2)(3)(4)(5)(6)(7)(8).length, 1);
    eq($10(1)(2)(3)(4)(5)(6)(7)(8).length, 2);

    eq($10(1)(2)(3)(4)(5)(6)(7)(8)(9).length, 1);

    eq($0(), []);
    eq($1(1), [1]);
    eq($2(1, 2), [1, 2]);
    eq($3(1, 2, 3), [1, 2, 3]);
    eq($4(1, 2, 3, 4), [1, 2, 3, 4]);
    eq($5(1, 2, 3, 4, 5), [1, 2, 3, 4, 5]);
    eq($6(1, 2, 3, 4, 5, 6), [1, 2, 3, 4, 5, 6]);
    eq($7(1, 2, 3, 4, 5, 6, 7), [1, 2, 3, 4, 5, 6, 7]);
    eq($8(1, 2, 3, 4, 5, 6, 7, 8), [1, 2, 3, 4, 5, 6, 7, 8]);
    eq($9(1, 2, 3, 4, 5, 6, 7, 8, 9), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
    eq($10(1, 2, 3, 4, 5, 6, 7, 8, 9, 10), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('returns a function which accepts placeholders', function() {
    //  f :: Boolean -> Number -> String -> (Boolean, Number, String)
    var f = def('f', {}, [Boolean, Number, String], list);

    eq(f(R.__, R.__, '')(R.__, 0)(false), [false, 0, '']);

    assert.throws(function() { f(R.__, [1, 2, 3]); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type Number ' +
                          'as its second argument; received [1, 2, 3]'));

    assert.throws(function() { f(R.__, R.__, [1, 2, 3]); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type String ' +
                          'as its third argument; received [1, 2, 3]'));

    assert.throws(function() { f(R.__, 0, '')([1, 2, 3]); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type Boolean ' +
                          'as its first argument; received [1, 2, 3]'));
  });

  it('returns a function which throws if given too many args', function() {
    assert.throws(function() { $0(1); },
                  errorEq(TypeError,
                          '‘$0’ requires zero arguments; ' +
                          'received one argument'));

    assert.throws(function() { $1(1, 2); },
                  errorEq(TypeError,
                          '‘$1’ requires one argument; ' +
                          'received two arguments'));

    assert.throws(function() { $2(1, 2, 3); },
                  errorEq(TypeError,
                          '‘$2’ requires two arguments; ' +
                          'received three arguments'));

    assert.throws(function() { $3(1, 2, 3, 4); },
                  errorEq(TypeError,
                          '‘$3’ requires three arguments; ' +
                          'received four arguments'));

    assert.throws(function() { $4(1, 2, 3, 4, 5); },
                  errorEq(TypeError,
                          '‘$4’ requires four arguments; ' +
                          'received five arguments'));

    assert.throws(function() { $5(1, 2, 3, 4, 5, 6); },
                  errorEq(TypeError,
                          '‘$5’ requires five arguments; ' +
                          'received six arguments'));

    assert.throws(function() { $6(1, 2, 3, 4, 5, 6, 7); },
                  errorEq(TypeError,
                          '‘$6’ requires six arguments; ' +
                          'received seven arguments'));

    assert.throws(function() { $7(1, 2, 3, 4, 5, 6, 7, 8); },
                  errorEq(TypeError,
                          '‘$7’ requires seven arguments; ' +
                          'received eight arguments'));

    assert.throws(function() { $8(1, 2, 3, 4, 5, 6, 7, 8, 9); },
                  errorEq(TypeError,
                          '‘$8’ requires eight arguments; ' +
                          'received nine arguments'));

    assert.throws(function() { $9(1, 2, 3, 4, 5, 6, 7, 8, 9, 10); },
                  errorEq(TypeError,
                          '‘$9’ requires nine arguments; ' +
                          'received ten arguments'));

    assert.throws(function() { $10(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11); },
                  errorEq(TypeError,
                          '‘$10’ requires ten arguments; ' +
                          'received 11 arguments'));
  });

  it('returns a function which type checks its arguments', function() {
    var $1 = def('f', {}, [Number], list);
    var $2 = def('f', {}, [a, Number], list);
    var $3 = def('f', {}, [a, a, Number], list);
    var $4 = def('f', {}, [a, a, a, Number], list);
    var $5 = def('f', {}, [a, a, a, a, Number], list);
    var $6 = def('f', {}, [a, a, a, a, a, Number], list);
    var $7 = def('f', {}, [a, a, a, a, a, a, Number], list);
    var $8 = def('f', {}, [a, a, a, a, a, a, a, Number], list);
    var $9 = def('f', {}, [a, a, a, a, a, a, a, a, Number], list);
    var $10 = def('f', {}, [a, a, a, a, a, a, a, a, a, Number], list);

    assert.throws(function() { $1('X'); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type Number ' +
                          'as its first argument; received "X"'));

    assert.throws(function() { $2(1, 'X'); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type Number ' +
                          'as its second argument; received "X"'));

    assert.throws(function() { $3(1, 2, 'X'); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type Number ' +
                          'as its third argument; received "X"'));

    assert.throws(function() { $4(1, 2, 3, 'X'); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type Number ' +
                          'as its fourth argument; received "X"'));

    assert.throws(function() { $5(1, 2, 3, 4, 'X'); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type Number ' +
                          'as its fifth argument; received "X"'));

    assert.throws(function() { $6(1, 2, 3, 4, 5, 'X'); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type Number ' +
                          'as its sixth argument; received "X"'));

    assert.throws(function() { $7(1, 2, 3, 4, 5, 6, 'X'); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type Number ' +
                          'as its seventh argument; received "X"'));

    assert.throws(function() { $8(1, 2, 3, 4, 5, 6, 7, 'X'); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type Number ' +
                          'as its eighth argument; received "X"'));

    assert.throws(function() { $9(1, 2, 3, 4, 5, 6, 7, 8, 'X'); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type Number ' +
                          'as its ninth argument; received "X"'));

    assert.throws(function() { $10(1, 2, 3, 4, 5, 6, 7, 8, 9, 'X'); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type Number ' +
                          'as its tenth argument; received "X"'));
  });

  it('returns a function which fails correctly given null', function() {
    //  f :: Number -> [Number]
    var f = def('f', {}, [Number], list);

    assert.throws(function() { f(null); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type Number ' +
                          'as its first argument; received null'));
  });

  it('returns a function which fails correctly given undefined', function() {
    //  f :: Number -> [Number]
    var f = def('f', {}, [Number], list);

    assert.throws(function() { f(undefined); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type Number ' +
                          'as its first argument; received undefined'));
  });

  it('does not rely on constructor identity', function() {
    //  inc :: Number -> Number
    var inc = def('inc', {}, [Number], R.inc);

    //  length :: [a] -> Number
    var length = def('length', {}, [Array], R.length);

    eq(inc(42), 43);
    // jshint -W053
    eq(inc(new Number(42)), 43);
    // jshint +W053

    eq(length([1, 2, 3]), 3);
    eq(length(vm.runInNewContext('[1, 2, 3]')), 3);

    assert.throws(function() { inc([1, 2, 3]); },
                  errorEq(TypeError,
                          '‘inc’ requires a value of type Number ' +
                          'as its first argument; received [1, 2, 3]'));

    assert.throws(function() { length('abc'); },
                  errorEq(TypeError,
                          '‘length’ requires a value of type Array ' +
                          'as its first argument; received "abc"'));
  });

  it('supports custom type', function() {
    //  Identity :: a -> Identity a
    function Identity(x) {
      if (!(this instanceof Identity)) {
        return new Identity(x);
      }
      this.value = x;
    }

    Identity.prototype['@@type'] = 'sanctuary-def/Identity';

    Identity.prototype.toString = function() {
      return 'Identity(' + R.toString(this.value) + ')';
    };

    //  f :: Identity a -> [Identity a]
    var f = def('f', {}, [Identity], list);

    eq(f(Identity(42)), [Identity(42)]);

    assert.throws(function() { f(42); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type Identity ' +
                          'as its first argument; received 42'));

    var g = def('g', {}, [a, a], list);

    eq(g(Identity(42), Identity(99)), [Identity(42), Identity(99)]);

    assert.throws(function() { g(Identity(42), 99); },
                  errorEq(TypeError,
                          '‘g’ requires its first and second arguments to ' +
                          'be of the same type; Identity(42) and 99 are not'));

    assert.throws(function() { g(42, Identity(99)); },
                  errorEq(TypeError,
                          '‘g’ requires its first and second arguments to ' +
                          'be of the same type; 42 and Identity(99) are not'));
  });

  it('supports custom pseudotype', function() {
    var Zero = {
      name: 'Zero',
      test: R.equals(0)
    };

    //  f :: Zero -> [Zero]
    var f = def('f', {}, [Zero], list);

    eq(f(0), [0]);

    assert.throws(function() { f(1); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type Zero ' +
                          'as its first argument; received 1'));
  });

  it('supports custom pseudotype with custom error formatter', function() {
    var Zero = {
      name: 'Zero',
      test: R.equals(0),
      format: function(ctx) {
        return '‘' + ctx.name + '’ requires 0 as its ' +
               ctx.position + ' argument; received ' + ctx.argument;
      }
    };

    //  f :: Zero -> [Zero]
    var f = def('f', {}, [Zero], list);

    eq(f(0), [0]);

    assert.throws(function() { f(1); },
                  errorEq(TypeError,
                          '‘f’ requires 0 as its first argument; received 1'));
  });

  it('supports polymorphism via type variables', function() {
    //  aa :: a -> a -> (a, a)
    var aa = def('aa', {}, [a, a], list);
    //  ab :: a -> b -> (a, b)
    var ab = def('ab', {}, [a, b], list);
    //  abba :: a -> b -> b -> a -> (a, b, b, a)
    var abba = def('abba', {}, [a, b, b, a], list);

    eq(aa(0, 1), [0, 1]);
    eq(aa(1, 0), [1, 0]);
    eq(ab(0, 1), [0, 1]);
    eq(ab(1, 0), [1, 0]);
    eq(ab(0, false), [0, false]);
    eq(ab(false, 0), [false, 0]);

    assert.throws(function() { aa(0, false); },
                  errorEq(TypeError,
                          '‘aa’ requires its first and second arguments ' +
                          'to be of the same type; 0 and false are not'));

    assert.throws(function() { aa(R.__, false)(0); },
                  errorEq(TypeError,
                          '‘aa’ requires its first and second arguments ' +
                          'to be of the same type; 0 and false are not'));

    assert.throws(function() { abba(0, [], {}); },
                  errorEq(TypeError,
                          '‘abba’ requires its second and third arguments ' +
                          'to be of the same type; [] and {} are not'));

    assert.throws(function() { abba(0, [], [], ''); },
                  errorEq(TypeError,
                          '‘abba’ requires its first and fourth arguments ' +
                          'to be of the same type; 0 and "" are not'));
  });

  it('supports type class constraints', function() {
    //  Semigroup :: { name :: String, test :: a -> Boolean }
    var Semigroup = {
      name: 'Semigroup',
      test: function(x) { return x != null && typeof x.concat === 'function'; }
    };

    //  concat :: Semigroup a => a -> a -> a
    var concat = def('concat', {a: Semigroup}, [a, a], function(x, y) {
      return x.concat(y);
    });

    eq(concat([1, 2, 3], [4, 5, 6]), [1, 2, 3, 4, 5, 6]);
    eq(concat('abc', 'def'), 'abcdef');

    assert.throws(function() { concat(42); },
                  errorEq(TypeError,
                          '‘concat’ requires a Semigroup ' +
                          'as its first argument; received 42'));

    assert.throws(function() { concat(R.__, 42); },
                  errorEq(TypeError,
                          '‘concat’ requires a Semigroup ' +
                          'as its second argument; received 42'));

    assert.throws(function() { concat([], ''); },
                  errorEq(TypeError,
                          '‘concat’ requires its first and second arguments ' +
                          'to be of the same type; [] and "" are not'));

    assert.throws(function() { concat('', []); },
                  errorEq(TypeError,
                          '‘concat’ requires its first and second arguments ' +
                          'to be of the same type; "" and [] are not'));

    function Nothing() {}
    function Just(x) { this.value = x; }

    Nothing.prototype.empty = Just.prototype.empty = R.always(new Nothing());

    Nothing.prototype.or = R.identity;
    Just.prototype.or = function(maybe) { return this; };

    //  Alternative :: { name :: String, test :: a -> Boolean }
    var Alternative = {
      name: 'Alternative',
      test: function(x) {
        return x != null &&
               typeof x.empty === 'function' &&
               typeof x.or === 'function';
      }
    };

    //  or :: Alternative a => a -> a -> a
    var or = def('or', {a: Alternative}, [a, a], function(x, y) {
      return x.or(y);
    });

    eq(or(new Nothing(), new Nothing()), new Nothing());
    eq(or(new Nothing(), new Just(1)), new Just(1));
    eq(or(new Just(2), new Nothing()), new Just(2));
    eq(or(new Just(3), new Just(4)), new Just(3));

    assert.throws(function() { or([1, 2, 3]); },
                  errorEq(TypeError,
                          '‘or’ requires an Alternative ' +
                          'as its first argument; received [1, 2, 3]'));
  });

  it('works in environment without Function#name', function() {
    //  This tests the code path for extracting the name of a constructor
    //  function from its string representation.
    var Identity = {
      name: null,
      prototype: {},
      toString: R.always('function Identity(x) { this.value = x; }')
    };

    //  f :: Identity -> [Identity]
    var f = def('f', {}, [Identity], list);

    assert.throws(function() { f(42); },
                  errorEq(TypeError,
                          '‘f’ requires a value of type Identity ' +
                          'as its first argument; received 42'));
  });

});
