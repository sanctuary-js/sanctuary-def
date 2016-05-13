# sanctuary-def

sanctuary-def is a run-time type system for JavaScript. It facilitates the
definition of curried JavaScript functions which are explicit about the number
of arguments to which they may be applied and the types of those arguments.

It is conventional to import the package as `$`:

```javascript
const $ = require('sanctuary-def');
```

The next step is to define an environment. An environment is a list of
[types](#types) such as `$.Number` and `$.String`. [`$.env`](#env) is an
environment containing all the built-in JavaScript types. It may be used
as the basis for environments which include custom types in addition to
the built-in types:

```javascript
//    Integer :: Type
const Integer = ...;

//    NonZeroInteger :: Type
const NonZeroInteger = ...;

//    env :: [Type]
const env = $.env.concat([Integer, NonZeroInteger]);
```

The next step is to define a `def` function for the environment:

```javascript
const def = $.create({checkTypes: true, env: env});
```

The `checkTypes` option determines whether type checking is enabled.
This allows one to only pay the performance cost of run-time type checking
during development. For example:

```javascript
const def = $.create({
  checkTypes: process.env.NODE_ENV === 'development',
  env: env,
});
```

`def` is a function for defining functions. For example:

```javascript
//    add :: Number -> Number -> Number
const add =
def('add', {}, [$.Number, $.Number, $.Number], (x, y) => x + y);
```

`[$.Number, $.Number, $.Number]` specifies that `add` takes two arguments of
type `Number` and returns a value of type `Number`.

Applying `add` to two arguments gives the expected result:

```javascript
add(2, 2);
// => 4
```

Applying `add` to greater than two arguments results in an exception being
thrown:

```javascript
add(2, 2, 2);
// ! TypeError: ‘add’ requires two arguments; received three arguments
```

Applying `add` to fewer than two arguments results in a function awaiting the
remaining arguments. This is known as partial application. Partial application
is convenient as it allows more specific functions to be defined in terms of
more general ones:

```javascript
//    inc :: Number -> Number
const inc = add(1);

inc(7);
// => 8
```

One may wish to partially apply a function whose parameters are in the "wrong"
order. All functions defined via sanctuary-def accommodate this by accepting
"placeholders". A placeholder is an object with a `'@@functional/placeholder'`
property whose value is `true`. [`R.__`][1] is one such object. A placeholder
indicates an argument yet to be provided. For example:

```javascript
//    _ :: Placeholder
const _ = {'@@functional/placeholder': true};

//    concatS :: String -> String -> String
const concatS =
def('concatS', {}, [$.String, $.String, $.String], (x, y) => x + y);

//    exclaim :: String -> String
const exclaim = concatS(_, '!');

exclaim('ahoy');
// => 'ahoy!'
```

JavaScript's implicit type coercion often obfuscates the source of type errors.
Consider the following function:

```javascript
//    _add :: (Number, Number) -> Number
const _add = (x, y) => x + y;
```

The type signature indicates that `_add` takes two arguments of type `Number`,
but this is not enforced. This allows type errors to be silently ignored:

```javascript
_add('2', '2');
// => '22'
```

`add`, on the other hand, throws if applied to arguments of the wrong types:

```javascript
add('2', '2');
// ! TypeError: Invalid value
//
//   add :: Number -> Number -> Number
//          ^^^^^^
//            1
//
//   1)  "2" :: String
//
//   The value at position 1 is not a member of ‘Number’.
```

Type checking is performed as arguments are provided (rather than once all
arguments have been provided), so type errors are reported early:

```javascript
add('X');
// ! TypeError: Invalid value
//
//   add :: Number -> Number -> Number
//          ^^^^^^
//            1
//
//   1)  "X" :: String
//
//   The value at position 1 is not a member of ‘Number’.
```

### Types

Conceptually, a type is a set of values. One can think of a value of
type `Type` as a function of type `Any -> Boolean` which tests values
for membership in the set (though this is an oversimplification).

#### `Any`

```haskell
$.Any :: Type
```

Type comprising every JavaScript value.

#### `Array`

```haskell
$.Array :: Type -> Type
```

Constructor for homogeneous Array types.

#### `Boolean`

```haskell
$.Boolean :: Type
```

Type comprising `true` and `false` (and their object counterparts).

#### `Date`

```haskell
$.Date :: Type
```

Type comprising every Date value.

#### `Error`

```haskell
$.Error :: Type
```

Type comprising every Error value, including values of more specific
constructors such as [`SyntaxError`][2] and [`TypeError`][3].

#### `FiniteNumber`

```haskell
$.FiniteNumber :: Type
```

Type comprising every [`ValidNumber`](#validnumber) value except `Infinity` and
`-Infinity` (and their object counterparts).

#### `Function`

```haskell
$.Function :: Type
```

Type comprising every Function value.

#### `Integer`

```haskell
$.Integer :: Type
```

Type comprising every integer in the range
[[`Number.MIN_SAFE_INTEGER`][4] .. [`Number.MAX_SAFE_INTEGER`][5]].

#### `NegativeFiniteNumber`

```haskell
$.NegativeFiniteNumber :: Type
```

Type comprising every [`FiniteNumber`](#finitenumber) value less than zero.

#### `NegativeInteger`

```haskell
$.NegativeInteger :: Type
```

Type comprising every [`Integer`](#integer) value less than zero.

#### `NegativeNumber`

```haskell
$.NegativeNumber :: Type
```

Type comprising every [`Number`](#number) value less than zero.

#### `NonZeroFiniteNumber`

```haskell
$.NonZeroFiniteNumber :: Type
```

Type comprising every [`FiniteNumber`](#finitenumber) value except `0` and `-0`
(and their object counterparts).

#### `NonZeroInteger`

```haskell
$.NonZeroInteger :: Type
```

Type comprising every non-zero [`Integer`](#integer) value.

#### `NonZeroValidNumber`

```haskell
$.NonZeroValidNumber :: Type
```

Type comprising every [`ValidNumber`](#validnumber) value except `0` and `-0`
(and their object counterparts).

#### `Null`

```haskell
$.Null :: Type
```

Type whose sole member is `null`.

#### `Nullable`

```haskell
$.Nullable :: Type -> Type
```

Constructor for types which include `null` as a member.

#### `Number`

```haskell
$.Number :: Type
```

Type comprising every Number value (including `NaN` and Number objects).

#### `Object`

```haskell
$.Object :: Type
```

Type comprising every "plain" Object value. Specifically, values created via:

  - object literal syntax;
  - [`Object.create`][6]; or
  - the `new` operator in conjunction with `Object` or a custom
    constructor function.

#### `Pair`

```haskell
$.Pair :: (Type, Type) -> Type
```

Constructor for tuple types of length 2. Arrays are said to represent tuples.
`['foo', 42]` is a member of `Pair String Number`.

#### `PositiveFiniteNumber`

```haskell
$.PositiveFiniteNumber :: Type
```

Type comprising every [`FiniteNumber`](#finitenumber) value greater than zero.

#### `PositiveInteger`

```haskell
$.PositiveInteger :: Type
```

Type comprising every [`Integer`](#integer) value greater than zero.

#### `PositiveNumber`

```haskell
$.PositiveNumber :: Type
```

Type comprising every [`Number`](#number) value greater than zero.

#### `RegExp`

```haskell
$.RegExp :: Type
```

Type comprising every RegExp value.

#### `RegexFlags`

```haskell
$.RegexFlags :: Type
```

Type comprising the canonical RegExp flags:

  - `''`
  - `'g'`
  - `'i'`
  - `'m'`
  - `'gi'`
  - `'gm'`
  - `'im'`
  - `'gim'`

#### `StrMap`

```haskell
$.StrMap :: Type -> Type
```

Constructor for homogeneous Object types.

`{foo: 1, bar: 2, baz: 3}`, for example, is a member of `StrMap Number`;
`{foo: 1, bar: 2, baz: 'XXX'}` is not.

#### `String`

```haskell
$.String :: Type
```

Type comprising every String value (including String objects).

#### `Undefined`

```haskell
$.Undefined :: Type
```

Type whose sole member is `undefined`.

#### `ValidDate`

```haskell
$.ValidDate :: Type
```

Type comprising every [`Date`](#date) value except `new Date(NaN)`.

#### `ValidNumber`

```haskell
$.ValidNumber :: Type
```

Type comprising every [`Number`](#number) value except `NaN` (and its object
counterpart).

### `env`

`$.env` is a list of [types](#types):

  - [`$.Array`](#array)
  - [`$.Boolean`](#boolean)
  - [`$.Date`](#date)
  - [`$.Error`](#error)
  - [`$.Function`](#function)
  - [`$.Null`](#null)
  - [`$.Number`](#number)
  - [`$.Object`](#object)
  - [`$.RegExp`](#regexp)
  - [`$.StrMap`](#strmap)
  - [`$.String`](#string)
  - [`$.Undefined`](#undefined)

### `test`

`$.test` takes three arguments:

  - an environment (a list of [types](#types));
  - a type; and
  - a value.

It returns `true` if the value is a member of the specified type; `false`
otherwise.

The environment is only significant when the second argument to `$.test`
contains [type variables](#typevariable). In other cases, simply provide
`[]` or [`$.env`](#env).

It's common to define a more restrictive type in terms of a more general one.
`$.test` enables this. For example, one could use `$.test([], $.Integer, x)`
in the definition of NonNegativeInteger:

```javascript
//    NonNegativeInteger :: Type
const NonNegativeInteger = $.NullaryType(
  'my-package/NonNegativeInteger',
  x => $.test([], $.Integer, x) && x >= 0
);
```

Using types as predicates is useful in other contexts too. For example, one
could define a record type for each endpoint of a REST API and validate the
bodies of incoming POST requests against these types.

### Type constructors

sanctuary-def provides several functions for defining types.

#### `TypeVariable`

Polymorphism is powerful. Not being able to define a function for all types
would be very limiting indeed: one couldn't even define the identity function!

```haskell
TypeVariable :: String -> Type
```

Before defining a polymorphic function one must define one or more type
variables:

```javascript
const a = $.TypeVariable('a');
const b = $.TypeVariable('b');

//    id :: a -> a
const id = def('id', {}, [a, a], x => x);

id(42);
// => 42

id(null);
// => null
```

The same type variable may be used in multiple positions, creating a
constraint:

```javascript
//    cmp :: a -> a -> Number
const cmp =
def('cmp', {}, [a, a, $.Number], (x, y) => x < y ? -1 : x > y ? 1 : 0);

cmp(42, 42);
// => 0

cmp('a', 'z');
// => -1

cmp('z', 'a');
// => 1

cmp(0, '1');
// ! TypeError: Type-variable constraint violation
//
//   cmp :: a -> a -> Number
//          ^    ^
//          1    2
//
//   1)  0 :: Number
//
//   2)  "1" :: String
//
//   Since there is no type of which all the above values are members, the type-variable constraint has been violated.
```

#### `NullaryType`

`NullaryType` is used to construct types with no type variables. `$.Number` is
defined via `NullaryType`, as are many of the other exported types exported by
sanctuary-def.

To define a nullary type `t` one must provide:

  - the name of `t` (exposed as `t.name`); and

  - a predicate which accepts any JavaScript value and returns `true` if
    (and only if) the value is a member of `t`.

```haskell
NullaryType :: String -> (Any -> Boolean) -> Type
```

For example:

```javascript
//    Integer :: Type
const Integer = $.NullaryType(
  'my-package/Integer',
  x => Object.prototype.toString.call(x) === '[object Number]' &&
       Math.floor(x) === Number(x) &&
       x >= Number.MIN_SAFE_INTEGER &&
       x <= Number.MAX_SAFE_INTEGER
);

//    NonZeroInteger :: Type
const NonZeroInteger = $.NullaryType(
  'my-package/NonZeroInteger',
  x => $.test([], Integer, x) && Number(x) !== 0
);

//    rem :: Integer -> NonZeroInteger -> Integer
const rem =
def('rem', {}, [Integer, NonZeroInteger, Integer], (x, y) => x % y);

rem(42, 5);
// => 2

rem(0.5);
// ! TypeError: Invalid value
//
//   rem :: Integer -> NonZeroInteger -> Integer
//          ^^^^^^^
//             1
//
//   1)  0.5 :: Number
//
//   The value at position 1 is not a member of ‘Integer’.

rem(42, 0);
// ! TypeError: Invalid value
//
//   rem :: Integer -> NonZeroInteger -> Integer
//                     ^^^^^^^^^^^^^^
//                           1
//
//   1)  0 :: Number
//
//   The value at position 1 is not a member of ‘NonZeroInteger’.
```

#### `UnaryType`

`UnaryType` is used to construct types with one type variable. `$.Array` is
defined via `UnaryType`.

```javascript
//    sum :: [Number] -> Number
const sum =
def('sum', {}, [$.Array($.Number), $.Number], xs => xs.reduce((x, y) => x + y, 0));

sum([1, 2, 3, 4]);
// => 10

sum(['1', '2', '3', '4']);
// ! TypeError: Invalid value
//
//   sum :: Array Number -> Number
//                ^^^^^^
//                  1
//
//   1)  "1" :: String
//
//   The value at position 1 is not a member of ‘Number’.
```

To define a unary type `t a` one must provide:

  - the name of `t` (exposed as `t.name`);

  - a predicate which accepts any JavaScript value and returns `true`
    if (and only if) the value is a member of `t x` for some type `x`;

  - a function which takes any value of type `t a` and returns an array
    of the values of type `a` contained in the `t` (exposed as `t._1`); and

  - the type of `a` (exposed as `t.$1`).

```haskell
UnaryType :: String -> (Any -> Boolean) -> (t a -> [a]) -> Type -> Type
```

For example:

```javascript
//    Maybe :: Type -> Type
const Maybe = $.UnaryType(
  'my-package/Maybe',
  x => x != null && x['@@type'] === 'my-package/Maybe',
  maybe => maybe.isJust ? [maybe.value] : []
);

//    Nothing :: Maybe a
const Nothing = {
  '@@type': 'my-package/Maybe',
  'isJust': false,
  'isNothing': true,
  'toString': () => 'Nothing',
};

//    Just :: a -> Maybe a
const Just = x => ({
  '@@type': 'my-package/Maybe',
  'isJust': true,
  'isNothing': false,
  'toString': () => 'Just(' + JSON.stringify(x) + ')',
  'value': x,
});

//    fromMaybe :: a -> Maybe a -> a
const fromMaybe =
def('fromMaybe', {}, [a, Maybe(a), a], (x, m) => m.isJust ? m.value : x);

fromMaybe(0, Just(42));
// => 42

fromMaybe(0, Nothing);
// => 0

fromMaybe(0, Just('XXX'));
// ! TypeError: Type-variable constraint violation
//
//   fromMaybe :: a -> Maybe a -> a
//                ^          ^
//                1          2
//
//   1)  0 :: Number
//
//   2)  "XXX" :: String
//
//   Since there is no type of which all the above values are members, the type-variable constraint has been violated.
```

#### `BinaryType`

`BinaryType` is used to construct types with two type variables.

To define a binary type `t a b` one must provide:

  - the name of `t` (exposed as `t.name`);

  - a predicate which accepts any JavaScript value and returns `true`
    if (and only if) the value is a member of `t x y` for some types
    `x` and `y`;

  - a function which takes any value of type `t a b` and returns an array
    of the values of type `a` contained in the `t` (exposed as `t._1`);

  - a function which takes any value of type `t a b` and returns an array
    of the values of type `b` contained in the `t` (exposed as `t._2`);

  - the type of `a` (exposed as `t.$1`); and

  - the type of `b` (exposed as `t.$2`).

```haskell
BinaryType :: String -> (Any -> Boolean) -> (t a b -> [a]) -> (t a b -> [b]) -> Type -> Type -> Type
```

For example:

```javascript
//    $Pair :: Type -> Type -> Type
const $Pair = $.BinaryType(
  'my-package/Pair',
  x => x != null && x['@@type'] === 'my-package/Pair',
  pair => [pair[0]],
  pair => [pair[1]]
);

//    Pair :: a -> b -> Pair a b
const Pair = def('Pair', {}, [a, b, $Pair(a, b)], (x, y) => ({
  '0': x,
  '1': y,
  '@@type': 'my-package/Pair',
  'length': 2,
  'toString': () => 'Pair(' + JSON.stringify(x) + ', ' + JSON.stringify(y) + ')',
}));

//    Rank :: Type
const Rank = $.NullaryType(
  'my-package/Rank',
  x => typeof x === 'string' && /^([A23456789JQK]|10)$/.test(x),
  'A'
);

//    Suit :: Type
const Suit = $.NullaryType(
  'my-package/Suit',
  x => typeof x === 'string' && /^[\u2660\u2663\u2665\u2666]$/.test(x),
  '\u2660'
);

//    Card :: Type
const Card = $Pair(Rank, Suit);

//    showCard :: Card -> String
const showCard =
def('showCard', {}, [Card, $.String], card => card[0] + card[1]);

showCard(Pair('A', '♠'));
// => 'A♠'

showCard(Pair('X', '♠'));
// ! TypeError: Invalid value
//
//   showCard :: Pair Rank Suit -> String
//                    ^^^^
//                     1
//
//   1)  "X" :: String
//
//   The value at position 1 is not a member of ‘Rank’.
```

#### `EnumType`

`EnumType` is used to construct [enumerated types][7].

To define an enumerated type one must provide:

  - an array of values with distinct [`R.toString`][8] representations.

```haskell
EnumType :: [Any] -> Type
```

For example:

```javascript
//    TimeUnit :: Type
const TimeUnit = $.EnumType(['milliseconds', 'seconds', 'minutes', 'hours']);

//    convertTo :: TimeUnit -> ValidDate -> ValidNumber
const convertTo =
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

convertTo('seconds', new Date(1000));
// => 1

convertTo('days', new Date(1000));
// ! TypeError: Invalid value
//
//   convertTo :: ("milliseconds" | "seconds" | "minutes" | "hours") -> ValidDate -> ValidNumber
//                ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                                        1
//
//   1)  "days" :: String
//
//   The value at position 1 is not a member of ‘("milliseconds" | "seconds" | "minutes" | "hours")’.
```

#### `RecordType`

`RecordType` is used to construct record types. The type definition specifies
the name and type of each required field.

To define a record type one must provide:

  - an object mapping field name to type.

```haskell
RecordType :: {Type} -> Type
```

For example:

```javascript
//    Point :: Type
const Point = $.RecordType({x: $.FiniteNumber, y: $.FiniteNumber});

//    dist :: Point -> Point -> FiniteNumber
const dist =
def('dist', {}, [Point, Point, $.FiniteNumber],
    (p, q) => Math.sqrt(Math.pow(p.x - q.x, 2) + Math.pow(p.y - q.y, 2)));

dist({x: 0, y: 0}, {x: 3, y: 4});
// => 5

dist({x: 0, y: 0}, {x: 3, y: 4, color: 'red'});
// => 5

dist({x: 0, y: 0}, {x: NaN, y: NaN});
// ! TypeError: Invalid value
//
//   dist :: { x :: FiniteNumber, y :: FiniteNumber } -> { x :: FiniteNumber, y :: FiniteNumber } -> FiniteNumber
//                                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                                                                          1
//
//   1)  {"x": NaN, "y": NaN} :: Object, StrMap Number
//
//   The value at position 1 is not a member of ‘{ x :: FiniteNumber, y :: FiniteNumber }’.

dist(0);
// ! TypeError: Invalid value
//
//   dist :: { x :: FiniteNumber, y :: FiniteNumber } -> { x :: FiniteNumber, y :: FiniteNumber } -> FiniteNumber
//           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
//                              1
//
//   1)  0 :: Number
//
//   The value at position 1 is not a member of ‘{ x :: FiniteNumber, y :: FiniteNumber }’.
```

### Type classes

`concatS`, defined earlier, is a function which concatenates two strings.
This is overly restrictive, since other types support concatenation (Array,
for example).

One could use a type variable to define a polymorphic "concat" function:

```javascript
//    _concat :: a -> a -> a
const _concat =
def('_concat', {}, [a, a, a], (x, y) => x.concat(y));

_concat('fizz', 'buzz');
// => 'fizzbuzz'

_concat([1, 2], [3, 4]);
// => [1, 2, 3, 4]

_concat([1, 2], 'buzz');
// ! TypeError: Type-variable constraint violation
//
//   _concat :: a -> a -> a
//              ^    ^
//              1    2
//
//   1)  [1, 2] :: Array Number
//
//   2)  "buzz" :: String
//
//   Since there is no type of which all the above values are members, the type-variable constraint has been violated.
```

The type of `_concat` is misleading: it suggests that it can operate on any
two values of *any* one type. In fact there's an implicit constraint, since
the type must support concatenation (in [mathematical][9] terms, the type
must have a [semigroup][10]). The run-time type errors that result when this
constraint is violated are not particularly descriptive:

```javascript
_concat({}, {});
// ! TypeError: undefined is not a function

_concat(null, null);
// ! TypeError: Cannot read property 'concat' of null
```

The solution is to constrain `a` by first defining a `TypeClass` value, then
specifying the constraint in the definition of the "concat" function:

```javascript
//    Semigroup :: TypeClass
const Semigroup = $.TypeClass(
  'my-package/Semigroup',
  x => x != null && typeof x.concat === 'function'
);

//    concat :: Semigroup a => a -> a -> a
const concat =
def('concat', {a: [Semigroup]}, [a, a, a], (x, y) => x.concat(y));

concat([1, 2], [3, 4]);
// => [1, 2, 3, 4]

concat({}, {});
// ! TypeError: Type-class constraint violation
//
//   concat :: Semigroup a => a -> a -> a
//             ^^^^^^^^^^^    ^
//                            1
//
//   1)  {} :: Object, StrMap ???
//
//   ‘concat’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.

concat(null, null);
// ! TypeError: Type-class constraint violation
//
//   concat :: Semigroup a => a -> a -> a
//             ^^^^^^^^^^^    ^
//                            1
//
//   1)  null :: Null
//
//   ‘concat’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.
```

Multiple constraints may be placed on a type variable by including multiple
`TypeClass` values in the list (e.g. `{a: [Foo, Bar, Baz]}`).


[1]: http://ramdajs.com/docs/#__
[2]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SyntaxError
[3]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError
[4]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MIN_SAFE_INTEGER
[5]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
[6]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
[7]: https://en.wikipedia.org/wiki/Enumerated_type
[8]: http://ramdajs.com/docs/#toString
[9]: https://en.wikipedia.org/wiki/Semigroup
[10]: https://github.com/fantasyland/fantasy-land#semigroup
