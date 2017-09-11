'use strict';

var assert = require('assert');
var vm = require('vm');

var Z = require('sanctuary-type-classes');
var Z$version = require('sanctuary-type-classes/package.json').version;
var type = require('sanctuary-type-identifiers');

var $ = require('..');


//  always :: a -> () -> a
function always(x) { return function() { return x; }; }

//  eq :: (a, b) -> Undefined !
function eq(actual, expected) {
  assert.strictEqual(arguments.length, eq.length);
  assert.strictEqual(Z.toString(actual), Z.toString(expected));
  assert.strictEqual(Z.equals(actual, expected), true);
}

//  identity :: a -> a
function identity(x) { return x; }

//  length :: { length :: a } -> a
function length(x) { return x.length; }

//  notImplemented :: () -> Undefined !
function notImplemented() { throw new Error('Not implemented'); }

//  throws :: (Function, TypeRep a, String) -> Undefined
function throws(f, type, message) {
  assert.throws(f, function(err) {
    return err.constructor === type && err.message === message;
  });
}

//  version :: String
var version = '0.13.1';  // updated programmatically


var def = $.create({checkTypes: true, env: $.env});

var a = $.TypeVariable('a');
var b = $.TypeVariable('b');
var c = $.TypeVariable('c');
var d = $.TypeVariable('d');
var m = $.UnaryTypeVariable('m');

function list() { return Array.prototype.slice.call(arguments); }

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
  'http://example.com/my-package#Integer',
  function(x) {
    return $.Number._test(x) &&
           Math.floor(x) === Number(x) &&
           x >= MIN_SAFE_INTEGER &&
           x <= MAX_SAFE_INTEGER;
  }
);


function _Maybe(tag, value) {
  this.isNothing = tag === 'Nothing';
  this.isJust = tag === 'Just';
  if (this.isJust) this.value = value;
}

_Maybe['@@type'] = 'my-package/Maybe';

_Maybe['fantasy-land/of'] = Just;

_Maybe['fantasy-land/zero'] = function() { return Nothing; };

_Maybe.prototype['fantasy-land/equals'] = function(other) {
  return this.isNothing ? other.isNothing
                        : other.isJust && Z.equals(this.value, other.value);
};

_Maybe.prototype['fantasy-land/concat'] = notImplemented;

_Maybe.prototype['fantasy-land/map'] = function(f) {
  return this.isNothing ? this : Just(f(this.value));
};

_Maybe.prototype['fantasy-land/ap'] = notImplemented;

_Maybe.prototype['fantasy-land/chain'] = function(f) {
  return this.isNothing ? this : f(this.value);
};

_Maybe.prototype['fantasy-land/alt'] = function(other) {
  return this.isNothing ? other : this;
};

_Maybe.prototype['fantasy-land/reduce'] = function(f, x) {
  return this.isNothing ? x : f(x, this.value);
};

_Maybe.prototype.inspect =
_Maybe.prototype.toString = function() {
  return this.isNothing ? 'Nothing' : 'Just(' + Z.toString(this.value) + ')';
};

//  Nothing :: Maybe a
var Nothing = new _Maybe('Nothing');

//  Just :: a -> Maybe a
function Just(x) { return new _Maybe('Just', x); }

//  Maybe :: Type
var Maybe = $.UnaryType(
  'my-package/Maybe',
  'http://example.com/my-package#Maybe',
  function(x) { return type(x) === 'my-package/Maybe'; },
  function(maybe) { return maybe.isJust ? [maybe.value] : []; }
);


function _Either(tag, value) {
  this.isLeft = tag === 'Left';
  this.isRight = tag === 'Right';
  this.value = value;
}

_Either['@@type'] = 'my-package/Either';

_Either['fantasy-land/of'] = Right;

_Either.prototype['fantasy-land/equals'] = function(other) {
  return this.isLeft === other.isLeft && Z.equals(this.value, other.value);
};

_Either.prototype['fantasy-land/concat'] = function(other) {
  return this.isLeft ?
    other.isLeft ? Left(Z.concat(this.value, other.value)) : other :
    other.isLeft ? this : Right(Z.concat(this.value, other.value));
};

_Either.prototype['fantasy-land/map'] = notImplemented;

_Either.prototype['fantasy-land/ap'] = notImplemented;

_Either.prototype['fantasy-land/chain'] = notImplemented;

_Either.prototype['fantasy-land/reduce'] = function(f, x) {
  return this.isLeft ? x : f(x, this.value);
};

_Either.prototype.inspect =
_Either.prototype.toString = function() {
  return (this.isLeft ? 'Left' : 'Right') + '(' + Z.toString(this.value) + ')';
};

//  Left :: a -> Either a b
function Left(x) { return new _Either('Left', x); }

//  Right :: b -> Either a b
function Right(x) { return new _Either('Right', x); }

//  Either :: Type
var Either = $.BinaryType(
  'my-package/Either',
  'http://example.com/my-package#Either',
  function(x) { return type(x) === 'my-package/Either'; },
  function(either) { return either.isLeft ? [either.value] : []; },
  function(either) { return either.isRight ? [either.value] : []; }
);


//  Pair :: a -> b -> Pair a b
function Pair(x, y) {
  if (!(this instanceof Pair)) return new Pair(x, y);
  this[0] = x;
  this[1] = y;
}

Pair['@@type'] = 'my-package/Pair';

Pair.prototype['fantasy-land/equals'] = function(other) {
  return Z.equals(this[0], other[0]) && Z.equals(this[1], other[1]);
};

Pair.prototype['fantasy-land/map'] = function(f) {
  return Pair(this[0], f(this[1]));
};

Pair.prototype['fantasy-land/bimap'] = function(f, g) {
  return Pair(f(this[0]), g(this[1]));
};

Pair.prototype.length = 2;

Pair.prototype.inspect =
Pair.prototype.toString = function() {
  return 'Pair(' + Z.toString(this[0]) + ', ' + Z.toString(this[1]) + ')';
};

//  $Pair :: Type
var $Pair = $.BinaryType(
  'my-package/Pair',
  'http://example.com/my-package#Pair',
  function(x) { return type(x) === 'my-package/Pair'; },
  function(pair) { return [pair[0]]; },
  function(pair) { return [pair[1]]; }
);


describe('create', function() {

  it('is a unary function', function() {
    eq(typeof $.create, 'function');
    eq($.create.length, 1);
  });

  it('type checks its arguments', function() {
    throws(function() { $.create(true); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'create :: { checkTypes :: Boolean, env :: Array Any } -> Function\n' +
           '          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n' +
           '                               1\n' +
           '\n' +
           '1)  true :: Boolean\n' +
           '\n' +
           'The value at position 1 is not a member of ‘{ checkTypes :: Boolean, env :: Array Any }’.\n');
  });

});

describe('def', function() {

  it('type checks its arguments when checkTypes is true', function() {
    throws(function() { def(null, null, null, null); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'def :: String -> StrMap (Array TypeClass) -> NonEmpty (Array Type) -> Function -> Function\n' +
           '       ^^^^^^\n' +
           '         1\n' +
           '\n' +
           '1)  null :: Null\n' +
           '\n' +
           'The value at position 1 is not a member of ‘String’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#String for information about the String type.\n');

    throws(function() { def('', null, null, null); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'def :: String -> StrMap (Array TypeClass) -> NonEmpty (Array Type) -> Function -> Function\n' +
           '                 ^^^^^^^^^^^^^^^^^^^^^^^^\n' +
           '                            1\n' +
           '\n' +
           '1)  null :: Null\n' +
           '\n' +
           'The value at position 1 is not a member of ‘StrMap (Array TypeClass)’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#StrMap for information about the sanctuary-def/StrMap type.\n');

    throws(function() { def('', {}, [], null); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'def :: String -> StrMap (Array TypeClass) -> NonEmpty (Array Type) -> Function -> Function\n' +
           '                                             ^^^^^^^^^^^^^^^^^^^^^\n' +
           '                                                       1\n' +
           '\n' +
           '1)  [] :: Array a\n' +
           '\n' +
           'The value at position 1 is not a member of ‘NonEmpty (Array Type)’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#NonEmpty for information about the sanctuary-def/NonEmpty type.\n');

    throws(function() { def('', {}, [1, 2, 3], null); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'def :: String -> StrMap (Array TypeClass) -> NonEmpty (Array Type) -> Function -> Function\n' +
           '                                                             ^^^^\n' +
           '                                                              1\n' +
           '\n' +
           '1)  1 :: Number\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Type’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Type for information about the Type type.\n');

    throws(function() { def('', {}, [$.Null], null); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'def :: String -> StrMap (Array TypeClass) -> NonEmpty (Array Type) -> Function -> Function\n' +
           '                                                                      ^^^^^^^^\n' +
           '                                                                         1\n' +
           '\n' +
           '1)  null :: Null\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Function’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Function for information about the Function type.\n');
  });

  it('does not type check its arguments when checkTypes is false', function() {
    var def = $.create({checkTypes: false, env: $.env});

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
           RangeError,
           '‘def’ cannot define a function with arity greater than nine');
  });

  it('returns a function with "inspect" and "toString" methods', function() {
    //  add :: Number -> Number -> Number
    var add =
    def('add',
        {},
        [$.Number, $.Number, $.Number],
        function(x, y) { return x + y; });

    eq(add.inspect(), 'add :: Number -> Number -> Number');
    eq(add.toString(), 'add :: Number -> Number -> Number');

    eq($0.toString(), '$0 :: () -> Array a');
    eq($1.toString(), '$1 :: a -> Array a');
    eq($2.toString(), '$2 :: a -> a -> Array a');
    eq($3.toString(), '$3 :: a -> a -> a -> Array a');
    eq($4.toString(), '$4 :: a -> a -> a -> a -> Array a');
    eq($5.toString(), '$5 :: a -> a -> a -> a -> a -> Array a');
    eq($6.toString(), '$6 :: a -> a -> a -> a -> a -> a -> Array a');
    eq($7.toString(), '$7 :: a -> a -> a -> a -> a -> a -> a -> Array a');
    eq($8.toString(), '$8 :: a -> a -> a -> a -> a -> a -> a -> a -> Array a');
    eq($9.toString(), '$9 :: a -> a -> a -> a -> a -> a -> a -> a -> a -> Array a');

    var __ = $.__;

    eq($3(10).toString(), '$3(10) :: a -> a -> Array a');
    eq($3(10, __).toString(), '$3(10) :: a -> a -> Array a');
    eq($3(__, 20).toString(), '$3(__, 20) :: a -> a -> Array a');
    eq($3(10, 20).toString(), '$3(10, 20) :: a -> Array a');
    eq($3(10, __, __).toString(), '$3(10) :: a -> a -> Array a');
    eq($3(__, 20, __).toString(), '$3(__, 20) :: a -> a -> Array a');
    eq($3(__, __, 30).toString(), '$3(__, __, 30) :: a -> a -> Array a');
    eq($3(10, 20, __).toString(), '$3(10, 20) :: a -> Array a');
    eq($3(10, __, 30).toString(), '$3(10, __, 30) :: a -> Array a');
    eq($3(__, 20, 30).toString(), '$3(__, 20, 30) :: a -> Array a');
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
    //  triple :: Number -> Number -> Number -> Array Number
    var triple =
    def('triple', {}, [$.Number, $.Number, $.Number, $.Array($.Number)], list);

    eq(triple($.__, $.__, 3)($.__, 2)(1), [1, 2, 3]);

    throws(function() { triple($.__, /x/); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'triple :: Number -> Number -> Number -> Array Number\n' +
           '                    ^^^^^^\n' +
           '                      1\n' +
           '\n' +
           '1)  /x/ :: RegExp\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');

    throws(function() { triple($.__, $.__, /x/); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'triple :: Number -> Number -> Number -> Array Number\n' +
           '                              ^^^^^^\n' +
           '                                1\n' +
           '\n' +
           '1)  /x/ :: RegExp\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');

    throws(function() { triple($.__, 2, 3)(/x/); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'triple :: Number -> Number -> Number -> Array Number\n' +
           '          ^^^^^^\n' +
           '            1\n' +
           '\n' +
           '1)  /x/ :: RegExp\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');
  });

  it('returns a function which throws if given too many args', function() {
    throws(function() { $0(1); },
           TypeError,
           'Function applied to too many arguments\n' +
           '\n' +
           '$0 :: () -> Array a\n' +
           '\n' +
           '‘$0’ expected zero arguments but received one argument.\n');

    throws(function() { $1(1, 2); },
           TypeError,
           'Function applied to too many arguments\n' +
           '\n' +
           '$1 :: a -> Array a\n' +
           '\n' +
           '‘$1’ expected at most one argument but received two arguments.\n');

    throws(function() { $2(1, 2, 3); },
           TypeError,
           'Function applied to too many arguments\n' +
           '\n' +
           '$2 :: a -> a -> Array a\n' +
           '\n' +
           '‘$2’ expected at most two arguments but received three arguments.\n');

    throws(function() { $3(1, 2, 3, 4); },
           TypeError,
           'Function applied to too many arguments\n' +
           '\n' +
           '$3 :: a -> a -> a -> Array a\n' +
           '\n' +
           '‘$3’ expected at most three arguments but received four arguments.\n');

    throws(function() { $4(1, 2, 3, 4, 5); },
           TypeError,
           'Function applied to too many arguments\n' +
           '\n' +
           '$4 :: a -> a -> a -> a -> Array a\n' +
           '\n' +
           '‘$4’ expected at most four arguments but received five arguments.\n');

    throws(function() { $5(1, 2, 3, 4, 5, 6); },
           TypeError,
           'Function applied to too many arguments\n' +
           '\n' +
           '$5 :: a -> a -> a -> a -> a -> Array a\n' +
           '\n' +
           '‘$5’ expected at most five arguments but received six arguments.\n');

    throws(function() { $6(1, 2, 3, 4, 5, 6, 7); },
           TypeError,
           'Function applied to too many arguments\n' +
           '\n' +
           '$6 :: a -> a -> a -> a -> a -> a -> Array a\n' +
           '\n' +
           '‘$6’ expected at most six arguments but received seven arguments.\n');

    throws(function() { $7(1, 2, 3, 4, 5, 6, 7, 8); },
           TypeError,
           'Function applied to too many arguments\n' +
           '\n' +
           '$7 :: a -> a -> a -> a -> a -> a -> a -> Array a\n' +
           '\n' +
           '‘$7’ expected at most seven arguments but received eight arguments.\n');

    throws(function() { $8(1, 2, 3, 4, 5, 6, 7, 8, 9); },
           TypeError,
           'Function applied to too many arguments\n' +
           '\n' +
           '$8 :: a -> a -> a -> a -> a -> a -> a -> a -> Array a\n' +
           '\n' +
           '‘$8’ expected at most eight arguments but received nine arguments.\n');

    throws(function() { $9(1, 2, 3, 4, 5, 6, 7, 8, 9, 10); },
           TypeError,
           'Function applied to too many arguments\n' +
           '\n' +
           '$9 :: a -> a -> a -> a -> a -> a -> a -> a -> a -> Array a\n' +
           '\n' +
           '‘$9’ expected at most nine arguments but received 10 arguments.\n');
  });

  it('returns a function which type checks its arguments', function() {
    var N = $.Number;
    var $9 = def('$9', {}, [N, N, N, N, N, N, N, N, N, $.Array(N)], list);

    throws(function() { $9('X'); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
           '      ^^^^^^\n' +
           '        1\n' +
           '\n' +
           '1)  "X" :: String\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');

    throws(function() { $9(1, 'X'); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
           '                ^^^^^^\n' +
           '                  1\n' +
           '\n' +
           '1)  "X" :: String\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');

    throws(function() { $9(1, 2, 'X'); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
           '                          ^^^^^^\n' +
           '                            1\n' +
           '\n' +
           '1)  "X" :: String\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');

    throws(function() { $9(1, 2, 3, 'X'); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
           '                                    ^^^^^^\n' +
           '                                      1\n' +
           '\n' +
           '1)  "X" :: String\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');

    throws(function() { $9(1, 2, 3, 4, 'X'); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
           '                                              ^^^^^^\n' +
           '                                                1\n' +
           '\n' +
           '1)  "X" :: String\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');

    throws(function() { $9(1, 2, 3, 4, 5, 'X'); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
           '                                                        ^^^^^^\n' +
           '                                                          1\n' +
           '\n' +
           '1)  "X" :: String\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');

    throws(function() { $9(1, 2, 3, 4, 5, 6, 'X'); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
           '                                                                  ^^^^^^\n' +
           '                                                                    1\n' +
           '\n' +
           '1)  "X" :: String\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');

    throws(function() { $9(1, 2, 3, 4, 5, 6, 7, 'X'); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
           '                                                                            ^^^^^^\n' +
           '                                                                              1\n' +
           '\n' +
           '1)  "X" :: String\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');

    throws(function() { $9(1, 2, 3, 4, 5, 6, 7, 8, 'X'); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           '$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number\n' +
           '                                                                                      ^^^^^^\n' +
           '                                                                                        1\n' +
           '\n' +
           '1)  "X" :: String\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');

    eq($9(1, 2, 3, 4, 5, 6, 7, 8, 9), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('reports type error correctly for null/undefined', function() {
    //  sqrt :: Number -> Number
    var sqrt = def('sqrt', {}, [$.Number, $.Number], Math.sqrt);

    eq(sqrt(25), 5);

    throws(function() { sqrt(null); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'sqrt :: Number -> Number\n' +
           '        ^^^^^^\n' +
           '          1\n' +
           '\n' +
           '1)  null :: Null\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');

    throws(function() { sqrt(undefined); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'sqrt :: Number -> Number\n' +
           '        ^^^^^^\n' +
           '          1\n' +
           '\n' +
           '1)  undefined :: Undefined\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');
  });

  it('creates a proper curry closure', function() {
    //  a000 :: a -> a -> a -> Array a
    var a000 = def('a00', {}, [a, a, a, $.Array(a)], Array);
    var anum = a000(1);
    var astr = a000('a');
    var bstr = a000($.__, 'b');
    var abstr = astr('b');

    eq(anum(2, 3), [1, 2, 3]);
    eq(anum(2)(3), [1, 2, 3]);
    eq(astr('b', 'c'), ['a', 'b', 'c']);
    eq(bstr('a', 'c'), ['a', 'b', 'c']);
    eq(astr($.__, 'c')('b'), ['a', 'b', 'c']);
    eq(abstr('c'), ['a', 'b', 'c']);
  });

  it('reports type error correctly for parameterized types', function() {
    var env = $.env.concat([Either($.Unknown, $.Unknown), Maybe($.Unknown)]);
    var def = $.create({checkTypes: true, env: env});

    //  a00 :: a -> a -> a
    var a00 = def('a00', {}, [a, a, a], identity);

    //  a01 :: a -> Array a -> a
    var a01 = def('a01', {}, [a, $.Array(a), a], identity);

    //  a02 :: a -> Array (Array a) -> a
    var a02 = def('a02', {}, [a, $.Array($.Array(a)), a], identity);

    //  ab02e :: a -> b -> Array (Array (Either a b)) -> a
    var ab02e = def('ab02e', {}, [a, b, $.Array($.Array(Either(a, b))), a], identity);

    //  ab0e21 :: a -> b -> Either (Array (Array a)) (Array b) -> a
    var ab0e21 = def('ab0e21', {}, [a, b, Either($.Array($.Array(a)), $.Array(b)), a], identity);

    throws(function() { a00(1, 'a'); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { a00(1, ['a']); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { a00(1, Just(1)); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { a01(1, ['a', 'b']); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { a01([1, 2], [1, 2, 3, 4]); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { a01([1, 2], [['a', 'b'], ['c', 'd']]); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { a01([[1, 2], [3, 4]], [[1, 2], [3, 4]]); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { a02([1, 2], [[1, 2], [3, 4, 5, 6]]); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { ab02e(1, 'x', [[Left('a'), Left('b')], [Left('c'), Left('d')]]); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { ab02e(1, 'x', [[Right(1), Right(2)], [Right(3), Right(4)]]); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { ab0e21(1, 'x', Left([['a', 'b'], ['c', 'd']])); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { ab0e21(1, 'x', Right([1, 2])); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');
  });

  it('throws custom error for unrecognized value (empty env)', function() {
    var env = [];
    var def = $.create({checkTypes: true, env: env});

    //  id :: a -> a
    var id = def('id', {}, [a, a], identity);

    throws(function() { id(/xxx/); },
           TypeError,
           'Unrecognized value\n' +
           '\n' +
           'id :: a -> a\n' +
           '      ^\n' +
           '      1\n' +
           '\n' +
           '1)  /xxx/ :: (no types)\n' +
           '\n' +
           'The environment is empty! Polymorphic functions require a non-empty environment.\n');
  });

  it('throws custom error for unrecognized value (non-empty env)', function() {
    var env = [$.Array($.Unknown), $.Boolean, $.Number, $.String];
    var def = $.create({checkTypes: true, env: env});

    //  id :: a -> a
    var id = def('id', {}, [a, a], identity);

    throws(function() { id(/xxx/); },
           TypeError,
           'Unrecognized value\n' +
           '\n' +
           'id :: a -> a\n' +
           '      ^\n' +
           '      1\n' +
           '\n' +
           '1)  /xxx/ :: (no types)\n' +
           '\n' +
           'The value at position 1 is not a member of any type in the environment.\n' +
           '\n' +
           'The environment contains the following types:\n' +
           '\n' +
           '  - Array b\n' +
           '  - Boolean\n' +
           '  - Number\n' +
           '  - String\n');
  });

  it('returns a function which type checks its return value', function() {
    //  add :: Number -> Number -> Number
    var add = def('add', {}, [$.Number, $.Number, $.Number], always('XXX'));

    throws(function() { add(2, 2); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'add :: Number -> Number -> Number\n' +
           '                           ^^^^^^\n' +
           '                             1\n' +
           '\n' +
           '1)  "XXX" :: String\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');
  });

  it('performs type checking when a "returned" function is applied', function() {
    //  lt :: Ord a => a -> (a -> Boolean)
    var lt =
    def('lt',
        {a: [Z.Ord]},
        [a, $.Function([a, $.Boolean])],
        function(y) { return function(x) { return x < y; }; });

    eq(lt(1)(0), true);
    eq(lt(1)(1), false);
    eq(lt(1)(2), false);

    throws(function() { lt(123)('abc'); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'lt :: Ord a => a -> (a -> Boolean)\n' +
           '               ^     ^\n' +
           '               1     2\n' +
           '\n' +
           '1)  123 :: Number\n' +
           '\n' +
           '2)  "abc" :: String\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');
  });

  it('does not rely on constructor identity', function() {
    //  inc :: Date -> Date
    var inc = def('inc', {}, [$.Date, $.Date], function(date) { return new Date(date.valueOf() + 1); });

    eq(inc(new Date(42)), new Date(43));
    eq(inc(vm.runInNewContext('new Date(42)')), new Date(43));

    //  len :: Array String -> Number
    var len = def('len', {}, [$.Array($.String), $.Number], length);

    eq(len(['foo', 'bar', 'baz']), 3);
    eq(len(vm.runInNewContext('["foo", "bar", "baz"]')), 3);
  });

  it('accommodates circular references', function() {
    //  id :: a -> a
    var id = def('id', {}, [a, a], identity);

    var x = {name: 'x'};
    var y = {name: 'y'};
    x.y = y;
    y.x = x;

    eq(id(x), x);

    var z = [];
    z.push(z);

    throws(function() { id(z); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'id :: a -> a\n' +
           '      ^\n' +
           '      1\n' +
           '\n' +
           '1)  [<Circular>] :: Array ???\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');
  });

  it('supports custom types', function() {
    //  fromMaybe :: a -> Maybe a
    var fromMaybe =
    def('fromMaybe',
        {},
        [a, Maybe(a), a],
        function(x, maybe) { return maybe.isJust ? maybe.value : x; });

    throws(function() { fromMaybe('x', Just(null)); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'fromMaybe :: a -> Maybe a -> a\n' +
           '             ^          ^\n' +
           '             1          2\n' +
           '\n' +
           '1)  "x" :: String\n' +
           '\n' +
           '2)  null :: Null\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');
  });

  it('supports enumerated types', function() {
    eq(typeof $.EnumType, 'function');
    eq($.EnumType.length, 3);
    eq($.EnumType.toString(), 'EnumType :: String -> String -> Array Any -> Type');

    //  TimeUnit :: Type
    var TimeUnit = $.EnumType('my-package/TimeUnit', '', ['milliseconds', 'seconds', 'minutes', 'hours']);

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
           TypeError,
           'Invalid value\n' +
           '\n' +
           'convertTo :: TimeUnit -> ValidDate -> ValidNumber\n' +
           '             ^^^^^^^^\n' +
           '                1\n' +
           '\n' +
           '1)  "days" :: String\n' +
           '\n' +
           'The value at position 1 is not a member of ‘TimeUnit’.\n');

    eq(convertTo('seconds', new Date(1000)), 1);

    //  SillyType :: Type
    var SillyType = $.EnumType('my-package/SillyType', '', ['foo', true, 42]);

    var _env = $.env.concat([SillyType]);
    var _def = $.create({checkTypes: true, env: _env});

    //  id :: a -> a
    var id = _def('id', {}, [a, a], identity);

    eq(id('foo'), 'foo');
    eq(id('bar'), 'bar');
    eq(id(true), true);
    eq(id(false), false);
    eq(id(42), 42);
    eq(id(-42), -42);

    eq(id(['foo', true]), ['foo', true]);

    throws(function() { id(['foo', false]); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'id :: a -> a\n' +
           '      ^\n' +
           '      1\n' +
           '\n' +
           '1)  ["foo", false] :: Array ???\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');
  });

  it('supports record types', function() {
    eq(typeof $.RecordType, 'function');
    eq($.RecordType.length, 1);
    eq($.RecordType.toString(), 'RecordType :: StrMap Type -> Type');

    //  Point :: Type
    var Point = $.RecordType({x: $.Number, y: $.Number});

    //  Line :: Type
    var Line = $.RecordType({start: Point, end: Point});

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
           TypeError,
           'Invalid value\n' +
           '\n' +
           'dist :: { x :: Number, y :: Number } -> { x :: Number, y :: Number } -> Number\n' +
           '        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n' +
           '                     1\n' +
           '\n' +
           '1)  null :: Null\n' +
           '\n' +
           'The value at position 1 is not a member of ‘{ x :: Number, y :: Number }’.\n');

    throws(function() { dist({}); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'dist :: { x :: Number, y :: Number } -> { x :: Number, y :: Number } -> Number\n' +
           '        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n' +
           '                     1\n' +
           '\n' +
           '1)  {} :: Object, StrMap a\n' +
           '\n' +
           'The value at position 1 is not a member of ‘{ x :: Number, y :: Number }’.\n');

    throws(function() { dist({x: 0}); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'dist :: { x :: Number, y :: Number } -> { x :: Number, y :: Number } -> Number\n' +
           '        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n' +
           '                     1\n' +
           '\n' +
           '1)  {"x": 0} :: Object, StrMap Number\n' +
           '\n' +
           'The value at position 1 is not a member of ‘{ x :: Number, y :: Number }’.\n');

    throws(function() { dist({x: 0, y: null}); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'dist :: { x :: Number, y :: Number } -> { x :: Number, y :: Number } -> Number\n' +
           '                            ^^^^^^\n' +
           '                              1\n' +
           '\n' +
           '1)  null :: Null\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');

    throws(function() { length({start: 0, end: 0}); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'length :: { end :: { x :: Number, y :: Number }, start :: { x :: Number, y :: Number } } -> Number\n' +
           '                   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n' +
           '                                1\n' +
           '\n' +
           '1)  0 :: Number\n' +
           '\n' +
           'The value at position 1 is not a member of ‘{ x :: Number, y :: Number }’.\n');

    throws(function() { length({start: {x: 0, y: 0}, end: {x: null, y: null}}); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'length :: { end :: { x :: Number, y :: Number }, start :: { x :: Number, y :: Number } } -> Number\n' +
           '                          ^^^^^^\n' +
           '                            1\n' +
           '\n' +
           '1)  null :: Null\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');

    //  id :: a -> a
    var id = def('id', {}, [a, a], identity);

    eq(id([{x: 0, y: 0}, {x: 1, y: 1}]), [{x: 0, y: 0}, {x: 1, y: 1}]);

    throws(function() { $.RecordType({x: /XXX/, y: /XXX/, z: $.Any}); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'RecordType :: StrMap Type -> Type\n' +
           '                     ^^^^\n' +
           '                      1\n' +
           '\n' +
           '1)  /XXX/ :: RegExp\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Type’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Type for information about the Type type.\n');

    //  Foo :: Type
    var Foo = $.RecordType({x: a, y: a});

    //  foo :: Foo -> Foo
    var foo = def('foo', {}, [Foo, Foo], identity);

    eq(foo({x: 1, y: 2, z: 3}), {x: 1, y: 2, z: 3});

    throws(function() { foo({x: 'abc', y: 123}); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'foo :: { x :: a, y :: a } -> { x :: a, y :: a }\n' +
           '              ^       ^\n' +
           '              1       2\n' +
           '\n' +
           '1)  "abc" :: String\n' +
           '\n' +
           '2)  123 :: Number\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');
  });

  it('supports "nullable" types', function() {
    eq(typeof $.Nullable, 'function');
    eq($.Nullable.length, 1);
    eq($.Nullable.toString(), 'Nullable :: Type -> Type');

    throws(function() { $.Nullable(null); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'Nullable :: Type -> Type\n' +
           '            ^^^^\n' +
           '             1\n' +
           '\n' +
           '1)  null :: Null\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Type’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Type for information about the Type type.\n');

    //  toUpper :: Nullable String -> Nullable String
    var toUpper =
    def('toUpper',
        {},
        [$.Nullable($.String), $.Nullable($.String)],
        function(ns) {
          // eslint-disable-next-line eqeqeq
          return ns === null ? null : ns.toUpperCase();
        });

    eq(toUpper(null), null);
    eq(toUpper('abc'), 'ABC');

    throws(function() { toUpper(['abc']); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'toUpper :: Nullable String -> Nullable String\n' +
           '                    ^^^^^^\n' +
           '                      1\n' +
           '\n' +
           '1)  ["abc"] :: Array String\n' +
           '\n' +
           'The value at position 1 is not a member of ‘String’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#String for information about the String type.\n');

    //  defaultTo :: a -> Nullable a -> a
    var defaultTo =
    def('defaultTo',
        {},
        [a, $.Nullable(a), a],
        function(x, nullable) {
          // eslint-disable-next-line eqeqeq
          return nullable === null ? x : nullable;
        });

    eq(defaultTo(0, null), 0);
    eq(defaultTo(0, 42), 42);

    throws(function() { defaultTo(0, 'XXX'); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    //  f :: Nullable a -> Nullable a
    var f = def('f', {}, [$.Nullable(a), $.Nullable(a)], always(42));

    eq(f(null), 42);
    eq(f(0), 42);

    throws(function() { f('XXX'); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');
  });

  it('provides the "Any" type', function() {
    eq($.Any.name, 'sanctuary-def/Any');
    eq($.Any.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Any');
  });

  it('provides the "AnyFunction" type', function() {
    eq($.AnyFunction.name, 'Function');
    eq($.AnyFunction.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Function');

    function Identity(x) { this.value = x; }
    Identity['@@type'] = 'my-package/Identity';

    function isAnyFunction(x) {
      return $.test($.env, $.AnyFunction, x);
    }
    eq(isAnyFunction(null), false);
    eq(isAnyFunction(Math.abs), true);
    eq(isAnyFunction(Identity), true);
    eq(isAnyFunction(function*(x) { return x; }), true);
  });

  it('provides the "Arguments" type', function() {
    eq($.Arguments.name, 'Arguments');
    eq($.Arguments.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Arguments');
  });

  it('provides the "Array" type constructor', function() {
    eq($.Array(a).name, 'Array');
    eq($.Array(a).url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Array');
  });

  it('provides the "Boolean" type', function() {
    eq($.Boolean.name, 'Boolean');
    eq($.Boolean.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Boolean');
  });

  it('provides the "Date" type', function() {
    eq($.Date.name, 'Date');
    eq($.Date.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Date');
  });

  it('provides the "Error" type', function() {
    eq($.Error.name, 'Error');
    eq($.Error.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Error');
  });

  it('provides the "Function" type constructor', function() {
    eq($.Function([a, a]).name, '');
    eq($.Function([a, a]).url, '');
  });

  it('provides the "NonEmpty" type constructor', function() {
    eq($.NonEmpty($.String).name, 'sanctuary-def/NonEmpty');
    eq($.NonEmpty($.String).url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#NonEmpty');

    function isNonEmptyIntegerArray(x) {
      return $.test($.env, $.NonEmpty($.Array($.Integer)), x);
    }
    eq(isNonEmptyIntegerArray([]), false);
    eq(isNonEmptyIntegerArray([0]), true);
    eq(isNonEmptyIntegerArray([0.5]), false);
  });

  it('provides the "Null" type', function() {
    eq($.Null.name, 'Null');
    eq($.Null.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Null');
  });

  it('provides the "Nullable" type constructor', function() {
    eq($.Nullable(a).name, 'sanctuary-def/Nullable');
    eq($.Nullable(a).url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Nullable');
  });

  it('provides the "Number" type', function() {
    eq($.Number.name, 'Number');
    eq($.Number.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number');
  });

  it('provides the "Object" type', function() {
    eq($.Object.name, 'Object');
    eq($.Object.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Object');
  });

  it('provides the "RegExp" type', function() {
    eq($.RegExp.name, 'RegExp');
    eq($.RegExp.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#RegExp');
  });

  it('provides the "String" type', function() {
    eq($.String.name, 'String');
    eq($.String.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#String');
  });

  it('provides the "Symbol" type', function() {
    eq($.Symbol.name, 'Symbol');
    eq($.Symbol.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Symbol');
  });

  it('provides the "Type" type', function() {
    eq($.Type.name, 'Type');
    eq($.Type.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Type');
  });

  it('provides the "TypeClass" type', function() {
    eq($.TypeClass.name, 'TypeClass');
    eq($.TypeClass.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#TypeClass');
  });

  it('provides the "Undefined" type', function() {
    eq($.Undefined.name, 'Undefined');
    eq($.Undefined.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Undefined');
  });

  it('provides the "Unknown" type', function() {
    eq($.Unknown.name, '');
    eq($.Unknown.url, '');
  });

  it('provides the "ValidDate" type', function() {
    eq($.ValidDate.name, 'sanctuary-def/ValidDate');
    eq($.ValidDate.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#ValidDate');

    //  sinceEpoch :: ValidDate -> Number
    var sinceEpoch = def('sinceEpoch',
                         {},
                         [$.ValidDate, $.Number],
                         function(date) { return date.valueOf() / 1000; });

    throws(function() { sinceEpoch(new Date('foo')); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'sinceEpoch :: ValidDate -> Number\n' +
           '              ^^^^^^^^^\n' +
           '                  1\n' +
           '\n' +
           '1)  new Date(NaN) :: Date\n' +
           '\n' +
           'The value at position 1 is not a member of ‘ValidDate’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#ValidDate for information about the sanctuary-def/ValidDate type.\n');

    eq(sinceEpoch(new Date(123456)), 123.456);
  });

  it('provides the "PositiveNumber" type', function() {
    eq($.PositiveNumber.name, 'sanctuary-def/PositiveNumber');
    eq($.PositiveNumber.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#PositiveNumber');

    function isPositiveNumber(x) {
      return $.test($.env, $.PositiveNumber, x);
    }
    eq(isPositiveNumber(null), false);
    eq(isPositiveNumber(NaN), false);
    eq(isPositiveNumber(-1), false);
    eq(isPositiveNumber(0), false);
    eq(isPositiveNumber(-0), false);
    eq(isPositiveNumber(0.5), true);
    eq(isPositiveNumber(Infinity), true);
    eq(isPositiveNumber(new Number(Infinity)), false);
  });

  it('provides the "NegativeNumber" type', function() {
    eq($.NegativeNumber.name, 'sanctuary-def/NegativeNumber');
    eq($.NegativeNumber.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#NegativeNumber');

    function isNegativeNumber(x) {
      return $.test($.env, $.NegativeNumber, x);
    }
    eq(isNegativeNumber(null), false);
    eq(isNegativeNumber(NaN), false);
    eq(isNegativeNumber(1), false);
    eq(isNegativeNumber(0), false);
    eq(isNegativeNumber(-0), false);
    eq(isNegativeNumber(-0.5), true);
    eq(isNegativeNumber(-Infinity), true);
    eq(isNegativeNumber(new Number(-Infinity)), false);
  });

  it('provides the "ValidNumber" type', function() {
    eq($.ValidNumber.name, 'sanctuary-def/ValidNumber');
    eq($.ValidNumber.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#ValidNumber');

    function isValidNumber(x) {
      return $.test($.env, $.ValidNumber, x);
    }
    eq(isValidNumber(NaN), false);
    eq(isValidNumber(1), true);
    eq(isValidNumber(new Number(1)), false);
  });

  it('provides the "NonZeroValidNumber" type', function() {
    eq($.NonZeroValidNumber.name, 'sanctuary-def/NonZeroValidNumber');
    eq($.NonZeroValidNumber.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#NonZeroValidNumber');

    function isNonZeroValidNumber(x) {
      return $.test($.env, $.NonZeroValidNumber, x);
    }
    eq(isNonZeroValidNumber(0), false);
    eq(isNonZeroValidNumber(-0), false);
    eq(isNonZeroValidNumber(1), true);
    eq(isNonZeroValidNumber(new Number(1)), false);
  });

  it('provides the "FiniteNumber" type', function() {
    eq($.FiniteNumber.name, 'sanctuary-def/FiniteNumber');
    eq($.FiniteNumber.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#FiniteNumber');

    function isFiniteNumber(x) {
      return $.test($.env, $.FiniteNumber, x);
    }
    eq(isFiniteNumber(Infinity), false);
    eq(isFiniteNumber(-Infinity), false);
    eq(isFiniteNumber(1), true);
    eq(isFiniteNumber(new Number(1)), false);
  });

  it('provides the "PositiveFiniteNumber" type', function() {
    eq($.PositiveFiniteNumber.name, 'sanctuary-def/PositiveFiniteNumber');
    eq($.PositiveFiniteNumber.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#PositiveFiniteNumber');

    function isPositiveFiniteNumber(x) {
      return $.test($.env, $.PositiveFiniteNumber, x);
    }
    eq(isPositiveFiniteNumber(null), false);
    eq(isPositiveFiniteNumber(NaN), false);
    eq(isPositiveFiniteNumber(Infinity), false);
    eq(isPositiveFiniteNumber(-1), false);
    eq(isPositiveFiniteNumber(0), false);
    eq(isPositiveFiniteNumber(-0), false);
    eq(isPositiveFiniteNumber(0.5), true);
    eq(isPositiveFiniteNumber(new Number(0.5)), false);
  });

  it('provides the "NegativeFiniteNumber" type', function() {
    eq($.NegativeFiniteNumber.name, 'sanctuary-def/NegativeFiniteNumber');
    eq($.NegativeFiniteNumber.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#NegativeFiniteNumber');

    function isNegativeFiniteNumber(x) {
      return $.test($.env, $.NegativeFiniteNumber, x);
    }
    eq(isNegativeFiniteNumber(null), false);
    eq(isNegativeFiniteNumber(NaN), false);
    eq(isNegativeFiniteNumber(-Infinity), false);
    eq(isNegativeFiniteNumber(1), false);
    eq(isNegativeFiniteNumber(0), false);
    eq(isNegativeFiniteNumber(-0), false);
    eq(isNegativeFiniteNumber(-0.5), true);
    eq(isNegativeFiniteNumber(new Number(-0.5)), false);
  });

  it('provides the "NonZeroFiniteNumber" type', function() {
    eq($.NonZeroFiniteNumber.name, 'sanctuary-def/NonZeroFiniteNumber');
    eq($.NonZeroFiniteNumber.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#NonZeroFiniteNumber');

    function isNonZeroFiniteNumber(x) {
      return $.test($.env, $.NonZeroFiniteNumber, x);
    }
    eq(isNonZeroFiniteNumber(0), false);
    eq(isNonZeroFiniteNumber(-0), false);
    eq(isNonZeroFiniteNumber(Infinity), false);
    eq(isNonZeroFiniteNumber(-Infinity), false);
    eq(isNonZeroFiniteNumber(1), true);
    eq(isNonZeroFiniteNumber(new Number(1)), false);
  });

  it('provides the "Integer" type', function() {
    eq($.Integer.name, 'sanctuary-def/Integer');
    eq($.Integer.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Integer');

    function isInteger(x) {
      return $.test($.env, $.Integer, x);
    }
    eq(isInteger(3.14), false);
    eq(isInteger(9007199254740992), false);
    eq(isInteger(-9007199254740992), false);
    eq(isInteger(1), true);
    eq(isInteger(new Number(1)), false);
  });

  it('provides the "NonZeroInteger" type', function() {
    eq($.NonZeroInteger.name, 'sanctuary-def/NonZeroInteger');
    eq($.NonZeroInteger.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#NonZeroInteger');

    function isNonZeroInteger(x) {
      return $.test($.env, $.NonZeroInteger, x);
    }
    eq(isNonZeroInteger(0), false);
    eq(isNonZeroInteger(-0), false);
    eq(isNonZeroInteger(3.14), false);
    eq(isNonZeroInteger(1), true);
    eq(isNonZeroInteger(new Number(1)), false);
  });

  it('provides the "NonNegativeInteger" type', function() {
    eq($.NonNegativeInteger.name, 'sanctuary-def/NonNegativeInteger');
    eq($.NonNegativeInteger.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#NonNegativeInteger');

    function isNonNegativeInteger(x) {
      return $.test($.env, $.NonNegativeInteger, x);
    }
    eq(isNonNegativeInteger(0), true);
    eq(isNonNegativeInteger(-0), true);
    eq(isNonNegativeInteger(1), true);
    eq(isNonNegativeInteger(-1), false);
    eq(isNonNegativeInteger(3.14), false);
    eq(isNonNegativeInteger(new Number(1)), false);
  });

  it('provides the "PositiveInteger" type', function() {
    eq($.PositiveInteger.name, 'sanctuary-def/PositiveInteger');
    eq($.PositiveInteger.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#PositiveInteger');

    function isPositiveInteger(x) {
      return $.test($.env, $.PositiveInteger, x);
    }
    eq(isPositiveInteger(1.5), false);
    eq(isPositiveInteger(-1), false);
    eq(isPositiveInteger(1), true);
    eq(isPositiveInteger(new Number(1)), false);
  });

  it('provides the "NegativeInteger" type', function() {
    eq($.NegativeInteger.name, 'sanctuary-def/NegativeInteger');
    eq($.NegativeInteger.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#NegativeInteger');

    function isNegativeInteger(x) {
      return $.test($.env, $.NegativeInteger, x);
    }
    eq(isNegativeInteger(-1.5), false);
    eq(isNegativeInteger(1), false);
    eq(isNegativeInteger(-1), true);
    eq(isNegativeInteger(new Number(-1)), false);
  });

  it('provides the "GlobalRegExp" type', function() {
    eq($.GlobalRegExp.name, 'sanctuary-def/GlobalRegExp');
    eq($.GlobalRegExp.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#GlobalRegExp');

    function isGlobalRegExp(x) {
      return $.test($.env, $.GlobalRegExp, x);
    }
    eq(isGlobalRegExp(null), false);
    eq(isGlobalRegExp({global: true}), false);
    eq(isGlobalRegExp(/x/), false);
    eq(isGlobalRegExp(/x/i), false);
    eq(isGlobalRegExp(/x/m), false);
    eq(isGlobalRegExp(/x/im), false);
    eq(isGlobalRegExp(/x/g), true);
    eq(isGlobalRegExp(/x/gi), true);
    eq(isGlobalRegExp(/x/gm), true);
    eq(isGlobalRegExp(/x/gim), true);
  });

  it('provides the "NonGlobalRegExp" type', function() {
    eq($.NonGlobalRegExp.name, 'sanctuary-def/NonGlobalRegExp');
    eq($.NonGlobalRegExp.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#NonGlobalRegExp');

    function isNonGlobalRegExp(x) {
      return $.test($.env, $.NonGlobalRegExp, x);
    }
    eq(isNonGlobalRegExp(null), false);
    eq(isNonGlobalRegExp({global: false}), false);
    eq(isNonGlobalRegExp(/x/g), false);
    eq(isNonGlobalRegExp(/x/gi), false);
    eq(isNonGlobalRegExp(/x/gm), false);
    eq(isNonGlobalRegExp(/x/gim), false);
    eq(isNonGlobalRegExp(/x/), true);
    eq(isNonGlobalRegExp(/x/i), true);
    eq(isNonGlobalRegExp(/x/m), true);
    eq(isNonGlobalRegExp(/x/im), true);
  });

  it('provides the "RegexFlags" type', function() {
    eq($.RegexFlags.name, 'sanctuary-def/RegexFlags');
    eq($.RegexFlags.url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#RegexFlags');

    function isRegexFlags(x) {
      return $.test($.env, $.RegexFlags, x);
    }
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

  it('provides the "StrMap" type constructor', function() {
    eq(typeof $.StrMap, 'function');
    eq($.StrMap.length, 1);
    eq($.StrMap.toString(), 'StrMap :: Type -> Type');
    eq($.StrMap(a).name, 'sanctuary-def/StrMap');
    eq($.StrMap(a).url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#StrMap');
    eq($.StrMap(a).toString(), '(StrMap a)');

    //  id :: a -> a
    var id = def('id', {}, [a, a], identity);

    //  keys :: StrMap a -> Array String
    var keys =
    def('keys',
        {},
        [$.StrMap(a), $.Array($.String)],
        function(m) { return Object.keys(m).sort(); });

    //  values :: StrMap a -> Array a
    var values =
    def('values',
        {},
        [$.StrMap(a), $.Array(a)],
        function(m) { return keys(m).map(function(k) { return m[k]; }); });

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
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'keys :: StrMap a -> Array String\n' +
           '               ^\n' +
           '               1\n' +
           '\n' +
           '1)  1 :: Number\n' +
           '    "XXX" :: String\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    eq(values({}), []);
    eq(values({x: 1, y: 2, z: 3}), [1, 2, 3]);
    eq(values(o), [1, 2, 3]);

    throws(function() { values({a: 1, b: 'XXX'}); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'values :: StrMap a -> Array a\n' +
           '                 ^\n' +
           '                 1\n' +
           '\n' +
           '1)  1 :: Number\n' +
           '    "XXX" :: String\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    //  testUnaryType :: Array (StrMap Number) -> Array (StrMap Number)
    var testUnaryType =
    def('testUnaryType',
        {},
        [$.Array($.StrMap($.Number)), $.Array($.StrMap($.Number))],
        identity);

    eq(testUnaryType([{x: 1}, {y: 2}, {z: 3}]), [{x: 1}, {y: 2}, {z: 3}]);

    throws(function() { testUnaryType([{x: /xxx/}]); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'testUnaryType :: Array (StrMap Number) -> Array (StrMap Number)\n' +
           '                               ^^^^^^\n' +
           '                                 1\n' +
           '\n' +
           '1)  /xxx/ :: RegExp\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');

    //  testBinaryType :: Either a (StrMap b) -> Either a (StrMap b)
    var testBinaryType =
    def('testBinaryType',
        {},
        [Either(a, $.StrMap(b)), Either(a, $.StrMap(b))],
        identity);

    eq(testBinaryType(Left('XXX')), Left('XXX'));
    eq(testBinaryType(Right({x: 1, y: 2, z: 3})), Right({x: 1, y: 2, z: 3}));

    throws(function() { testBinaryType(Right({x: ['foo', false]})); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'testBinaryType :: Either a (StrMap b) -> Either a (StrMap b)\n' +
           '                                   ^\n' +
           '                                   1\n' +
           '\n' +
           '1)  ["foo", false] :: Array ???\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');
  });

  it('provides the "Pair" type constructor', function() {
    eq(typeof $.Pair, 'function');
    eq($.Pair.length, 2);
    eq($.Pair.toString(), 'Pair :: Type -> Type -> Type');
    eq($.Pair(a, b).name, 'sanctuary-def/Pair');
    eq($.Pair(a, b).url, 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Pair');
    eq($.Pair(a, b).toString(), '(Pair a b)');
    eq($.Pair(a)(b).toString(), '(Pair a b)');

    //  fst :: Pair a b -> a
    var fst = def('fst', {}, [$.Pair(a, b), a], function(pair) { return pair[0]; });

    //  snd :: Pair a b -> b
    var snd = def('snd', {}, [$.Pair(a, b), b], function(pair) { return pair[1]; });

    eq(fst(['foo', 42]), 'foo');
    eq(snd(['foo', 42]), 42);

    throws(function() { fst(['foo']); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'fst :: Pair a b -> a\n' +
           '       ^^^^^^^^\n' +
           '          1\n' +
           '\n' +
           '1)  ["foo"] :: Array String\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Pair a b’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Pair for information about the sanctuary-def/Pair type.\n');
  });

  it('uses Z.toString-like string representations', function() {
    //  f :: Null -> Null
    var f = def('f', {}, [$.Null, $.Null], identity);

    function Point(x, y) {
      this.x = x;
      this.y = y;
    }
    Point.prototype._private = true;

    var o1 = {id: 1};
    var o2 = {id: 2};
    o1.ref = o2;
    o2.ref = o1;

    var values = [
      [(function() { return arguments; }(1, 2, 3)), 'Arguments'],
      [new Boolean(false), ''],
      [new Date(0), 'Date'],
      [new Date('XXX'), 'Date'],
      [new Number(-0), ''],
      [new String(''), ''],
      [/x/.exec('xyz'), 'Array String'],
      [(function() { var xs = [1, 2, 3]; xs.z = 0; xs.a = 0; return xs; }()), 'Array Number'],
      [{toString: null}, 'Object, StrMap Null'],
      [new Point(0, 0), 'Object, StrMap Number'],
      [o1, 'Object, StrMap ???']
    ];

    values.forEach(function(pair) {
      var x = pair[0];
      var types = pair[1];
      throws(function() { f(x); },
             TypeError,
             'Invalid value\n' +
             '\n' +
             'f :: Null -> Null\n' +
             '     ^^^^\n' +
             '      1\n' +
             '\n' +
             '1)  ' + Z.toString(x) + ' ::' + (types.length > 0 ? ' ' + types : '') + '\n' +
             '\n' +
             'The value at position 1 is not a member of ‘Null’.\n' +
             '\n' +
             'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Null for information about the Null type.\n');
    });
  });

  it('lists the types of each value without duplicates', function() {
    var env = [$.Array($.Unknown), $.Number, $.Integer];
    var def = $.create({checkTypes: true, env: env});

    //  add :: Number -> Number -> Number
    var add =
    def('add',
        {},
        [$.Number, $.Number, $.Number],
        function(x, y) { return x + y; });

    throws(function() { add([[1], [2]]); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'add :: Number -> Number -> Number\n' +
           '       ^^^^^^\n' +
           '         1\n' +
           '\n' +
           '1)  [[1], [2]] :: Array (Array Number), Array (Array Integer)\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');
  });

  it('supports polymorphism via type variables', function() {
    var env = $.env.concat([Either($.Unknown, $.Unknown), Maybe($.Unknown), $Pair($.Unknown, $.Unknown)]);
    var def = $.create({checkTypes: true, env: env});

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
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { aa($.__, 0)(/x/); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { aa([Left('XXX'), 42]); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'aa :: a -> a -> Pair a a\n' +
           '      ^\n' +
           '      1\n' +
           '\n' +
           '1)  [Left("XXX"), 42] :: Array ???\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    //  fromMaybe :: a -> Maybe a -> a
    var fromMaybe = def('fromMaybe', {}, [a, Maybe(a), a], function(x, maybe) {
      return maybe.isJust ? maybe.value : x;
    });

    eq(fromMaybe(0, Nothing), 0);
    eq(fromMaybe(0, Just(42)), 42);

    throws(function() { fromMaybe(0, [1, 2, 3]); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'fromMaybe :: a -> Maybe a -> a\n' +
           '                  ^^^^^^^\n' +
           '                     1\n' +
           '\n' +
           '1)  [1, 2, 3] :: Array Number\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Maybe a’.\n' +
           '\n' +
           'See http://example.com/my-package#Maybe for information about the my-package/Maybe type.\n');

    //  fst :: Pair a b -> a
    var fst = def('fst', {}, [$Pair(a, b), a], function(pair) { return pair[0]; });

    eq(fst(Pair('XXX', 42)), 'XXX');

    throws(function() { fst(['XXX', 42]); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'fst :: Pair a b -> a\n' +
           '       ^^^^^^^^\n' +
           '          1\n' +
           '\n' +
           '1)  ["XXX", 42] :: Array ???\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Pair a b’.\n' +
           '\n' +
           'See http://example.com/my-package#Pair for information about the my-package/Pair type.\n');

    //  twin :: Pair a a -> Boolean
    var twin =
    def('twin',
        {},
        [$Pair(a, a), $.Boolean],
        function(pair) { return Z.equals(pair[0], pair[1]); });

    eq(twin(Pair(42, 42)), true);
    eq(twin(Pair(42, 99)), false);

    throws(function() { twin(Pair(42, 'XXX')); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'twin :: Pair a a -> Boolean\n' +
           '             ^ ^\n' +
           '             1 2\n' +
           '\n' +
           '1)  42 :: Number\n' +
           '\n' +
           '2)  "XXX" :: String\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    //  concat :: Either a b -> Either a b -> Either a b
    var concat =
    def('concat',
        {},
        [Either(a, b), Either(a, b), Either(a, b)],
        Z.concat);

    eq(concat(Left('abc'), Left('def')), Left('abcdef'));
    eq(concat(Left('abc'), Right('ABC')), Right('ABC'));
    eq(concat(Right('ABC'), Left('abc')), Right('ABC'));
    eq(concat(Right('ABC'), Right('DEF')), Right('ABCDEF'));

    throws(function() { concat(Left('abc'), Left([1, 2, 3])); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { concat(Right('abc'), Right([1, 2, 3])); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    //  f :: a -> a -> a -> a
    var f = def('f', {}, [a, a, a, a], function(x, y, z) { return x; });

    throws(function() { f(Left('abc'), Left(/XXX/)); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'f :: a -> a -> a -> a\n' +
           '     ^    ^\n' +
           '     1    2\n' +
           '\n' +
           '1)  Left("abc") :: Either String b\n' +
           '\n' +
           '2)  Left(/XXX/) :: Either RegExp b\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { f(Right(123), Right(/XXX/)); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'f :: a -> a -> a -> a\n' +
           '     ^    ^\n' +
           '     1    2\n' +
           '\n' +
           '1)  Right(123) :: Either b Number\n' +
           '\n' +
           '2)  Right(/XXX/) :: Either b RegExp\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { f(Left('abc'), Right(123), Left(/XXX/)); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'f :: a -> a -> a -> a\n' +
           '     ^         ^\n' +
           '     1         2\n' +
           '\n' +
           '1)  Left("abc") :: Either String b\n' +
           '\n' +
           '2)  Left(/XXX/) :: Either RegExp b\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { f(Left('abc'), Right(123), Right(/XXX/)); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'f :: a -> a -> a -> a\n' +
           '          ^    ^\n' +
           '          1    2\n' +
           '\n' +
           '1)  Right(123) :: Either b Number\n' +
           '\n' +
           '2)  Right(/XXX/) :: Either b RegExp\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');
  });

  it('supports arbitrary nesting of types', function() {
    var env = $.env.concat([Either($.Unknown, $.Unknown), $.Integer]);
    var def = $.create({checkTypes: true, env: env});

    //  unnest :: Array (Array a) -> Array a
    var unnest =
    def('unnest',
        {},
        [$.Array($.Array(a)), $.Array(a)],
        function(xss) { return Z.chain(identity, xss); });

    eq(unnest([[1, 2], [3, 4], [5, 6]]), [1, 2, 3, 4, 5, 6]);
    eq(unnest([[null], [null], [null]]), [null, null, null]);

    throws(function() { unnest([1, 2, 3]); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'unnest :: Array (Array a) -> Array a\n' +
           '                ^^^^^^^^^\n' +
           '                    1\n' +
           '\n' +
           '1)  1 :: Number, Integer\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Array a’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Array for information about the Array type.\n');

    //  concatComplex :: Array (Either String Integer) -> Array (Either String Integer) -> Array (Either String Integer)
    var concatComplex =
    def('concatComplex',
        {},
        [$.Array(Either($.String, $.Integer)),
         $.Array(Either($.String, $.Integer)),
         $.Array(Either($.String, $.Integer))],
        always([Left(/xxx/)]));

    throws(function() { concatComplex([Left(/xxx/), Right(0), Right(0.1), Right(0.2)]); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'concatComplex :: Array (Either String Integer) -> Array (Either String Integer) -> Array (Either String Integer)\n' +
           '                               ^^^^^^\n' +
           '                                 1\n' +
           '\n' +
           '1)  /xxx/ :: RegExp\n' +
           '\n' +
           'The value at position 1 is not a member of ‘String’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#String for information about the String type.\n');

    throws(function() { concatComplex([Left('abc'), Right(0), Right(0.1), Right(0.2)]); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'concatComplex :: Array (Either String Integer) -> Array (Either String Integer) -> Array (Either String Integer)\n' +
           '                                      ^^^^^^^\n' +
           '                                         1\n' +
           '\n' +
           '1)  0.1 :: Number\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Integer’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Integer for information about the sanctuary-def/Integer type.\n');

    throws(function() { concatComplex([], [Left(/xxx/), Right(0), Right(0.1), Right(0.2)]); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'concatComplex :: Array (Either String Integer) -> Array (Either String Integer) -> Array (Either String Integer)\n' +
           '                                                                ^^^^^^\n' +
           '                                                                  1\n' +
           '\n' +
           '1)  /xxx/ :: RegExp\n' +
           '\n' +
           'The value at position 1 is not a member of ‘String’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#String for information about the String type.\n');

    throws(function() { concatComplex([], [Left('abc'), Right(0), Right(0.1), Right(0.2)]); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'concatComplex :: Array (Either String Integer) -> Array (Either String Integer) -> Array (Either String Integer)\n' +
           '                                                                       ^^^^^^^\n' +
           '                                                                          1\n' +
           '\n' +
           '1)  0.1 :: Number\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Integer’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Integer for information about the sanctuary-def/Integer type.\n');

    throws(function() { concatComplex([], []); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'concatComplex :: Array (Either String Integer) -> Array (Either String Integer) -> Array (Either String Integer)\n' +
           '                                                                                                 ^^^^^^\n' +
           '                                                                                                   1\n' +
           '\n' +
           '1)  /xxx/ :: RegExp\n' +
           '\n' +
           'The value at position 1 is not a member of ‘String’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#String for information about the String type.\n');
  });

  it('does not allow heterogeneous arrays', function() {
    var env = $.env.concat([Either($.Unknown, $.Unknown)]);
    var def = $.create({checkTypes: true, env: env});

    //  concat :: Array a -> Array a -> Array a
    var concat =
    def('concat', {}, [$.Array(a), $.Array(a), $.Array(a)], Z.concat);

    eq(concat([], []), []);
    eq(concat([], [1, 2, 3]), [1, 2, 3]);
    eq(concat([1, 2, 3], []), [1, 2, 3]);
    eq(concat([1, 2, 3], [4, 5, 6]), [1, 2, 3, 4, 5, 6]);
    eq(concat([Left('XXX')], [Right(42)]), [Left('XXX'), Right(42)]);

    throws(function() { concat([[1, 2, 3], [Left('XXX'), Right(42)]]); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'concat :: Array a -> Array a -> Array a\n' +
           '                ^\n' +
           '                1\n' +
           '\n' +
           '1)  [1, 2, 3] :: Array Number\n' +
           '    [Left("XXX"), Right(42)] :: Array (Either String Number)\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { concat([[1, 2, 3], [Right(42), Left('XXX')]]); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'concat :: Array a -> Array a -> Array a\n' +
           '                ^\n' +
           '                1\n' +
           '\n' +
           '1)  [1, 2, 3] :: Array Number\n' +
           '    [Right(42), Left("XXX")] :: Array (Either String Number)\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    //  concatNested :: Array (Array a) -> Array (Array a) -> Array (Array a)
    var concatNested =
    def('concatNested',
        {},
        [$.Array($.Array(a)), $.Array($.Array(a)), $.Array($.Array(a))],
        always([['a', 'b', 'c'], [1, 2, 3]]));

    throws(function() { concatNested([['a', 'b', 'c'], [1, 2, 3]]); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { concatNested([], [['a', 'b', 'c'], [1, 2, 3]]); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { concatNested([], []); },
           TypeError,
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
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');
  });

  it('permits the use of arrays as tuples', function() {
    //  Pair :: Type
    var Pair = $.BinaryType(
      'my-package/Pair',
      'http://example.com/my-package#Pair',
      function(x) { return Object.prototype.toString.call(x) === '[object Array]' && x.length === 2; },
      function(pair) { return [pair[0]]; },
      function(pair) { return [pair[1]]; }
    );

    var env = $.env.concat([Either($.Unknown, $.Unknown), Pair($.Unknown, $.Unknown)]);
    var def = $.create({checkTypes: true, env: env});

    //  id :: a -> a
    var id = def('id', {}, [a, a], identity);

    eq(id(['abc', 123]), ['abc', 123]);
    eq(id([Left('abc'), 123]), [Left('abc'), 123]);
    eq(id(['abc', Right(123)]), ['abc', Right(123)]);
    eq(id([Left('abc'), Right(123)]), [Left('abc'), Right(123)]);

    throws(function() { id([Left('abc'), 123, 456]); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'id :: a -> a\n' +
           '      ^\n' +
           '      1\n' +
           '\n' +
           '1)  [Left("abc"), 123, 456] :: Array ???\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');
  });

  it('supports higher-order functions', function() {
    //  f :: (String -> Number) -> Array String -> Array Number
    var f =
    def('f',
        {},
        [$.Function([$.String, $.Number]), $.Array($.String), $.Array($.Number)],
        Z.map);

    //  g :: (String -> Number) -> Array String -> Array Number
    var g =
    def('g',
        {},
        [$.Function([$.String, $.Number]), $.Array($.String), $.Array($.Number)],
        function(f, xs) { return f(xs); });

    eq(f(length, ['foo', 'bar', 'baz', 'quux']), [3, 3, 3, 4]);

    throws(function() { g(/xxx/); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'g :: (String -> Number) -> Array String -> Array Number\n' +
           '     ^^^^^^^^^^^^^^^^^^\n' +
           '             1\n' +
           '\n' +
           '1)  /xxx/ :: RegExp\n' +
           '\n' +
           'The value at position 1 is not a member of ‘String -> Number’.\n');

    throws(function() { g(length, ['a', 'b', 'c']); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'g :: (String -> Number) -> Array String -> Array Number\n' +
           '      ^^^^^^\n' +
           '        1\n' +
           '\n' +
           '1)  ["a", "b", "c"] :: Array String\n' +
           '\n' +
           'The value at position 1 is not a member of ‘String’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#String for information about the String type.\n');

    throws(function() { f(identity, ['a', 'b', 'c']); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'f :: (String -> Number) -> Array String -> Array Number\n' +
           '                ^^^^^^\n' +
           '                  1\n' +
           '\n' +
           '1)  "a" :: String\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Number’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Number for information about the Number type.\n');

    //  map :: (a -> b) -> Array a -> Array b
    var map =
    def('map',
        {},
        [$.Function([a, b]), $.Array(a), $.Array(b)],
        function(f, xs) {
          var result = [];
          for (var idx = 0; idx < xs.length; idx += 1) {
            result.push(f(idx === 3 ? null : xs[idx]));
          }
          return result;
        });

    eq(map(length, ['foo', 'bar']), [3, 3]);

    throws(function() { map(length, ['foo', 'bar', 'baz', 'quux']); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'map :: (a -> b) -> Array a -> Array b\n' +
           '        ^                ^\n' +
           '        1                2\n' +
           '\n' +
           '1)  "foo" :: String\n' +
           '    "bar" :: String\n' +
           '    "baz" :: String\n' +
           '    null :: Null\n' +
           '\n' +
           '2)  "foo" :: String\n' +
           '    "bar" :: String\n' +
           '    "baz" :: String\n' +
           '    "quux" :: String\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { map(function(s) { return s === 'baz' ? null : s.length; }, ['foo', 'bar', 'baz']); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'map :: (a -> b) -> Array a -> Array b\n' +
           '             ^\n' +
           '             1\n' +
           '\n' +
           '1)  3 :: Number\n' +
           '    3 :: Number\n' +
           '    null :: Null\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    //  reduce_ :: ((a, b) -> a) -> a -> Array b -> a
    var reduce_ =
    def('reduce_',
        {},
        [$.Function([a, b, a]), a, $.Array(b), a],
        Z.reduce);

    eq(reduce_(function(x, y) { return x + y; }, 0, [1, 2, 3, 4, 5, 6]), 21);

    throws(function() { reduce_(null); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'reduce_ :: ((a, b) -> a) -> a -> Array b -> a\n' +
           '           ^^^^^^^^^^^^^\n' +
           '                 1\n' +
           '\n' +
           '1)  null :: Null\n' +
           '\n' +
           'The value at position 1 is not a member of ‘(a, b) -> a’.\n');

    //  unfoldr :: (b -> Maybe (Pair a b)) -> b -> Array a
    var unfoldr =
    def('unfoldr',
        {},
        [$.Function([b, Maybe($.Pair(a, b))]), b, $.Array(a)],
        function(f, x) {
          var result = [];
          var m = f(x);
          while (m.isJust) {
            result.push(m.value[0]);
            m = f(m.value[1]);
          }
          return result;
        });

    //  h :: Integer -> Maybe (Pair Integer Integer)
    function h(n) { return n >= 5 ? Nothing : Just([n, n + 1]); }

    eq(unfoldr(h, 5), []);
    eq(unfoldr(h, 4), [4]);
    eq(unfoldr(h, 1), [1, 2, 3, 4]);

    throws(function() { unfoldr(null); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'unfoldr :: (b -> Maybe (Pair a b)) -> b -> Array a\n' +
           '           ^^^^^^^^^^^^^^^^^^^^^^^\n' +
           '                      1\n' +
           '\n' +
           '1)  null :: Null\n' +
           '\n' +
           'The value at position 1 is not a member of ‘b -> Maybe (Pair a b)’.\n');

    //  T :: a -> (a -> b) -> b
    var T =
    def('T',
        {},
        [a, $.Function([a, b]), b],
        function(x, f) { return f(/* x */); });

    throws(function() { T(100, Math.sqrt); },
           TypeError,
           '‘T’ applied ‘a -> b’ to the wrong number of arguments\n' +
           '\n' +
           'T :: a -> (a -> b) -> b\n' +
           '           ^\n' +
           '           1\n' +
           '\n' +
           'Expected one argument but received zero arguments.\n');
  });

  it('supports type-class constraints', function() {
    var env = $.env.concat([Integer, Maybe($.Unknown), Either($.Unknown, $.Unknown)]);
    var def = $.create({checkTypes: true, env: env});

    //  alt :: Alternative a => a -> a -> a
    var alt = def('alt', {a: [Z.Alternative]}, [a, a, a], Z.alt);

    eq(alt(Nothing, Nothing), Nothing);
    eq(alt(Nothing, Just(1)), Just(1));
    eq(alt(Just(2), Nothing), Just(2));
    eq(alt(Just(3), Just(4)), Just(3));

    throws(function() { alt(Left(1)); },
           TypeError,
           'Type-class constraint violation\n' +
           '\n' +
           'alt :: Alternative a => a -> a -> a\n' +
           '       ^^^^^^^^^^^^^    ^\n' +
           '                        1\n' +
           '\n' +
           '1)  Left(1) :: Either Number b, Either Integer b\n' +
           '\n' +
           '‘alt’ requires ‘a’ to satisfy the Alternative type-class constraint; the value at position 1 does not.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v' + Z$version + '#Alternative for information about the sanctuary-type-classes/Alternative type class.\n');

    throws(function() { alt($.__, Right(1)); },
           TypeError,
           'Type-class constraint violation\n' +
           '\n' +
           'alt :: Alternative a => a -> a -> a\n' +
           '       ^^^^^^^^^^^^^         ^\n' +
           '                             1\n' +
           '\n' +
           '1)  Right(1) :: Either b Number, Either b Integer\n' +
           '\n' +
           '‘alt’ requires ‘a’ to satisfy the Alternative type-class constraint; the value at position 1 does not.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v' + Z$version + '#Alternative for information about the sanctuary-type-classes/Alternative type class.\n');

    //  concat :: Semigroup a => a -> a -> a
    var concat = def('concat', {a: [Z.Semigroup]}, [a, a, a], Z.concat);

    eq(concat([1, 2, 3], [4, 5, 6]), [1, 2, 3, 4, 5, 6]);
    eq(concat('abc', 'def'), 'abcdef');

    throws(function() { concat(/x/); },
           TypeError,
           'Type-class constraint violation\n' +
           '\n' +
           'concat :: Semigroup a => a -> a -> a\n' +
           '          ^^^^^^^^^^^    ^\n' +
           '                         1\n' +
           '\n' +
           '1)  /x/ :: RegExp\n' +
           '\n' +
           '‘concat’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v' + Z$version + '#Semigroup for information about the sanctuary-type-classes/Semigroup type class.\n');

    throws(function() { concat($.__, /x/); },
           TypeError,
           'Type-class constraint violation\n' +
           '\n' +
           'concat :: Semigroup a => a -> a -> a\n' +
           '          ^^^^^^^^^^^         ^\n' +
           '                              1\n' +
           '\n' +
           '1)  /x/ :: RegExp\n' +
           '\n' +
           '‘concat’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v' + Z$version + '#Semigroup for information about the sanctuary-type-classes/Semigroup type class.\n');

    throws(function() { concat([], ''); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'concat :: Semigroup a => a -> a -> a\n' +
           '                         ^    ^\n' +
           '                         1    2\n' +
           '\n' +
           '1)  [] :: Array b\n' +
           '\n' +
           '2)  "" :: String\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { concat('', []); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'concat :: Semigroup a => a -> a -> a\n' +
           '                         ^    ^\n' +
           '                         1    2\n' +
           '\n' +
           '1)  "" :: String\n' +
           '\n' +
           '2)  [] :: Array b\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    //  filter :: (Alternative m, Monad m) => (a -> Boolean) -> m a -> m a
    var filter =
    def('filter',
        {m: [Z.Alternative, Z.Monad]},
        [$.Function([a, $.Boolean]), m(a), m(a)],
        Z.filterM);

    //  even :: Integer -> Boolean
    function even(x) { return x % 2 === 0; }

    eq(filter(even, Nothing), Nothing);
    eq(filter(even, Just(9)), Nothing);
    eq(filter(even, Just(4)), Just(4));

    throws(function() { filter(even, Right(42)); },
           TypeError,
           'Type-class constraint violation\n' +
           '\n' +
           'filter :: (Alternative m, Monad m) => (a -> Boolean) -> m a -> m a\n' +
           '           ^^^^^^^^^^^^^                                ^^^\n' +
           '                                                         1\n' +
           '\n' +
           '1)  Right(42) :: Either b Number, Either b Integer\n' +
           '\n' +
           '‘filter’ requires ‘m’ to satisfy the Alternative type-class constraint; the value at position 1 does not.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v' + Z$version + '#Alternative for information about the sanctuary-type-classes/Alternative type class.\n');

    //  concatMaybes :: Semigroup a => Maybe a -> Maybe a -> Maybe a
    var concatMaybes =
    def('concatMaybes',
        {a: [Z.Semigroup]},
        [Maybe(a), Maybe(a), Maybe(a)],
        always(Just(/xxx/)));

    throws(function() { concatMaybes(Just(/xxx/)); },
           TypeError,
           'Type-class constraint violation\n' +
           '\n' +
           'concatMaybes :: Semigroup a => Maybe a -> Maybe a -> Maybe a\n' +
           '                ^^^^^^^^^^^          ^\n' +
           '                                     1\n' +
           '\n' +
           '1)  /xxx/ :: RegExp\n' +
           '\n' +
           '‘concatMaybes’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v' + Z$version + '#Semigroup for information about the sanctuary-type-classes/Semigroup type class.\n');

    throws(function() { concatMaybes(Just('abc'), Just(/xxx/)); },
           TypeError,
           'Type-class constraint violation\n' +
           '\n' +
           'concatMaybes :: Semigroup a => Maybe a -> Maybe a -> Maybe a\n' +
           '                ^^^^^^^^^^^                     ^\n' +
           '                                                1\n' +
           '\n' +
           '1)  /xxx/ :: RegExp\n' +
           '\n' +
           '‘concatMaybes’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v' + Z$version + '#Semigroup for information about the sanctuary-type-classes/Semigroup type class.\n');

    throws(function() { concatMaybes(Just('abc'), Just('def')); },
           TypeError,
           'Type-class constraint violation\n' +
           '\n' +
           'concatMaybes :: Semigroup a => Maybe a -> Maybe a -> Maybe a\n' +
           '                ^^^^^^^^^^^                                ^\n' +
           '                                                           1\n' +
           '\n' +
           '1)  /xxx/ :: RegExp\n' +
           '\n' +
           '‘concatMaybes’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v' + Z$version + '#Semigroup for information about the sanctuary-type-classes/Semigroup type class.\n');

    //  sillyConst :: (Alternative a, Semigroup b) => a -> b -> a
    var sillyConst =
    def('sillyConst',
        {a: [Z.Alternative], b: [Z.Semigroup]},
        [a, b, a],
        function(x, y) { return x; });

    eq(sillyConst(Just(42), [1, 2, 3]), Just(42));

    throws(function() { sillyConst(true); },
           TypeError,
           'Type-class constraint violation\n' +
           '\n' +
           'sillyConst :: (Alternative a, Semigroup b) => a -> b -> a\n' +
           '               ^^^^^^^^^^^^^                  ^\n' +
           '                                              1\n' +
           '\n' +
           '1)  true :: Boolean\n' +
           '\n' +
           '‘sillyConst’ requires ‘a’ to satisfy the Alternative type-class constraint; the value at position 1 does not.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v' + Z$version + '#Alternative for information about the sanctuary-type-classes/Alternative type class.\n');
  });

  it('supports unary type variables', function() {
    var env = $.env.concat([Either($.Unknown, $.Unknown), Maybe($.Unknown)]);
    var def = $.create({checkTypes: true, env: env});

    //  f :: Type -> Type
    var f = $.UnaryTypeVariable('f');

    //  map :: Functor f => (a -> b) -> f a -> f b
    var map =
    def('map',
        {f: [Z.Functor]},
        [$.Function([a, b]), f(a), f(b)],
        Z.map);

    eq(map(Math.sqrt, Nothing), Nothing);
    eq(map(Math.sqrt, Just(9)), Just(3));

    var xs = [1, 4, 9];
    xs['fantasy-land/map'] = xs.map;

    throws(function() { map(Math.sqrt, xs); },
           TypeError,
           '‘map’ applied ‘a -> b’ to the wrong number of arguments\n' +
           '\n' +
           'map :: Functor f => (a -> b) -> f a -> f b\n' +
           '                     ^\n' +
           '                     1\n' +
           '\n' +
           'Expected one argument but received three arguments:\n' +
           '\n' +
           '  - 1\n' +
           '  - 0\n' +
           '  - [1, 4, 9, "fantasy-land/map": function map() { [native code] }]\n');

    //  sum :: Foldable f => f FiniteNumber -> FiniteNumber
    var sum =
    def('sum',
        {f: [Z.Foldable]},
        [f($.FiniteNumber), $.FiniteNumber],
        function(foldable) {
          return Z.reduce(function(x, y) { return x + y; }, 0, foldable);
        });

    eq(sum([1, 2, 3, 4, 5]), 15);
    eq(sum(Nothing), 0);
    eq(sum(Just(42)), 42);
    eq(sum(Left('XXX')), 0);
    eq(sum(Right(42)), 42);

    throws(function() { sum(42); },
           TypeError,
           'Type-class constraint violation\n' +
           '\n' +
           'sum :: Foldable f => f FiniteNumber -> FiniteNumber\n' +
           '       ^^^^^^^^^^    ^^^^^^^^^^^^^^\n' +
           '                           1\n' +
           '\n' +
           '1)  42 :: Number\n' +
           '\n' +
           '‘sum’ requires ‘f’ to satisfy the Foldable type-class constraint; the value at position 1 does not.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v' + Z$version + '#Foldable for information about the sanctuary-type-classes/Foldable type class.\n');

    throws(function() { sum(Just(Infinity)); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'sum :: Foldable f => f FiniteNumber -> FiniteNumber\n' +
           '                       ^^^^^^^^^^^^\n' +
           '                            1\n' +
           '\n' +
           '1)  Infinity :: Number\n' +
           '\n' +
           'The value at position 1 is not a member of ‘FiniteNumber’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#FiniteNumber for information about the sanctuary-def/FiniteNumber type.\n');

    //  sort :: (Ord a, Applicative f, Foldable f, Monoid (f a)) => f a -> f a
    var sort =
    def('sort',
        {a: [Z.Ord], f: [Z.Applicative, Z.Foldable, Z.Monoid]},
        [f(a), f(a)],
        function(m) {
          var M = m.constructor;
          return Z.reduce(
            function(m, x) { return Z.concat(m, Z.of(M, x)); },
            Z.empty(M),
            Z.reduce(function(xs, x) {
              var idx = 0;
              while (idx < xs.length && Z.lte(xs[idx], x)) idx += 1;
              xs.splice(idx, 0, x);
              return xs;
            }, [], m)
          );
        });

    eq(sort(['foo', 'bar', 'baz']), ['bar', 'baz', 'foo']);

    throws(function() { sort(['foo', true, 42]); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'sort :: (Ord a, Applicative f, Foldable f, Monoid f) => f a -> f a\n' +
           '                                                          ^\n' +
           '                                                          1\n' +
           '\n' +
           '1)  "foo" :: String\n' +
           '    true :: Boolean\n' +
           '    42 :: Number\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    throws(function() { sort([Math.sin, Math.cos]); },
           TypeError,
           'Type-class constraint violation\n' +
           '\n' +
           'sort :: (Ord a, Applicative f, Foldable f, Monoid f) => f a -> f a\n' +
           '         ^^^^^                                            ^\n' +
           '                                                          1\n' +
           '\n' +
           '1)  function sin() { [native code] } :: Function\n' +
           '\n' +
           '‘sort’ requires ‘a’ to satisfy the Ord type-class constraint; the value at position 1 does not.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v' + Z$version + '#Ord for information about the sanctuary-type-classes/Ord type class.\n');
  });

  it('supports binary type variables', function() {
    var env = $.env.concat([Either($.Unknown, $.Unknown), Maybe($.Unknown), $Pair($.Unknown, $.Unknown)]);
    var def = $.create({checkTypes: true, env: env});

    //  f :: (Type, Type) -> Type
    var f = $.BinaryTypeVariable('f');

    //  bimap :: Bifunctor f => (a -> b) -> (c -> d) -> f a c -> f b d
    var bimap =
    def('bimap',
        {f: [Z.Bifunctor]},
        [$.Function([a, b]), $.Function([c, d]), f(a, c), f(b, d)],
        Z.bimap);

    eq(bimap.toString(), 'bimap :: Bifunctor f => (a -> b) -> (c -> d) -> f a c -> f b d');
    eq(bimap(length, Math.sqrt, Pair('Sanctuary', 25)), Pair(9, 5));

    throws(function() { bimap(length, Math.sqrt, Pair(['foo', true, 42], null)); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'bimap :: Bifunctor f => (a -> b) -> (c -> d) -> f a c -> f b d\n' +
           '                                                  ^\n' +
           '                                                  1\n' +
           '\n' +
           '1)  ["foo", true, 42] :: Array ???\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');

    //  chain :: Chain m => (a -> m b) -> m a -> m b
    var chain = def('chain', {m: [Z.Chain]}, [$.Function([a, m(b)]), m(a), m(b)], Z.chain);

    throws(function() { chain(Left, Just('x')); },
           TypeError,
           'Type-variable constraint violation\n' +
           '\n' +
           'chain :: Chain m => (a -> m b) -> m a -> m b\n' +
           '                          ^^^     ^^^\n' +
           '                           1       2\n' +
           '\n' +
           '1)  Left("x") :: Either String c\n' +
           '\n' +
           '2)  Just("x") :: Maybe String\n' +
           '\n' +
           'Since there is no type of which all the above values are members, the type-variable constraint has been violated.\n');
  });

  it('only determines actual types when necessary', function() {
    //  count :: Integer
    var count = 0;

    //  Void :: Type
    var Void = $.NullaryType(
      'my-package/Void',
      'http://example.com/my-package#Void',
      function(x) { count += 1; return false; }
    );

    var env = [$.Array($.Unknown), Maybe($.Unknown), $.Number, Void];
    var def = $.create({checkTypes: true, env: env});

    //  head :: Array a -> Maybe a
    var head =
    def('head',
        {},
        [$.Array(a), Maybe(a)],
        function(xs) { return xs.length > 0 ? Just(xs[0]) : Nothing; });

    eq(head([]), Nothing);
    eq(count, 0);
    eq(head([1, 2, 3]), Just(1));
    eq(count, 1);
  });

  it('replaces Unknowns with free type variables', function() {
    var env = [Either($.Unknown, $.Unknown), $.Number];
    var def = $.create({checkTypes: true, env: env});

    var f = $.UnaryTypeVariable('f');

    //  map :: Functor f => (a -> b) -> f a -> f b
    var map =
    def('map',
        {f: [Z.Functor]},
        [$.Function([a, b]), f(a), f(b)],
        Z.map);

    throws(function() { map(Right(Right(Right(Right(0))))); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'map :: Functor f => (a -> b) -> f a -> f b\n' +
           '                    ^^^^^^^^\n' +
           '                       1\n' +
           '\n' +
           '1)  Right(Right(Right(Right(0)))) :: Either c (Either d (Either e (Either g Number)))\n' +
           '\n' +
           'The value at position 1 is not a member of ‘a -> b’.\n');
  });

});

describe('test', function() {

  it('is a ternary function', function() {
    eq(typeof $.test, 'function');
    eq($.test.length, 3);
    eq($.test.toString(), 'test :: Array Type -> Type -> Any -> Boolean');
  });

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
    eq($.test($.env, $Pair($.Number)($.String), Pair(42, 42)), false);
    eq($.test($.env, $Pair($.Number, $.String), Pair('', '')), false);
    eq($.test($.env, $Pair($.Number)($.String), Pair('', '')), false);
    eq($.test($.env, $Pair($.Number, $.String), Pair('', 42)), false);
    eq($.test($.env, $Pair($.Number)($.String), Pair('', 42)), false);
    eq($.test($.env, $Pair($.Number, $.String), Pair(42, '')), true);
    eq($.test($.env, $Pair($.Number)($.String), Pair(42, '')), true);
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

describe('NullaryType', function() {

  it('is a ternary function', function() {
    eq(typeof $.NullaryType, 'function');
    eq($.NullaryType.length, 3);
    eq($.NullaryType.toString(), 'NullaryType :: String -> String -> (Any -> Boolean) -> Type');
  });

});

describe('UnaryType', function() {

  it('is a quaternary function', function() {
    eq(typeof $.UnaryType, 'function');
    eq($.UnaryType.length, 4);
    eq($.UnaryType.toString(), 'UnaryType :: String -> String -> (Any -> Boolean) -> (t a -> Array a) -> Function');
  });

  it('returns a type constructor which type checks its arguments', function() {
    throws(function() { Maybe({x: $.Number, y: $.Number}); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'Maybe :: Type -> Type\n' +
           '         ^^^^\n' +
           '          1\n' +
           '\n' +
           '1)  {"x": Number, "y": Number} :: Object, StrMap ???\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Type’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Type for information about the Type type.\n');
  });

});

describe('BinaryType', function() {

  it('is a quinary function', function() {
    eq(typeof $.BinaryType, 'function');
    eq($.BinaryType.length, 5);
    eq($.BinaryType.toString(), 'BinaryType :: String -> String -> (Any -> Boolean) -> (t a b -> Array a) -> (t a b -> Array b) -> Function');
  });

  it('returns a type constructor which type checks its arguments', function() {
    throws(function() { Either($.Number, {x: $.Number, y: $.Number}); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'Either :: Type -> Type -> Type\n' +
           '                  ^^^^\n' +
           '                   1\n' +
           '\n' +
           '1)  {"x": Number, "y": Number} :: Object, StrMap ???\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Type’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Type for information about the Type type.\n');
  });

});

describe('TypeVariable', function() {

  it('is a unary function', function() {
    eq(typeof $.TypeVariable, 'function');
    eq($.TypeVariable.length, 1);
    eq($.TypeVariable.toString(), 'TypeVariable :: String -> Type');
  });

});

describe('UnaryTypeVariable', function() {

  it('is a unary function', function() {
    eq(typeof $.UnaryTypeVariable, 'function');
    eq($.UnaryTypeVariable.length, 1);
    eq($.UnaryTypeVariable.toString(), 'UnaryTypeVariable :: String -> Function');
  });

  it('returns a function which type checks its arguments', function() {
    var f = $.UnaryTypeVariable('f');

    eq(typeof f, 'function');
    eq(f.length, 1);
    eq(f.toString(), 'f :: Type -> Type');
    eq(f(a).toString(), '(f a)');

    throws(function() { f(Number); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'f :: Type -> Type\n' +
           '     ^^^^\n' +
           '      1\n' +
           '\n' +
           '1)  function Number() { [native code] } :: Function\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Type’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Type for information about the Type type.\n');
  });

});

describe('BinaryTypeVariable', function() {

  it('is a unary function', function() {
    eq(typeof $.BinaryTypeVariable, 'function');
    eq($.BinaryTypeVariable.length, 1);
    eq($.BinaryTypeVariable.toString(), 'BinaryTypeVariable :: String -> Function');
  });

  it('returns a function which type checks its arguments', function() {
    var p = $.BinaryTypeVariable('p');

    eq(typeof p, 'function');
    eq(p.length, 2);
    eq(p.toString(), 'p :: Type -> Type -> Type');
    eq(p(a, b).toString(), '(p a b)');
    eq(p(a)(b).toString(), '(p a b)');

    throws(function() { p(Number); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'p :: Type -> Type -> Type\n' +
           '     ^^^^\n' +
           '      1\n' +
           '\n' +
           '1)  function Number() { [native code] } :: Function\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Type’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Type for information about the Type type.\n');
  });

});

describe('Thunk', function() {

  it('is a unary function', function() {
    eq(typeof $.Thunk, 'function');
    eq($.Thunk.length, 1);
    eq($.Thunk.toString(), 'Thunk :: Type -> Type');
  });

  it('is short for `t => $.Function([t])`', function() {
    var env = $.env;
    var def = $.create({checkTypes: true, env: env});

    //  why :: (() -> Integer) -> Integer
    var why =
    def('why',
        {},
        [$.Thunk($.Integer), $.Integer],
        function(thunk) { return thunk(); });

    eq(why(function() { return 42; }), 42);

    throws(function() { why(function() { return 'Who knows?'; }); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'why :: (() -> Integer) -> Integer\n' +
           '              ^^^^^^^\n' +
           '                 1\n' +
           '\n' +
           '1)  "Who knows?" :: String\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Integer’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Integer for information about the sanctuary-def/Integer type.\n');
  });

});

describe('Predicate', function() {

  it('is a unary function', function() {
    eq(typeof $.Predicate, 'function');
    eq($.Predicate.length, 1);
    eq($.Predicate.toString(), 'Predicate :: Type -> Type');
  });

  it('is short for `t => $.Function([t, $.Boolean])`', function() {
    var env = $.env;
    var def = $.create({checkTypes: true, env: env});

    //  when :: (a -> Boolean) -> (a -> a) -> a -> a
    var when =
    def('when',
        {},
        [$.Predicate(a), $.Function([a, a]), a, a],
        function(pred, f, x) { return pred(x) ? f(x) : x; });

    //  abs :: Number -> Number
    var abs = when(function(x) { return x < 0; }, function(x) { return -x; });

    eq(abs(42), 42);
    eq(abs(-1), 1);

    throws(function() { when(identity, identity, 'foo'); },
           TypeError,
           'Invalid value\n' +
           '\n' +
           'when :: (a -> Boolean) -> (a -> a) -> a -> a\n' +
           '              ^^^^^^^\n' +
           '                 1\n' +
           '\n' +
           '1)  "foo" :: String\n' +
           '\n' +
           'The value at position 1 is not a member of ‘Boolean’.\n' +
           '\n' +
           'See https://github.com/sanctuary-js/sanctuary-def/tree/v' + version + '#Boolean for information about the Boolean type.\n');
  });

});
