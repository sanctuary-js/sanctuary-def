'use strict';

const util = require ('util');
const vm = require ('vm');

const Descending = require ('sanctuary-descending');
const {Left, Right} = require ('sanctuary-either');
const Identity = require ('sanctuary-identity');
const {Nothing, Just} = require ('sanctuary-maybe');
const Pair = require ('sanctuary-pair');
const show = require ('sanctuary-show');
const Z = require ('sanctuary-type-classes');
const Z$version = (require ('sanctuary-type-classes/package.json')).version;
const type = require ('sanctuary-type-identifiers');

const $ = require ('..');
const version = (require ('../package.json')).version;

const eq = require ('./internal/eq');
const throws = require ('./internal/throws');


//    complement :: (a -> Boolean) -> a -> Boolean
const complement = pred => x => !(pred (x));

//    curry2 :: ((a, b) -> c) -> a -> b -> c
const curry2 = f => x => y => f (x, y);

//    curry3 :: ((a, b, c) -> d) -> a -> b -> c -> d
const curry3 = f => x => y => z => f (x, y, z);

//    singleton :: String -> a -> StrMap a
const singleton = k => v => { const m = {}; m[k] = v; return m; };


const def = $.create ({checkTypes: true, env: $.env});

const a = $.TypeVariable ('a');
const b = $.TypeVariable ('b');
const c = $.TypeVariable ('c');
const d = $.TypeVariable ('d');
const f = $.UnaryTypeVariable ('f');
const m = $.UnaryTypeVariable ('m');

//    $0 :: () -> Array a
const $0 =
def ('$0')
    ({})
    ([$.Array (a)])
    (() => []);

//    $1 :: a -> Array a
const $1 =
def ('$1')
    ({})
    ([a, $.Array (a)])
    (x => [x]);

//    $2 :: a -> a -> Array a
const $2 =
def ('$2')
    ({})
    ([a, a, $.Array (a)])
    (x => y => [x, y]);

//    $3 :: a -> a -> a -> Array a
const $3 =
def ('$3')
    ({})
    ([a, a, a, $.Array (a)])
    (x => y => z => [x, y, z]);

//    $26 :: a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> Array a
const $26 =
def ('$26')
    ({})
    ([a, a, a, a, a, a, a, a, a, a, a, a, a, a, a, a, a, a, a, a, a, a, a, a, a, a, $.Array (a)])
    (a => b => c => d => e => f => g => h => i => j => k => l => m => n => o => p => q => r => s => t => u => v => w => x => y => z =>
       [a, b, c, d, e, f, g, h, i, j, k, l, m, n, o, p, q, r, s, t, u, v, w, x, y, z]);


suite ('env', () => {

  test ('is an array of types', () => {
    eq ($.env)
       ([$.AnyFunction,
         $.Arguments,
         $.Array ($.Unknown),
         $.Array2 ($.Unknown) ($.Unknown),
         $.Boolean,
         $.Buffer,
         $.Date,
         $.Descending ($.Unknown),
         $.Either ($.Unknown) ($.Unknown),
         $.Error,
         $.Fn ($.Unknown) ($.Unknown),
         $.HtmlElement,
         $.Identity ($.Unknown),
         $.JsMap ($.Unknown) ($.Unknown),
         $.JsSet ($.Unknown),
         $.Maybe ($.Unknown),
         $.Module,
         $.Null,
         $.Number,
         $.Object,
         $.Pair ($.Unknown) ($.Unknown),
         $.RegExp,
         $.StrMap ($.Unknown),
         $.String,
         $.Symbol,
         $.Type,
         $.TypeClass,
         $.Undefined]);
  });

});

suite ('create', () => {

  test ('is a unary function', () => {
    eq (typeof $.create) ('function');
    eq ($.create.length) (1);
  });

  test ('type checks its arguments', () => {
    throws (() => { $.create (true); })
           (new TypeError (`Invalid value

create :: { checkTypes :: Boolean, env :: Array Type } -> String -> StrMap (Array TypeClass) -> NonEmpty (Array Type) -> Function -> Function
          ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                               1

1)  true :: Boolean

The value at position 1 is not a member of ‘{ checkTypes :: Boolean, env :: Array Type }’.
`));
  });

});

suite ('def', () => {

  test ('type checks its arguments when checkTypes is true', () => {
    throws (() => { def (null); })
           (new TypeError (`Invalid value

def :: String -> StrMap (Array TypeClass) -> NonEmpty (Array Type) -> Function -> Function
       ^^^^^^
         1

1)  null :: Null

The value at position 1 is not a member of ‘String’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#String for information about the String type.
`));

    throws (() => { def ('') (null); })
           (new TypeError (`Invalid value

def :: String -> StrMap (Array TypeClass) -> NonEmpty (Array Type) -> Function -> Function
                 ^^^^^^^^^^^^^^^^^^^^^^^^
                            1

1)  null :: Null

The value at position 1 is not a member of ‘StrMap (Array TypeClass)’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#StrMap for information about the StrMap type constructor.
`));

    throws (() => { def ('') ({}) ([]); })
           (new TypeError (`Invalid value

def :: String -> StrMap (Array TypeClass) -> NonEmpty (Array Type) -> Function -> Function
                                             ^^^^^^^^^^^^^^^^^^^^^
                                                       1

1)  [] :: Array a

The value at position 1 is not a member of ‘NonEmpty (Array Type)’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#NonEmpty for information about the NonEmpty type constructor.
`));

    throws (() => { def ('') ({}) ([1, 2, 3]); })
           (new TypeError (`Invalid value

def :: String -> StrMap (Array TypeClass) -> NonEmpty (Array Type) -> Function -> Function
                                                             ^^^^
                                                              1

1)  1 :: Number

The value at position 1 is not a member of ‘Type’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Type for information about the Type type.
`));

    throws (() => { def ('') ({}) ([$.Null]) (null); })
           (new TypeError (`Invalid value

def :: String -> StrMap (Array TypeClass) -> NonEmpty (Array Type) -> Function -> Function
                                                                      ^^^^^^^^
                                                                         1

1)  null :: Null

The value at position 1 is not a member of ‘Function’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Function for information about the Function type.
`));
  });

  test ('does not type check its arguments when checkTypes is false', () => {
    const def = $.create ({checkTypes: false, env: $.env});

    //    add :: Number -> Number -> Number
    const add =
    def ('add')
        ({})
        ([$.Number, $.Number, $.Number])
        (x => y => x + y);

    eq (add (42) (1)) (43);
    eq (add (1) (2, 3, 4)) (3);
    eq (add ('XXX') ({foo: 42})) ('XXX[object Object]');
    eq (add ({foo: 42}) ('XXX')) ('[object Object]XXX');
  });

  test ('returns a function whose length is zero or one', () => {
    eq ($0.length) (0);
    eq ($1.length) (1);
    eq ($2.length) (1);
    eq ($3.length) (1);
    eq ($26.length) (1);
  });

  test ('returns a function with "inspect" and "@@show" methods', () => {
    //    add :: Number -> Number -> Number
    const add =
    def ('add')
        ({})
        ([$.Number, $.Number, $.Number])
        (x => y => x + y);

    eq (util.inspect (add)) ('add :: Number -> Number -> Number');
    eq (show (add)) ('add :: Number -> Number -> Number');

    eq (show ($0)) ('$0 :: () -> Array a');
    eq (show ($1)) ('$1 :: a -> Array a');
    eq (show ($2)) ('$2 :: a -> a -> Array a');
    eq (show ($3)) ('$3 :: a -> a -> a -> Array a');
    eq (show ($26)) ('$26 :: a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> a -> Array a');
  });

  test ('returns a curried function', () => {
    eq ($0 ()) ([]);
    eq ($1 (1)) ([1]);
    eq ($2 (1) (2)) ([1, 2]);
    eq ($3 (1) (2) (3)) ([1, 2, 3]);
    eq ($26 (1) (2) (3) (4) (5) (6) (7) (8) (9) (10) (11) (12) (13) (14) (15) (16) (17) (18) (19) (20) (21) (22) (23) (24) (25) (26))
       ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]);
  });

  test ('returns a function which throws if given too many args', () => {
    throws (() => { $0 (1); })
           (new TypeError (`‘$0’ applied to the wrong number of arguments

$0 :: () -> Array a
      ^^
      1

Expected zero arguments but received one argument:

  - 1
`));

    throws (() => { $1 (1, 2); })
           (new TypeError (`‘$1’ applied to the wrong number of arguments

$1 :: a -> Array a
      ^
      1

Expected one argument but received two arguments:

  - 1
  - 2
`));

    throws (() => { $2 (1, 2, 3, 4, 5, 6, 7, 8, 9, 10); })
           (new TypeError (`‘$2’ applied to the wrong number of arguments

$2 :: a -> a -> Array a
      ^
      1

Expected one argument but received 10 arguments:

  - 1
  - 2
  - 3
  - 4
  - 5
  - 6
  - 7
  - 8
  - 9
  - 10
`));
  });

  test ('returns a function which type checks its arguments', () => {
    const $9 =
    def ('$9')
        ({})
        ([$.Number,
          $.Number,
          $.Number,
          $.Number,
          $.Number,
          $.Number,
          $.Number,
          $.Number,
          $.Number,
          $.Array ($.Number)])
        (_1 => _2 => _3 => _4 => _5 => _6 => _7 => _8 => _9 => [_1, _2, _3, _4, _5, _6, _7, _8, _9]);

    throws (() => { $9 ('X'); })
           (new TypeError (`Invalid value

$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number
      ^^^^^^
        1

1)  "X" :: String

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));

    throws (() => { $9 (1) ('X'); })
           (new TypeError (`Invalid value

$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number
                ^^^^^^
                  1

1)  "X" :: String

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));

    throws (() => { $9 (1) (2) ('X'); })
           (new TypeError (`Invalid value

$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number
                          ^^^^^^
                            1

1)  "X" :: String

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));

    throws (() => { $9 (1) (2) (3) ('X'); })
           (new TypeError (`Invalid value

$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number
                                    ^^^^^^
                                      1

1)  "X" :: String

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));

    throws (() => { $9 (1) (2) (3) (4) ('X'); })
           (new TypeError (`Invalid value

$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number
                                              ^^^^^^
                                                1

1)  "X" :: String

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));

    throws (() => { $9 (1) (2) (3) (4) (5) ('X'); })
           (new TypeError (`Invalid value

$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number
                                                        ^^^^^^
                                                          1

1)  "X" :: String

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));

    throws (() => { $9 (1) (2) (3) (4) (5) (6) ('X'); })
           (new TypeError (`Invalid value

$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number
                                                                  ^^^^^^
                                                                    1

1)  "X" :: String

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));

    throws (() => { $9 (1) (2) (3) (4) (5) (6) (7) ('X'); })
           (new TypeError (`Invalid value

$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number
                                                                            ^^^^^^
                                                                              1

1)  "X" :: String

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));

    throws (() => { $9 (1) (2) (3) (4) (5) (6) (7) (8) ('X'); })
           (new TypeError (`Invalid value

$9 :: Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Number -> Array Number
                                                                                      ^^^^^^
                                                                                        1

1)  "X" :: String

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));

    eq ($9 (1) (2) (3) (4) (5) (6) (7) (8) (9)) ([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });

  test ('reports type error correctly for null/undefined', () => {
    //    sqrt :: Number -> Number
    const sqrt =
    def ('sqrt')
        ({})
        ([$.Number, $.Number])
        (Math.sqrt);

    eq (sqrt (25)) (5);

    throws (() => { sqrt (null); })
           (new TypeError (`Invalid value

sqrt :: Number -> Number
        ^^^^^^
          1

1)  null :: Null

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));

    throws (() => { sqrt (undefined); })
           (new TypeError (`Invalid value

sqrt :: Number -> Number
        ^^^^^^
          1

1)  undefined :: Undefined

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));
  });

  test ('reports type error correctly for parameterized types', () => {
    //    a00 :: a -> a -> a
    const a00 =
    def ('a00')
        ({})
        ([a, a, a])
        (x => y => x);

    //    a01 :: a -> Array a -> a
    const a01 =
    def ('a01')
        ({})
        ([a, $.Array (a), a])
        (x => y => x);

    //    a02 :: a -> Array (Array a) -> a
    const a02 =
    def ('a02')
        ({})
        ([a, $.Array ($.Array (a)), a])
        (x => y => x);

    //    ab02e :: a -> b -> Array (Array (Either a b)) -> a
    const ab02e =
    def ('ab02e')
        ({})
        ([a, b, $.Array ($.Array ($.Either (a) (b))), a])
        (x => y => z => x);

    //    ab0e21 :: a -> b -> Either (Array (Array a)) (Array b) -> a
    const ab0e21 =
    def ('ab0e21')
        ({})
        ([a, b, $.Either ($.Array ($.Array (a))) ($.Array (b)), a])
        (x => y => z => x);

    throws (() => { a00 (1) ('a'); })
           (new TypeError (`Type-variable constraint violation

a00 :: a -> a -> a
       ^    ^
       1    2

1)  1 :: Number

2)  "a" :: String

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { a00 (1) (['a']); })
           (new TypeError (`Type-variable constraint violation

a00 :: a -> a -> a
       ^    ^
       1    2

1)  1 :: Number

2)  ["a"] :: Array String

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { a00 (1) (Just (1)); })
           (new TypeError (`Type-variable constraint violation

a00 :: a -> a -> a
       ^    ^
       1    2

1)  1 :: Number

2)  Just (1) :: Maybe Number

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { a01 (1) (['a', 'b']); })
           (new TypeError (`Type-variable constraint violation

a01 :: a -> Array a -> a
       ^          ^
       1          2

1)  1 :: Number

2)  "a" :: String
    "b" :: String

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { a01 ([1, 2]) ([1, 2, 3, 4]); })
           (new TypeError (`Type-variable constraint violation

a01 :: a -> Array a -> a
       ^          ^
       1          2

1)  [1, 2] :: Array Number, Array2 Number Number

2)  1 :: Number
    2 :: Number
    3 :: Number
    4 :: Number

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { a01 ([1, 2]) ([['a', 'b'], ['c', 'd']]); })
           (new TypeError (`Type-variable constraint violation

a01 :: a -> Array a -> a
       ^          ^
       1          2

1)  [1, 2] :: Array Number, Array2 Number Number

2)  ["a", "b"] :: Array String, Array2 String String
    ["c", "d"] :: Array String, Array2 String String

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { a01 ([[1, 2], [3, 4]]) ([[1, 2], [3, 4]]); })
           (new TypeError (`Type-variable constraint violation

a01 :: a -> Array a -> a
       ^          ^
       1          2

1)  [[1, 2], [3, 4]] :: Array (Array Number), Array (Array2 Number Number), Array2 (Array Number) (Array Number), Array2 (Array Number) (Array2 Number Number), Array2 (Array2 Number Number) (Array Number), Array2 (Array2 Number Number) (Array2 Number Number)

2)  [1, 2] :: Array Number, Array2 Number Number
    [3, 4] :: Array Number, Array2 Number Number

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { a02 ([1, 2]) ([[1, 2], [3, 4, 5, 6]]); })
           (new TypeError (`Type-variable constraint violation

a02 :: a -> Array (Array a) -> a
       ^                 ^
       1                 2

1)  [1, 2] :: Array Number, Array2 Number Number

2)  1 :: Number
    2 :: Number
    3 :: Number
    4 :: Number
    5 :: Number
    6 :: Number

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { ab02e (1) ('x') ([[Left ('a'), Left ('b')], [Left ('c'), Left ('d')]]); })
           (new TypeError (`Type-variable constraint violation

ab02e :: a -> b -> Array (Array (Either a b)) -> a
         ^                              ^
         1                              2

1)  1 :: Number

2)  "a" :: String
    "b" :: String
    "c" :: String
    "d" :: String

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { ab02e (1) ('x') ([[Right (1), Right (2)], [Right (3), Right (4)]]); })
           (new TypeError (`Type-variable constraint violation

ab02e :: a -> b -> Array (Array (Either a b)) -> a
              ^                           ^
              1                           2

1)  "x" :: String

2)  1 :: Number
    2 :: Number
    3 :: Number
    4 :: Number

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { ab0e21 (1) ('x') (Left ([['a', 'b'], ['c', 'd']])); })
           (new TypeError (`Type-variable constraint violation

ab0e21 :: a -> b -> Either (Array (Array a)) (Array b) -> a
          ^                              ^
          1                              2

1)  1 :: Number

2)  "a" :: String
    "b" :: String
    "c" :: String
    "d" :: String

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { ab0e21 (1) ('x') (Right ([1, 2])); })
           (new TypeError (`Type-variable constraint violation

ab0e21 :: a -> b -> Either (Array (Array a)) (Array b) -> a
               ^                                    ^
               1                                    2

1)  "x" :: String

2)  1 :: Number
    2 :: Number

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));
  });

  test ('throws custom error for unrecognized value (empty env)', () => {
    const env = [];
    const def = $.create ({checkTypes: true, env});

    //    id :: a -> a
    const id =
    def ('id')
        ({})
        ([a, a])
        (x => x);

    throws (() => { id (/xxx/); })
           (new TypeError (`Unrecognized value

id :: a -> a
      ^
      1

1)  /xxx/ :: (no types)

The environment is empty! Polymorphic functions require a non-empty environment.
`));
  });

  test ('throws custom error for unrecognized value (non-empty env)', () => {
    const env = [$.Array ($.Unknown), $.Boolean, $.Number, $.String];
    const def = $.create ({checkTypes: true, env});

    //    id :: a -> a
    const id =
    def ('id')
        ({})
        ([a, a])
        (x => x);

    throws (() => { id (/xxx/); })
           (new TypeError (`Unrecognized value

id :: a -> a
      ^
      1

1)  /xxx/ :: (no types)

The value at position 1 is not a member of any type in the environment.

The environment contains the following types:

  - Array b
  - Boolean
  - Number
  - String
`));
  });

  test ('returns a function which type checks its return value', () => {
    //    add :: Number -> Number -> Number
    const add =
    def ('add')
        ({})
        ([$.Number, $.Number, $.Number])
        (x => y => 'XXX');

    throws (() => { add (2) (2); })
           (new TypeError (`Invalid value

add :: Number -> Number -> Number
                           ^^^^^^
                             1

1)  "XXX" :: String

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));
  });

  test ('performs type checking when a "returned" function is applied', () => {
    //    lt :: Ord a => a -> (a -> Boolean)
    const lt =
    def ('lt')
        ({a: [Z.Ord]})
        ([a, $.Fn (a) ($.Boolean)])
        (y => x => x < y);

    eq (lt (1) (0)) (true);
    eq (lt (1) (1)) (false);
    eq (lt (1) (2)) (false);

    throws (() => { lt (123) ('abc'); })
           (new TypeError (`Type-variable constraint violation

lt :: Ord a => a -> (a -> Boolean)
               ^     ^
               1     2

1)  123 :: Number

2)  "abc" :: String

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));
  });

  test ('does not rely on constructor identity', () => {
    //    inc :: Date -> Date
    const inc =
    def ('inc')
        ({})
        ([$.Date, $.Date])
        (date => new Date (date.valueOf () + 1));

    eq (inc (new Date (42))) (new Date (43));
    eq (inc (vm.runInNewContext ('new Date(42)'))) (new Date (43));

    //    length :: Array String -> Number
    const length =
    def ('length')
        ({})
        ([$.Array ($.String), $.Number])
        (xs => xs.length);

    eq (length (['foo', 'bar', 'baz'])) (3);
    eq (length (vm.runInNewContext ('["foo", "bar", "baz"]'))) (3);
  });

  test ('accommodates circular references', () => {
    //    id :: a -> a
    const id =
    def ('id')
        ({})
        ([a, a])
        (x => x);

    const x = {name: 'x'};
    const y = {name: 'y'};
    x.y = y;
    y.x = x;

    eq (id (x)) (x);

    const z = [];
    z.push (z);

    throws (() => { id (z); })
           (new TypeError (`Type-variable constraint violation

id :: a -> a
      ^
      1

1)  [<Circular>] :: Array ???

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));
  });

  test ('supports custom types', () => {
    //    fromMaybe :: a -> Maybe a
    const fromMaybe =
    def ('fromMaybe')
        ({})
        ([a, $.Maybe (a), a])
        (x => maybe => maybe.isJust ? maybe.value : x);

    throws (() => { fromMaybe ('x') (Just (null)); })
           (new TypeError (`Type-variable constraint violation

fromMaybe :: a -> Maybe a -> a
             ^          ^
             1          2

1)  "x" :: String

2)  null :: Null

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));
  });

  test ('supports enumerated types', () => {
    eq (typeof $.EnumType) ('function');
    eq ($.EnumType.length) (1);
    eq (show ($.EnumType)) ('EnumType :: String -> String -> Array Any -> Type');

    //    TimeUnit :: Type
    const TimeUnit = $.EnumType
      ('TimeUnit')
      ('')
      (['milliseconds', 'seconds', 'minutes', 'hours']);

    //    convertTo :: TimeUnit -> ValidDate -> ValidNumber
    const convertTo =
    def ('convertTo')
        ({})
        ([TimeUnit, $.ValidDate, $.ValidNumber])
        (function recur(unit) {
           return function(date) {
             switch (unit) {
               case 'milliseconds': return date.valueOf ();
               case 'seconds':      return recur ('milliseconds') (date) / 1000;
               case 'minutes':      return recur ('seconds') (date) / 60;
               case 'hours':        return recur ('minutes') (date) / 60;
             }
           };
         });

    throws (() => { convertTo ('days') (new Date (0)); })
           (new TypeError (`Invalid value

convertTo :: TimeUnit -> ValidDate -> ValidNumber
             ^^^^^^^^
                1

1)  "days" :: String

The value at position 1 is not a member of ‘TimeUnit’.
`));

    eq (convertTo ('seconds') (new Date (1000))) (1);

    //    SillyType :: Type
    const SillyType = $.EnumType
      ('SillyType')
      ('')
      (['foo', true, 42]);

    const _env = Z.concat ($.env, [SillyType]);
    const _def = $.create ({checkTypes: true, env: _env});

    //    id :: a -> a
    const id =
    _def ('id')
         ({})
         ([a, a])
         (x => x);

    eq (id ('foo')) ('foo');
    eq (id ('bar')) ('bar');
    eq (id (true)) (true);
    eq (id (false)) (false);
    eq (id (42)) (42);
    eq (id (-42)) (-42);

    eq (id (['foo', true, 42])) (['foo', true, 42]);

    throws (() => { id (['foo', false, 42]); })
           (new TypeError (`Type-variable constraint violation

id :: a -> a
      ^
      1

1)  ["foo", false, 42] :: Array ???

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));
  });

  test ('supports anonymous record types', () => {
    eq (typeof $.RecordType) ('function');
    eq ($.RecordType.length) (1);
    eq (show ($.RecordType)) ('RecordType :: StrMap Type -> Type');
    eq (show ($.RecordType ({}))) ('{}');
    eq (show ($.RecordType ({x: $.Number}))) ('{ x :: Number }');
    eq (show ($.RecordType ({x: $.Number, y: $.Number}))) ('{ x :: Number, y :: Number }');
    eq (show ($.RecordType ({_ABC: $.Number, $123: $.Number}))) ('{ _ABC :: Number, $123 :: Number }');
    eq (show ($.RecordType ({0: $.Number, 1: $.Number}))) ('{ "0" :: Number, "1" :: Number }');
    eq (show ($.RecordType ({'foo-bar': $.Number}))) ('{ "foo-bar" :: Number }');
    eq (show ($.RecordType ({'foo bar': $.Number}))) ('{ "foo bar" :: Number }');
    eq (show ($.RecordType ({'x "y" z': $.Number}))) ('{ "x \\"y\\" z" :: Number }');

    //  Field ordering:
    eq (show ($.RecordType ({foo: $.Number, bar: $.Number}))) ('{ foo :: Number, bar :: Number }');
    eq (show ($.RecordType ({bar: $.Number, foo: $.Number}))) ('{ bar :: Number, foo :: Number }');

    const pred = $.test ([]) ($.RecordType ({x: $.Number}));

    //  Own properties:
    eq (pred ({x: 0})) (true);
    eq (pred (Object.defineProperty ({}, 'x', {value: 0, enumerable: true}))) (true);
    eq (pred (Object.defineProperty ({}, 'x', {value: 0, enumerable: false}))) (false);

    //  Inherited properties:
    eq (pred (Object.create ({x: 0}))) (true);
    eq (pred (Object.create (Object.defineProperty ({}, 'x', {value: 0, enumerable: true})))) (true);
    eq (pred (Object.create (Object.defineProperty ({}, 'x', {value: 0, enumerable: false})))) (false);

    //    Empty :: Type
    const Empty = $.RecordType ({});

    eq ($.test ([]) (Empty) (null)) (false);
    eq ($.test ([]) (Empty) (undefined)) (false);
    eq ($.test ([]) (Empty) (false)) (true);
    eq ($.test ([]) (Empty) (12.34)) (true);
    eq ($.test ([]) (Empty) ('xyz')) (true);
    eq ($.test ([]) (Empty) (new Boolean (true))) (true);
    eq ($.test ([]) (Empty) (new Number (12.34))) (true);
    eq ($.test ([]) (Empty) (new String ('xyz'))) (true);
    eq ($.test ([]) (Empty) ([])) (true);
    eq ($.test ([]) (Empty) ({})) (true);

    //    Point :: Type
    const Point = $.RecordType ({x: $.Number, y: $.Number});

    //    Line :: Type
    const Line = $.RecordType ({start: Point, end: Point});

    //    dist :: Point -> Point -> Number
    const dist =
    def ('dist')
        ({})
        ([Point, Point, $.Number])
        (p => q => Math.sqrt (Math.pow (p.x - q.x, 2) +
                              Math.pow (p.y - q.y, 2)));

    //    length :: Line -> Number
    const length =
    def ('length')
        ({})
        ([Line, $.Number])
        (line => dist (line.start) (line.end));

    eq (dist ({x: 0, y: 0}) ({x: 0, y: 0})) (0);
    eq (dist ({x: 0, y: 0}) ({x: 0, y: 0, color: 'red'})) (0);
    eq (dist ({x: 1, y: 1}) ({x: 4, y: 5})) (5);
    eq (dist ({x: 1, y: 1}) ({x: 4, y: 5, color: 'red'})) (5);

    eq (length ({start: {x: 1, y: 1}, end: {x: 4, y: 5}})) (5);
    eq (length ({start: {x: 1, y: 1}, end: {x: 4, y: 5, color: 'red'}})) (5);

    throws (() => { dist (null); })
           (new TypeError (`Invalid value

dist :: { x :: Number, y :: Number } -> { x :: Number, y :: Number } -> Number
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                     1

1)  null :: Null

The value at position 1 is not a member of ‘{ x :: Number, y :: Number }’.
`));

    throws (() => { dist ({}); })
           (new TypeError (`Invalid value

dist :: { x :: Number, y :: Number } -> { x :: Number, y :: Number } -> Number
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                     1

1)  {} :: Object, StrMap a

The value at position 1 is not a member of ‘{ x :: Number, y :: Number }’.
`));

    throws (() => { dist ({x: 0}); })
           (new TypeError (`Invalid value

dist :: { x :: Number, y :: Number } -> { x :: Number, y :: Number } -> Number
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                     1

1)  {"x": 0} :: Object, StrMap Number

The value at position 1 is not a member of ‘{ x :: Number, y :: Number }’.
`));

    throws (() => { dist ({x: 0, y: null}); })
           (new TypeError (`Invalid value

dist :: { x :: Number, y :: Number } -> { x :: Number, y :: Number } -> Number
                            ^^^^^^
                              1

1)  null :: Null

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));

    throws (() => { length ({start: 0, end: 0}); })
           (new TypeError (`Invalid value

length :: { start :: { x :: Number, y :: Number }, end :: { x :: Number, y :: Number } } -> Number
                     ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                  1

1)  0 :: Number

The value at position 1 is not a member of ‘{ x :: Number, y :: Number }’.
`));

    throws (() => { length ({start: {x: 0, y: 0}, end: {x: null, y: null}}); })
           (new TypeError (`Invalid value

length :: { start :: { x :: Number, y :: Number }, end :: { x :: Number, y :: Number } } -> Number
                                                                 ^^^^^^
                                                                   1

1)  null :: Null

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));

    //    id :: a -> a
    const id =
    def ('id')
        ({})
        ([a, a])
        (x => x);

    eq (id ([{x: 0, y: 0}, {x: 1, y: 1}])) ([{x: 0, y: 0}, {x: 1, y: 1}]);

    throws (() => { $.RecordType ({x: /XXX/, y: /XXX/, z: $.Any}); })
           (new TypeError (`Invalid value

RecordType :: StrMap Type -> Type
                     ^^^^
                      1

1)  /XXX/ :: RegExp

The value at position 1 is not a member of ‘Type’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Type for information about the Type type.
`));

    //    Foo :: Type
    const Foo = $.RecordType ({x: a, y: a});

    //    foo :: Foo -> Foo
    const foo =
    def ('foo')
        ({})
        ([Foo, Foo])
        (foo => foo);

    eq (foo ({x: 1, y: 2, z: 3})) ({x: 1, y: 2, z: 3});

    throws (() => { foo ({x: 'abc', y: 123}); })
           (new TypeError (`Type-variable constraint violation

foo :: { x :: a, y :: a } -> { x :: a, y :: a }
              ^       ^
              1       2

1)  "abc" :: String

2)  123 :: Number

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    //    fooBarBaz :: { 'foo "bar" baz' :: Number } -> Number
    const fooBarBaz =
    def ('fooBarBaz')
        ({})
        ([$.RecordType ({'foo "bar" baz': $.Number}), $.Number])
        (r => r['foo "bar" baz']);

    eq (fooBarBaz ({'foo "bar" baz': 42})) (42);

    throws (() => { fooBarBaz ({'foo "bar" baz': null}); })
           (new TypeError (`Invalid value

fooBarBaz :: { "foo \\"bar\\" baz" :: Number } -> Number
                                    ^^^^^^
                                      1

1)  null :: Null

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));

    //    prop :: String -> Function
    const prop =
    def ('prop')
        ({})
        ([$.String, $.AnyFunction])
        (name => def ('prop (' + show (name) + ')')
                     ({})
                     ([$.RecordType (singleton (name) (a)), a])
                     (r => r[name]));

    eq (prop ('x') ({x: 1, y: 2})) (1);
    eq (prop ('y') ({x: 1, y: 2})) (2);

    throws (() => { prop ('z') ({x: 1, y: 2}); })
           (new TypeError (`Invalid value

prop ("z") :: { z :: a } -> a
              ^^^^^^^^^^
                  1

1)  {"x": 1, "y": 2} :: Object, StrMap Number

The value at position 1 is not a member of ‘{ z :: a }’.
`));

    const point = Object.create ({x: 0, y: 0});
    eq (prop ('x') (point)) (0);
    eq (prop ('y') (point)) (0);

    eq (/x/g.global) (true);
    eq ('global' in /x/g) (true);

    throws (() => { prop ('global') (/x/g); })
           (new TypeError (`Invalid value

prop ("global") :: { global :: a } -> a
                   ^^^^^^^^^^^^^^^
                          1

1)  /x/g :: RegExp

The value at position 1 is not a member of ‘{ global :: a }’.
`));

    eq (['x'].length) (1);
    eq ('length' in ['x']) (true);

    throws (() => { prop ('length') (['x']); })
           (new TypeError (`Invalid value

prop ("length") :: { length :: a } -> a
                   ^^^^^^^^^^^^^^^
                          1

1)  ["x"] :: Array String

The value at position 1 is not a member of ‘{ length :: a }’.
`));
  });

  test ('supports named record types', () => {
    eq (typeof $.NamedRecordType) ('function');
    eq ($.NamedRecordType.length) (1);
    eq (show ($.NamedRecordType)) ('NamedRecordType :: NonEmpty String -> String -> Array Type -> StrMap Type -> Type');
    eq (show ($.NamedRecordType ('Circle') ('') ([]) ({radius: $.PositiveFiniteNumber}))) ('Circle');

    //    Empty :: Type
    const Empty = $.NamedRecordType ('Empty') ('') ([]) ({});

    eq ($.test ([]) (Empty) (null)) (false);
    eq ($.test ([]) (Empty) (undefined)) (false);
    eq ($.test ([]) (Empty) (false)) (true);
    eq ($.test ([]) (Empty) (12.34)) (true);
    eq ($.test ([]) (Empty) ('xyz')) (true);
    eq ($.test ([]) (Empty) (new Boolean (true))) (true);
    eq ($.test ([]) (Empty) (new Number (12.34))) (true);
    eq ($.test ([]) (Empty) (new String ('xyz'))) (true);
    eq ($.test ([]) (Empty) ([])) (true);
    eq ($.test ([]) (Empty) ({})) (true);

    throws (() => { $.NamedRecordType ('Circle') ('') ([]) ({radius: Number}); })
           (new TypeError (`Invalid value

NamedRecordType :: NonEmpty String -> String -> Array Type -> StrMap Type -> Type
                                                                     ^^^^
                                                                      1

1)  ${Number} :: Function, (a -> b)

The value at position 1 is not a member of ‘Type’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Type for information about the Type type.
`));

    //    Circle :: Type
    const Circle = $.NamedRecordType
      ('Circle')
      ('http://example.com/my-package#Circle')
      ([])
      ({radius: $.PositiveFiniteNumber});

    //    Cylinder :: Type
    const Cylinder = $.NamedRecordType
      ('Cylinder')
      ('http://example.com/my-package#Cylinder')
      ([Circle])
      ({height: $.PositiveFiniteNumber});

    const isCircle = $.test ([]) (Circle);
    eq (isCircle (null)) (false);
    eq (isCircle ({})) (false);
    eq (isCircle ({radius: null})) (false);
    eq (isCircle ({radius: 0})) (false);
    eq (isCircle ({radius: 1})) (true);
    eq (isCircle ({radius: 1, height: 1})) (true);

    const isCylinder = $.test ([]) (Cylinder);
    eq (isCylinder (null)) (false);
    eq (isCylinder ({})) (false);
    eq (isCylinder ({radius: null})) (false);
    eq (isCylinder ({height: null})) (false);
    eq (isCylinder ({radius: 0})) (false);
    eq (isCylinder ({height: 0})) (false);
    eq (isCylinder ({radius: 1})) (false);
    eq (isCylinder ({height: 1})) (false);
    eq (isCylinder ({radius: 0, height: 0})) (false);
    eq (isCylinder ({radius: 0, height: 1})) (false);
    eq (isCylinder ({radius: 1, height: 0})) (false);
    eq (isCylinder ({radius: 1, height: 1})) (true);

    //    area :: Circle -> PositiveFiniteNumber
    const area =
    def ('area')
        ({})
        ([Circle, $.PositiveFiniteNumber])
        (circle => Math.PI * circle.radius * circle.radius);

    eq (area ({radius: 1})) (3.141592653589793);
    eq (area ({radius: 2})) (12.566370614359172);

    throws (() => { area ({radius: 0}); })
           (new TypeError (`Invalid value

area :: Circle -> PositiveFiniteNumber
        ^^^^^^
          1

1)  {"radius": 0} :: Object, StrMap Number

The value at position 1 is not a member of ‘Circle’.

See http://example.com/my-package#Circle for information about the Circle type.
`));
  });

  test ('supports "nullable" types', () => {
    eq (typeof $.Nullable) ('function');
    eq ($.Nullable.length) (1);
    eq (show ($.Nullable)) ('Nullable :: Type -> Type');

    throws (() => { $.Nullable (null); })
           (new TypeError (`Invalid value

Nullable :: Type -> Type
            ^^^^
             1

1)  null :: Null

The value at position 1 is not a member of ‘Type’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Type for information about the Type type.
`));

    //    toUpper :: Nullable String -> Nullable String
    const toUpper =
    def ('toUpper')
        ({})
        ([$.Nullable ($.String), $.Nullable ($.String)])
        (ns => ns === null ? null : ns.toUpperCase ());  // eslint-disable-line eqeqeq

    eq (toUpper (null)) (null);
    eq (toUpper ('abc')) ('ABC');

    throws (() => { toUpper (['abc']); })
           (new TypeError (`Invalid value

toUpper :: Nullable String -> Nullable String
                    ^^^^^^
                      1

1)  ["abc"] :: Array String

The value at position 1 is not a member of ‘String’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#String for information about the String type.
`));

    //    defaultTo :: a -> Nullable a -> a
    const defaultTo =
    def ('defaultTo')
        ({})
        ([a, $.Nullable (a), a])
        (x => nullable => nullable === null ? x : nullable);  // eslint-disable-line eqeqeq

    eq (defaultTo (0) (null)) (0);
    eq (defaultTo (0) (42)) (42);

    throws (() => { defaultTo (0) ('XXX'); })
           (new TypeError (`Type-variable constraint violation

defaultTo :: a -> Nullable a -> a
             ^             ^
             1             2

1)  0 :: Number

2)  "XXX" :: String

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    //    f :: Nullable a -> Nullable a
    const f =
    def ('f')
        ({})
        ([$.Nullable (a), $.Nullable (a)])
        (x => 42);

    eq (f (null)) (42);
    eq (f (0)) (42);

    throws (() => { f ('XXX'); })
           (new TypeError (`Type-variable constraint violation

f :: Nullable a -> Nullable a
              ^             ^
              1             2

1)  "XXX" :: String

2)  42 :: Number

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));
  });

  test ('provides the "Void" type', () => {
    eq ($.Void.name) ('Void');
    eq ($.Void.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Void`);
    eq ($.Void.supertypes) ([]);

    const isVoid = $.test ([]) ($.Void);
    eq (isVoid (undefined)) (false);
    eq (isVoid (null)) (false);
    eq (isVoid (NaN)) (false);
    eq (isVoid ('')) (false);
  });

  test ('provides the "Any" type', () => {
    eq ($.Any.name) ('Any');
    eq ($.Any.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Any`);
    eq ($.Any.supertypes) ([]);
  });

  test ('provides the "AnyFunction" type', () => {
    eq ($.AnyFunction.name) ('Function');
    eq ($.AnyFunction.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Function`);
    eq ($.AnyFunction.supertypes) ([]);

    const isAnyFunction = $.test ([]) ($.AnyFunction);
    eq (isAnyFunction (null)) (false);
    eq (isAnyFunction (Math.abs)) (true);
    eq (isAnyFunction (function Identity(x) { this.value = x; })) (true);
    eq (isAnyFunction (function* (x) { return x; })) (true);
  });

  test ('provides the "Arguments" type', () => {
    eq ($.Arguments.name) ('Arguments');
    eq ($.Arguments.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Arguments`);
    eq ($.Arguments.supertypes) ([]);
  });

  test ('provides the "Array" type constructor', () => {
    eq (($.Array (a)).name) ('Array');
    eq (($.Array (a)).url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Array`);
    eq (($.Array (a)).supertypes) ([]);
  });

  test ('provides the "Array0" type', () => {
    eq ($.Array0.name) ('Array0');
    eq ($.Array0.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Array0`);
    eq ($.Array0.supertypes) ([$.Array ($.Unknown)]);

    const isEmptyArray = $.test ([]) ($.Array0);
    eq (isEmptyArray (null)) (false);
    eq (isEmptyArray ([])) (true);
    eq (isEmptyArray ([0])) (false);
  });

  test ('provides the "Array1" type constructor', () => {
    eq (typeof $.Array1) ('function');
    eq ($.Array1.length) (1);
    eq (show ($.Array1)) ('Array1 :: Type -> Type');
    eq (show ($.Array1 (a))) ('Array1 a');
    eq (($.Array1 (a)).name) ('Array1');
    eq (($.Array1 (a)).url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Array1`);
    eq (($.Array1 (a)).supertypes) ([$.Array ($.Unknown)]);

    const isSingletonStringArray = $.test ([]) ($.Array1 ($.String));
    eq (isSingletonStringArray (null)) (false);
    eq (isSingletonStringArray ([])) (false);
    eq (isSingletonStringArray ([0])) (false);
    eq (isSingletonStringArray (['x'])) (true);
    eq (isSingletonStringArray (['x', 'y'])) (false);
  });

  test ('provides the "Array2" type constructor', () => {
    eq (typeof $.Array2) ('function');
    eq ($.Array2.length) (1);
    eq (show ($.Array2)) ('Array2 :: Type -> Type -> Type');
    eq (show ($.Array2 (a) (b))) ('Array2 a b');
    eq (($.Array2 (a) (b)).name) ('Array2');
    eq (($.Array2 (a) (b)).url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Array2`);
    eq (($.Array2 (a) (b)).supertypes) ([$.Array ($.Unknown)]);

    //    fst :: Array2 a b -> a
    const fst = def ('fst') ({}) ([$.Array2 (a) (b), a]) (array2 => array2[0]);

    //    snd :: Array2 a b -> b
    const snd = def ('snd') ({}) ([$.Array2 (a) (b), b]) (array2 => array2[1]);

    eq (fst (['foo', 42])) ('foo');
    eq (snd (['foo', 42])) (42);

    throws (() => { fst (['foo']); })
           (new TypeError (`Invalid value

fst :: Array2 a b -> a
       ^^^^^^^^^^
           1

1)  ["foo"] :: Array String

The value at position 1 is not a member of ‘Array2 a b’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Array2 for information about the Array2 type constructor.
`));
  });

  test ('provides the "Boolean" type', () => {
    eq ($.Boolean.name) ('Boolean');
    eq ($.Boolean.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Boolean`);
    eq ($.Boolean.supertypes) ([]);
  });

  test ('provides the "Buffer" type', () => {
    eq ($.Buffer.name) ('Buffer');
    eq ($.Buffer.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Buffer`);
    eq ($.Buffer.supertypes) ([]);

    const isBuffer = $.test ([]) ($.Buffer);
    eq (isBuffer (null)) (false);
    eq (isBuffer (Buffer.from ([1, 2, 3]))) (true);

    {
      const Buffer = global.Buffer;
      delete global.Buffer;
      try {
        eq (isBuffer (null)) (false);
        eq (isBuffer (Buffer.from ([1, 2, 3]))) (false);
      } finally {
        global.Buffer = Buffer;
      }
    }
  });

  test ('provides the "Date" type', () => {
    eq ($.Date.name) ('Date');
    eq ($.Date.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Date`);
    eq ($.Date.supertypes) ([]);
  });

  test ('provides the "Descending" type constructor', () => {
    eq (typeof $.Descending) ('function');
    eq ($.Descending.length) (1);
    eq (show ($.Descending)) ('Descending :: Type -> Type');
    eq (show ($.Descending (a))) ('Descending a');
    eq (($.Descending (a)).name) ('Descending');
    eq (($.Descending (a)).url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Descending`);
    eq (($.Descending (a)).supertypes) ([]);

    const isDescendingString = $.test ([]) ($.Descending ($.String));
    eq (isDescendingString (null)) (false);
    eq (isDescendingString (Descending (12.34))) (false);
    eq (isDescendingString (Descending ('abc'))) (true);
  });

  test ('provides the "Either" type constructor', () => {
    eq (typeof $.Either) ('function');
    eq ($.Either.length) (1);
    eq (show ($.Either)) ('Either :: Type -> Type -> Type');
    eq (show ($.Either (a) (b))) ('Either a b');
    eq (($.Either (a) (b)).name) ('Either');
    eq (($.Either (a) (b)).url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Either`);
    eq (($.Either (a) (b)).supertypes) ([]);

    const isEitherStringNumber = $.test ([]) ($.Either ($.String) ($.Number));
    eq (isEitherStringNumber (null)) (false);
    eq (isEitherStringNumber (Left ('abc'))) (true);
    eq (isEitherStringNumber (Left (/XXX/))) (false);
    eq (isEitherStringNumber (Right (12.34))) (true);
    eq (isEitherStringNumber (Right (/XXX/))) (false);
  });

  test ('provides the "Error" type', () => {
    eq ($.Error.name) ('Error');
    eq ($.Error.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Error`);
    eq ($.Error.supertypes) ([]);
  });

  test ('provides the "Fn" type constructor', () => {
    eq (typeof $.Fn) ('function');
    eq ($.Fn.length) (1);
    eq (show ($.Fn)) ('Fn :: Type -> Type -> Type');
    eq (show ($.Fn (a) (b))) ('a -> b');
    eq (($.Fn (a) (b)).name) ('');
    eq (($.Fn (a) (b)).url) ('');
    eq (($.Fn (a) (b)).supertypes) ([$.AnyFunction]);
  });

  test ('provides the "Function" type constructor', () => {
    eq (typeof $.Function) ('function');
    eq ($.Function.length) (1);
    eq (show ($.Function)) ('Function :: NonEmpty (Array Type) -> Type');
    eq (show ($.Function ([a, b]))) ('a -> b');
    eq (($.Function ([a, b])).name) ('');
    eq (($.Function ([a, b])).url) ('');
    eq (($.Function ([a, b])).supertypes) ([$.AnyFunction]);

    //  Fn :: Type -> Type -> Type
    function Fn($1) { return function($2) { return $.Function ([$1, $2]); }; }

    //  https://gist.github.com/Avaq/1f0636ec5c8d6aed2e45
    var I = Fn (a) (a);
    var K = Fn (a) (Fn (b) (a));
    var A = Fn (Fn (a) (b)) (Fn (a) (b));
    var T = Fn (a) (Fn (Fn (a) (b)) (b));
    var W = Fn (Fn (a) (Fn (a) (b))) (Fn (a) (b));
    var C = Fn (Fn (a) (Fn (b) (c))) (Fn (b) (Fn (a) (c)));
    var B = Fn (Fn (b) (c)) (Fn (Fn (a) (b)) (Fn (a) (c)));
    var S = Fn (Fn (a) (Fn (b) (c))) (Fn (Fn (a) (b)) (Fn (a) (c)));
    var P = Fn (Fn (b) (Fn (b) (c))) (Fn (Fn (a) (b)) (Fn (a) (Fn (a) (c))));
    var Y = Fn (Fn (a) (a)) (a);

    eq (show (I)) ('a -> a');
    eq (show (K)) ('a -> b -> a');
    eq (show (A)) ('(a -> b) -> a -> b');
    eq (show (T)) ('a -> (a -> b) -> b');
    eq (show (W)) ('(a -> a -> b) -> a -> b');
    eq (show (C)) ('(a -> b -> c) -> b -> a -> c');
    eq (show (B)) ('(b -> c) -> (a -> b) -> a -> c');
    eq (show (S)) ('(a -> b -> c) -> (a -> b) -> a -> c');
    eq (show (P)) ('(b -> b -> c) -> (a -> b) -> a -> a -> c');
    eq (show (Y)) ('(a -> a) -> a');
  });

  test ('provides the "HtmlElement" type', () => {
    eq ($.HtmlElement.name) ('HtmlElement');
    eq ($.HtmlElement.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#HtmlElement`);
    eq ($.HtmlElement.supertypes) ([]);
  });

  test ('provides the "Identity" type constructor', () => {
    eq (typeof $.Identity) ('function');
    eq ($.Identity.length) (1);
    eq (show ($.Identity)) ('Identity :: Type -> Type');
    eq (show ($.Identity (a))) ('Identity a');
    eq (($.Identity (a)).name) ('Identity');
    eq (($.Identity (a)).url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Identity`);
    eq (($.Identity (a)).supertypes) ([]);

    const isIdentityString = $.test ([]) ($.Identity ($.String));
    eq (isIdentityString (null)) (false);
    eq (isIdentityString (Identity (12.34))) (false);
    eq (isIdentityString (Identity ('abc'))) (true);
  });

  test ('provides the "JsMap" type constructor', () => {
    eq (typeof $.JsMap) ('function');
    eq ($.JsMap.length) (1);
    eq (show ($.JsMap)) ('JsMap :: Type -> Type -> Type');
    eq (show ($.JsMap (a) (b))) ('JsMap a b');
    eq (($.JsMap (a) (b)).name) ('JsMap');
    eq (($.JsMap (a) (b)).url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#JsMap`);
    eq (($.JsMap (a) (b)).supertypes) ([]);

    const isJsMapNumberString = $.test ([]) ($.JsMap ($.Number) ($.String));
    eq (isJsMapNumberString (null)) (false);
    eq (isJsMapNumberString ({})) (false);
    eq (isJsMapNumberString (new Map ([]))) (true);
    eq (isJsMapNumberString (new Map ([[1, 'a'], [2, 'b'], [3, 'c']]))) (true);
    eq (isJsMapNumberString (new Map ([['a', 1], ['b', 2], ['c', 3]]))) (false);
  });

  test ('provides the "JsSet" type constructor', () => {
    eq (typeof $.JsSet) ('function');
    eq ($.JsSet.length) (1);
    eq (show ($.JsSet)) ('JsSet :: Type -> Type');
    eq (show ($.JsSet (a))) ('JsSet a');
    eq (($.JsSet (a)).name) ('JsSet');
    eq (($.JsSet (a)).url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#JsSet`);
    eq (($.JsSet (a)).supertypes) ([]);

    const isJsSetNumber = $.test ([]) ($.JsSet ($.Number));
    eq (isJsSetNumber (null)) (false);
    eq (isJsSetNumber ([])) (false);
    eq (isJsSetNumber (new Set ([]))) (true);
    eq (isJsSetNumber (new Set ([1, 2, 3]))) (true);
    eq (isJsSetNumber (new Set (['a', 'b', 'c']))) (false);
  });

  test ('provides the "Maybe" type constructor', () => {
    eq (typeof $.Maybe) ('function');
    eq ($.Maybe.length) (1);
    eq (show ($.Maybe)) ('Maybe :: Type -> Type');
    eq (show ($.Maybe (a))) ('Maybe a');
    eq (($.Maybe (a)).name) ('Maybe');
    eq (($.Maybe (a)).url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Maybe`);
    eq (($.Maybe (a)).supertypes) ([]);

    const isMaybeNumber = $.test ([]) ($.Maybe ($.Number));
    eq (isMaybeNumber (null)) (false);
    eq (isMaybeNumber (Nothing)) (true);
    eq (isMaybeNumber (Just (12.34))) (true);
    eq (isMaybeNumber (Just (/XXX/))) (false);
  });

  test ('provides the "NonEmpty" type constructor', () => {
    eq (($.NonEmpty ($.String)).name) ('NonEmpty');
    eq (($.NonEmpty ($.String)).url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#NonEmpty`);
    eq (($.NonEmpty ($.String)).supertypes) ([]);

    const isNonEmptyIntegerArray = $.test ([]) ($.NonEmpty ($.Array ($.Integer)));
    eq (isNonEmptyIntegerArray ([])) (false);
    eq (isNonEmptyIntegerArray ([0])) (true);
    eq (isNonEmptyIntegerArray ([0.5])) (false);
  });

  test ('provides the "Null" type', () => {
    eq ($.Null.name) ('Null');
    eq ($.Null.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Null`);
    eq ($.Null.supertypes) ([]);
  });

  test ('provides the "Nullable" type constructor', () => {
    eq (($.Nullable (a)).name) ('Nullable');
    eq (($.Nullable (a)).url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Nullable`);
    eq (($.Nullable (a)).supertypes) ([]);
  });

  test ('provides the "Number" type', () => {
    eq ($.Number.name) ('Number');
    eq ($.Number.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number`);
    eq ($.Number.supertypes) ([]);
  });

  test ('provides the "Object" type', () => {
    eq ($.Object.name) ('Object');
    eq ($.Object.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Object`);
    eq ($.Object.supertypes) ([]);
  });

  test ('provides the "Pair" type constructor', () => {
    eq (typeof $.Pair) ('function');
    eq ($.Pair.length) (1);
    eq (show ($.Pair)) ('Pair :: Type -> Type -> Type');
    eq (show ($.Pair (a) (b))) ('Pair a b');
    eq (($.Pair (a) (b)).name) ('Pair');
    eq (($.Pair (a) (b)).url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Pair`);
    eq (($.Pair (a) (b)).supertypes) ([]);

    const isPairStringNumber = $.test ([]) ($.Pair ($.String) ($.Number));
    eq (isPairStringNumber (null)) (false);
    eq (isPairStringNumber (Pair ('abc') ('xyz'))) (false);
    eq (isPairStringNumber (Pair ('abc') (67.89))) (true);
    eq (isPairStringNumber (Pair (12.34) ('xyz'))) (false);
    eq (isPairStringNumber (Pair (12.34) (67.89))) (false);
  });

  test ('provides the "RegExp" type', () => {
    eq ($.RegExp.name) ('RegExp');
    eq ($.RegExp.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#RegExp`);
    eq ($.RegExp.supertypes) ([]);
  });

  test ('provides the "String" type', () => {
    eq ($.String.name) ('String');
    eq ($.String.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#String`);
    eq ($.String.supertypes) ([]);
  });

  test ('provides the "Symbol" type', () => {
    eq ($.Symbol.name) ('Symbol');
    eq ($.Symbol.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Symbol`);
    eq ($.Symbol.supertypes) ([]);
  });

  test ('provides the "Type" type', () => {
    eq ($.Type.name) ('Type');
    eq ($.Type.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Type`);
    eq ($.Type.supertypes) ([]);
  });

  test ('provides the "TypeClass" type', () => {
    eq ($.TypeClass.name) ('TypeClass');
    eq ($.TypeClass.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#TypeClass`);
    eq ($.TypeClass.supertypes) ([]);
  });

  test ('provides the "Undefined" type', () => {
    eq ($.Undefined.name) ('Undefined');
    eq ($.Undefined.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Undefined`);
    eq ($.Undefined.supertypes) ([]);
  });

  test ('provides the "Unknown" type', () => {
    eq ($.Unknown.name) ('');
    eq ($.Unknown.url) ('');
    eq ($.Unknown.supertypes) ([]);
  });

  test ('provides the "ValidDate" type', () => {
    eq ($.ValidDate.name) ('ValidDate');
    eq ($.ValidDate.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#ValidDate`);
    eq ($.ValidDate.supertypes) ([$.Date]);

    //    sinceEpoch :: ValidDate -> Number
    const sinceEpoch =
    def ('sinceEpoch')
        ({})
        ([$.ValidDate, $.Number])
        (date => date.valueOf () / 1000);

    throws (() => { sinceEpoch (new Date ('foo')); })
           (new TypeError (`Invalid value

sinceEpoch :: ValidDate -> Number
              ^^^^^^^^^
                  1

1)  new Date (NaN) :: Date

The value at position 1 is not a member of ‘ValidDate’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#ValidDate for information about the ValidDate type.
`));

    eq (sinceEpoch (new Date (123456))) (123.456);
  });

  test ('provides the "PositiveNumber" type', () => {
    eq ($.PositiveNumber.name) ('PositiveNumber');
    eq ($.PositiveNumber.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#PositiveNumber`);
    eq ($.PositiveNumber.supertypes) ([$.Number]);

    const isPositiveNumber = $.test ([]) ($.PositiveNumber);
    eq (isPositiveNumber (null)) (false);
    eq (isPositiveNumber (NaN)) (false);
    eq (isPositiveNumber (-1)) (false);
    eq (isPositiveNumber (0)) (false);
    eq (isPositiveNumber (-0)) (false);
    eq (isPositiveNumber (0.5)) (true);
    eq (isPositiveNumber (Infinity)) (true);
    eq (isPositiveNumber (new Number (Infinity))) (false);
  });

  test ('provides the "NegativeNumber" type', () => {
    eq ($.NegativeNumber.name) ('NegativeNumber');
    eq ($.NegativeNumber.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#NegativeNumber`);
    eq ($.NegativeNumber.supertypes) ([$.Number]);

    const isNegativeNumber = $.test ([]) ($.NegativeNumber);
    eq (isNegativeNumber (null)) (false);
    eq (isNegativeNumber (NaN)) (false);
    eq (isNegativeNumber (1)) (false);
    eq (isNegativeNumber (0)) (false);
    eq (isNegativeNumber (-0)) (false);
    eq (isNegativeNumber (-0.5)) (true);
    eq (isNegativeNumber (-Infinity)) (true);
    eq (isNegativeNumber (new Number (-Infinity))) (false);
  });

  test ('provides the "ValidNumber" type', () => {
    eq ($.ValidNumber.name) ('ValidNumber');
    eq ($.ValidNumber.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#ValidNumber`);
    eq ($.ValidNumber.supertypes) ([$.Number]);

    const isValidNumber = $.test ([]) ($.ValidNumber);
    eq (isValidNumber (NaN)) (false);
    eq (isValidNumber (1)) (true);
    eq (isValidNumber (new Number (1))) (false);
  });

  test ('provides the "NonZeroValidNumber" type', () => {
    eq ($.NonZeroValidNumber.name) ('NonZeroValidNumber');
    eq ($.NonZeroValidNumber.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#NonZeroValidNumber`);
    eq ($.NonZeroValidNumber.supertypes) ([$.ValidNumber]);

    const isNonZeroValidNumber = $.test ([]) ($.NonZeroValidNumber);
    eq (isNonZeroValidNumber (0)) (false);
    eq (isNonZeroValidNumber (-0)) (false);
    eq (isNonZeroValidNumber (1)) (true);
    eq (isNonZeroValidNumber (new Number (1))) (false);
  });

  test ('provides the "FiniteNumber" type', () => {
    eq ($.FiniteNumber.name) ('FiniteNumber');
    eq ($.FiniteNumber.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#FiniteNumber`);
    eq ($.FiniteNumber.supertypes) ([$.ValidNumber]);

    const isFiniteNumber = $.test ([]) ($.FiniteNumber);
    eq (isFiniteNumber (Infinity)) (false);
    eq (isFiniteNumber (-Infinity)) (false);
    eq (isFiniteNumber (1)) (true);
    eq (isFiniteNumber (new Number (1))) (false);
  });

  test ('provides the "PositiveFiniteNumber" type', () => {
    eq ($.PositiveFiniteNumber.name) ('PositiveFiniteNumber');
    eq ($.PositiveFiniteNumber.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#PositiveFiniteNumber`);
    eq ($.PositiveFiniteNumber.supertypes) ([$.FiniteNumber]);

    const isPositiveFiniteNumber = $.test ([]) ($.PositiveFiniteNumber);
    eq (isPositiveFiniteNumber (null)) (false);
    eq (isPositiveFiniteNumber (NaN)) (false);
    eq (isPositiveFiniteNumber (Infinity)) (false);
    eq (isPositiveFiniteNumber (-1)) (false);
    eq (isPositiveFiniteNumber (0)) (false);
    eq (isPositiveFiniteNumber (-0)) (false);
    eq (isPositiveFiniteNumber (0.5)) (true);
    eq (isPositiveFiniteNumber (new Number (0.5))) (false);
  });

  test ('provides the "NegativeFiniteNumber" type', () => {
    eq ($.NegativeFiniteNumber.name) ('NegativeFiniteNumber');
    eq ($.NegativeFiniteNumber.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#NegativeFiniteNumber`);
    eq ($.NegativeFiniteNumber.supertypes) ([$.FiniteNumber]);

    const isNegativeFiniteNumber = $.test ([]) ($.NegativeFiniteNumber);
    eq (isNegativeFiniteNumber (null)) (false);
    eq (isNegativeFiniteNumber (NaN)) (false);
    eq (isNegativeFiniteNumber (-Infinity)) (false);
    eq (isNegativeFiniteNumber (1)) (false);
    eq (isNegativeFiniteNumber (0)) (false);
    eq (isNegativeFiniteNumber (-0)) (false);
    eq (isNegativeFiniteNumber (-0.5)) (true);
    eq (isNegativeFiniteNumber (new Number (-0.5))) (false);
  });

  test ('provides the "NonZeroFiniteNumber" type', () => {
    eq ($.NonZeroFiniteNumber.name) ('NonZeroFiniteNumber');
    eq ($.NonZeroFiniteNumber.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#NonZeroFiniteNumber`);
    eq ($.NonZeroFiniteNumber.supertypes) ([$.FiniteNumber]);

    const isNonZeroFiniteNumber = $.test ([]) ($.NonZeroFiniteNumber);
    eq (isNonZeroFiniteNumber (0)) (false);
    eq (isNonZeroFiniteNumber (-0)) (false);
    eq (isNonZeroFiniteNumber (Infinity)) (false);
    eq (isNonZeroFiniteNumber (-Infinity)) (false);
    eq (isNonZeroFiniteNumber (1)) (true);
    eq (isNonZeroFiniteNumber (new Number (1))) (false);
  });

  test ('provides the "Integer" type', () => {
    eq ($.Integer.name) ('Integer');
    eq ($.Integer.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Integer`);
    eq ($.Integer.supertypes) ([$.ValidNumber]);

    const isInteger = $.test ([]) ($.Integer);
    eq (isInteger (3.14)) (false);
    eq (isInteger (9007199254740992)) (false);
    eq (isInteger (-9007199254740992)) (false);
    eq (isInteger (1)) (true);
    eq (isInteger (new Number (1))) (false);
  });

  test ('provides the "NonZeroInteger" type', () => {
    eq ($.NonZeroInteger.name) ('NonZeroInteger');
    eq ($.NonZeroInteger.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#NonZeroInteger`);
    eq ($.NonZeroInteger.supertypes) ([$.Integer]);

    const isNonZeroInteger = $.test ([]) ($.NonZeroInteger);
    eq (isNonZeroInteger (0)) (false);
    eq (isNonZeroInteger (-0)) (false);
    eq (isNonZeroInteger (3.14)) (false);
    eq (isNonZeroInteger (1)) (true);
    eq (isNonZeroInteger (new Number (1))) (false);
  });

  test ('provides the "NonNegativeInteger" type', () => {
    eq ($.NonNegativeInteger.name) ('NonNegativeInteger');
    eq ($.NonNegativeInteger.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#NonNegativeInteger`);
    eq ($.NonNegativeInteger.supertypes) ([$.Integer]);

    const isNonNegativeInteger = $.test ([]) ($.NonNegativeInteger);
    eq (isNonNegativeInteger (0)) (true);
    eq (isNonNegativeInteger (-0)) (true);
    eq (isNonNegativeInteger (1)) (true);
    eq (isNonNegativeInteger (-1)) (false);
    eq (isNonNegativeInteger (3.14)) (false);
    eq (isNonNegativeInteger (new Number (1))) (false);
  });

  test ('provides the "PositiveInteger" type', () => {
    eq ($.PositiveInteger.name) ('PositiveInteger');
    eq ($.PositiveInteger.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#PositiveInteger`);
    eq ($.PositiveInteger.supertypes) ([$.Integer]);

    const isPositiveInteger = $.test ([]) ($.PositiveInteger);
    eq (isPositiveInteger (1.5)) (false);
    eq (isPositiveInteger (-1)) (false);
    eq (isPositiveInteger (1)) (true);
    eq (isPositiveInteger (new Number (1))) (false);
  });

  test ('provides the "NegativeInteger" type', () => {
    eq ($.NegativeInteger.name) ('NegativeInteger');
    eq ($.NegativeInteger.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#NegativeInteger`);
    eq ($.NegativeInteger.supertypes) ([$.Integer]);

    const isNegativeInteger = $.test ([]) ($.NegativeInteger);
    eq (isNegativeInteger (-1.5)) (false);
    eq (isNegativeInteger (1)) (false);
    eq (isNegativeInteger (-1)) (true);
    eq (isNegativeInteger (new Number (-1))) (false);
  });

  test ('provides the "GlobalRegExp" type', () => {
    eq ($.GlobalRegExp.name) ('GlobalRegExp');
    eq ($.GlobalRegExp.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#GlobalRegExp`);
    eq ($.GlobalRegExp.supertypes) ([$.RegExp]);

    const isGlobalRegExp = $.test ([]) ($.GlobalRegExp);
    eq (isGlobalRegExp (null)) (false);
    eq (isGlobalRegExp ({global: true})) (false);
    eq (isGlobalRegExp (/x/)) (false);
    eq (isGlobalRegExp (/x/i)) (false);
    eq (isGlobalRegExp (/x/m)) (false);
    eq (isGlobalRegExp (/x/im)) (false);
    eq (isGlobalRegExp (/x/g)) (true);
    eq (isGlobalRegExp (/x/gi)) (true);
    eq (isGlobalRegExp (/x/gm)) (true);
    eq (isGlobalRegExp (/x/gim)) (true);
  });

  test ('provides the "NonGlobalRegExp" type', () => {
    eq ($.NonGlobalRegExp.name) ('NonGlobalRegExp');
    eq ($.NonGlobalRegExp.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#NonGlobalRegExp`);
    eq ($.NonGlobalRegExp.supertypes) ([$.RegExp]);

    const isNonGlobalRegExp = $.test ([]) ($.NonGlobalRegExp);
    eq (isNonGlobalRegExp (null)) (false);
    eq (isNonGlobalRegExp ({global: false})) (false);
    eq (isNonGlobalRegExp (/x/g)) (false);
    eq (isNonGlobalRegExp (/x/gi)) (false);
    eq (isNonGlobalRegExp (/x/gm)) (false);
    eq (isNonGlobalRegExp (/x/gim)) (false);
    eq (isNonGlobalRegExp (/x/)) (true);
    eq (isNonGlobalRegExp (/x/i)) (true);
    eq (isNonGlobalRegExp (/x/m)) (true);
    eq (isNonGlobalRegExp (/x/im)) (true);
  });

  test ('provides the "RegexFlags" type', () => {
    eq ($.RegexFlags.name) ('RegexFlags');
    eq ($.RegexFlags.url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#RegexFlags`);
    eq ($.RegexFlags.supertypes) ([$.String]);

    const isRegexFlags = $.test ([]) ($.RegexFlags);
    eq (isRegexFlags ('')) (true);
    eq (isRegexFlags ('g')) (true);
    eq (isRegexFlags ('i')) (true);
    eq (isRegexFlags ('m')) (true);
    eq (isRegexFlags ('gi')) (true);
    eq (isRegexFlags ('gm')) (true);
    eq (isRegexFlags ('im')) (true);
    eq (isRegexFlags ('gim')) (true);
    //  String objects are not acceptable.
    eq (isRegexFlags (new String (''))) (false);
    //  Flags must be alphabetically ordered.
    eq (isRegexFlags ('mg')) (false);
    //  "Sticky" flag is not acceptable.
    eq (isRegexFlags ('y')) (false);
  });

  test ('provides the "StrMap" type constructor', () => {
    eq (typeof $.StrMap) ('function');
    eq ($.StrMap.length) (1);
    eq (show ($.StrMap)) ('StrMap :: Type -> Type');
    eq (show ($.StrMap (a))) ('StrMap a');
    eq (($.StrMap (a)).name) ('StrMap');
    eq (($.StrMap (a)).url) (`https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#StrMap`);
    eq (($.StrMap (a)).supertypes) ([$.Object]);

    //    id :: a -> a
    const id =
    def ('id')
        ({})
        ([a, a])
        (x => x);

    //    keys :: StrMap a -> Array String
    const keys =
    def ('keys')
        ({})
        ([$.StrMap (a), $.Array ($.String)])
        (m => (Object.keys (m)).sort ());

    //    values :: StrMap a -> Array a
    const values =
    def ('values')
        ({})
        ([$.StrMap (a), $.Array (a)])
        (m => Z.map (k => m[k], keys (m)));

    const o = Object.create (null);
    o.x = 1;
    o.y = 2;
    o.z = 3;

    eq (id ({})) ({});
    eq (id ({x: 1, y: 2, z: 3})) ({x: 1, y: 2, z: 3});
    eq (id (o)) ({x: 1, y: 2, z: 3});
    eq (id ({a: 1, b: 'XXX'})) ({a: 1, b: 'XXX'});

    eq (keys ({})) ([]);
    eq (keys ({x: 1, y: 2, z: 3})) (['x', 'y', 'z']);
    eq (keys (o)) (['x', 'y', 'z']);

    throws (() => { keys ({a: 1, b: 'XXX'}); })
           (new TypeError (`Type-variable constraint violation

keys :: StrMap a -> Array String
               ^
               1

1)  1 :: Number
    "XXX" :: String

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    eq (values ({})) ([]);
    eq (values ({x: 1, y: 2, z: 3})) ([1, 2, 3]);
    eq (values (o)) ([1, 2, 3]);

    throws (() => { values ({a: 1, b: 'XXX'}); })
           (new TypeError (`Type-variable constraint violation

values :: StrMap a -> Array a
                 ^
                 1

1)  1 :: Number
    "XXX" :: String

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    //    testUnaryType :: Array (StrMap Number) -> Array (StrMap Number)
    const testUnaryType =
    def ('testUnaryType')
        ({})
        ([$.Array ($.StrMap ($.Number)), $.Array ($.StrMap ($.Number))])
        (xs => xs);

    eq (testUnaryType ([{x: 1}, {y: 2}, {z: 3}])) ([{x: 1}, {y: 2}, {z: 3}]);

    throws (() => { testUnaryType ([{x: /xxx/}]); })
           (new TypeError (`Invalid value

testUnaryType :: Array (StrMap Number) -> Array (StrMap Number)
                               ^^^^^^
                                 1

1)  /xxx/ :: RegExp

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));

    //    testBinaryType :: Either a (StrMap b) -> Either a (StrMap b)
    const testBinaryType =
    def ('testBinaryType')
        ({})
        ([$.Either (a) ($.StrMap (b)), $.Either (a) ($.StrMap (b))])
        (e => e);

    eq (testBinaryType (Left ('XXX'))) (Left ('XXX'));
    eq (testBinaryType (Right ({x: 1, y: 2, z: 3}))) (Right ({x: 1, y: 2, z: 3}));

    throws (() => { testBinaryType (Right ({x: ['foo', false, 42]})); })
           (new TypeError (`Type-variable constraint violation

testBinaryType :: Either a (StrMap b) -> Either a (StrMap b)
                                   ^
                                   1

1)  ["foo", false, 42] :: Array ???

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));
  });

  test ('uses show-like string representations', () => {
    //    f :: Null -> Null
    const f =
    def ('f')
        ({})
        ([$.Null, $.Null])
        (n => n);

    function Point(x, y) {
      this.x = x;
      this.y = y;
    }
    Point.prototype._private = true;

    const o1 = {id: 1};
    const o2 = {id: 2};
    o1.ref = o2;
    o2.ref = o1;

    const values = [
      [(function() { return arguments; } (1, 2, 3)), 'Arguments'],
      [new Boolean (false), ''],
      [new Date (0), 'Date'],
      [new Date ('XXX'), 'Date'],
      [new Number (-0), ''],
      [new String (''), ''],
      [/x/.exec ('xyz'), 'Array String'],
      [(() => { const xs = [1, 2, 3]; xs.z = 0; xs.a = 0; return xs; }) (), 'Array Number'],
      [{toString: null}, 'Object, StrMap Null'],
      [new Point (0, 0), 'Object, StrMap Number'],
      [o1, 'Object, StrMap ???'],
    ];

    values.forEach (pair => {
      const x = pair[0];
      const types = pair[1];
      throws (() => { f (x); })
             (new TypeError (`Invalid value

f :: Null -> Null
     ^^^^
      1

1)  ${show (x)} :: ${types.length > 0 ? `${types}` : '(no types)'}

The value at position 1 is not a member of ‘Null’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Null for information about the Null type.
`));
    });
  });

  test ('lists the types of each value without duplicates', () => {
    const env = [$.Array ($.Unknown), $.Number, $.Integer];
    const def = $.create ({checkTypes: true, env});

    //    add :: Number -> Number -> Number
    const add =
    def ('add')
        ({})
        ([$.Number, $.Number, $.Number])
        (x => y => x + y);

    throws (() => { add ([[1], [2]]); })
           (new TypeError (`Invalid value

add :: Number -> Number -> Number
       ^^^^^^
         1

1)  [[1], [2]] :: Array (Array Number), Array (Array Integer)

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));
  });

  test ('supports polymorphism via type variables', () => {
    //    aa :: a -> a -> Pair a a
    const aa =
    def ('aa')
        ({})
        ([a, a, $.Pair (a) (a)])
        (Pair);

    //    ab :: a -> b -> Pair a b
    const ab =
    def ('ab')
        ({})
        ([a, b, $.Pair (a) (b)])
        (Pair);

    eq (aa (0) (1)) (Pair (0) (1));
    eq (aa (1) (0)) (Pair (1) (0));
    eq (ab (0) (1)) (Pair (0) (1));
    eq (ab (1) (0)) (Pair (1) (0));
    eq (ab (0) (false)) (Pair (0) (false));
    eq (ab (false) (0)) (Pair (false) (0));

    throws (() => { aa (0) (/x/); })
           (new TypeError (`Type-variable constraint violation

aa :: a -> a -> Pair a a
      ^    ^
      1    2

1)  0 :: Number

2)  /x/ :: RegExp

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { aa ([Left ('XXX'), false, 42]); })
           (new TypeError (`Type-variable constraint violation

aa :: a -> a -> Pair a a
      ^
      1

1)  [Left ("XXX"), false, 42] :: Array ???

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    //    fromMaybe :: a -> Maybe a -> a
    const fromMaybe =
    def ('fromMaybe')
        ({})
        ([a, $.Maybe (a), a])
        (x => maybe => maybe.isJust ? maybe.value : x);

    eq (fromMaybe (0) (Nothing)) (0);
    eq (fromMaybe (0) (Just (42))) (42);

    throws (() => { fromMaybe (0) ([1, 2, 3]); })
           (new TypeError (`Invalid value

fromMaybe :: a -> Maybe a -> a
                  ^^^^^^^
                     1

1)  [1, 2, 3] :: Array Number

The value at position 1 is not a member of ‘Maybe a’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Maybe for information about the Maybe type constructor.
`));

    //    fst :: Pair a b -> a
    const fst =
    def ('fst')
        ({})
        ([$.Pair (a) (b), a])
        (pair => pair.fst);

    eq (fst (Pair ('XXX') (42))) ('XXX');

    throws (() => { fst (['XXX', 42]); })
           (new TypeError (`Invalid value

fst :: Pair a b -> a
       ^^^^^^^^
          1

1)  ["XXX", 42] :: Array ???, Array2 String Number

The value at position 1 is not a member of ‘Pair a b’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Pair for information about the Pair type constructor.
`));

    //    twin :: Pair a a -> Boolean
    const twin =
    def ('twin')
        ({})
        ([$.Pair (a) (a), $.Boolean])
        (pair => Z.equals (pair.fst, pair.snd));

    eq (twin (Pair (42) (42))) (true);
    eq (twin (Pair (42) (99))) (false);

    throws (() => { twin (Pair (42) ('XXX')); })
           (new TypeError (`Type-variable constraint violation

twin :: Pair a a -> Boolean
             ^ ^
             1 2

1)  42 :: Number

2)  "XXX" :: String

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    //    concat :: Either a b -> Either a b -> Either a b
    const concat =
    def ('concat')
        ({})
        ([$.Either (a) (b), $.Either (a) (b), $.Either (a) (b)])
        (curry2 (Z.concat));

    eq (concat (Left ('abc')) (Left ('def'))) (Left ('abcdef'));
    eq (concat (Left ('abc')) (Right ('ABC'))) (Right ('ABC'));
    eq (concat (Right ('ABC')) (Left ('abc'))) (Right ('ABC'));
    eq (concat (Right ('ABC')) (Right ('DEF'))) (Right ('ABCDEF'));

    throws (() => { concat (Left ('abc')) (Left ([1, 2, 3])); })
           (new TypeError (`Type-variable constraint violation

concat :: Either a b -> Either a b -> Either a b
                 ^             ^
                 1             2

1)  "abc" :: String

2)  [1, 2, 3] :: Array Number

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { concat (Right ('abc')) (Right ([1, 2, 3])); })
           (new TypeError (`Type-variable constraint violation

concat :: Either a b -> Either a b -> Either a b
                   ^             ^
                   1             2

1)  "abc" :: String

2)  [1, 2, 3] :: Array Number

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    //    f :: a -> a -> a -> a
    const f =
    def ('f')
        ({})
        ([a, a, a, a])
        (x => y => z => x);

    eq (f (1) (2) (3)) (1);

    throws (() => { f (Left ('abc')) (Left (/XXX/)); })
           (new TypeError (`Type-variable constraint violation

f :: a -> a -> a -> a
     ^    ^
     1    2

1)  Left ("abc") :: Either String b

2)  Left (/XXX/) :: Either RegExp b

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { f (Right (123)) (Right (/XXX/)); })
           (new TypeError (`Type-variable constraint violation

f :: a -> a -> a -> a
     ^    ^
     1    2

1)  Right (123) :: Either b Number

2)  Right (/XXX/) :: Either b RegExp

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { f (Left ('abc')) (Right (123)) (Left (/XXX/)); })
           (new TypeError (`Type-variable constraint violation

f :: a -> a -> a -> a
     ^         ^
     1         2

1)  Left ("abc") :: Either String b

2)  Left (/XXX/) :: Either RegExp b

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { f (Left ('abc')) (Right (123)) (Right (/XXX/)); })
           (new TypeError (`Type-variable constraint violation

f :: a -> a -> a -> a
          ^    ^
          1    2

1)  Right (123) :: Either b Number

2)  Right (/XXX/) :: Either b RegExp

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));
  });

  test ('supports arbitrary nesting of types', () => {
    //    unnest :: Array (Array a) -> Array a
    const unnest =
    def ('unnest')
        ({})
        ([$.Array ($.Array (a)), $.Array (a)])
        (xss => Z.chain (xs => xs, xss));

    eq (unnest ([[1, 2], [3, 4], [5, 6]])) ([1, 2, 3, 4, 5, 6]);
    eq (unnest ([[null], [null], [null]])) ([null, null, null]);

    throws (() => { unnest ([1, 2, 3]); })
           (new TypeError (`Invalid value

unnest :: Array (Array a) -> Array a
                 ^^^^^^^
                    1

1)  1 :: Number

The value at position 1 is not a member of ‘Array a’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Array for information about the Array type constructor.
`));

    //    concatComplex :: Array (Either String Integer) -> Array (Either String Integer) -> Array (Either String Integer)
    const concatComplex =
    def ('concatComplex')
        ({})
        ([$.Array ($.Either ($.String) ($.Integer)),
          $.Array ($.Either ($.String) ($.Integer)),
          $.Array ($.Either ($.String) ($.Integer))])
        (xs => ys => [Left (/xxx/)]);

    throws (() => { concatComplex ([Left (/xxx/), Right (0), Right (0.1), Right (0.2)]); })
           (new TypeError (`Invalid value

concatComplex :: Array (Either String Integer) -> Array (Either String Integer) -> Array (Either String Integer)
                               ^^^^^^
                                 1

1)  /xxx/ :: RegExp

The value at position 1 is not a member of ‘String’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#String for information about the String type.
`));

    throws (() => { concatComplex ([Left ('abc'), Right (0), Right (0.1), Right (0.2)]); })
           (new TypeError (`Invalid value

concatComplex :: Array (Either String Integer) -> Array (Either String Integer) -> Array (Either String Integer)
                                      ^^^^^^^
                                         1

1)  0.1 :: Number

The value at position 1 is not a member of ‘Integer’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Integer for information about the Integer type.
`));

    throws (() => { concatComplex ([]) ([Left (/xxx/), Right (0), Right (0.1), Right (0.2)]); })
           (new TypeError (`Invalid value

concatComplex :: Array (Either String Integer) -> Array (Either String Integer) -> Array (Either String Integer)
                                                                ^^^^^^
                                                                  1

1)  /xxx/ :: RegExp

The value at position 1 is not a member of ‘String’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#String for information about the String type.
`));

    throws (() => { concatComplex ([]) ([Left ('abc'), Right (0), Right (0.1), Right (0.2)]); })
           (new TypeError (`Invalid value

concatComplex :: Array (Either String Integer) -> Array (Either String Integer) -> Array (Either String Integer)
                                                                       ^^^^^^^
                                                                          1

1)  0.1 :: Number

The value at position 1 is not a member of ‘Integer’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Integer for information about the Integer type.
`));

    throws (() => { concatComplex ([]) ([]); })
           (new TypeError (`Invalid value

concatComplex :: Array (Either String Integer) -> Array (Either String Integer) -> Array (Either String Integer)
                                                                                                 ^^^^^^
                                                                                                   1

1)  /xxx/ :: RegExp

The value at position 1 is not a member of ‘String’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#String for information about the String type.
`));
  });

  test ('does not allow heterogeneous arrays', () => {
    //    concat :: Array a -> Array a -> Array a
    const concat =
    def ('concat')
        ({})
        ([$.Array (a), $.Array (a), $.Array (a)])
        (curry2 (Z.concat));

    eq (concat ([]) ([])) ([]);
    eq (concat ([]) ([1, 2, 3])) ([1, 2, 3]);
    eq (concat ([1, 2, 3]) ([])) ([1, 2, 3]);
    eq (concat ([1, 2, 3]) ([4, 5, 6])) ([1, 2, 3, 4, 5, 6]);
    eq (concat ([Left ('XXX')]) ([Right (42)])) ([Left ('XXX'), Right (42)]);

    throws (() => { concat ([[1, 2, 3], [Left ('XXX'), Right (42)]]); })
           (new TypeError (`Type-variable constraint violation

concat :: Array a -> Array a -> Array a
                ^
                1

1)  [1, 2, 3] :: Array Number
    [Left ("XXX"), Right (42)] :: Array (Either String Number), Array2 (Either String b) (Either c Number)

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { concat ([[1, 2, 3], [Right (42), Left ('XXX')]]); })
           (new TypeError (`Type-variable constraint violation

concat :: Array a -> Array a -> Array a
                ^
                1

1)  [1, 2, 3] :: Array Number
    [Right (42), Left ("XXX")] :: Array (Either String Number), Array2 (Either b Number) (Either String c)

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    //    concatNested :: Array (Array a) -> Array (Array a) -> Array (Array a)
    const concatNested =
    def ('concatNested')
        ({})
        ([$.Array ($.Array (a)), $.Array ($.Array (a)), $.Array ($.Array (a))])
        (xss => yss => [['a', 'b', 'c'], [1, 2, 3]]);

    throws (() => { concatNested ([['a', 'b', 'c'], [1, 2, 3]]); })
           (new TypeError (`Type-variable constraint violation

concatNested :: Array (Array a) -> Array (Array a) -> Array (Array a)
                             ^
                             1

1)  "a" :: String
    "b" :: String
    "c" :: String
    1 :: Number
    2 :: Number
    3 :: Number

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { concatNested ([]) ([['a', 'b', 'c'], [1, 2, 3]]); })
           (new TypeError (`Type-variable constraint violation

concatNested :: Array (Array a) -> Array (Array a) -> Array (Array a)
                                                ^
                                                1

1)  "a" :: String
    "b" :: String
    "c" :: String
    1 :: Number
    2 :: Number
    3 :: Number

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { concatNested ([]) ([]); })
           (new TypeError (`Type-variable constraint violation

concatNested :: Array (Array a) -> Array (Array a) -> Array (Array a)
                                                                   ^
                                                                   1

1)  "a" :: String
    "b" :: String
    "c" :: String
    1 :: Number
    2 :: Number
    3 :: Number

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));
  });

  test ('supports higher-order functions', () => {
    //    f :: (String -> Number) -> Array String -> Array Number
    const f =
    def ('f')
        ({})
        ([$.Fn ($.String) ($.Number), $.Array ($.String), $.Array ($.Number)])
        (curry2 (Z.map));

    //    g :: (String -> Number) -> Array String -> Array Number
    const g =
    def ('g')
        ({})
        ([$.Fn ($.String) ($.Number), $.Array ($.String), $.Array ($.Number)])
        (f => xs => f (xs));

    eq (f (s => s.length) (['foo', 'bar', 'baz', 'quux'])) ([3, 3, 3, 4]);

    throws (() => { g (/xxx/); })
           (new TypeError (`Invalid value

g :: (String -> Number) -> Array String -> Array Number
      ^^^^^^^^^^^^^^^^
             1

1)  /xxx/ :: RegExp

The value at position 1 is not a member of ‘String -> Number’.
`));

    throws (() => { g (s => s.length) (['a', 'b', 'c']); })
           (new TypeError (`Invalid value

g :: (String -> Number) -> Array String -> Array Number
      ^^^^^^
        1

1)  ["a", "b", "c"] :: Array String

The value at position 1 is not a member of ‘String’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#String for information about the String type.
`));

    throws (() => { f (x => x) (['a', 'b', 'c']); })
           (new TypeError (`Invalid value

f :: (String -> Number) -> Array String -> Array Number
                ^^^^^^
                  1

1)  "a" :: String

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));

    //    map :: (a -> b) -> Array a -> Array b
    const map =
    def ('map')
        ({})
        ([$.Fn (a) (b), $.Array (a), $.Array (b)])
        (f => xs => {
           const result = [];
           for (let idx = 0; idx < xs.length; idx += 1) {
             result.push (f (idx === 3 ? null : xs[idx]));
           }
           return result;
         });

    eq (map (s => s.length) (['foo', 'bar'])) ([3, 3]);

    throws (() => { map (s => s.length) (['foo', 'bar', 'baz', 'quux']); })
           (new TypeError (`Type-variable constraint violation

map :: (a -> b) -> Array a -> Array b
        ^                ^
        1                2

1)  "foo" :: String
    "bar" :: String
    "baz" :: String
    null :: Null

2)  "foo" :: String
    "bar" :: String
    "baz" :: String
    "quux" :: String

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { map (s => s === 'baz' ? null : s.length) (['foo', 'bar', 'baz']); })
           (new TypeError (`Type-variable constraint violation

map :: (a -> b) -> Array a -> Array b
             ^
             1

1)  3 :: Number
    3 :: Number
    null :: Null

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    //    reduce_ :: ((a, b) -> a) -> a -> Array b -> a
    const reduce_ =
    def ('reduce_')
        ({})
        ([$.Function ([a, b, a]), a, $.Array (b), a])
        (curry3 (Z.reduce));

    eq (reduce_ ((x, y) => x + y) (0) ([1, 2, 3, 4, 5, 6])) (21);

    throws (() => { reduce_ (null); })
           (new TypeError (`Invalid value

reduce_ :: ((a, b) -> a) -> a -> Array b -> a
            ^^^^^^^^^^^
                 1

1)  null :: Null

The value at position 1 is not a member of ‘(a, b) -> a’.
`));

    //    unfoldr :: (b -> Maybe (Array2 a b)) -> b -> Array a
    const unfoldr =
    def ('unfoldr')
        ({})
        ([$.Fn (b) ($.Maybe ($.Array2 (a) (b))), b, $.Array (a)])
        (f => x => {
           const result = [];
           for (let m = f (x); m.isJust; m = f (m.value[1])) {
             result.push (m.value[0]);
           }
           return result;
         });

    //    h :: Integer -> Maybe (Array2 Integer Integer)
    const h = n => n >= 5 ? Nothing : Just ([n, n + 1]);

    eq (unfoldr (h) (5)) ([]);
    eq (unfoldr (h) (4)) ([4]);
    eq (unfoldr (h) (1)) ([1, 2, 3, 4]);

    throws (() => { unfoldr (null); })
           (new TypeError (`Invalid value

unfoldr :: (b -> Maybe (Array2 a b)) -> b -> Array a
            ^^^^^^^^^^^^^^^^^^^^^^^
                       1

1)  null :: Null

The value at position 1 is not a member of ‘b -> Maybe (Array2 a b)’.
`));

    throws (() => { unfoldr (n => n >= 5 ? Nothing : Just (n)) (1); })
           (new TypeError (`Invalid value

unfoldr :: (b -> Maybe (Array2 a b)) -> b -> Array a
                        ^^^^^^^^^^
                            1

1)  1 :: Number

The value at position 1 is not a member of ‘Array2 a b’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Array2 for information about the Array2 type constructor.
`));

    throws (() => { unfoldr (n => n >= 5 ? Nothing : Just ([null, 'XXX'])) (1); })
           (new TypeError (`Type-variable constraint violation

unfoldr :: (b -> Maybe (Array2 a b)) -> b -> Array a
            ^                    ^      ^
            1                    2      3

1)  1 :: Number

2)  "XXX" :: String

3)  1 :: Number

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    //    T :: a -> (a -> b) -> b
    const T =
    def ('T')
        ({})
        ([a, $.Fn (a) (b), b])
        (x => f => f (/* x */));

    throws (() => { T (100) (Math.sqrt); })
           (new TypeError (`‘T’ applied ‘a -> b’ to the wrong number of arguments

T :: a -> (a -> b) -> b
           ^
           1

Expected one argument but received zero arguments.
`));

    throws (() => { def ('once') ({}) ([$.Fn (a) (b), a, b]) (f => x => f (x)) (null); })
           (new TypeError (`Invalid value

once :: (a -> b) -> a -> b
         ^^^^^^
           1

1)  null :: Null

The value at position 1 is not a member of ‘a -> b’.
`));

    throws (() => { def ('twice') ({}) ([$.Fn (a) ($.Fn (a) (b)), a, b]) (f => x => f (x) (x)) (null); })
           (new TypeError (`Invalid value

twice :: (a -> a -> b) -> a -> b
          ^^^^^^^^^^^
               1

1)  null :: Null

The value at position 1 is not a member of ‘a -> a -> b’.
`));

    throws (() => { def ('thrice') ({}) ([$.Fn (a) ($.Fn (a) ($.Fn (a) (b))), a, b]) (f => x => f (x) (x) (x)) (null); })
           (new TypeError (`Invalid value

thrice :: (a -> a -> a -> b) -> a -> b
           ^^^^^^^^^^^^^^^^
                  1

1)  null :: Null

The value at position 1 is not a member of ‘a -> a -> a -> b’.
`));
  });

  test ('supports type-class constraints', () => {
    //    alt :: Alt f => f a -> f a -> f a
    const alt =
    def ('alt')
        ({f: [Z.Alt]})
        ([f (a), f (a), f (a)])
        (curry2 (Z.alt));

    eq (alt ([]) ([])) ([]);
    eq (alt ({}) ({})) ({});
    eq (alt (Nothing) (Nothing)) (Nothing);
    eq (alt (Nothing) (Just (1))) (Just (1));
    eq (alt (Just (2)) (Nothing)) (Just (2));
    eq (alt (Just (3)) (Just (4))) (Just (3));
    eq (alt (Left (1)) (Left (2))) (Left (2));
    eq (alt (Left (3)) (Right (4))) (Right (4));
    eq (alt (Right (5)) (Left (6))) (Right (5));
    eq (alt (Right (7)) (Right (8))) (Right (7));

    //    concat :: Semigroup a => a -> a -> a
    const concat =
    def ('concat')
        ({a: [Z.Semigroup]})
        ([a, a, a])
        (curry2 (Z.concat));

    eq (concat ([1, 2, 3]) ([4, 5, 6])) ([1, 2, 3, 4, 5, 6]);
    eq (concat ('abc') ('def')) ('abcdef');

    throws (() => { concat (/x/); })
           (new TypeError (`Type-class constraint violation

concat :: Semigroup a => a -> a -> a
          ^^^^^^^^^^^    ^
                         1

1)  /x/ :: RegExp

‘concat’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.

See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v${Z$version}#Semigroup for information about the sanctuary-type-classes/Semigroup type class.
`));

    throws (() => { concat ([]) (''); })
           (new TypeError (`Type-variable constraint violation

concat :: Semigroup a => a -> a -> a
                         ^    ^
                         1    2

1)  [] :: Array b

2)  "" :: String

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { concat ('') ([]); })
           (new TypeError (`Type-variable constraint violation

concat :: Semigroup a => a -> a -> a
                         ^    ^
                         1    2

1)  "" :: String

2)  [] :: Array b

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    //    filter :: Filterable f => (a -> Boolean) -> f a -> f a
    const filter =
    def ('filter')
        ({f: [Z.Filterable]})
        ([$.Fn (a) ($.Boolean), f (a), f (a)])
        (curry2 (Z.filter));

    //    even :: Integer -> Boolean
    const even = x => x % 2 === 0;

    eq (filter (even) (Nothing)) (Nothing);
    eq (filter (even) (Just (9))) (Nothing);
    eq (filter (even) (Just (4))) (Just (4));

    throws (() => { filter (even) (Right (42)); })
           (new TypeError (`Type-class constraint violation

filter :: Filterable f => (a -> Boolean) -> f a -> f a
          ^^^^^^^^^^^^                      ^^^
                                             1

1)  Right (42) :: Either b Number

‘filter’ requires ‘f’ to satisfy the Filterable type-class constraint; the value at position 1 does not.

See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v${Z$version}#Filterable for information about the sanctuary-type-classes/Filterable type class.
`));

    //    concatMaybes :: Semigroup a => Maybe a -> Maybe a -> Maybe a
    const concatMaybes =
    def ('concatMaybes')
        ({a: [Z.Semigroup]})
        ([$.Maybe (a), $.Maybe (a), $.Maybe (a)])
        (m => n => Just (/xxx/));

    throws (() => { concatMaybes (Just (/xxx/)); })
           (new TypeError (`Type-class constraint violation

concatMaybes :: Semigroup a => Maybe a -> Maybe a -> Maybe a
                ^^^^^^^^^^^          ^
                                     1

1)  /xxx/ :: RegExp

‘concatMaybes’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.

See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v${Z$version}#Semigroup for information about the sanctuary-type-classes/Semigroup type class.
`));

    throws (() => { concatMaybes (Just ('abc')) (Just (/xxx/)); })
           (new TypeError (`Type-class constraint violation

concatMaybes :: Semigroup a => Maybe a -> Maybe a -> Maybe a
                ^^^^^^^^^^^                     ^
                                                1

1)  /xxx/ :: RegExp

‘concatMaybes’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.

See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v${Z$version}#Semigroup for information about the sanctuary-type-classes/Semigroup type class.
`));

    throws (() => { concatMaybes (Just ('abc')) (Just ('def')); })
           (new TypeError (`Type-class constraint violation

concatMaybes :: Semigroup a => Maybe a -> Maybe a -> Maybe a
                ^^^^^^^^^^^                                ^
                                                           1

1)  /xxx/ :: RegExp

‘concatMaybes’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.

See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v${Z$version}#Semigroup for information about the sanctuary-type-classes/Semigroup type class.
`));

    //    sillyConst :: (Alternative a, Semigroup b) => a -> b -> a
    const sillyConst =
    def ('sillyConst')
        ({a: [Z.Alternative], b: [Z.Semigroup]})
        ([a, b, a])
        (x => y => x);

    eq (sillyConst (Just (42)) ([1, 2, 3])) (Just (42));

    throws (() => { sillyConst (true); })
           (new TypeError (`Type-class constraint violation

sillyConst :: (Alternative a, Semigroup b) => a -> b -> a
               ^^^^^^^^^^^^^                  ^
                                              1

1)  true :: Boolean

‘sillyConst’ requires ‘a’ to satisfy the Alternative type-class constraint; the value at position 1 does not.

See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v${Z$version}#Alternative for information about the sanctuary-type-classes/Alternative type class.
`));
  });

  test ('supports unary type variables', () => {
    //    Box :: a -> Box a
    const Box = x => ({
      'value': x,
      '@@type': 'my-package/Box@1',
      '@@show': () => 'Box (' + show (x) + ')',
    });

    //    $Box :: Type -> Type
    const $Box = $.UnaryType
      ('Box')
      ('http://example.com/my-package#Box')
      ([])
      (x => type (x) === 'my-package/Box@1')
      (box => [box.value]);

    const env = Z.concat ($.env, [$Box ($.Unknown)]);
    const def = $.create ({checkTypes: true, env});

    //    map :: Functor f => (a -> b) -> f a -> f b
    const map =
    def ('map')
        ({f: [Z.Functor]})
        ([$.Fn (a) (b), f (a), f (b)])
        (curry2 (Z.map));

    eq (map (Math.sqrt) (Nothing)) (Nothing);
    eq (map (Math.sqrt) (Just (9))) (Just (3));

    eq (map (Math.sqrt) (Math.sqrt) (625)) (5);

    const xs = [1, 4, 9];
    xs['fantasy-land/map'] = xs.map;

    throws (() => { map (Math.sqrt) (xs); })
           (new TypeError (`‘map’ applied ‘a -> b’ to the wrong number of arguments

map :: Functor f => (a -> b) -> f a -> f b
                     ^
                     1

Expected one argument but received three arguments:

  - 1
  - 0
  - [1, 4, 9, "fantasy-land/map": function map() { [native code] }]
`));

    //    sum :: Foldable f => f FiniteNumber -> FiniteNumber
    const sum =
    def ('sum')
        ({f: [Z.Foldable]})
        ([f ($.FiniteNumber), $.FiniteNumber])
        (foldable => Z.reduce ((x, y) => x + y, 0, foldable));

    eq (sum ([1, 2, 3, 4, 5])) (15);
    eq (sum (Nothing)) (0);
    eq (sum (Just (42))) (42);
    eq (sum (Left ('XXX'))) (0);
    eq (sum (Right (42))) (42);

    throws (() => { sum (42); })
           (new TypeError (`Invalid value

sum :: Foldable f => f FiniteNumber -> FiniteNumber
                     ^^^^^^^^^^^^^^
                           1

1)  42 :: Number

The value at position 1 is not a member of ‘f FiniteNumber’.
`));

    throws (() => { sum (Box (42)); })
           (new TypeError (`Type-class constraint violation

sum :: Foldable f => f FiniteNumber -> FiniteNumber
       ^^^^^^^^^^    ^^^^^^^^^^^^^^
                           1

1)  Box (42) :: Box Number

‘sum’ requires ‘f’ to satisfy the Foldable type-class constraint; the value at position 1 does not.

See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v${Z$version}#Foldable for information about the sanctuary-type-classes/Foldable type class.
`));

    throws (() => { sum (Just (Infinity)); })
           (new TypeError (`Invalid value

sum :: Foldable f => f FiniteNumber -> FiniteNumber
                       ^^^^^^^^^^^^
                            1

1)  Infinity :: Number

The value at position 1 is not a member of ‘FiniteNumber’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#FiniteNumber for information about the FiniteNumber type.
`));

    //    sort :: (Ord a, Applicative f, Foldable f, Monoid (f a)) => f a -> f a
    const sort =
    def ('sort')
        ({a: [Z.Ord], f: [Z.Applicative, Z.Foldable, Z.Monoid]})
        ([f (a), f (a)])
        (m => {
           const M = m.constructor;
           return Z.reduce (
             (m, x) => Z.concat (m, Z.of (M, x)),
             Z.empty (M),
             Z.reduce ((xs, x) => {
               let idx = 0;
               while (idx < xs.length && Z.lte (xs[idx], x)) idx += 1;
               xs.splice (idx, 0, x);
               return xs;
             }, [], m)
           );
         });

    eq (sort (['foo', 'bar', 'baz'])) (['bar', 'baz', 'foo']);

    throws (() => { sort (['foo', true, 42]); })
           (new TypeError (`Type-variable constraint violation

sort :: (Ord a, Applicative f, Foldable f, Monoid f) => f a -> f a
                                                          ^
                                                          1

1)  "foo" :: String
    true :: Boolean

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    throws (() => { sort ([Math.sin, Math.cos]); })
           (new TypeError (`Type-class constraint violation

sort :: (Ord a, Applicative f, Foldable f, Monoid f) => f a -> f a
         ^^^^^                                            ^
                                                          1

1)  function sin() { [native code] } :: Function, (b -> c)

‘sort’ requires ‘a’ to satisfy the Ord type-class constraint; the value at position 1 does not.

See https://github.com/sanctuary-js/sanctuary-type-classes/tree/v${Z$version}#Ord for information about the sanctuary-type-classes/Ord type class.
`));

    //    xxx :: f String -> Null
    const xxx = def ('xxx') ({}) ([f ($.String), $.Null]) (x => null);

    eq (xxx ([])) (null);
    eq (xxx (['foo'])) (null);
    eq (xxx (['foo', 'bar'])) (null);
    eq (xxx (['foo', 'bar', 'baz'])) (null);

    throws (() => { xxx ('XXX'); })
           (new TypeError (`Invalid value

xxx :: f String -> Null
       ^^^^^^^^
          1

1)  "XXX" :: String

The value at position 1 is not a member of ‘f String’.
`));

    throws (() => { xxx ([1, 2, 3]); })
           (new TypeError (`Invalid value

xxx :: f String -> Null
         ^^^^^^
           1

1)  1 :: Number

The value at position 1 is not a member of ‘String’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#String for information about the String type.
`));
  });

  test ('supports binary type variables', () => {
    //    f :: Type -> Type -> Type
    const f = $.BinaryTypeVariable ('f');

    //    bimap :: Bifunctor f => (a -> b) -> (c -> d) -> f a c -> f b d
    const bimap =
    def ('bimap')
        ({f: [Z.Bifunctor]})
        ([$.Fn (a) (b), $.Fn (c) (d), f (a) (c), f (b) (d)])
        (curry3 (Z.bimap));

    eq (show (bimap)) ('bimap :: Bifunctor f => (a -> b) -> (c -> d) -> f a c -> f b d');
    eq (bimap (s => s.length) (Math.sqrt) (Pair ('Sanctuary') (25))) (Pair (9) (5));

    throws (() => { bimap (xs => xs.length) (Math.sqrt) (Pair (['foo', true, 42]) (null)); })
           (new TypeError (`Type-variable constraint violation

bimap :: Bifunctor f => (a -> b) -> (c -> d) -> f a c -> f b d
                                                  ^
                                                  1

1)  ["foo", true, 42] :: Array ???

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    //    chain :: Chain m => (a -> m b) -> m a -> m b
    const chain =
    def ('chain')
        ({m: [Z.Chain]})
        ([$.Fn (a) (m (b)), m (a), m (b)])
        (curry2 (Z.chain));

    throws (() => { chain (Left) (Just ('x')); })
           (new TypeError (`Type-variable constraint violation

chain :: Chain m => (a -> m b) -> m a -> m b
                          ^^^     ^^^
                           1       2

1)  Left ("x") :: Either String c

2)  Just ("x") :: Maybe String

Since there is no type of which all the above values are members, the type-variable constraint has been violated.
`));

    //    xxx :: f String Number -> Null
    const xxx = def ('xxx') ({}) ([f ($.String) ($.Number), $.Null]) (x => null);

    eq (xxx (Pair ('abc') (123))) (null);
    eq (xxx (Left ('abc'))) (null);
    eq (xxx (Right (123))) (null);

    throws (() => { xxx (/XXX/); })
           (new TypeError (`Invalid value

xxx :: f String Number -> Null
       ^^^^^^^^^^^^^^^
              1

1)  /XXX/ :: RegExp

The value at position 1 is not a member of ‘f String Number’.
`));

    throws (() => { xxx (Left (/XXX/)); })
           (new TypeError (`Invalid value

xxx :: f String Number -> Null
         ^^^^^^
           1

1)  /XXX/ :: RegExp

The value at position 1 is not a member of ‘String’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#String for information about the String type.
`));

    throws (() => { xxx (Right (/XXX/)); })
           (new TypeError (`Invalid value

xxx :: f String Number -> Null
                ^^^^^^
                  1

1)  /XXX/ :: RegExp

The value at position 1 is not a member of ‘Number’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Number for information about the Number type.
`));
  });

  test ('only determines actual types when necessary', () => {
    //  count :: Integer
    let count = 0;

    //    Void :: Type
    const Void = $.NullaryType
      ('Void')
      ('http://example.com/my-package#Void')
      ([])
      (x => { count += 1; return false; });

    const env = [$.Array ($.Unknown), $.Maybe ($.Unknown), $.Number, Void];
    const def = $.create ({checkTypes: true, env});

    //    head :: Array a -> Maybe a
    const head =
    def ('head')
        ({})
        ([$.Array (a), $.Maybe (a)])
        (xs => xs.length > 0 ? Just (xs[0]) : Nothing);

    eq (head ([])) (Nothing);
    eq (count) (0);
    eq (head ([1, 2, 3])) (Just (1));
    eq (count) (1);
  });

  test ('replaces Unknowns with free type variables', () => {
    //    map :: Functor f => (a -> b) -> f a -> f b
    const map =
    def ('map')
        ({f: [Z.Functor]})
        ([$.Fn (a) (b), f (a), f (b)])
        (curry2 (Z.map));

    throws (() => { map (Right (Right (Right (Right (0))))); })
           (new TypeError (`Invalid value

map :: Functor f => (a -> b) -> f a -> f b
                     ^^^^^^
                       1

1)  Right (Right (Right (Right (0)))) :: Either c (Either d (Either e (Either g Number)))

The value at position 1 is not a member of ‘a -> b’.
`));
  });

});

suite ('test', () => {

  test ('is a ternary function', () => {
    eq (typeof $.test) ('function');
    eq ($.test.length) (1);
    eq (show ($.test)) ('test :: Array Type -> Type -> Any -> Boolean');
  });

  test ('supports nullary types', () => {
    eq ($.test ([]) ($.Number) (null)) (false);
    eq ($.test ([]) ($.Number) ('42')) (false);
    eq ($.test ([]) ($.Number) (42)) (true);
  });

  test ('supports unary types', () => {
    eq ($.test ([]) ($.Array ($.Number)) (null)) (false);
    eq ($.test ([]) ($.Array ($.Number)) ('42')) (false);
    eq ($.test ([]) ($.Array ($.Number)) ([1, 2, '3'])) (false);
    eq ($.test ([]) ($.Array ($.Number)) (['42'])) (false);
    eq ($.test ([]) ($.Array ($.Number)) ([])) (true);
    eq ($.test ([]) ($.Array ($.Number)) ([1, 2, 3])) (true);
  });

  test ('supports binary types', () => {
    eq ($.test ([]) ($.Pair ($.Number) ($.String)) (Pair (42) (42))) (false);
    eq ($.test ([]) ($.Pair ($.Number) ($.String)) (Pair ('') (''))) (false);
    eq ($.test ([]) ($.Pair ($.Number) ($.String)) (Pair ('') (42))) (false);
    eq ($.test ([]) ($.Pair ($.Number) ($.String)) (Pair (42) (''))) (true);
  });

  test ('supports type variables', () => {
    eq ($.test ($.env) ($.Array (a)) (null)) (false);
    eq ($.test ($.env) ($.Array (a)) ('42')) (false);
    eq ($.test ($.env) ($.Array (a)) ([1, 2, '3'])) (false);
    eq ($.test ($.env) ($.Array (a)) (['42'])) (true);
    eq ($.test ($.env) ($.Array (a)) ([])) (true);
    eq ($.test ($.env) ($.Array (a)) ([1, 2, 3])) (true);

    eq ($.test ($.env) ($.Pair (a) (a)) (Pair ('foo') (42))) (false);
    eq ($.test ($.env) ($.Pair (a) (a)) (Pair ('foo') ('bar'))) (true);
    eq ($.test ($.env) ($.Pair (a) (b)) (Pair ('foo') (42))) (true);
  });

});

suite ('NullaryType', () => {

  test ('is a ternary function', () => {
    eq (typeof $.NullaryType) ('function');
    eq ($.NullaryType.length) (1);
    eq (show ($.NullaryType)) ('NullaryType :: String -> String -> Array Type -> (Any -> Boolean) -> Type');
  });

  test ('supports subtyping', () => {
    //    Number_ :: Type
    const Number_ = $.NullaryType
      ('Number')
      ('')
      ([])
      (x => typeof x === 'number');

    //    ValidNumber :: Type
    const ValidNumber = $.NullaryType
      ('ValidNumber')
      ('')
      ([Number_])
      (complement (isNaN));

    //    FiniteNumber :: Type
    const FiniteNumber = $.NullaryType
      ('FiniteNumber')
      ('')
      ([ValidNumber])
      (isFinite);

    eq ($.test ([]) (Number_) (null)) (false);
    eq ($.test ([]) (Number_) (NaN)) (true);
    eq ($.test ([]) (ValidNumber) (null)) (false);
    eq ($.test ([]) (ValidNumber) (NaN)) (false);
    eq ($.test ([]) (ValidNumber) (Infinity)) (true);
    eq ($.test ([]) (FiniteNumber) (null)) (false);
    eq ($.test ([]) (FiniteNumber) (NaN)) (false);
    eq ($.test ([]) (FiniteNumber) (Infinity)) (false);
    eq ($.test ([]) (FiniteNumber) (0)) (true);
  });

});

suite ('UnaryType', () => {

  test ('is a quaternary function', () => {
    eq (typeof $.UnaryType) ('function');
    eq ($.UnaryType.length) (1);
    eq (show ($.UnaryType)) ('UnaryType :: Foldable f => String -> String -> Array Type -> (Any -> Boolean) -> (t a -> f a) -> Type -> Type');
  });

  test ('returns a type constructor which type checks its arguments', () => {
    //    MyUnaryType :: Type -> Type
    const MyUnaryType = $.UnaryType
      ('MyUnaryType')
      ('')
      ([])
      (x => type (x) === 'my-package/MyUnaryType@1')
      (_ => []);

    eq (show (def ('f')
                  ({})
                  ([MyUnaryType ($.RecordType ({x: $.Number, y: $.Number}))])
                  (() => {})))
       ('f :: () -> MyUnaryType { x :: Number, y :: Number }');

    throws (() => { MyUnaryType ({x: $.Number, y: $.Number}); })
           (new TypeError (`Invalid value

MyUnaryType :: Type -> Type
               ^^^^
                1

1)  {"x": Number, "y": Number} :: Object, StrMap Type

The value at position 1 is not a member of ‘Type’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Type for information about the Type type.
`));
  });

  test ('supports subtyping', () => {
    //    Palindrome :: Type -> Type
    const Palindrome = $.UnaryType
      ('Palindrome')
      ('http://example.com/my-package#Palindrome')
      ([$.Array ($.Unknown)])
      (xs => Z.equals (xs, Z.reverse (xs)))
      (palindrome => palindrome);

    eq ($.test ([]) (Palindrome ($.Number)) (null)) (false);
    eq ($.test ([]) (Palindrome ($.Number)) ([])) (true);
    eq ($.test ([]) (Palindrome ($.Number)) ([1])) (true);
    eq ($.test ([]) (Palindrome ($.Number)) ([1, 2, 3])) (false);
    eq ($.test ([]) (Palindrome ($.Number)) ([1, 2, 1])) (true);
    eq ($.test ([]) (Palindrome ($.Number)) (['foo', 'bar', 'foo'])) (false);
  });

});

suite ('BinaryType', () => {

  test ('is a quinary function', () => {
    eq (typeof $.BinaryType) ('function');
    eq ($.BinaryType.length) (1);
    eq (show ($.BinaryType)) ('BinaryType :: Foldable f => String -> String -> Array Type -> (Any -> Boolean) -> (t a b -> f a) -> (t a b -> f b) -> Type -> Type -> Type');
  });

  test ('returns a type constructor which type checks its arguments', () => {
    //    MyBinaryType :: Type -> Type -> Type
    const MyBinaryType = $.BinaryType
      ('MyBinaryType')
      ('')
      ([])
      (x => type (x) === 'my-package/MyBinaryType@1')
      (_ => [])
      (_ => []);

    throws (() => { MyBinaryType ($.Number) ({x: $.Number, y: $.Number}); })
           (new TypeError (`Invalid value

MyBinaryType :: Type -> Type -> Type
                        ^^^^
                         1

1)  {"x": Number, "y": Number} :: Object, StrMap Type

The value at position 1 is not a member of ‘Type’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Type for information about the Type type.
`));
  });

  test ('supports subtyping', () => {
    //    Different :: Type -> Type -> Type
    const Different = $.BinaryType
      ('Different')
      ('http://example.com/my-package#Different')
      ([$.Array2 ($.Unknown) ($.Unknown)])
      (array2 => !(Z.equals (array2[0], array2[1])))
      (different => [different[0]])
      (different => [different[1]]);

    eq ($.test ([]) (Different ($.String) ($.String)) ([null, null])) (false);
    eq ($.test ([]) (Different ($.String) ($.String)) ([null, 'foo'])) (false);
    eq ($.test ([]) (Different ($.String) ($.String)) (['foo', null])) (false);
    eq ($.test ([]) (Different ($.String) ($.String)) (['foo', 'foo'])) (false);
    eq ($.test ([]) (Different ($.String) ($.String)) (['foo', 'bar'])) (true);
  });

});

suite ('TypeVariable', () => {

  test ('is a unary function', () => {
    eq (typeof $.TypeVariable) ('function');
    eq ($.TypeVariable.length) (1);
    eq (show ($.TypeVariable)) ('TypeVariable :: String -> Type');
  });

});

suite ('UnaryTypeVariable', () => {

  test ('is a unary function', () => {
    eq (typeof $.UnaryTypeVariable) ('function');
    eq ($.UnaryTypeVariable.length) (1);
    eq (show ($.UnaryTypeVariable)) ('UnaryTypeVariable :: String -> Type -> Type');
  });

  test ('returns a function which type checks its arguments', () => {
    //    f :: Type -> Type
    const f = $.UnaryTypeVariable ('f');

    eq (typeof f) ('function');
    eq (f.length) (1);
    eq (show (f)) ('f :: Type -> Type');
    eq (show (f (a))) ('f a');

    throws (() => { f (Number); })
           (new TypeError (`Invalid value

f :: Type -> Type
     ^^^^
      1

1)  function Number() { [native code] } :: Function, (a -> b)

The value at position 1 is not a member of ‘Type’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Type for information about the Type type.
`));
  });

});

suite ('BinaryTypeVariable', () => {

  test ('is a unary function', () => {
    eq (typeof $.BinaryTypeVariable) ('function');
    eq ($.BinaryTypeVariable.length) (1);
    eq (show ($.BinaryTypeVariable)) ('BinaryTypeVariable :: String -> Type -> Type -> Type');
  });

  test ('returns a function which type checks its arguments', () => {
    //    p :: Type -> Type -> Type
    const p = $.BinaryTypeVariable ('p');

    eq (typeof p) ('function');
    eq (p.length) (1);
    eq (show (p)) ('p :: Type -> Type -> Type');
    eq (show (p (a) (b))) ('p a b');

    throws (() => { p (Number); })
           (new TypeError (`Invalid value

p :: Type -> Type -> Type
     ^^^^
      1

1)  function Number() { [native code] } :: Function, (a -> b)

The value at position 1 is not a member of ‘Type’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Type for information about the Type type.
`));
  });

});

suite ('Thunk', () => {

  test ('is a unary function', () => {
    eq (typeof $.Thunk) ('function');
    eq ($.Thunk.length) (1);
    eq (show ($.Thunk)) ('Thunk :: Type -> Type');
    eq (show ($.Thunk (a))) ('() -> a');
    eq (show ($.Thunk ($.Thunk (a)))) ('() -> () -> a');
    eq (show ($.Thunk ($.Thunk ($.Thunk (a))))) ('() -> () -> () -> a');
  });

  test ('is short for `t => $.Function ([t])`', () => {
    //    why :: (() -> Integer) -> Integer
    const why =
    def ('why')
        ({})
        ([$.Thunk ($.Integer), $.Integer])
        (thunk => thunk ());

    eq (why (() => 42)) (42);

    throws (() => { why (() => 'Who knows?'); })
           (new TypeError (`Invalid value

why :: (() -> Integer) -> Integer
              ^^^^^^^
                 1

1)  "Who knows?" :: String

The value at position 1 is not a member of ‘Integer’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Integer for information about the Integer type.
`));
  });

});

suite ('Predicate', () => {

  test ('is a unary function', () => {
    eq (typeof $.Predicate) ('function');
    eq ($.Predicate.length) (1);
    eq (show ($.Predicate)) ('Predicate :: Type -> Type');
    eq (show ($.Predicate (a))) ('a -> Boolean');
    eq (show ($.Predicate ($.Predicate (a)))) ('(a -> Boolean) -> Boolean');
    eq (show ($.Predicate ($.Predicate ($.Predicate (a))))) ('((a -> Boolean) -> Boolean) -> Boolean');
  });

  test ('is short for `t => $.Fn (t) ($.Boolean)`', () => {
    //    when :: (a -> Boolean) -> (a -> a) -> a -> a
    const when =
    def ('when')
        ({})
        ([$.Predicate (a), $.Fn (a) (a), a, a])
        (pred => f => x => pred (x) ? f (x) : x);

    //    abs :: Number -> Number
    const abs = when (x => x < 0) (x => -x);

    eq (abs (42)) (42);
    eq (abs (-1)) (1);

    throws (() => { when (x => x) (x => x) ('foo'); })
           (new TypeError (`Invalid value

when :: (a -> Boolean) -> (a -> a) -> a -> a
              ^^^^^^^
                 1

1)  "foo" :: String

The value at position 1 is not a member of ‘Boolean’.

See https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#Boolean for information about the Boolean type.
`));
  });

});

suite ('interoperability', () => {

  test ('Z.equals can operate on ‘Type’ values', () => {
    eq (Z.equals ($.Number, $.Number)) (true);
    eq (Z.equals ($.Number, $.String)) (false);
    eq (Z.equals ($.Array ($.Number), $.Array ($.Number))) (true);
    eq (Z.equals ($.Array ($.Number), $.Array ($.String))) (false);
    eq (Z.equals ($.RecordType ({x: $.Number}), $.RecordType ({x: $.Number}))) (true);
    eq (Z.equals ($.RecordType ({x: $.Number}), $.RecordType ({y: $.Number}))) (false);
    eq (Z.equals ($.RecordType ({x: $.Number}), $.RecordType ({x: $.String}))) (false);
    eq (Z.equals ($.NullaryType ('X') ('') ([$.Number]) (x => true),
                  $.NullaryType ('X') ('') ([$.Number]) (x => true)))
       (true);
    eq (Z.equals ($.NullaryType ('X') ('') ([$.Number]) (x => true),
                  $.NullaryType ('X') ('') ([$.String]) (x => true)))
       (false);
    eq (Z.equals ($.NullaryType ('X') ('') ([]) (x => true),
                  $.NullaryType ('X') ('') ([]) (x => true)))
       (true);
    eq (Z.equals ($.NullaryType ('X') ('') ([]) (x => true),
                  $.NullaryType ('Y') ('') ([]) (x => true)))
       (false);
    eq (Z.equals ($.NullaryType ('X') ('') ([]) (x => true),
                  $.NullaryType ('X') ('') ([]) (x => false)))
       (true);
    eq (Z.equals ($.Array ($.NullaryType ('X') ('http://x.com/') ([]) (x => true)),
                  $.Array ($.NullaryType ('X') ('http://x.com/') ([]) (x => true))))
       (true);
    eq (Z.equals ($.Array ($.NullaryType ('X') ('http://x.com/') ([]) (x => true)),
                  $.Array ($.NullaryType ('X') ('http://x.org/') ([]) (x => true))))
       (false);

    //  Field ordering:
    eq (Z.equals ($.RecordType ({foo: $.Number, bar: $.Number}),
                  $.RecordType ({foo: $.Number, bar: $.Number})))
       (true);
    eq (Z.equals ($.RecordType ({foo: $.Number, bar: $.Number}),
                  $.RecordType ({bar: $.Number, foo: $.Number})))
       (true);
  });

});
