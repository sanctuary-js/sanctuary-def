'use strict';

/* global describe, it */
/* jshint -W053 */

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


var def = $.create($.env);

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


//  Nothing :: -> Just a
var Nothing = function Nothing() {
  return {
    '@@type': 'my-package/Maybe',
    'chain': function(f) { return this; },
    'concat': function() { throw new Error('Not implemented'); },
    'constructor': Nothing,  // ramda/ramda#1516
    'empty': function() { return this; },
    'isNothing': true,
    'isJust': false,
    'of': function(x) { return Just(x); },
    'or': R.identity,
    'toString': R.always('Nothing()')
  };
};

//  Just :: a -> Just a
var Just = function Just(x) {
  return {
    '@@type': 'my-package/Maybe',
    'chain': function(f) { return f(x); },
    'concat': function() { throw new Error('Not implemented'); },
    'constructor': Just,  // ramda/ramda#1516
    'empty': R.always(Nothing()),
    'isNothing': false,
    'isJust': true,
    'of': function(x) { return Just(x); },
    'or': function() { return this; },
    'toString': R.always('Just(' + R.toString(x) + ')'),
    'value': x
  };
};

//  Maybe :: Type
var Maybe = $.UnaryType(
  'my-package/Maybe',
  function(x) { return x != null && x['@@type'] === 'my-package/Maybe'; },
  function(maybe) { return maybe.isJust ? [maybe.value] : []; }
);


//  Left :: a -> Either a b
var Left = function Left(x) {
  return {
    '@@type': 'my-package/Either',
    'chain': function(f) { return this; },
    'constructor': Left,  // ramda/ramda#1516
    'isLeft': true,
    'isRight': false,
    'of': function(x) { return Right(x); },
    'toString': R.always('Left(' + R.toString(x) + ')'),
    'value': x
  };
};

//  Right :: b -> Either a b
var Right = function Right(x) {
  return {
    '@@type': 'my-package/Either',
    'chain': function(f) { return f(x); },
    'constructor': Right,  // ramda/ramda#1516
    'isLeft': false,
    'isRight': true,
    'of': function(x) { return Right(x); },
    'toString': R.always('Right(' + R.toString(x) + ')'),
    'value': x
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
var Pair = function Pair(x, y) {
  return {
    '0': x,
    '1': y,
    '@@type': 'my-package/Pair',
    'constructor': Pair,  // ramda/ramda#1516
    'length': 2,
    'toString': R.always('Pair(' + R.toString(x) + ', ' + R.toString(y) + ')')
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

  it('type checks its arguments', function() {
    throws(function() { def(); },
           errorEq(TypeError,
                   '‘def’ requires four arguments; received zero arguments'));

    throws(function() { def(null, null, null, null); },
           errorEq(TypeError,
                   '‘def’ expected a value of type String ' +
                   'as its first argument; received null'));

    throws(function() { def('', null, null, null); },
           errorEq(TypeError,
                   '‘def’ expected a value of type Object ' +
                   'as its second argument; received null'));

    throws(function() { def('', {}, null, null); },
           errorEq(TypeError,
                   '‘def’ expected a value of type ' +
                   '(Array { test :: Function }) ' +
                   'as its third argument; received null'));

    throws(function() { def('', {}, [], null); },
           errorEq(TypeError,
                   '‘def’ expected a value of type Function ' +
                   'as its fourth argument; received null'));
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

    throws(function() {
             def('$10', {}, [a, a, a, a, a, a, a, a, a, a, $.Array(a)], list);
           },
           errorEq(RangeError,
                   '‘def’ cannot define a function ' +
                   'with arity greater than nine'));
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
                   '‘triple’ expected a value of type Number ' +
                   'as its second argument; received /x/'));

    throws(function() { triple(R.__, R.__, /x/); },
           errorEq(TypeError,
                   '‘triple’ expected a value of type Number ' +
                   'as its third argument; received /x/'));

    throws(function() { triple(R.__, 2, 3)(/x/); },
           errorEq(TypeError,
                   '‘triple’ expected a value of type Number ' +
                   'as its first argument; received /x/'));
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
                   '‘$9’ expected a value of type Number ' +
                   'as its first argument; received "X"'));

    throws(function() { $9(1, 'X'); },
           errorEq(TypeError,
                   '‘$9’ expected a value of type Number ' +
                   'as its second argument; received "X"'));

    throws(function() { $9(1, 2, 'X'); },
           errorEq(TypeError,
                   '‘$9’ expected a value of type Number ' +
                   'as its third argument; received "X"'));

    throws(function() { $9(1, 2, 3, 'X'); },
           errorEq(TypeError,
                   '‘$9’ expected a value of type Number ' +
                   'as its fourth argument; received "X"'));

    throws(function() { $9(1, 2, 3, 4, 'X'); },
           errorEq(TypeError,
                   '‘$9’ expected a value of type Number ' +
                   'as its fifth argument; received "X"'));

    throws(function() { $9(1, 2, 3, 4, 5, 'X'); },
           errorEq(TypeError,
                   '‘$9’ expected a value of type Number ' +
                   'as its sixth argument; received "X"'));

    throws(function() { $9(1, 2, 3, 4, 5, 6, 'X'); },
           errorEq(TypeError,
                   '‘$9’ expected a value of type Number ' +
                   'as its seventh argument; received "X"'));

    throws(function() { $9(1, 2, 3, 4, 5, 6, 7, 'X'); },
           errorEq(TypeError,
                   '‘$9’ expected a value of type Number ' +
                   'as its eighth argument; received "X"'));

    throws(function() { $9(1, 2, 3, 4, 5, 6, 7, 8, 'X'); },
           errorEq(TypeError,
                   '‘$9’ expected a value of type Number ' +
                   'as its ninth argument; received "X"'));

    eq($9(1, 2, 3, 4, 5, 6, 7, 8, 9), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  it('reports type error correctly for null/undefined', function() {
    //  sqrt :: Number -> Number
    var sqrt = def('sqrt', {}, [$.Number, $.Number], Math.sqrt);

    eq(sqrt(25), 5);

    throws(function() { sqrt(null); },
           errorEq(TypeError,
                   '‘sqrt’ expected a value of type Number ' +
                   'as its first argument; received null'));

    throws(function() { sqrt(undefined); },
           errorEq(TypeError,
                   '‘sqrt’ expected a value of type Number ' +
                   'as its first argument; received undefined'));
  });

  it('returns a function which type checks its return value', function() {
    //  add :: Number -> Number -> Number
    var add = def('add', {}, [$.Number, $.Number, $.Number], R.always('XXX'));

    throws(function() { add(2, 2); },
           errorEq(TypeError,
                   '‘add’ is expected to return a value of type Number; ' +
                   'returned "XXX"'));
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
    var def = $.create($.env.concat([Integer, $Pair]));

    var T = $.Array($Pair($.String, Maybe($.Number)));

    throws(function() { def('id', {}, [T, T], R.identity); },
           errorEq(TypeError,
                   'Definition of ‘id’ references my-package/Maybe ' +
                   'which is not in the environment:\n' +
                   '\n' +
                   '  - (Array ???)\n' +
                   '  - Boolean\n' +
                   '  - Date\n' +
                   '  - Error\n' +
                   '  - Function\n' +
                   '  - Null\n' +
                   '  - Number\n' +
                   '  - Object\n' +
                   '  - RegExp\n' +
                   '  - String\n' +
                   '  - Undefined\n' +
                   '  - Integer\n' +
                   '  - (Pair ??? ???)'));

    //  even :: Integer -> Boolean
    var even = def('even', {}, [Integer, $.Boolean], function(x) {
      return x % 2 === 0;
    });

    eq(even(1), false);
    eq(even(2), true);

    throws(function() { even(0.5); },
           errorEq(TypeError,
                   '‘even’ expected a value of type Integer ' +
                   'as its first argument; received 0.5'));
  });

  it('supports record types', function() {
    //  Point :: Type
    var Point = $.RecordType({x: $.Number, y: $.Number});

    //  Line :: Type
    var Line = $.RecordType({start: Point, end: Point});

    var def = $.create($.env.concat([Point, Line]));

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
                   '‘dist’ expected a value of type ' +
                   '{ x :: Number, y :: Number } ' +
                   'as its first argument; received null'));

    throws(function() { dist({}); },
           errorEq(TypeError,
                   '‘dist’ expected a value of type ' +
                   '{ x :: Number, y :: Number } ' +
                   'as its first argument; received {}'));

    throws(function() { dist({x: 0}); },
           errorEq(TypeError,
                   '‘dist’ expected a value of type ' +
                   '{ x :: Number, y :: Number } ' +
                   'as its first argument; received {"x": 0}'));

    throws(function() { dist({x: 0, y: null}); },
           errorEq(TypeError,
                   '‘dist’ expected a value of type ' +
                   '{ x :: Number, y :: Number } ' +
                   'as its first argument; received {"x": 0, "y": null}'));

    throws(function() { length({start: 0, end: 0}); },
           errorEq(TypeError,
                   '‘length’ expected a value of type ' +
                   '{ end :: { x :: Number, y :: Number }' +
                   ', start :: { x :: Number, y :: Number } } ' +
                   'as its first argument; received {"end": 0, "start": 0}'));

    //  id :: a -> a
    var id = def('id', {}, [a, a], R.identity);

    eq(id([{x: 0, y: 0}, {x: 1, y: 1}]), [{x: 0, y: 0}, {x: 1, y: 1}]);
  });

  it('supports "nullable" types', function() {
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
                   '‘toUpper’ expected a value of type (Nullable String) ' +
                   'as its first argument; received ["abc"]'));
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
      (function() { return arguments; }(1, 2, 3)),
      new Boolean(false),
      new Date(0),
      new Number(-0),
      new String(''),
      /x/.exec('xyz'),
      (function() { var xs = [1, 2, 3]; xs.z = 0; xs.a = 0; return xs; }()),
      {toString: null},
      new Point(0, 0),
      o1
    ];

    values.forEach(function(x) {
      throws(function() { f(x); },
             errorEq(TypeError,
                     '‘f’ expected a value of type Null as its ' +
                     'first argument; received ' + R.toString(x)));
    });
  });

  it('supports polymorphism via type variables', function() {
    var def = $.create($.env.concat([Either, Maybe, $Pair]));

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
                   '‘aa’ expected a value of type Number ' +
                   'as its second argument; received /x/'));

    throws(function() { aa(R.__, 0)(/x/); },
           errorEq(TypeError,
                   '‘aa’ expected a value of type Number ' +
                   'as its first argument; received /x/'));

    //  fromMaybe :: a -> Maybe a -> a
    var fromMaybe = def('fromMaybe', {}, [a, Maybe(a), a], function(x, maybe) {
      return maybe.isJust ? maybe.value : x;
    });

    eq(fromMaybe(0, Nothing()), 0);
    eq(fromMaybe(0, Just(42)), 42);

    throws(function() { fromMaybe(0, [1, 2, 3]); },
           errorEq(TypeError,
                   '‘fromMaybe’ expected a value of type (Maybe Number) ' +
                   'as its second argument; received [1, 2, 3]'));

    //  fst :: Pair a b -> a
    var fst = def('fst', {}, [$Pair(a, b), a], R.nth(0));

    eq(fst(Pair('XXX', 42)), 'XXX');

    throws(function() { fst(['XXX', 42]); },
           errorEq(TypeError,
                   '‘fst’ expected a value of type (Pair a b) ' +
                   'as its first argument; received ["XXX", 42]'));

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
                   '‘concat’ expected a value of type (Either String b) ' +
                   'as its second argument; received Left([1, 2, 3])'));

    throws(function() { concat(Right('abc'), Right([1, 2, 3])); },
           errorEq(TypeError,
                   '‘concat’ expected a value of type (Either a String) ' +
                   'as its second argument; received Right([1, 2, 3])'));
  });

  it('supports arbitrary nesting of types', function() {
    //  unnest :: [[a]] -> [a]
    var unnest =
    def('unnest', {}, [$.Array($.Array(a)), $.Array(a)], R.unnest);

    eq(unnest([[1, 2], [3, 4], [5, 6]]), [1, 2, 3, 4, 5, 6]);
    eq(unnest([[null], [null], [null]]), [null, null, null]);

    throws(function() { unnest([1, 2, 3]); },
           errorEq(TypeError,
                   '‘unnest’ expected a value of type (Array (Array a)) ' +
                   'as its first argument; received [1, 2, 3]'));
  });

  it('does not allow heterogeneous arrays', function() {
    var def = $.create($.env.concat([Either]));

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
                   '‘concat’ received [[1, 2, 3], [Left("XXX"), Right(42)]] ' +
                   'as its first argument, but this value is not a ' +
                   'member of any of the types in the environment:\n' +
                   '\n' +
                   '  - (Array ???)\n' +
                   '  - Boolean\n' +
                   '  - Date\n' +
                   '  - Error\n' +
                   '  - Function\n' +
                   '  - Null\n' +
                   '  - Number\n' +
                   '  - Object\n' +
                   '  - RegExp\n' +
                   '  - String\n' +
                   '  - Undefined\n' +
                   '  - (Either ??? ???)'));
  });

  it('supports type-class constraints', function() {
    var def = $.create($.env.concat([Integer, Maybe, Either]));

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
                   '‘or’ requires ‘a’ to implement Alternative; ' +
                   '(Either Number ???) and (Either Integer ???) do not'));

    throws(function() { or(R.__, Right(1)); },
           errorEq(TypeError,
                   '‘or’ requires ‘a’ to implement Alternative; ' +
                   '(Either ??? Number) and (Either ??? Integer) do not'));

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
                   '‘concat’ requires ‘a’ to implement Semigroup; ' +
                   'RegExp does not'));

    throws(function() { concat(R.__, /x/); },
           errorEq(TypeError,
                   '‘concat’ requires ‘a’ to implement Semigroup; ' +
                   'RegExp does not'));

    throws(function() { concat([], ''); },
           errorEq(TypeError,
                   '‘concat’ expected a value of type (Array ???) ' +
                   'as its second argument; received ""'));

    throws(function() { concat('', []); },
           errorEq(TypeError,
                   '‘concat’ expected a value of type String ' +
                   'as its second argument; received []'));

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
                   '‘filter’ requires ‘a’ to implement Monad and Monoid; ' +
                   '(Array Number) and (Array Integer) do not'));

    throws(function() { filter(R.F, Right(42)); },
           errorEq(TypeError,
                   '‘filter’ requires ‘a’ to implement Monad and Monoid; ' +
                   '(Either ??? Number) and (Either ??? Integer) do not'));
  });

});
