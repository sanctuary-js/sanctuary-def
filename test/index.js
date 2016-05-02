'use strict';

var assert = require('assert');
var vm = require('vm');

var R = require('ramda');

var $ = require('..');


var throws = assert.throws;

var eq = function(actual, expected) {
  assert.strictEqual(arguments.length, 2);
  assert.strictEqual(R.toString(actual), R.toString(expected));
};

//  errorEq :: TypeRep a -> String -> Error -> Boolean
var errorEq = R.curry(function(type, message, error) {
  return error.constructor === type && error.message === message;
});


var def = $.create(true, $.env);

var a = $.TypeVariable('a');
var b = $.TypeVariable('b');

var list  = R.unapply(R.identity);

var $0 = def('$0', {}, [$.Array(a)], list);
var $1 = def('$1', {}, [a, $.Array(a)], list);
var $2 = def('$2', {}, [a, a, $.Array(a)], list);
var $3 = def('$3', {}, [a, a, a, $.Array(a)], list);
var $4 = def('$4', {}, [a, a, a, a, $.Array(a)], list);
var $5 = def('$5', {}, [a, a, a, a, a, $.Array(a)], list);
var $6 = def('$6', {}, [a, a, a, a, a, a, $.Array(a)], list);
var $7 = def('$7', {}, [a, a, a, a, a, a, a, $.Array(a)], list);
var $8 = def('$8', {}, [a, a, a, a, a, a, a, a, $.Array(a)], list);
var $9 = def('$9', {}, [a, a, a, a, a, a, a, a, a, $.Array(a)], list);


var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;
var MIN_SAFE_INTEGER = -MAX_SAFE_INTEGER;

//  Integer :: Type
var Integer = $.NullaryType(
  'my-package/Integer',
  function(x) {
    return R.type(x) === 'Number' &&
           Math.floor(x) === Number(x) &&
           x >= MIN_SAFE_INTEGER &&
           x <= MAX_SAFE_INTEGER;
  }
);


//  Nothing :: -> Maybe a
var Nothing = function() {
  return {
    '@@type': 'my-package/Maybe',
    chain: function(f) { return this; },
    concat: function() { throw new Error('Not implemented'); },
    empty: function() { return this; },
    isNothing: true,
    isJust: false,
    of: function(x) { return Just(x); },
    or: R.identity,
    toString: R.always('Nothing()')
  };
};

//  Just :: a -> Maybe a
var Just = function(x) {
  return {
    '@@type': 'my-package/Maybe',
    chain: function(f) { return f(x); },
    concat: function() { throw new Error('Not implemented'); },
    empty: R.always(Nothing()),
    isNothing: false,
    isJust: true,
    of: function(x) { return Just(x); },
    or: function() { return this; },
    toString: R.always('Just(' + R.toString(x) + ')'),
    value: x
  };
};

//  Maybe :: Type
var Maybe = $.UnaryType(
  'my-package/Maybe',
  function(x) { return x != null && x['@@type'] === 'my-package/Maybe'; },
  function(maybe) { return maybe.isJust ? [maybe.value] : []; }
);


//  Left :: a -> Either a b
var Left = function(x) {
  return {
    '@@type': 'my-package/Either',
    chain: function(f) { return this; },
    isLeft: true,
    isRight: false,
    of: function(x) { return Right(x); },
    toString: R.always('Left(' + R.toString(x) + ')'),
    value: x
  };
};

//  Right :: b -> Either a b
var Right = function(x) {
  return {
    '@@type': 'my-package/Either',
    chain: function(f) { return f(x); },
    isLeft: false,
    isRight: true,
    of: function(x) { return Right(x); },
    toString: R.always('Right(' + R.toString(x) + ')'),
    value: x
  };
};

//  Either :: Type
var Either = $.BinaryType(
  'my-package/Either',
  function(x) { return x != null && x['@@type'] === 'my-package/Either'; },
  function(either) { return either.isLeft ? [either.value] : []; },
  function(either) { return either.isRight ? [either.value] : []; }
);


//  Pair :: a -> b -> Pair a b
var Pair = function(x, y) {
  return {
    0: x,
    1: y,
    '@@type': 'my-package/Pair',
    length: 2,
    toString: R.always('Pair(' + R.toString(x) + ', ' + R.toString(y) + ')')
  };
};

//  $Pair :: Type
var $Pair = $.BinaryType(
  'my-package/Pair',
  function(x) { return x != null && x['@@type'] === 'my-package/Pair'; },
  R.take(1),
  R.drop(1)
);


describe('def', function() {

  it('type checks its arguments when checkTypes is true', function() {
    throws(function() { def(); },
           errorEq(TypeError,
                   '‘def’ requires four arguments; received zero arguments'));

    throws(function() { def(null, null, null, null); },
           errorEq(TypeError,
                   '‘def’ expected a value of type ‘String’ as its first argument; received null'));

    throws(function() { def('', null, null, null); },
           errorEq(TypeError,
                   '‘def’ expected a value of type ‘Object’ as its second argument; received null'));

    throws(function() { def('', {}, null, null); },
           errorEq(TypeError,
                   '‘def’ expected a value of type ‘Array Type’ as its third argument; received null'));

    throws(function() { def('', {}, [1, 2, 3], null); },
           errorEq(TypeError,
                   '‘def’ expected a value of type ‘Array Type’ as its third argument; received [1, 2, 3]'));

    throws(function() { def('', {}, [], null); },
           errorEq(TypeError,
                   '‘def’ expected a value of type ‘Function’ as its fourth argument; received null'));
  });

  it('does not type check its arguments when checkTypes is false', function() {
    var def = $.create(false, $.env);

    //  add :: Number -> Number -> Number
    var add =
    def('add',
        {},
        [$.Number, $.Number, $.Number],
        function(x, y) { return x + y; });

    eq(add(42, 1), 43);
    eq(add(42)(1), 43);
    eq(add(1, 2, 3, 4), 3);
    eq(add(1)(2, 3, 4), 3);
    eq(add('XXX', {foo: 42}), 'XXX[object Object]');
    eq(add({foo: 42}, 'XXX'), '[object Object]XXX');
  });

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

    throws(function() { def('$10', {}, [a, a, a, a, a, a, a, a, a, a, $.Array(a)], list); },
           errorEq(RangeError,
                   '‘def’ cannot define a function with arity greater than nine'));
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

    eq($3(1)(2).length, 1);
    eq($4(1)(2).length, 2);
    eq($5(1)(2).length, 3);
    eq($6(1)(2).length, 4);
    eq($7(1)(2).length, 5);
    eq($8(1)(2).length, 6);
    eq($9(1)(2).length, 7);

    eq($4(1)(2)(3).length, 1);
    eq($5(1)(2)(3).length, 2);
    eq($6(1)(2)(3).length, 3);
    eq($7(1)(2)(3).length, 4);
    eq($8(1)(2)(3).length, 5);
    eq($9(1)(2)(3).length, 6);

    eq($5(1)(2)(3)(4).length, 1);
    eq($6(1)(2)(3)(4).length, 2);
    eq($7(1)(2)(3)(4).length, 3);
    eq($8(1)(2)(3)(4).length, 4);
    eq($9(1)(2)(3)(4).length, 5);

    eq($6(1)(2)(3)(4)(5).length, 1);
    eq($7(1)(2)(3)(4)(5).length, 2);
    eq($8(1)(2)(3)(4)(5).length, 3);
    eq($9(1)(2)(3)(4)(5).length, 4);

    eq($7(1)(2)(3)(4)(5)(6).length, 1);
    eq($8(1)(2)(3)(4)(5)(6).length, 2);
    eq($9(1)(2)(3)(4)(5)(6).length, 3);

    eq($8(1)(2)(3)(4)(5)(6)(7).length, 1);
    eq($9(1)(2)(3)(4)(5)(6)(7).length, 2);

    eq($9(1)(2)(3)(4)(5)(6)(7)(8).length, 1);

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
  });

  it('returns a function which accepts placeholders', function() {
    //  triple :: Number -> Number -> Number -> [Number]
    var triple =
    def('triple', {}, [$.Number, $.Number, $.Number, $.Array($.Number)], list);

    eq(triple(R.__, R.__, 3)(R.__, 2)(1), [1, 2, 3]);

    throws(function() { triple(R.__, /x/); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'triple :: Number -> Number -> Number -> Array Number\n' +
                   '                    ^^^^^^\n' +
                   '                      1\n' +
                   '\n' +
                   '1)  /x/ :: RegExp\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));

    throws(function() { triple(R.__, R.__, /x/); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'triple :: Number -> Number -> Number -> Array Number\n' +
                   '                              ^^^^^^\n' +
                   '                                1\n' +
                   '\n' +
                   '1)  /x/ :: RegExp\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));

    throws(function() { triple(R.__, 2, 3)(/x/); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'triple :: Number -> Number -> Number -> Array Number\n' +
                   '          ^^^^^^\n' +
                   '            1\n' +
                   '\n' +
                   '1)  /x/ :: RegExp\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));
  });

  it('returns a function which throws if given too many args', function() {
    throws(function() { $0(1); },
           errorEq(TypeError,
                   '‘$0’ requires zero arguments; received one argument'));

    throws(function() { $1(1, 2); },
           errorEq(TypeError,
                   '‘$1’ requires one argument; received two arguments'));

    throws(function() { $2(1, 2, 3); },
           errorEq(TypeError,
                   '‘$2’ requires two arguments; received three arguments'));

    throws(function() { $3(1, 2, 3, 4); },
           errorEq(TypeError,
                   '‘$3’ requires three arguments; received four arguments'));

    throws(function() { $4(1, 2, 3, 4, 5); },
           errorEq(TypeError,
                   '‘$4’ requires four arguments; received five arguments'));

    throws(function() { $5(1, 2, 3, 4, 5, 6); },
           errorEq(TypeError,
                   '‘$5’ requires five arguments; received six arguments'));

    throws(function() { $6(1, 2, 3, 4, 5, 6, 7); },
           errorEq(TypeError,
                   '‘$6’ requires six arguments; received seven arguments'));

    throws(function() { $7(1, 2, 3, 4, 5, 6, 7, 8); },
           errorEq(TypeError,
                   '‘$7’ requires seven arguments; received eight arguments'));

    throws(function() { $8(1, 2, 3, 4, 5, 6, 7, 8, 9); },
           errorEq(TypeError,
                   '‘$8’ requires eight arguments; received nine arguments'));

    throws(function() { $9(1, 2, 3, 4, 5, 6, 7, 8, 9, 10); },
           errorEq(TypeError,
                   '‘$9’ requires nine arguments; received 10 arguments'));

    throws(function() { R.apply($9, R.range(0, 100)); },
           errorEq(TypeError,
                   '‘$9’ requires nine arguments; received 100 arguments'));
  });

  it('returns a function which type checks its arguments', function() {
    var N = $.Number;
    var $9 = def('$9', {}, [N, N, N, N, N, N, N, N, N, $.Array(N)], list);

    throws(function() { $9('X'); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
                   '      ^^^^^^\n' +
                   '        1\n' +
                   '\n' +
                   '1)  "X" :: String\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));

    throws(function() { $9(1, 'X'); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
                   '                ^^^^^^\n' +
                   '                  1\n' +
                   '\n' +
                   '1)  "X" :: String\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));

    throws(function() { $9(1, 2, 'X'); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
                   '                          ^^^^^^\n' +
                   '                            1\n' +
                   '\n' +
                   '1)  "X" :: String\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));

    throws(function() { $9(1, 2, 3, 'X'); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
                   '                                    ^^^^^^\n' +
                   '                                      1\n' +
                   '\n' +
                   '1)  "X" :: String\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));

    throws(function() { $9(1, 2, 3, 4, 'X'); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
                   '                                              ^^^^^^\n' +
                   '                                                1\n' +
                   '\n' +
                   '1)  "X" :: String\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));

    throws(function() { $9(1, 2, 3, 4, 5, 'X'); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
                   '                                                        ^^^^^^\n' +
                   '                                                          1\n' +
                   '\n' +
                   '1)  "X" :: String\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));

    throws(function() { $9(1, 2, 3, 4, 5, 6, 'X'); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
                   '                                                                  ^^^^^^\n' +
                   '                                                                    1\n' +
                   '\n' +
                   '1)  "X" :: String\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));

    throws(function() { $9(1, 2, 3, 4, 5, 6, 7, 'X'); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
                   '                                                                            ^^^^^^\n' +
                   '                                                                              1\n' +
                   '\n' +
                   '1)  "X" :: String\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));

    throws(function() { $9(1, 2, 3, 4, 5, 6, 7, 8, 'X'); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
                   '                                                                                      ^^^^^^\n' +
                   '                                                                                        1\n' +
                   '\n' +
                   '1)  "X" :: String\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));

    eq($9(1, 2, 3, 4, 5, 6, 7, 8, 9), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('reports type error correctly for null/undefined', function() {
    //  sqrt :: Number -> Number
    var sqrt = def('sqrt', {}, [$.Number, $.Number], Math.sqrt);

    eq(sqrt(25), 5);

    throws(function() { sqrt(null); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'sqrt :: Number -> Number\n' +
                   '        ^^^^^^\n' +
                   '          1\n' +
                   '\n' +
                   '1)  null :: Null\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));

    throws(function() { sqrt(undefined); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'sqrt :: Number -> Number\n' +
                   '        ^^^^^^\n' +
                   '          1\n' +
                   '\n' +
                   '1)  undefined :: Undefined\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));
  });

  it('creates a proper curry closure', function() {
    //  a000 :: a -> a -> a -> [a]
    var a000 = def('a00', {}, [a, a, a, $.Array(a)], Array);
    var anum = a000(1);
    var astr = a000('a');
    var bstr = a000(R.__, 'b');
    var abstr = astr('b');

    eq(anum(2, 3), [1, 2, 3]);
    eq(anum(2)(3), [1, 2, 3]);
    eq(astr('b', 'c'), ['a', 'b', 'c']);
    eq(bstr('a', 'c'), ['a', 'b', 'c']);
    eq(astr(R.__, 'c')('b'), ['a', 'b', 'c']);
    eq(abstr('c'), ['a', 'b', 'c']);
  });

  it('reports type error correctly for parameterized types', function() {
    var env = $.env.concat([Either, Maybe]);
    var def = $.create(true, env);

    //  a00 :: a -> a -> a
    var a00 = def('a00', {}, [a, a, a], R.identity);

    //  a01 :: a -> [a] -> a
    var a01 = def('a01', {}, [a, $.Array(a), a], R.identity);

    //  a02 :: a -> [[a]] -> a
    var a02 = def('a02', {}, [a, $.Array($.Array(a)), a], R.identity);

    //  ab02e :: a -> b -> [[Either a b]] -> a
    var ab02e = def('ab02e', {}, [a, b, $.Array($.Array(Either(a, b))), a],
                    R.identity);

    //  ab0e21 :: a -> b -> Either [[a]] [b] -> a
    var ab0e21 = def('ab0e21', {},
                     [a, b, Either($.Array($.Array(a)), $.Array(b)), a],
                     R.identity);

    throws(function() { a00(1, 'a'); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'a00 :: a -> a -> a\n' +
                   '       ^    ^\n' +
                   '       1    2\n' +
                   '\n' +
                   '1)  1 :: Number\n' +
                   '\n' +
                   '2)  "a" :: String\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    throws(function() { a00(1, ['a']); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'a00 :: a -> a -> a\n' +
                   '       ^    ^\n' +
                   '       1    2\n' +
                   '\n' +
                   '1)  1 :: Number\n' +
                   '\n' +
                   '2)  ["a"] :: Array String\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    throws(function() { a00(1, Just(1)); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'a00 :: a -> a -> a\n' +
                   '       ^    ^\n' +
                   '       1    2\n' +
                   '\n' +
                   '1)  1 :: Number\n' +
                   '\n' +
                   '2)  Just(1) :: Maybe Number\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    throws(function() { a01(1, ['a', 'b']); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'a01 :: a -> Array a -> a\n' +
                   '       ^          ^\n' +
                   '       1          2\n' +
                   '\n' +
                   '1)  1 :: Number\n' +
                   '\n' +
                   '2)  "a" :: String\n' +
                   '    "b" :: String\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    throws(function() { a01([1, 2], [1, 2, 3, 4]); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'a01 :: a -> Array a -> a\n' +
                   '       ^          ^\n' +
                   '       1          2\n' +
                   '\n' +
                   '1)  [1, 2] :: Array Number\n' +
                   '\n' +
                   '2)  1 :: Number\n' +
                   '    2 :: Number\n' +
                   '    3 :: Number\n' +
                   '    4 :: Number\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    throws(function() { a01([1, 2], [['a', 'b'], ['c', 'd']]); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'a01 :: a -> Array a -> a\n' +
                   '       ^          ^\n' +
                   '       1          2\n' +
                   '\n' +
                   '1)  [1, 2] :: Array Number\n' +
                   '\n' +
                   '2)  ["a", "b"] :: Array String\n' +
                   '    ["c", "d"] :: Array String\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    throws(function() { a01([[1, 2], [3, 4]], [[1, 2], [3, 4]]); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'a01 :: a -> Array a -> a\n' +
                   '       ^          ^\n' +
                   '       1          2\n' +
                   '\n' +
                   '1)  [[1, 2], [3, 4]] :: Array (Array Number)\n' +
                   '\n' +
                   '2)  [1, 2] :: Array Number\n' +
                   '    [3, 4] :: Array Number\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    throws(function() { a02([1, 2], [[1, 2], [3, 4, 5, 6]]); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'a02 :: a -> Array (Array a) -> a\n' +
                   '       ^                 ^\n' +
                   '       1                 2\n' +
                   '\n' +
                   '1)  [1, 2] :: Array Number\n' +
                   '\n' +
                   '2)  1 :: Number\n' +
                   '    2 :: Number\n' +
                   '    3 :: Number\n' +
                   '    4 :: Number\n' +
                   '    5 :: Number\n' +
                   '    6 :: Number\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    throws(function() { ab02e(1, 'x', [[Left('a'), Left('b')], [Left('c'), Left('d')]]); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'ab02e :: a -> b -> Array (Array (Either a b)) -> a\n' +
                   '         ^                              ^\n' +
                   '         1                              2\n' +
                   '\n' +
                   '1)  1 :: Number\n' +
                   '\n' +
                   '2)  "a" :: String\n' +
                   '    "b" :: String\n' +
                   '    "c" :: String\n' +
                   '    "d" :: String\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    throws(function() { ab02e(1, 'x', [[Right(1), Right(2)], [Right(3), Right(4)]]); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'ab02e :: a -> b -> Array (Array (Either a b)) -> a\n' +
                   '              ^                           ^\n' +
                   '              1                           2\n' +
                   '\n' +
                   '1)  "x" :: String\n' +
                   '\n' +
                   '2)  1 :: Number\n' +
                   '    2 :: Number\n' +
                   '    3 :: Number\n' +
                   '    4 :: Number\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    throws(function() { ab0e21(1, 'x', Left([['a', 'b'], ['c', 'd']])); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'ab0e21 :: a -> b -> Either (Array (Array a)) (Array b) -> a\n' +
                   '          ^                              ^\n' +
                   '          1                              2\n' +
                   '\n' +
                   '1)  1 :: Number\n' +
                   '\n' +
                   '2)  "a" :: String\n' +
                   '    "b" :: String\n' +
                   '    "c" :: String\n' +
                   '    "d" :: String\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    throws(function() { ab0e21(1, 'x', Right([1, 2])); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'ab0e21 :: a -> b -> Either (Array (Array a)) (Array b) -> a\n' +
                   '               ^                                    ^\n' +
                   '               1                                    2\n' +
                   '\n' +
                   '1)  "x" :: String\n' +
                   '\n' +
                   '2)  1 :: Number\n' +
                   '    2 :: Number\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));
  });

  it('returns a function which type checks its return value', function() {
    //  add :: Number -> Number -> Number
    var add = def('add', {}, [$.Number, $.Number, $.Number], R.always('XXX'));

    throws(function() { add(2, 2); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'add :: Number -> Number -> Number\n' +
                   '                           ^^^^^^\n' +
                   '                             1\n' +
                   '\n' +
                   '1)  "XXX" :: String\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));
  });

  it('does not rely on constructor identity', function() {
    //  inc :: Number -> Number
    var inc = def('inc', {}, [$.Number, $.Number], R.inc);

    eq(inc(42), 43);
    eq(inc(new Number(42)), 43);
    eq(inc(vm.runInNewContext('new Number(42)')), 43);

    //  length :: [String] -> Number
    var length = def('length', {}, [$.Array($.String), $.Number], R.length);

    eq(length(['foo', 'bar', 'baz']), 3);
    eq(length(vm.runInNewContext('["foo", "bar", "baz"]')), 3);
  });

  it('supports custom types', function() {
    //  AnonJust :: a -> AnonMaybe a
    var AnonJust = function(x) {
      return {
        '@@type': 'my-package/AnonMaybe',
        isNothing: false,
        isJust: true,
        toString: R.always('AnonJust(' + R.toString(x) + ')'),
        value: x
      };
    };

    //  AnonMaybe :: Type
    var AnonMaybe = $.UnaryType(
      'my-package/AnonMaybe',
      function(x) { return x != null && x['@@type'] === 'my-package/AnonMaybe'; },
      function(maybe) { return maybe.isJust ? [maybe.value] : []; }
    );

    var env = $.env.concat([Integer, $Pair, AnonMaybe]);
    var def = $.create(true, env);

    //  even :: Integer -> Boolean
    var even = def('even', {}, [Integer, $.Boolean], function(x) {
      return x % 2 === 0;
    });

    eq(even(1), false);
    eq(even(2), true);

    throws(function() { even(0.5); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'even :: Integer -> Boolean\n' +
                   '        ^^^^^^^\n' +
                   '           1\n' +
                   '\n' +
                   '1)  0.5 :: Number\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Integer’.\n'));

    //  fromMaybe :: a -> AnonMaybe a
    var fromMaybe =
    def('fromMaybe',
        {},
        [a, AnonMaybe(a), a],
        function(x, maybe) { return maybe.isJust ? maybe.value : x; });

    throws(function() { fromMaybe('x', AnonJust(null)); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'fromMaybe :: a -> AnonMaybe a -> a\n' +
                   '             ^              ^\n' +
                   '             1              2\n' +
                   '\n' +
                   '1)  "x" :: String\n' +
                   '\n' +
                   '2)  null :: Null\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));
  });

  it('supports enumerated types', function() {
    //  TimeUnit :: Type
    var TimeUnit = $.EnumType(['milliseconds', 'seconds', 'minutes', 'hours']);

    var env = $.env.concat([TimeUnit, $.ValidDate, $.ValidNumber]);
    var def = $.create(true, env);

    //  convertTo :: TimeUnit -> ValidDate -> ValidNumber
    var convertTo =
    def('convertTo',
        {},
        [TimeUnit, $.ValidDate, $.ValidNumber],
        function recur(unit, date) {
          switch (unit) {
            case 'milliseconds': return date.valueOf();
            case 'seconds':      return recur('milliseconds', date) / 1000;
            case 'minutes':      return recur('seconds', date) / 60;
            case 'hours':        return recur('minutes', date) / 60;
          }
        });

    throws(function() { convertTo('days', new Date(0)); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'convertTo :: ("milliseconds" | "seconds" | "minutes" | "hours") -> ValidDate -> ValidNumber\n' +
                   '             ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n' +
                   '                                     1\n' +
                   '\n' +
                   '1)  "days" :: String\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘("milliseconds" | "seconds" | "minutes" | "hours")’.\n'));

    eq(convertTo('seconds', new Date(1000)), 1);

    //  SillyType :: Type
    var SillyType = $.EnumType(['foo', true, 42]);

    var _env = $.env.concat([SillyType]);
    var _def = $.create(true, _env);

    //  id :: a -> a
    var id = _def('id', {}, [a, a], R.identity);

    eq(id('foo'), 'foo');
    eq(id('bar'), 'bar');
    eq(id(true), true);
    eq(id(false), false);
    eq(id(42), 42);
    eq(id(-42), -42);

    eq(id(['foo', true]), ['foo', true]);

    throws(function() { id(['foo', false]); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'id :: a -> a\n' +
                   '      ^\n' +
                   '      1\n' +
                   '\n' +
                   '1)  ["foo", false] :: Array ???\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));
  });

  it('supports record types', function() {
    //  Point :: Type
    var Point = $.RecordType({x: $.Number, y: $.Number});

    //  Line :: Type
    var Line = $.RecordType({start: Point, end: Point});

    var env = $.env.concat([Point, Line]);
    var def = $.create(true, env);

    //  dist :: Point -> Point -> Number
    var dist = def('dist', {}, [Point, Point, $.Number], function(p, q) {
      return Math.sqrt(Math.pow(p.x - q.x, 2) + Math.pow(p.y - q.y, 2));
    });

    //  length :: Line -> Number
    var length = def('length', {}, [Line, $.Number], function(line) {
      return dist(line.start, line.end);
    });

    eq(dist({x: 0, y: 0}, {x: 0, y: 0}), 0);
    eq(dist({x: 0, y: 0}, {x: 0, y: 0, color: 'red'}), 0);
    eq(dist({x: 1, y: 1}, {x: 4, y: 5}), 5);
    eq(dist({x: 1, y: 1}, {x: 4, y: 5, color: 'red'}), 5);

    eq(length({start: {x: 1, y: 1}, end: {x: 4, y: 5}}), 5);
    eq(length({start: {x: 1, y: 1}, end: {x: 4, y: 5, color: 'red'}}), 5);

    throws(function() { dist(null); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'dist :: { x :: Number, y :: Number } -> { x :: Number, y :: Number } -> Number\n' +
                   '        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n' +
                   '                     1\n' +
                   '\n' +
                   '1)  null :: Null\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘{ x :: Number, y :: Number }’.\n'));

    throws(function() { dist({}); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'dist :: { x :: Number, y :: Number } -> { x :: Number, y :: Number } -> Number\n' +
                   '        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n' +
                   '                     1\n' +
                   '\n' +
                   '1)  {} :: Object, StrMap ???\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘{ x :: Number, y :: Number }’.\n'));

    throws(function() { dist({x: 0}); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'dist :: { x :: Number, y :: Number } -> { x :: Number, y :: Number } -> Number\n' +
                   '        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n' +
                   '                     1\n' +
                   '\n' +
                   '1)  {"x": 0} :: Object, StrMap Number\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘{ x :: Number, y :: Number }’.\n'));

    throws(function() { dist({x: 0, y: null}); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'dist :: { x :: Number, y :: Number } -> { x :: Number, y :: Number } -> Number\n' +
                   '                            ^^^^^^\n' +
                   '                              1\n' +
                   '\n' +
                   '1)  null :: Null\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));

    throws(function() { length({start: 0, end: 0}); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'length :: { end :: { x :: Number, y :: Number }, start :: { x :: Number, y :: Number } } -> Number\n' +
                   '                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n' +
                   '                                1\n' +
                   '\n' +
                   '1)  0 :: Number\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘{ x :: Number, y :: Number }’.\n'));

    throws(function() { length({start: {x: 0, y: 0}, end: {x: null, y: null}}); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'length :: { end :: { x :: Number, y :: Number }, start :: { x :: Number, y :: Number } } -> Number\n' +
                   '                          ^^^^^^\n' +
                   '                            1\n' +
                   '\n' +
                   '1)  null :: Null\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));

    //  id :: a -> a
    var id = def('id', {}, [a, a], R.identity);

    eq(id([{x: 0, y: 0}, {x: 1, y: 1}]), [{x: 0, y: 0}, {x: 1, y: 1}]);

    throws(function() { $.RecordType({x: /XXX/, y: /XXX/, z: $.Any}); },
           errorEq(TypeError,
                   'Invalid values\n' +
                   '\n' +
                   'The argument to ‘RecordType’ must be an object mapping field name to type.\n' +
                   '\n' +
                   'The following mappings are invalid:\n' +
                   '\n' +
                   '  - "x": /XXX/\n' +
                   '  - "y": /XXX/\n'));
  });

  it('supports "nullable" types', function() {
    var env = $.env.concat([$.Nullable]);
    var def = $.create(true, env);

    //  toUpper :: Nullable String -> Nullable String
    var toUpper =
    def('toUpper',
        {},
        [$.Nullable($.String), $.Nullable($.String)],
        R.unless(R.equals(null), R.toUpper));

    eq(toUpper(null), null);
    eq(toUpper('abc'), 'ABC');

    throws(function() { toUpper(['abc']); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'toUpper :: Nullable String -> Nullable String\n' +
                   '                    ^^^^^^\n' +
                   '                      1\n' +
                   '\n' +
                   '1)  ["abc"] :: Array String\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘String’.\n'));

    //  defaultTo :: a -> Nullable a -> a
    var defaultTo =
    def('defaultTo',
        {},
        [a, $.Nullable(a), a],
        function(x, nullable) { return nullable === null ? x : nullable; });

    eq(defaultTo(0, null), 0);
    eq(defaultTo(0, 42), 42);

    throws(function() { defaultTo(0, 'XXX'); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'defaultTo :: a -> Nullable a -> a\n' +
                   '             ^             ^\n' +
                   '             1             2\n' +
                   '\n' +
                   '1)  0 :: Number\n' +
                   '\n' +
                   '2)  "XXX" :: String\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    //  f :: Nullable a -> Nullable a
    var f = def('f', {}, [$.Nullable(a), $.Nullable(a)], R.always(42));

    eq(f(null), 42);
    eq(f(0), 42);

    throws(function() { f('XXX'); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'f :: Nullable a -> Nullable a\n' +
                   '              ^             ^\n' +
                   '              1             2\n' +
                   '\n' +
                   '1)  "XXX" :: String\n' +
                   '\n' +
                   '2)  42 :: Number\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));
  });

  it('supports the "ValidDate" type', function() {
    var env = $.env.concat([$.ValidDate]);
    var def = $.create(true, env);

    //  sinceEpoch :: ValidDate -> Number
    var sinceEpoch = def('sinceEpoch',
                         {},
                         [$.ValidDate, $.Number],
                         function(date) { return date.valueOf() / 1000; });

    throws(function() { sinceEpoch(new Date('foo')); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'sinceEpoch :: ValidDate -> Number\n' +
                   '              ^^^^^^^^^\n' +
                   '                  1\n' +
                   '\n' +
                   '1)  new Date(NaN) :: Date\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘ValidDate’.\n'));

    eq(sinceEpoch(new Date(123456)), 123.456);
  });

  it('supports the "PositiveNumber" type', function() {
    eq($.PositiveNumber.name, 'sanctuary-def/PositiveNumber');

    var isPositiveNumber = function(x) {
      return $.test($.env, $.PositiveNumber, x);
    };
    eq(isPositiveNumber(null), false);
    eq(isPositiveNumber(NaN), false);
    eq(isPositiveNumber(new Number(NaN)), false);
    eq(isPositiveNumber(-1), false);
    eq(isPositiveNumber(new Number(-1)), false);
    eq(isPositiveNumber(0), false);
    eq(isPositiveNumber(new Number(0)), false);
    eq(isPositiveNumber(-0), false);
    eq(isPositiveNumber(new Number(-0)), false);
    eq(isPositiveNumber(0.5), true);
    eq(isPositiveNumber(new Number(0.5)), true);
    eq(isPositiveNumber(Infinity), true);
    eq(isPositiveNumber(new Number(Infinity)), true);
  });

  it('supports the "NegativeNumber" type', function() {
    eq($.NegativeNumber.name, 'sanctuary-def/NegativeNumber');

    var isNegativeNumber = function(x) {
      return $.test($.env, $.NegativeNumber, x);
    };
    eq(isNegativeNumber(null), false);
    eq(isNegativeNumber(NaN), false);
    eq(isNegativeNumber(new Number(NaN)), false);
    eq(isNegativeNumber(1), false);
    eq(isNegativeNumber(new Number(1)), false);
    eq(isNegativeNumber(0), false);
    eq(isNegativeNumber(new Number(0)), false);
    eq(isNegativeNumber(-0), false);
    eq(isNegativeNumber(new Number(-0)), false);
    eq(isNegativeNumber(-0.5), true);
    eq(isNegativeNumber(new Number(-0.5)), true);
    eq(isNegativeNumber(-Infinity), true);
    eq(isNegativeNumber(new Number(-Infinity)), true);
  });

  it('supports the "ValidNumber" type', function() {
    eq($.ValidNumber.name, 'sanctuary-def/ValidNumber');

    var isValidNumber = function(x) {
      return $.test($.env, $.ValidNumber, x);
    };
    eq(isValidNumber(NaN), false);
    eq(isValidNumber(new Number(NaN)), false);
    eq(isValidNumber(1), true);
    eq(isValidNumber(new Number(1)), true);
  });

  it('supports the "NonZeroValidNumber" type', function() {
    eq($.NonZeroValidNumber.name, 'sanctuary-def/NonZeroValidNumber');

    var isNonZeroValidNumber = function(x) {
      return $.test($.env, $.NonZeroValidNumber, x);
    };
    eq(isNonZeroValidNumber(0), false);
    eq(isNonZeroValidNumber(new Number(0)), false);
    eq(isNonZeroValidNumber(-0), false);
    eq(isNonZeroValidNumber(new Number(-0)), false);
    eq(isNonZeroValidNumber(1), true);
    eq(isNonZeroValidNumber(new Number(1)), true);
  });

  it('supports the "FiniteNumber" type', function() {
    eq($.FiniteNumber.name, 'sanctuary-def/FiniteNumber');

    var isFiniteNumber = function(x) {
      return $.test($.env, $.FiniteNumber, x);
    };
    eq(isFiniteNumber(Infinity), false);
    eq(isFiniteNumber(new Number(Infinity)), false);
    eq(isFiniteNumber(-Infinity), false);
    eq(isFiniteNumber(new Number(-Infinity)), false);
    eq(isFiniteNumber(1), true);
    eq(isFiniteNumber(new Number(1)), true);
  });

  it('supports the "PositiveFiniteNumber" type', function() {
    eq($.PositiveFiniteNumber.name, 'sanctuary-def/PositiveFiniteNumber');

    var isPositiveFiniteNumber = function(x) {
      return $.test($.env, $.PositiveFiniteNumber, x);
    };
    eq(isPositiveFiniteNumber(null), false);
    eq(isPositiveFiniteNumber(NaN), false);
    eq(isPositiveFiniteNumber(new Number(NaN)), false);
    eq(isPositiveFiniteNumber(Infinity), false);
    eq(isPositiveFiniteNumber(new Number(Infinity)), false);
    eq(isPositiveFiniteNumber(-1), false);
    eq(isPositiveFiniteNumber(new Number(-1)), false);
    eq(isPositiveFiniteNumber(0), false);
    eq(isPositiveFiniteNumber(new Number(0)), false);
    eq(isPositiveFiniteNumber(-0), false);
    eq(isPositiveFiniteNumber(new Number(-0)), false);
    eq(isPositiveFiniteNumber(0.5), true);
    eq(isPositiveFiniteNumber(new Number(0.5)), true);
  });

  it('supports the "NegativeFiniteNumber" type', function() {
    eq($.NegativeFiniteNumber.name, 'sanctuary-def/NegativeFiniteNumber');

    var isNegativeFiniteNumber = function(x) {
      return $.test($.env, $.NegativeFiniteNumber, x);
    };
    eq(isNegativeFiniteNumber(null), false);
    eq(isNegativeFiniteNumber(NaN), false);
    eq(isNegativeFiniteNumber(new Number(NaN)), false);
    eq(isNegativeFiniteNumber(-Infinity), false);
    eq(isNegativeFiniteNumber(new Number(-Infinity)), false);
    eq(isNegativeFiniteNumber(1), false);
    eq(isNegativeFiniteNumber(new Number(1)), false);
    eq(isNegativeFiniteNumber(0), false);
    eq(isNegativeFiniteNumber(new Number(0)), false);
    eq(isNegativeFiniteNumber(-0), false);
    eq(isNegativeFiniteNumber(new Number(-0)), false);
    eq(isNegativeFiniteNumber(-0.5), true);
    eq(isNegativeFiniteNumber(new Number(-0.5)), true);
  });

  it('supports the "NonZeroFiniteNumber" type', function() {
    eq($.NonZeroFiniteNumber.name, 'sanctuary-def/NonZeroFiniteNumber');

    var isNonZeroFiniteNumber = function(x) {
      return $.test($.env, $.NonZeroFiniteNumber, x);
    };
    eq(isNonZeroFiniteNumber(0), false);
    eq(isNonZeroFiniteNumber(new Number(0)), false);
    eq(isNonZeroFiniteNumber(-0), false);
    eq(isNonZeroFiniteNumber(new Number(-0)), false);
    eq(isNonZeroFiniteNumber(Infinity), false);
    eq(isNonZeroFiniteNumber(new Number(Infinity)), false);
    eq(isNonZeroFiniteNumber(-Infinity), false);
    eq(isNonZeroFiniteNumber(new Number(-Infinity)), false);
    eq(isNonZeroFiniteNumber(1), true);
    eq(isNonZeroFiniteNumber(new Number(1)), true);
  });

  it('supports the "Integer" type', function() {
    eq($.Integer.name, 'sanctuary-def/Integer');

    var isInteger = function(x) {
      return $.test($.env, $.Integer, x);
    };
    eq(isInteger(3.14), false);
    eq(isInteger(new Number(3.14)), false);
    eq(isInteger(9007199254740992), false);
    eq(isInteger(new Number(9007199254740992)), false);
    eq(isInteger(-9007199254740992), false);
    eq(isInteger(new Number(-9007199254740992)), false);
    eq(isInteger(1), true);
    eq(isInteger(new Number(1)), true);
  });

  it('supports the "NonZeroInteger" type', function() {
    eq($.NonZeroInteger.name, 'sanctuary-def/NonZeroInteger');

    var isNonZeroInteger = function(x) {
      return $.test($.env, $.NonZeroInteger, x);
    };
    eq(isNonZeroInteger(0), false);
    eq(isNonZeroInteger(new Number(0)), false);
    eq(isNonZeroInteger(-0), false);
    eq(isNonZeroInteger(new Number(-0)), false);
    eq(isNonZeroInteger(3.14), false);
    eq(isNonZeroInteger(new Number(3.14)), false);
    eq(isNonZeroInteger(1), true);
    eq(isNonZeroInteger(new Number(1)), true);
  });

  it('supports the "PositiveInteger" type', function() {
    eq($.PositiveInteger.name, 'sanctuary-def/PositiveInteger');

    var isPositiveInteger = function(x) {
      return $.test($.env, $.PositiveInteger, x);
    };
    eq(isPositiveInteger(1.5), false);
    eq(isPositiveInteger(new Number(1.5)), false);
    eq(isPositiveInteger(-1), false);
    eq(isPositiveInteger(new Number(-1)), false);
    eq(isPositiveInteger(1), true);
    eq(isPositiveInteger(new Number(1)), true);
  });

  it('supports the "NegativeInteger" type', function() {
    eq($.NegativeInteger.name, 'sanctuary-def/NegativeInteger');

    var isNegativeInteger = function(x) {
      return $.test($.env, $.NegativeInteger, x);
    };
    eq(isNegativeInteger(-1.5), false);
    eq(isNegativeInteger(new Number(-1.5)), false);
    eq(isNegativeInteger(1), false);
    eq(isNegativeInteger(new Number(1)), false);
    eq(isNegativeInteger(-1), true);
    eq(isNegativeInteger(new Number(-1)), true);
  });

  it('supports the "RegexFlags" type', function() {
    var isRegexFlags = function(x) {
      return $.test($.env, $.RegexFlags, x);
    };
    eq(isRegexFlags(''), true);
    eq(isRegexFlags('g'), true);
    eq(isRegexFlags('i'), true);
    eq(isRegexFlags('m'), true);
    eq(isRegexFlags('gi'), true);
    eq(isRegexFlags('gm'), true);
    eq(isRegexFlags('im'), true);
    eq(isRegexFlags('gim'), true);
    //  String objects are not acceptable.
    eq(isRegexFlags(new String('')), false);
    //  Flags must be alphabetically ordered.
    eq(isRegexFlags('mg'), false);
    //  "Sticky" flag is not acceptable.
    eq(isRegexFlags('y'), false);
  });

  it('supports the "StrMap" type constructor', function() {
    var env = $.env.concat([Either]);
    var def = $.create(true, env);

    //  id :: a -> a
    var id = def('id', {}, [a, a], R.identity);

    //  keys :: StrMap a -> [String]
    var keys =
    def('keys',
        {},
        [$.StrMap(a), $.Array($.String)],
        function(m) { return R.keys(m).sort(); });

    //  values :: StrMap a -> [a]
    var values =
    def('values',
        {},
        [$.StrMap(a), $.Array(a)],
        function(m) { return R.map(R.prop(R.__, m), keys(m)); });

    var o = Object.create(null);
    o.x = 1;
    o.y = 2;
    o.z = 3;

    eq(id({}), {});
    eq(id({x: 1, y: 2, z: 3}), {x: 1, y: 2, z: 3});
    eq(id(o), {x: 1, y: 2, z: 3});
    eq(id({a: 1, b: 'XXX'}), {a: 1, b: 'XXX'});

    eq(keys({}), []);
    eq(keys({x: 1, y: 2, z: 3}), ['x', 'y', 'z']);
    eq(keys(o), ['x', 'y', 'z']);

    throws(function() { keys({a: 1, b: 'XXX'}); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'keys :: StrMap a -> Array String\n' +
                   '               ^\n' +
                   '               1\n' +
                   '\n' +
                   '1)  1 :: Number\n' +
                   '    "XXX" :: String\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    eq(values({}), []);
    eq(values({x: 1, y: 2, z: 3}), [1, 2, 3]);
    eq(values(o), [1, 2, 3]);

    throws(function() { values({a: 1, b: 'XXX'}); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'values :: StrMap a -> Array a\n' +
                   '                 ^\n' +
                   '                 1\n' +
                   '\n' +
                   '1)  1 :: Number\n' +
                   '    "XXX" :: String\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    //  testUnaryType :: [StrMap Number] -> [StrMap Number]
    var testUnaryType =
    def('testUnaryType',
        {},
        [$.Array($.StrMap($.Number)), $.Array($.StrMap($.Number))],
        R.identity);

    eq(testUnaryType([{x: 1}, {y: 2}, {z: 3}]), [{x: 1}, {y: 2}, {z: 3}]);

    throws(function() { testUnaryType([{x: /xxx/}]); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'testUnaryType :: Array (StrMap Number) -> Array (StrMap Number)\n' +
                   '                               ^^^^^^\n' +
                   '                                 1\n' +
                   '\n' +
                   '1)  /xxx/ :: RegExp\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Number’.\n'));

    //  testBinaryType :: Either a (StrMap b) -> Either a (StrMap b)
    var testBinaryType =
    def('testBinaryType',
        {},
        [Either(a, $.StrMap(b)), Either(a, $.StrMap(b))],
        R.identity);

    eq(testBinaryType(Left('XXX')), Left('XXX'));
    eq(testBinaryType(Right({x: 1, y: 2, z: 3})), Right({x: 1, y: 2, z: 3}));

    throws(function() { testBinaryType(Right({x: ['foo', false]})); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'testBinaryType :: Either a (StrMap b) -> Either a (StrMap b)\n' +
                   '                                   ^\n' +
                   '                                   1\n' +
                   '\n' +
                   '1)  ["foo", false] :: Array ???\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));
  });

  it('uses R.toString-like string representations', function() {
    //  f :: Null -> Null
    var f = def('f', {}, [$.Null, $.Null], function(x) { return x; });

    var Point = function Point(x, y) {
      this.x = x;
      this.y = y;
    };
    Point.prototype._private = true;

    var o1 = {id: 1};
    var o2 = {id: 2};
    o1.ref = o2;
    o2.ref = o1;

    var values = [
      [(function() { return arguments; }(1, 2, 3)), 'Arguments'],
      [new Boolean(false), 'Boolean'],
      [new Date(0), 'Date'],
      [new Date('XXX'), 'Date'],
      [new Number(-0), 'Number'],
      [new String(''), 'String'],
      [/x/.exec('xyz'), 'Array String'],
      [
        (function() { var xs = [1, 2, 3]; xs.z = 0; xs.a = 0; return xs; }()),
        'Array Number'
      ],
      [{toString: null}, 'Object, StrMap Null'],
      [new Point(0, 0), 'Object, StrMap Number'],
      [o1, 'Object, StrMap ???']
    ];

    values.forEach(R.apply(function(x, types) {
      throws(function() { f(x); },
             errorEq(TypeError,
                     'Invalid value\n' +
                     '\n' +
                     'f :: Null -> Null\n' +
                     '     ^^^^\n' +
                     '      1\n' +
                     '\n' +
                     '1)  ' + R.toString(x) + ' :: ' + types + '\n' +
                     '\n' +
                     'The value at position 1 is not a member of ‘Null’.\n'));
    }));
  });

  it('supports polymorphism via type variables', function() {
    var env = $.env.concat([Either, Maybe, $Pair]);
    var def = $.create(true, env);

    //  aa :: a -> a -> (a, a)
    var aa = def('aa', {}, [a, a, $Pair(a, a)], Pair);
    //  ab :: a -> b -> (a, b)
    var ab = def('ab', {}, [a, b, $Pair(a, b)], Pair);

    eq(aa(0, 1), Pair(0, 1));
    eq(aa(1, 0), Pair(1, 0));
    eq(ab(0, 1), Pair(0, 1));
    eq(ab(1, 0), Pair(1, 0));
    eq(ab(0, false), Pair(0, false));
    eq(ab(false, 0), Pair(false, 0));

    throws(function() { aa(0, /x/); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'aa :: a -> a -> Pair a a\n' +
                   '      ^    ^\n' +
                   '      1    2\n' +
                   '\n' +
                   '1)  0 :: Number\n' +
                   '\n' +
                   '2)  /x/ :: RegExp\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    throws(function() { aa(R.__, 0)(/x/); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'aa :: a -> a -> Pair a a\n' +
                   '      ^    ^\n' +
                   '      1    2\n' +
                   '\n' +
                   '1)  /x/ :: RegExp\n' +
                   '\n' +
                   '2)  0 :: Number\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    throws(function() { aa([Left('XXX'), 42]); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'aa :: a -> a -> Pair a a\n' +
                   '      ^\n' +
                   '      1\n' +
                   '\n' +
                   '1)  [Left("XXX"), 42] :: Array ???\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    //  fromMaybe :: a -> Maybe a -> a
    var fromMaybe = def('fromMaybe', {}, [a, Maybe(a), a], function(x, maybe) {
      return maybe.isJust ? maybe.value : x;
    });

    eq(fromMaybe(0, Nothing()), 0);
    eq(fromMaybe(0, Just(42)), 42);

    throws(function() { fromMaybe(0, [1, 2, 3]); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'fromMaybe :: a -> Maybe a -> a\n' +
                   '                  ^^^^^^^\n' +
                   '                     1\n' +
                   '\n' +
                   '1)  [1, 2, 3] :: Array Number\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Maybe a’.\n'));

    //  fst :: Pair a b -> a
    var fst = def('fst', {}, [$Pair(a, b), a], R.nth(0));

    eq(fst(Pair('XXX', 42)), 'XXX');

    throws(function() { fst(['XXX', 42]); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'fst :: Pair a b -> a\n' +
                   '       ^^^^^^^^\n' +
                   '          1\n' +
                   '\n' +
                   '1)  ["XXX", 42] :: Array ???\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Pair a b’.\n'));

    //  concat :: Either a b -> Either a b -> Either a b
    var concat =
    def('concat',
        {},
        [Either(a, b), Either(a, b), Either(a, b)],
        function(e1, e2) {
          return e1.isLeft && e2.isLeft ? Left(e1.value.concat(e2.value)) :
                 e1.isLeft ? e1 :
                 e2.isLeft ? e2 : Right(e1.value.concat(e2.value));
        });

    eq(concat(Left('abc'), Left('def')), Left('abcdef'));
    eq(concat(Left('abc'), Right('ABC')), Left('abc'));
    eq(concat(Right('ABC'), Left('abc')), Left('abc'));
    eq(concat(Right('ABC'), Right('DEF')), Right('ABCDEF'));

    throws(function() { concat(Left('abc'), Left([1, 2, 3])); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'concat :: Either a b -> Either a b -> Either a b\n' +
                   '                 ^             ^\n' +
                   '                 1             2\n' +
                   '\n' +
                   '1)  "abc" :: String\n' +
                   '\n' +
                   '2)  [1, 2, 3] :: Array Number\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    throws(function() { concat(Right('abc'), Right([1, 2, 3])); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'concat :: Either a b -> Either a b -> Either a b\n' +
                   '                   ^             ^\n' +
                   '                   1             2\n' +
                   '\n' +
                   '1)  "abc" :: String\n' +
                   '\n' +
                   '2)  [1, 2, 3] :: Array Number\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));
  });

  it('supports arbitrary nesting of types', function() {
    var env = $.env.concat([Either, $.Integer]);
    var def = $.create(true, env);

    //  unnest :: [[a]] -> [a]
    var unnest =
    def('unnest', {}, [$.Array($.Array(a)), $.Array(a)], R.unnest);

    eq(unnest([[1, 2], [3, 4], [5, 6]]), [1, 2, 3, 4, 5, 6]);
    eq(unnest([[null], [null], [null]]), [null, null, null]);

    throws(function() { unnest([1, 2, 3]); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'unnest :: Array (Array a) -> Array a\n' +
                   '                ^^^^^^^^^\n' +
                   '                    1\n' +
                   '\n' +
                   '1)  1 :: Number, Integer\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Array a’.\n'));

    //  concatComplex :: [Either String Integer] -> [Either String Integer] -> [Either String Integer]
    var concatComplex =
    def('concatComplex',
        {},
        [$.Array(Either($.String, $.Integer)),
         $.Array(Either($.String, $.Integer)),
         $.Array(Either($.String, $.Integer))],
        R.always([Left(/xxx/)]));

    throws(function() { concatComplex([Left(/xxx/), Right(0), Right(0.1), Right(0.2)]); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'concatComplex :: Array (Either String Integer) -> Array (Either String Integer) -> Array (Either String Integer)\n' +
                   '                               ^^^^^^\n' +
                   '                                 1\n' +
                   '\n' +
                   '1)  /xxx/ :: RegExp\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘String’.\n'));

    throws(function() { concatComplex([Left('abc'), Right(0), Right(0.1), Right(0.2)]); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'concatComplex :: Array (Either String Integer) -> Array (Either String Integer) -> Array (Either String Integer)\n' +
                   '                                      ^^^^^^^\n' +
                   '                                         1\n' +
                   '\n' +
                   '1)  0.1 :: Number\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Integer’.\n'));

    throws(function() { concatComplex([], [Left(/xxx/), Right(0), Right(0.1), Right(0.2)]); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'concatComplex :: Array (Either String Integer) -> Array (Either String Integer) -> Array (Either String Integer)\n' +
                   '                                                                ^^^^^^\n' +
                   '                                                                  1\n' +
                   '\n' +
                   '1)  /xxx/ :: RegExp\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘String’.\n'));

    throws(function() { concatComplex([], [Left('abc'), Right(0), Right(0.1), Right(0.2)]); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'concatComplex :: Array (Either String Integer) -> Array (Either String Integer) -> Array (Either String Integer)\n' +
                   '                                                                       ^^^^^^^\n' +
                   '                                                                          1\n' +
                   '\n' +
                   '1)  0.1 :: Number\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘Integer’.\n'));

    throws(function() { concatComplex([], []); },
           errorEq(TypeError,
                   'Invalid value\n' +
                   '\n' +
                   'concatComplex :: Array (Either String Integer) -> Array (Either String Integer) -> Array (Either String Integer)\n' +
                   '                                                                                                 ^^^^^^\n' +
                   '                                                                                                   1\n' +
                   '\n' +
                   '1)  /xxx/ :: RegExp\n' +
                   '\n' +
                   'The value at position 1 is not a member of ‘String’.\n'));
  });

  it('does not allow heterogeneous arrays', function() {
    var env = $.env.concat([Either]);
    var def = $.create(true, env);

    //  concat :: [a] -> [a] -> [a]
    var concat =
    def('concat', {}, [$.Array(a), $.Array(a), $.Array(a)], function(xs, ys) {
      return xs.concat(ys);
    });

    eq(concat([], []), []);
    eq(concat([], [1, 2, 3]), [1, 2, 3]);
    eq(concat([1, 2, 3], []), [1, 2, 3]);
    eq(concat([1, 2, 3], [4, 5, 6]), [1, 2, 3, 4, 5, 6]);
    eq(concat([Left('XXX')], [Right(42)]), [Left('XXX'), Right(42)]);

    throws(function() { concat([[1, 2, 3], [Left('XXX'), Right(42)]]); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'concat :: Array a -> Array a -> Array a\n' +
                   '                ^\n' +
                   '                1\n' +
                   '\n' +
                   '1)  [1, 2, 3] :: Array Number\n' +
                   '    [Left("XXX"), Right(42)] :: Array (Either String Number)\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    //  concatNested :: [[a]] -> [[a]] -> [[a]]
    var concatNested =
    def('concatNested',
        {},
        [$.Array($.Array(a)), $.Array($.Array(a)), $.Array($.Array(a))],
        R.always([['a', 'b', 'c'], [1, 2, 3]]));

    throws(function() { concatNested([['a', 'b', 'c'], [1, 2, 3]]); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'concatNested :: Array (Array a) -> Array (Array a) -> Array (Array a)\n' +
                   '                             ^\n' +
                   '                             1\n' +
                   '\n' +
                   '1)  "a" :: String\n' +
                   '    "b" :: String\n' +
                   '    "c" :: String\n' +
                   '    1 :: Number\n' +
                   '    2 :: Number\n' +
                   '    3 :: Number\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    throws(function() { concatNested([], [['a', 'b', 'c'], [1, 2, 3]]); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'concatNested :: Array (Array a) -> Array (Array a) -> Array (Array a)\n' +
                   '                                                ^\n' +
                   '                                                1\n' +
                   '\n' +
                   '1)  "a" :: String\n' +
                   '    "b" :: String\n' +
                   '    "c" :: String\n' +
                   '    1 :: Number\n' +
                   '    2 :: Number\n' +
                   '    3 :: Number\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    throws(function() { concatNested([], []); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'concatNested :: Array (Array a) -> Array (Array a) -> Array (Array a)\n' +
                   '                                                                   ^\n' +
                   '                                                                   1\n' +
                   '\n' +
                   '1)  "a" :: String\n' +
                   '    "b" :: String\n' +
                   '    "c" :: String\n' +
                   '    1 :: Number\n' +
                   '    2 :: Number\n' +
                   '    3 :: Number\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));
  });

  it('permits the use of arrays as tuples', function() {
    //  Pair :: Type
    var Pair = $.BinaryType(
      'my-package/Pair',
      R.both(R.is(Array), R.propEq('length', 2)),
      R.compose(R.of, R.nth(0)),
      R.compose(R.of, R.nth(1))
    );

    var env = $.env.concat([Either, Pair]);
    var def = $.create(true, env);

    //  id :: a -> a
    var id = def('id', {}, [a, a], R.identity);

    eq(id(['abc', 123]), ['abc', 123]);
    eq(id([Left('abc'), 123]), [Left('abc'), 123]);
    eq(id(['abc', Right(123)]), ['abc', Right(123)]);
    eq(id([Left('abc'), Right(123)]), [Left('abc'), Right(123)]);

    throws(function() { id([Left('abc'), 123, 456]); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'id :: a -> a\n' +
                   '      ^\n' +
                   '      1\n' +
                   '\n' +
                   '1)  [Left("abc"), 123, 456] :: Array ???\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));
  });

  it('supports values of "foreign" types', function() {
    //  id :: a -> a
    var id = def('id', {}, [a, a], R.identity);

    //  x :: Foreign
    var x = {'@@type': 'my-package/Foreign'};

    eq(id(x), x);
    eq(id([x]), [x]);
    eq(id([x, x]), [x, x]);

    throws(function() { id([{'@@type': 'my-package/Foo'}, {'@@type': 'my-package/Bar'}]); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'id :: a -> a\n' +
                   '      ^\n' +
                   '      1\n' +
                   '\n' +
                   '1)  [{"@@type": "my-package/Foo"}, {"@@type": "my-package/Bar"}] :: Array ???\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));
  });

  it('supports type-class constraints', function() {
    var env = $.env.concat([Integer, Maybe, Either]);
    var def = $.create(true, env);

    //  hasMethods :: [String] -> a -> Boolean
    var hasMethods = R.curry(function(names, x) {
      return x != null &&
             R.all(function(k) { return typeof x[k] === 'function'; }, names);
    });

    //  Alternative :: TypeClass
    var Alternative =
    $.TypeClass('my-package/Alternative', hasMethods(['empty', 'or']));

    //  or :: Alternative a => a -> a -> a
    var or = def('or', {a: [Alternative]}, [a, a, a], function(x, y) {
      return x.or(y);
    });

    eq(or(Nothing(), Nothing()), Nothing());
    eq(or(Nothing(), Just(1)), Just(1));
    eq(or(Just(2), Nothing()), Just(2));
    eq(or(Just(3), Just(4)), Just(3));

    throws(function() { or(Left(1)); },
           errorEq(TypeError,
                   'Type-class constraint violation\n' +
                   '\n' +
                   'or :: Alternative a => a -> a -> a\n' +
                   '      ^^^^^^^^^^^^^    ^\n' +
                   '                       1\n' +
                   '\n' +
                   '1)  Left(1) :: Either Number ???, Either Integer ???\n' +
                   '\n' +
                   '‘or’ requires ‘a’ to satisfy the Alternative type-class constraint; the value at position 1 does not.\n'));

    throws(function() { or(R.__, Right(1)); },
           errorEq(TypeError,
                   'Type-class constraint violation\n' +
                   '\n' +
                   'or :: Alternative a => a -> a -> a\n' +
                   '      ^^^^^^^^^^^^^         ^\n' +
                   '                            1\n' +
                   '\n' +
                   '1)  Right(1) :: Either ??? Number, Either ??? Integer\n' +
                   '\n' +
                   '‘or’ requires ‘a’ to satisfy the Alternative type-class constraint; the value at position 1 does not.\n'));

    //  Semigroup :: TypeClass
    var Semigroup =
    $.TypeClass('my-package/Semigroup', hasMethods(['concat']));

    //  concat :: Semigroup a => a -> a -> a
    var concat = def('concat', {a: [Semigroup]}, [a, a, a], function(x, y) {
      return x.concat(y);
    });

    eq(concat([1, 2, 3], [4, 5, 6]), [1, 2, 3, 4, 5, 6]);
    eq(concat('abc', 'def'), 'abcdef');

    throws(function() { concat(/x/); },
           errorEq(TypeError,
                   'Type-class constraint violation\n' +
                   '\n' +
                   'concat :: Semigroup a => a -> a -> a\n' +
                   '          ^^^^^^^^^^^    ^\n' +
                   '                         1\n' +
                   '\n' +
                   '1)  /x/ :: RegExp\n' +
                   '\n' +
                   '‘concat’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.\n'));

    throws(function() { concat(R.__, /x/); },
           errorEq(TypeError,
                   'Type-class constraint violation\n' +
                   '\n' +
                   'concat :: Semigroup a => a -> a -> a\n' +
                   '          ^^^^^^^^^^^         ^\n' +
                   '                              1\n' +
                   '\n' +
                   '1)  /x/ :: RegExp\n' +
                   '\n' +
                   '‘concat’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.\n'));

    throws(function() { concat([], ''); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'concat :: Semigroup a => a -> a -> a\n' +
                   '                         ^    ^\n' +
                   '                         1    2\n' +
                   '\n' +
                   '1)  [] :: Array ???\n' +
                   '\n' +
                   '2)  "" :: String\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    throws(function() { concat('', []); },
           errorEq(TypeError,
                   'Type-variable constraint violation\n' +
                   '\n' +
                   'concat :: Semigroup a => a -> a -> a\n' +
                   '                         ^    ^\n' +
                   '                         1    2\n' +
                   '\n' +
                   '1)  "" :: String\n' +
                   '\n' +
                   '2)  [] :: Array ???\n' +
                   '\n' +
                   'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n'));

    //  Monad :: TypeClass
    var Monad =
    $.TypeClass('my-package/Monad', hasMethods(['chain', 'of']));

    //  Monoid :: TypeClass
    var Monoid =
    $.TypeClass('my-package/Monoid', hasMethods(['concat', 'empty']));

    //  filter :: (Monad m, Monoid (m a)) => (a -> Boolean) -> m a -> m a
    var filter =
    def('filter', {a: [Monad, Monoid]}, [$.Function, a, a], function(pred, m) {
      return m.chain(function(x) {
        return pred(x) ? m.of(x) : m.empty();
      });
    });

    eq(filter(R.T, Just(42)), Just(42));
    eq(filter(R.F, Just(42)), Nothing());
    eq(filter(R.T, Nothing()), Nothing());
    eq(filter(R.F, Nothing()), Nothing());

    throws(function() { filter(R.F, [1, 2, 3]); },
           errorEq(TypeError,
                   'Type-class constraint violation\n' +
                   '\n' +
                   'filter :: (Monad a, Monoid a) => Function -> a -> a\n' +
                   '           ^^^^^^^                           ^\n' +
                   '                                             1\n' +
                   '\n' +
                   '1)  [1, 2, 3] :: Array Number, Array Integer\n' +
                   '\n' +
                   '‘filter’ requires ‘a’ to satisfy the Monad type-class constraint; the value at position 1 does not.\n'));

    throws(function() { filter(R.F, Right(42)); },
           errorEq(TypeError,
                   'Type-class constraint violation\n' +
                   '\n' +
                   'filter :: (Monad a, Monoid a) => Function -> a -> a\n' +
                   '                    ^^^^^^^^                 ^\n' +
                   '                                             1\n' +
                   '\n' +
                   '1)  Right(42) :: Either ??? Number, Either ??? Integer\n' +
                   '\n' +
                   '‘filter’ requires ‘a’ to satisfy the Monoid type-class constraint; the value at position 1 does not.\n'));

    //  concatMaybes :: Semigroup a => Maybe a -> Maybe a -> Maybe a
    var concatMaybes =
    def('concatMaybes',
        {a: [Semigroup]},
        [Maybe(a), Maybe(a), Maybe(a)],
        R.always(Just(/xxx/)));

    throws(function() { concatMaybes(Just(/xxx/)); },
           errorEq(TypeError,
                   'Type-class constraint violation\n' +
                   '\n' +
                   'concatMaybes :: Semigroup a => Maybe a -> Maybe a -> Maybe a\n' +
                   '                ^^^^^^^^^^^          ^\n' +
                   '                                     1\n' +
                   '\n' +
                   '1)  /xxx/ :: RegExp\n' +
                   '\n' +
                   '‘concatMaybes’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.\n'));

    throws(function() { concatMaybes(Just('abc'), Just(/xxx/)); },
           errorEq(TypeError,
                   'Type-class constraint violation\n' +
                   '\n' +
                   'concatMaybes :: Semigroup a => Maybe a -> Maybe a -> Maybe a\n' +
                   '                ^^^^^^^^^^^                     ^\n' +
                   '                                                1\n' +
                   '\n' +
                   '1)  /xxx/ :: RegExp\n' +
                   '\n' +
                   '‘concatMaybes’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.\n'));

    throws(function() { concatMaybes(Just('abc'), Just('def')); },
           errorEq(TypeError,
                   'Type-class constraint violation\n' +
                   '\n' +
                   'concatMaybes :: Semigroup a => Maybe a -> Maybe a -> Maybe a\n' +
                   '                ^^^^^^^^^^^                                ^\n' +
                   '                                                           1\n' +
                   '\n' +
                   '1)  /xxx/ :: RegExp\n' +
                   '\n' +
                   '‘concatMaybes’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.\n'));
  });

});

describe('test', function() {

  it('supports nullary types', function() {
    eq($.test($.env, $.Number, null), false);
    eq($.test($.env, $.Number, '42'), false);
    eq($.test($.env, $.Number, 42), true);
  });

  it('supports unary types', function() {
    eq($.test($.env, $.Array($.Number), null), false);
    eq($.test($.env, $.Array($.Number), '42'), false);
    eq($.test($.env, $.Array($.Number), [1, 2, '3']), false);
    eq($.test($.env, $.Array($.Number), ['42']), false);
    eq($.test($.env, $.Array($.Number), []), true);
    eq($.test($.env, $.Array($.Number), [1, 2, 3]), true);
  });

  it('supports binary types', function() {
    eq($.test($.env, $Pair($.Number, $.String), Pair(42, 42)), false);
    eq($.test($.env, $Pair($.Number, $.String), Pair('', '')), false);
    eq($.test($.env, $Pair($.Number, $.String), Pair('', 42)), false);
    eq($.test($.env, $Pair($.Number, $.String), Pair(42, '')), true);
  });

  it('supports type variables', function() {
    eq($.test($.env, $.Array(a), null), false);
    eq($.test($.env, $.Array(a), '42'), false);
    eq($.test($.env, $.Array(a), [1, 2, '3']), false);
    eq($.test($.env, $.Array(a), ['42']), true);
    eq($.test($.env, $.Array(a), []), true);
    eq($.test($.env, $.Array(a), [1, 2, 3]), true);

    eq($.test($.env, $Pair(a, a), Pair('foo', 42)), false);
    eq($.test($.env, $Pair(a, a), Pair('foo', 'bar')), true);
    eq($.test($.env, $Pair(a, b), Pair('foo', 42)), true);
  });

});
