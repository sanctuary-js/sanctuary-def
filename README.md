# sanctuary-def

sanctuary-def is a run-time type system for JavaScript. It facilitates
the definition of curried JavaScript functions which are explicit about
the number of arguments to which they may be applied and the types of
those arguments.

It is conventional to import the package as `$`:

```javascript
const $ = require ('sanctuary-def');
```

The next step is to define an environment. An environment is an array
of [types][]. [`env`][] is an environment containing all the built-in
JavaScript types. It may be used as the basis for environments which
include custom types in addition to the built-in types:

```javascript
//    Integer :: Type
const Integer = '...';

//    NonZeroInteger :: Type
const NonZeroInteger = '...';

//    env :: Array Type
const env = $.env.concat ([Integer, NonZeroInteger]);
```

Type constructors such as `List :: Type -> Type` cannot be included in
an environment as they're not of the correct type. One could, though,
use a type constructor to define a fixed number of concrete types:

```javascript
//    env :: Array Type
const env = $.env.concat ([
  List ($.Number),                // :: Type
  List ($.String),                // :: Type
  List (List ($.Number)),         // :: Type
  List (List ($.String)),         // :: Type
  List (List (List ($.Number))),  // :: Type
  List (List (List ($.String))),  // :: Type
]);
```

Not only would this be tedious, but one could never enumerate all possible
types as there are infinitely many. Instead, one should use [`Unknown`][]:

```javascript
//    env :: Array Type
const env = $.env.concat ([List ($.Unknown)]);
```

The next step is to define a `def` function for the environment:

```javascript
const def = $.create ({checkTypes: true, env});
```

The `checkTypes` option determines whether type checking is enabled.
This allows one to only pay the performance cost of run-time type checking
during development. For example:

```javascript
const def = $.create ({
  checkTypes: process.env.NODE_ENV === 'development',
  env,
});
```

`def` is a function for defining functions. For example:

```javascript
//    add :: Number -> Number -> Number
const add =
def ('add')
    ({})
    ([$.Number, $.Number, $.Number])
    (x => y => x + y);
```

`[$.Number, $.Number, $.Number]` specifies that `add` takes two arguments
of type `Number`, one at a time, and returns a value of type `Number`.

Applying `add` to two arguments, one at a time, gives the expected result:

```javascript
add (2) (2);
// => 4
```

Applying `add` to multiple arguments at once results in an exception being
thrown:

```javascript
add (2, 2, 2);
// ! TypeError: ‘add’ applied to the wrong number of arguments
//
//   add :: Number -> Number -> Number
//          ^^^^^^
//            1
//
//   Expected one argument but received three arguments:
//
//     - 2
//     - 2
//     - 2
```

Applying `add` to one argument produces a function awaiting the remaining
argument. This is known as partial application. Partial application allows
more specific functions to be defined in terms of more general ones:

```javascript
//    inc :: Number -> Number
const inc = add (1);

inc (7);
// => 8
```

JavaScript's implicit type coercion often obfuscates the source of type
errors. Consider the following function:

```javascript
//    _add :: Number -> Number -> Number
const _add = x => y => x + y;
```

The type signature indicates that `_add` takes arguments of type `Number`,
but this is not enforced. This allows type errors to be silently ignored:

```javascript
_add ('2') ('2');
// => '22'
```

`add`, on the other hand, throws if applied to arguments of the wrong
types:

```javascript
add ('2') ('2');
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
add ('X');
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

#### <a name="Any" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L465">`Any :: Type`</a>

Type comprising every JavaScript value.

#### <a name="AnyFunction" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L470">`AnyFunction :: Type`</a>

Type comprising every Function value.

#### <a name="Arguments" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L475">`Arguments :: Type`</a>

Type comprising every [`arguments`][arguments] object.

#### <a name="Array" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L480">`Array :: Type -⁠> Type`</a>

Constructor for homogeneous Array types.

#### <a name="Array0" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L485">`Array0 :: Type`</a>

Type whose sole member is `[]`.

#### <a name="Array1" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L493">`Array1 :: Type -⁠> Type`</a>

Constructor for singleton Array types.

#### <a name="Array2" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L502">`Array2 :: Type -⁠> Type -⁠> Type`</a>

Constructor for heterogeneous Array types of length 2. `['foo', true]` is
a member of `Array2 String Boolean`.

#### <a name="Boolean" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L513">`Boolean :: Type`</a>

Type comprising `true` and `false`.

#### <a name="Date" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L518">`Date :: Type`</a>

Type comprising every Date value.

#### <a name="Error" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L523">`Error :: Type`</a>

Type comprising every Error value, including values of more specific
constructors such as [`SyntaxError`][] and [`TypeError`][].

#### <a name="FiniteNumber" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L529">`FiniteNumber :: Type`</a>

Type comprising every [`ValidNumber`][] value except `Infinity` and
`-Infinity`.

#### <a name="Function" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L543">`Function :: NonEmpty (Array Type) -⁠> Type`</a>

Constructor for Function types.

Examples:

  - `$.Function ([$.Date, $.String])` represents the `Date -> String`
    type; and
  - `$.Function ([a, b, a])` represents the `(a, b) -> a` type.

#### <a name="GlobalRegExp" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L582">`GlobalRegExp :: Type`</a>

Type comprising every [`RegExp`][] value whose `global` flag is `true`.

See also [`NonGlobalRegExp`][].

#### <a name="Integer" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L592">`Integer :: Type`</a>

Type comprising every integer in the range
[[`Number.MIN_SAFE_INTEGER`][min] .. [`Number.MAX_SAFE_INTEGER`][max]].

#### <a name="NegativeFiniteNumber" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L606">`NegativeFiniteNumber :: Type`</a>

Type comprising every [`FiniteNumber`][] value less than zero.

#### <a name="NegativeInteger" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L614">`NegativeInteger :: Type`</a>

Type comprising every [`Integer`][] value less than zero.

#### <a name="NegativeNumber" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L622">`NegativeNumber :: Type`</a>

Type comprising every [`Number`][] value less than zero.

#### <a name="NonEmpty" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L630">`NonEmpty :: Type -⁠> Type`</a>

Constructor for non-empty types. `$.NonEmpty ($.String)`, for example, is
the type comprising every [`String`][] value except `''`.

The given type must satisfy the [Monoid][] and [Setoid][] specifications.

#### <a name="NonGlobalRegExp" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L646">`NonGlobalRegExp :: Type`</a>

Type comprising every [`RegExp`][] value whose `global` flag is `false`.

See also [`GlobalRegExp`][].

#### <a name="NonNegativeInteger" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L656">`NonNegativeInteger :: Type`</a>

Type comprising every non-negative [`Integer`][] value (including `-0`).
Also known as the set of natural numbers under ISO 80000-2:2009.

#### <a name="NonZeroFiniteNumber" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L665">`NonZeroFiniteNumber :: Type`</a>

Type comprising every [`FiniteNumber`][] value except `0` and `-0`.

#### <a name="NonZeroInteger" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L673">`NonZeroInteger :: Type`</a>

Type comprising every [`Integer`][] value except `0` and `-0`.

#### <a name="NonZeroValidNumber" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L681">`NonZeroValidNumber :: Type`</a>

Type comprising every [`ValidNumber`][] value except `0` and `-0`.

#### <a name="Null" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L689">`Null :: Type`</a>

Type whose sole member is `null`.

#### <a name="Nullable" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L694">`Nullable :: Type -⁠> Type`</a>

Constructor for types which include `null` as a member.

#### <a name="Number" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L706">`Number :: Type`</a>

Type comprising every primitive Number value (including `NaN`).

#### <a name="Object" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L711">`Object :: Type`</a>

Type comprising every "plain" Object value. Specifically, values
created via:

  - object literal syntax;
  - [`Object.create`][]; or
  - the `new` operator in conjunction with `Object` or a custom
    constructor function.

#### <a name="PositiveFiniteNumber" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L722">`PositiveFiniteNumber :: Type`</a>

Type comprising every [`FiniteNumber`][] value greater than zero.

#### <a name="PositiveInteger" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L730">`PositiveInteger :: Type`</a>

Type comprising every [`Integer`][] value greater than zero.

#### <a name="PositiveNumber" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L738">`PositiveNumber :: Type`</a>

Type comprising every [`Number`][] value greater than zero.

#### <a name="RegExp" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L746">`RegExp :: Type`</a>

Type comprising every RegExp value.

#### <a name="RegexFlags" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L751">`RegexFlags :: Type`</a>

Type comprising the canonical RegExp flags:

  - `''`
  - `'g'`
  - `'i'`
  - `'m'`
  - `'gi'`
  - `'gm'`
  - `'im'`
  - `'gim'`

#### <a name="StrMap" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L768">`StrMap :: Type -⁠> Type`</a>

Constructor for homogeneous Object types.

`{foo: 1, bar: 2, baz: 3}`, for example, is a member of `StrMap Number`;
`{foo: 1, bar: 2, baz: 'XXX'}` is not.

#### <a name="String" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L784">`String :: Type`</a>

Type comprising every primitive String value.

#### <a name="Symbol" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L789">`Symbol :: Type`</a>

Type comprising every Symbol value.

#### <a name="Type" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L794">`Type :: Type`</a>

Type comprising every `Type` value.

#### <a name="TypeClass" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L799">`TypeClass :: Type`</a>

Type comprising every [`TypeClass`][] value.

#### <a name="Undefined" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L807">`Undefined :: Type`</a>

Type whose sole member is `undefined`.

#### <a name="Unknown" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L812">`Unknown :: Type`</a>

Type used to represent missing type information. The type of `[]`,
for example, is `Array ???`.

May be used with type constructors when defining environments. Given a
type constructor `List :: Type -> Type`, one could use `List ($.Unknown)`
to include an infinite number of types in an environment:

  - `List Number`
  - `List String`
  - `List (List Number)`
  - `List (List String)`
  - `List (List (List Number))`
  - `List (List (List String))`
  - `...`

#### <a name="ValidDate" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L831">`ValidDate :: Type`</a>

Type comprising every [`Date`][] value except `new Date (NaN)`.

#### <a name="ValidNumber" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L839">`ValidNumber :: Type`</a>

Type comprising every [`Number`][] value except `NaN`.

#### <a name="env" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L847">`env :: Array Type`</a>

An array of [types][]:

  - <code>[AnyFunction](#AnyFunction)</code>
  - <code>[Arguments](#Arguments)</code>
  - <code>[Array](#Array) ([Unknown](#Unknown))</code>
  - <code>[Boolean](#Boolean)</code>
  - <code>[Date](#Date)</code>
  - <code>[Error](#Error)</code>
  - <code>[Null](#Null)</code>
  - <code>[Number](#Number)</code>
  - <code>[Object](#Object)</code>
  - <code>[RegExp](#RegExp)</code>
  - <code>[StrMap](#StrMap) ([Unknown](#Unknown))</code>
  - <code>[String](#String)</code>
  - <code>[Symbol](#Symbol)</code>
  - <code>[Undefined](#Undefined)</code>

#### <a name="test" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L1242">`test :: Array Type -⁠> Type -⁠> a -⁠> Boolean`</a>

Takes an environment, a type, and any value. Returns `true` if the value
is a member of the type; `false` otherwise.

The environment is only significant if the type contains
[type variables][].

One may define a more restrictive type in terms of a more general one:

```javascript
//    NonNegativeInteger :: Type
const NonNegativeInteger = $.NullaryType
  ('my-package/NonNegativeInteger')
  ('http://example.com/my-package#NonNegativeInteger')
  (x => $.test ([]) ($.Integer) (x) && x >= 0);
```

Using types as predicates is useful in other contexts too. One could,
for example, define a [record type][] for each endpoint of a REST API
and validate the bodies of incoming POST requests against these types.

### Type constructors

sanctuary-def provides several functions for defining types.

#### <a name="NullaryType" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L1276">`NullaryType :: String -⁠> String -⁠> (Any -⁠> Boolean) -⁠> Type`</a>

Type constructor for types with no type variables (such as [`Number`][]).

To define a nullary type `t` one must provide:

  - the name of `t` (exposed as `t.name`);

  - the documentation URL of `t` (exposed as `t.url`); and

  - a predicate which accepts any JavaScript value and returns `true` if
    (and only if) the value is a member of `t`.

For example:

```javascript
//    Integer :: Type
const Integer = $.NullaryType
  ('my-package/Integer')
  ('http://example.com/my-package#Integer')
  (x => typeof x === 'number' &&
        Math.floor (x) === x &&
        x >= Number.MIN_SAFE_INTEGER &&
        x <= Number.MAX_SAFE_INTEGER);

//    NonZeroInteger :: Type
const NonZeroInteger = $.NullaryType
  ('my-package/NonZeroInteger')
  ('http://example.com/my-package#NonZeroInteger')
  (x => $.test ([]) (Integer) (x) && x !== 0);

//    rem :: Integer -> NonZeroInteger -> Integer
const rem =
def ('rem')
    ({})
    ([Integer, NonZeroInteger, Integer])
    (x => y => x % y);

rem (42) (5);
// => 2

rem (0.5);
// ! TypeError: Invalid value
//
//   rem :: Integer -> NonZeroInteger -> Integer
//          ^^^^^^^
//             1
//
//   1)  0.5 :: Number
//
//   The value at position 1 is not a member of ‘Integer’.

rem (42) (0);
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

#### <a name="UnaryType" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L1356">`UnaryType :: String -⁠> String -⁠> (Any -⁠> Boolean) -⁠> (t a -⁠> Array a) -⁠> Type -⁠> Type`</a>

Type constructor for types with one type variable (such as [`Array`][]).

To define a unary type `t a` one must provide:

  - the name of `t` (exposed as `t.name`);

  - the documentation URL of `t` (exposed as `t.url`);

  - a predicate which accepts any JavaScript value and returns `true`
    if (and only if) the value is a member of `t x` for some type `x`;

  - a function which takes any value of type `t a` and returns an array
    of the values of type `a` contained in the `t` (exposed as
    `t.types.$1.extractor`); and

  - the type of `a` (exposed as `t.types.$1.type`).

For example:

```javascript
const show = require ('sanctuary-show');
const type = require ('sanctuary-type-identifiers');

//    maybeTypeIdent :: String
const maybeTypeIdent = 'my-package/Maybe';

//    Maybe :: Type -> Type
const Maybe = $.UnaryType
  (maybeTypeIdent)
  ('http://example.com/my-package#Maybe')
  (x => type (x) === maybeTypeIdent)
  (maybe => maybe.isJust ? [maybe.value] : []);

//    MaybeTypeRep :: TypeRep Maybe
const MaybeTypeRep = {'@@type': maybeTypeIdent};

//    Nothing :: Maybe a
const Nothing = {
  'constructor': MaybeTypeRep,
  'isJust': false,
  'isNothing': true,
  '@@show': () => 'Nothing',
};

//    Just :: a -> Maybe a
const Just = x => ({
  'constructor': MaybeTypeRep,
  'isJust': true,
  'isNothing': false,
  '@@show': () => `Just (${show (x)})`,
  'value': x,
});

//    fromMaybe :: a -> Maybe a -> a
const fromMaybe =
def ('fromMaybe')
    ({})
    ([a, Maybe (a), a])
    (x => m => m.isJust ? m.value : x);

fromMaybe (0) (Just (42));
// => 42

fromMaybe (0) (Nothing);
// => 0

fromMaybe (0) (Just ('XXX'));
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

#### <a name="BinaryType" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L1477">`BinaryType :: String -⁠> String -⁠> (Any -⁠> Boolean) -⁠> (t a b -⁠> Array a) -⁠> (t a b -⁠> Array b) -⁠> Type -⁠> Type -⁠> Type`</a>

Type constructor for types with two type variables (such as
[`Array2`][]).

To define a binary type `t a b` one must provide:

  - the name of `t` (exposed as `t.name`);

  - the documentation URL of `t` (exposed as `t.url`);

  - a predicate which accepts any JavaScript value and returns `true`
    if (and only if) the value is a member of `t x y` for some types
    `x` and `y`;

  - a function which takes any value of type `t a b` and returns an array
    of the values of type `a` contained in the `t` (exposed as
    `t.types.$1.extractor`);

  - a function which takes any value of type `t a b` and returns an array
    of the values of type `b` contained in the `t` (exposed as
    `t.types.$2.extractor`);

  - the type of `a` (exposed as `t.types.$1.type`); and

  - the type of `b` (exposed as `t.types.$2.type`).

For example:

```javascript
const type = require ('sanctuary-type-identifiers');

//    pairTypeIdent :: String
const pairTypeIdent = 'my-package/Pair';

//    $Pair :: Type -> Type -> Type
const $Pair = $.BinaryType
  (pairTypeIdent)
  ('http://example.com/my-package#Pair')
  (x => type (x) === pairTypeIdent)
  (({fst}) => [fst])
  (({snd}) => [snd]);

//    PairTypeRep :: TypeRep Pair
const PairTypeRep = {'@@type': pairTypeIdent};

//    Pair :: a -> b -> Pair a b
const Pair =
def ('Pair')
    ({})
    ([a, b, $Pair (a) (b)])
    (fst => snd => ({
       'constructor': PairTypeRep,
       'fst': fst,
       'snd': snd,
       '@@show': () => `Pair (${show (fst)}) (${show (snd)})`,
     }));

//    Rank :: Type
const Rank = $.NullaryType
  ('my-package/Rank')
  ('http://example.com/my-package#Rank')
  (x => typeof x === 'string' &&
        /^(A|2|3|4|5|6|7|8|9|10|J|Q|K)$/.test (x));

//    Suit :: Type
const Suit = $.NullaryType
  ('my-package/Suit')
  ('http://example.com/my-package#Suit')
  (x => typeof x === 'string' &&
        /^[\u2660\u2663\u2665\u2666]$/.test (x));

//    Card :: Type
const Card = $Pair (Rank) (Suit);

//    showCard :: Card -> String
const showCard =
def ('showCard')
    ({})
    ([Card, $.String])
    (card => card.fst + card.snd);

showCard (Pair ('A') ('♠'));
// => 'A♠'

showCard (Pair ('X') ('♠'));
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

#### <a name="EnumType" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L1640">`EnumType :: String -⁠> String -⁠> Array Any -⁠> Type`</a>

Type constructor for [enumerated types][] (such as [`RegexFlags`][]).

To define an enumerated type `t` one must provide:

  - the name of `t` (exposed as `t.name`);

  - the documentation URL of `t` (exposed as `t.url`); and

  - an array of distinct values.

For example:

```javascript
//    Denomination :: Type
const Denomination = $.EnumType
  ('my-package/Denomination')
  ('http://example.com/my-package#Denomination')
  ([10, 20, 50, 100, 200]);
```

#### <a name="RecordType" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L1673">`RecordType :: StrMap Type -⁠> Type`</a>

`RecordType` is used to construct record types. The type definition
specifies the name and type of each required field. A field is an
enumerable property (either an own property or an inherited property).

To define a record type one must provide:

  - an object mapping field name to type.

For example:

```javascript
//    Point :: Type
const Point = $.RecordType ({x: $.FiniteNumber, y: $.FiniteNumber});

//    dist :: Point -> Point -> FiniteNumber
const dist =
def ('dist')
    ({})
    ([Point, Point, $.FiniteNumber])
    (p => q => Math.sqrt (Math.pow (p.x - q.x, 2) +
                          Math.pow (p.y - q.y, 2)));

dist ({x: 0, y: 0}) ({x: 3, y: 4});
// => 5

dist ({x: 0, y: 0}) ({x: 3, y: 4, color: 'red'});
// => 5

dist ({x: 0, y: 0}) ({x: NaN, y: NaN});
// ! TypeError: Invalid value
//
//   dist :: { x :: FiniteNumber, y :: FiniteNumber } -> { x :: FiniteNumber, y :: FiniteNumber } -> FiniteNumber
//                                                              ^^^^^^^^^^^^
//                                                                   1
//
//   1)  NaN :: Number
//
//   The value at position 1 is not a member of ‘FiniteNumber’.

dist (0);
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

#### <a name="TypeVariable" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L1760">`TypeVariable :: String -⁠> Type`</a>

Polymorphism is powerful. Not being able to define a function for
all types would be very limiting indeed: one couldn't even define the
identity function!

Before defining a polymorphic function one must define one or more type
variables:

```javascript
const a = $.TypeVariable ('a');
const b = $.TypeVariable ('b');

//    id :: a -> a
const id = def ('id') ({}) ([a, a]) (x => x);

id (42);
// => 42

id (null);
// => null
```

The same type variable may be used in multiple positions, creating a
constraint:

```javascript
//    cmp :: a -> a -> Number
const cmp =
def ('cmp')
    ({})
    ([a, a, $.Number])
    (x => y => x < y ? -1 : x > y ? 1 : 0);

cmp (42) (42);
// => 0

cmp ('a') ('z');
// => -1

cmp ('z') ('a');
// => 1

cmp (0) ('1');
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

#### <a name="UnaryTypeVariable" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L1823">`UnaryTypeVariable :: String -⁠> Type -⁠> Type`</a>

Combines [`UnaryType`][] and [`TypeVariable`][].

To define a unary type variable `t a` one must provide:

  - a name (conventionally matching `^[a-z]$`); and

  - the type of `a` (exposed as `t.types.$1.type`).

Consider the type of a generalized `map`:

```haskell
map :: Functor f => (a -> b) -> f a -> f b
```

`f` is a unary type variable. With two (nullary) type variables, one
unary type variable, and one [type class][] it's possible to define a
fully polymorphic `map` function:

```javascript
const $ = require ('sanctuary-def');
const Z = require ('sanctuary-type-classes');

const a = $.TypeVariable ('a');
const b = $.TypeVariable ('b');
const f = $.UnaryTypeVariable ('f');

//    map :: Functor f => (a -> b) -> f a -> f b
const map =
def ('map')
    ({f: [Z.Functor]})
    ([$.Function ([a, b]), f (a), f (b)])
    (f => functor => Z.map (f, functor));
```

Whereas a regular type variable is fully resolved (`a` might become
`Array (Array String)`, for example), a unary type variable defers to
its type argument, which may itself be a type variable. The type argument
corresponds to the type argument of a unary type or the *second* type
argument of a binary type. The second type argument of `Map k v`, for
example, is `v`. One could replace `Functor => f` with `Map k` or with
`Map Integer`, but not with `Map`.

This shallow inspection makes it possible to constrain a value's "outer"
and "inner" types independently.

#### <a name="BinaryTypeVariable" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L1889">`BinaryTypeVariable :: String -⁠> Type -⁠> Type -⁠> Type`</a>

Combines [`BinaryType`][] and [`TypeVariable`][].

To define a binary type variable `t a b` one must provide:

  - a name (conventionally matching `^[a-z]$`);

  - the type of `a` (exposed as `t.types.$1.type`); and

  - the type of `b` (exposed as `t.types.$2.type`).

The more detailed explanation of [`UnaryTypeVariable`][] also applies to
`BinaryTypeVariable`.

#### <a name="Thunk" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L1932">`Thunk :: Type -⁠> Type`</a>

`$.Thunk (T)` is shorthand for `$.Function ([T])`, the type comprising
every nullary function (thunk) which returns a value of type `T`.

#### <a name="Predicate" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.17.1/index.js#L1942">`Predicate :: Type -⁠> Type`</a>

`$.Predicate (T)` is shorthand for `$.Function ([T, $.Boolean])`, the
type comprising every predicate function which takes a value of type `T`.

### Type classes

`concatS`, defined earlier, is a function which concatenates two strings.
This is overly restrictive, since other types support concatenation
(Array, for example).

One could use a type variable to define a polymorphic "concat" function:

```javascript
//    _concat :: a -> a -> a
const _concat =
def ('_concat')
    ({})
    ([a, a, a])
    (x => y => x.concat (y));

_concat ('fizz') ('buzz');
// => 'fizzbuzz'

_concat ([1, 2]) ([3, 4]);
// => [1, 2, 3, 4]

_concat ([1, 2]) ('buzz');
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

The type of `_concat` is misleading: it suggests that it can operate on
any two values of *any* one type. In fact there's an implicit constraint,
since the type must support concatenation (in [mathematical][semigroup]
terms, the type must have a [semigroup][FL:Semigroup]). Violating this
implicit constraint results in a run-time error in the implementation:

```javascript
_concat (null) (null);
// ! TypeError: Cannot read property 'concat' of null
```

The solution is to constrain `a` by first defining a [`TypeClass`][]
value, then specifying the constraint in the definition of the "concat"
function:

```javascript
const Z = require ('sanctuary-type-classes');

//    Semigroup :: TypeClass
const Semigroup = Z.TypeClass (
  'my-package/Semigroup',
  'http://example.com/my-package#Semigroup',
  [],
  x => x != null && typeof x.concat === 'function'
);

//    concat :: Semigroup a => a -> a -> a
const concat =
def ('concat')
    ({a: [Semigroup]})
    ([a, a, a])
    (x => y => x.concat (y));

concat ([1, 2]) ([3, 4]);
// => [1, 2, 3, 4]

concat (null) (null);
// ! TypeError: Type-class constraint violation
//
//   concat :: Semigroup a => a -> a -> a
//             ^^^^^^^^^^^    ^
//                            1
//
//   1)  null :: Null
//
//   ‘concat’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.
//
//   See http://example.com/my-package#Semigroup for information about the my-package/Semigroup type class.
```

Multiple constraints may be placed on a type variable by including
multiple `TypeClass` values in the array (e.g. `{a: [Foo, Bar, Baz]}`).

[FL:Semigroup]:         https://github.com/fantasyland/fantasy-land#semigroup
[Monoid]:               https://github.com/fantasyland/fantasy-land#monoid
[Setoid]:               https://github.com/fantasyland/fantasy-land#setoid
[`Array`]:              #Array
[`Array2`]:             #Array2
[`BinaryType`]:         #BinaryType
[`Date`]:               #Date
[`FiniteNumber`]:       #FiniteNumber
[`GlobalRegExp`]:       #GlobalRegExp
[`Integer`]:            #Integer
[`NonGlobalRegExp`]:    #NonGlobalRegExp
[`Number`]:             #Number
[`Object.create`]:      https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
[`RegExp`]:             #RegExp
[`RegexFlags`]:         #RegexFlags
[`String`]:             #String
[`SyntaxError`]:        https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SyntaxError
[`TypeClass`]:          https://github.com/sanctuary-js/sanctuary-type-classes#TypeClass
[`TypeError`]:          https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError
[`TypeVariable`]:       #TypeVariable
[`UnaryType`]:          #UnaryType
[`UnaryTypeVariable`]:  #UnaryTypeVariable
[`Unknown`]:            #Unknown
[`ValidNumber`]:        #ValidNumber
[`env`]:                #env
[arguments]:            https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments
[enumerated types]:     https://en.wikipedia.org/wiki/Enumerated_type
[max]:                  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
[min]:                  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MIN_SAFE_INTEGER
[record type]:          #RecordType
[semigroup]:            https://en.wikipedia.org/wiki/Semigroup
[type class]:           #type-classes
[type variables]:       #TypeVariable
[types]:                #types
