# sanctuary-def

sanctuary-def is a run-time type system for JavaScript. It facilitates
the definition of curried JavaScript functions that are explicit about
the number of arguments to which they may be applied and the types of
those arguments.

It is conventional to import the package as `$`:

```javascript
const $ = require ('sanctuary-def');
```

The next step is to define an environment. An environment is an array
of [types][]. [`env`][] is an environment containing all the built-in
JavaScript types. It may be used as the basis for environments that
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
type `Type` as a function of type `Any -> Boolean` that tests values
for membership in the set (though this is an oversimplification).

#### <a name="Unknown" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L518">`Unknown :: Type`</a>

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

#### <a name="Any" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L537">`Any :: Type`</a>

Type comprising every JavaScript value.

#### <a name="AnyFunction" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L545">`AnyFunction :: Type`</a>

Type comprising every Function value.

#### <a name="Arguments" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L553">`Arguments :: Type`</a>

Type comprising every [`arguments`][arguments] object.

#### <a name="Array" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L561">`Array :: Type -⁠> Type`</a>

Constructor for homogeneous Array types.

#### <a name="Array0" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L570">`Array0 :: Type`</a>

Type whose sole member is `[]`.

#### <a name="Array1" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L578">`Array1 :: Type -⁠> Type`</a>

Constructor for singleton Array types.

#### <a name="Array2" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L587">`Array2 :: Type -⁠> Type -⁠> Type`</a>

Constructor for heterogeneous Array types of length 2. `['foo', true]` is
a member of `Array2 String Boolean`.

#### <a name="Boolean" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L598">`Boolean :: Type`</a>

Type comprising `true` and `false`.

#### <a name="Date" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L606">`Date :: Type`</a>

Type comprising every Date value.

#### <a name="ValidDate" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L614">`ValidDate :: Type`</a>

Type comprising every [`Date`][] value except `new Date (NaN)`.

#### <a name="Descending" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L622">`Descending :: Type -⁠> Type`</a>

[Descending][] type constructor.

#### <a name="Either" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L631">`Either :: Type -⁠> Type -⁠> Type`</a>

[Either][] type constructor.

#### <a name="Error" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L641">`Error :: Type`</a>

Type comprising every Error value, including values of more specific
constructors such as [`SyntaxError`][] and [`TypeError`][].

#### <a name="Fn" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L650">`Fn :: Type -⁠> Type -⁠> Type`</a>

Binary type constructor for unary function types. `$.Fn (I) (O)`
represents `I -> O`, the type of functions that take a value of
type `I` and return a value of type `O`.

#### <a name="Function" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L657">`Function :: NonEmpty (Array Type) -⁠> Type`</a>

Constructor for Function types.

Examples:

  - `$.Function ([$.Date, $.String])` represents the `Date -> String`
    type; and
  - `$.Function ([a, b, a])` represents the `(a, b) -> a` type.

#### <a name="HtmlElement" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L697">`HtmlElement :: Type`</a>

Type comprising every [HTML element][].

#### <a name="Identity" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L707">`Identity :: Type -⁠> Type`</a>

[Identity][] type constructor.

#### <a name="Maybe" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L716">`Maybe :: Type -⁠> Type`</a>

[Maybe][] type constructor.

#### <a name="NonEmpty" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L725">`NonEmpty :: Type -⁠> Type`</a>

Constructor for non-empty types. `$.NonEmpty ($.String)`, for example, is
the type comprising every [`String`][] value except `''`.

The given type must satisfy the [Monoid][] and [Setoid][] specifications.

#### <a name="Null" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L741">`Null :: Type`</a>

Type whose sole member is `null`.

#### <a name="Nullable" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L749">`Nullable :: Type -⁠> Type`</a>

Constructor for types that include `null` as a member.

#### <a name="Number" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L761">`Number :: Type`</a>

Type comprising every primitive Number value (including `NaN`).

#### <a name="PositiveNumber" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L774">`PositiveNumber :: Type`</a>

Type comprising every [`Number`][] value greater than zero.

#### <a name="NegativeNumber" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L782">`NegativeNumber :: Type`</a>

Type comprising every [`Number`][] value less than zero.

#### <a name="ValidNumber" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L790">`ValidNumber :: Type`</a>

Type comprising every [`Number`][] value except `NaN`.

#### <a name="NonZeroValidNumber" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L798">`NonZeroValidNumber :: Type`</a>

Type comprising every [`ValidNumber`][] value except `0` and `-0`.

#### <a name="FiniteNumber" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L806">`FiniteNumber :: Type`</a>

Type comprising every [`ValidNumber`][] value except `Infinity` and
`-Infinity`.

#### <a name="NonZeroFiniteNumber" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L815">`NonZeroFiniteNumber :: Type`</a>

Type comprising every [`FiniteNumber`][] value except `0` and `-0`.

#### <a name="PositiveFiniteNumber" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L823">`PositiveFiniteNumber :: Type`</a>

Type comprising every [`FiniteNumber`][] value greater than zero.

#### <a name="NegativeFiniteNumber" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L831">`NegativeFiniteNumber :: Type`</a>

Type comprising every [`FiniteNumber`][] value less than zero.

#### <a name="Integer" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L839">`Integer :: Type`</a>

Type comprising every integer in the range
[[`Number.MIN_SAFE_INTEGER`][min] .. [`Number.MAX_SAFE_INTEGER`][max]].

#### <a name="NonZeroInteger" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L852">`NonZeroInteger :: Type`</a>

Type comprising every [`Integer`][] value except `0` and `-0`.

#### <a name="NonNegativeInteger" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L860">`NonNegativeInteger :: Type`</a>

Type comprising every non-negative [`Integer`][] value (including `-0`).
Also known as the set of natural numbers under ISO 80000-2:2009.

#### <a name="PositiveInteger" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L869">`PositiveInteger :: Type`</a>

Type comprising every [`Integer`][] value greater than zero.

#### <a name="NegativeInteger" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L877">`NegativeInteger :: Type`</a>

Type comprising every [`Integer`][] value less than zero.

#### <a name="Object" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L885">`Object :: Type`</a>

Type comprising every "plain" Object value. Specifically, values
created via:

  - object literal syntax;
  - [`Object.create`][]; or
  - the `new` operator in conjunction with `Object` or a custom
    constructor function.

#### <a name="Pair" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L899">`Pair :: Type -⁠> Type -⁠> Type`</a>

[Pair][] type constructor.

#### <a name="RegExp" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L909">`RegExp :: Type`</a>

Type comprising every RegExp value.

#### <a name="GlobalRegExp" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L917">`GlobalRegExp :: Type`</a>

Type comprising every [`RegExp`][] value whose `global` flag is `true`.

See also [`NonGlobalRegExp`][].

#### <a name="NonGlobalRegExp" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L927">`NonGlobalRegExp :: Type`</a>

Type comprising every [`RegExp`][] value whose `global` flag is `false`.

See also [`GlobalRegExp`][].

#### <a name="StrMap" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L937">`StrMap :: Type -⁠> Type`</a>

Constructor for homogeneous Object types.

`{foo: 1, bar: 2, baz: 3}`, for example, is a member of `StrMap Number`;
`{foo: 1, bar: 2, baz: 'XXX'}` is not.

#### <a name="String" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L949">`String :: Type`</a>

Type comprising every primitive String value.

#### <a name="RegexFlags" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L957">`RegexFlags :: Type`</a>

Type comprising the canonical RegExp flags:

  - `''`
  - `'g'`
  - `'i'`
  - `'m'`
  - `'gi'`
  - `'gm'`
  - `'im'`
  - `'gim'`

#### <a name="Symbol" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L974">`Symbol :: Type`</a>

Type comprising every Symbol value.

#### <a name="Type" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L982">`Type :: Type`</a>

Type comprising every `Type` value.

#### <a name="TypeClass" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L990">`TypeClass :: Type`</a>

Type comprising every [`TypeClass`][] value.

#### <a name="Undefined" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L998">`Undefined :: Type`</a>

Type whose sole member is `undefined`.

#### <a name="env" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L1006">`env :: Array Type`</a>

An array of [types][]:

  - <code>[AnyFunction](#AnyFunction)</code>
  - <code>[Arguments](#Arguments)</code>
  - <code>[Array](#Array) ([Unknown][])</code>
  - <code>[Array2](#Array2) ([Unknown][]) ([Unknown][])</code>
  - <code>[Boolean](#Boolean)</code>
  - <code>[Date](#Date)</code>
  - <code>[Descending](#Descending) ([Unknown][])</code>
  - <code>[Either](#Either) ([Unknown][]) ([Unknown][])</code>
  - <code>[Error](#Error)</code>
  - <code>[Fn](#Fn) ([Unknown][]) ([Unknown][])</code>
  - <code>[HtmlElement](#HtmlElement)</code>
  - <code>[Identity](#Identity) ([Unknown][])</code>
  - <code>[Maybe](#Maybe) ([Unknown][])</code>
  - <code>[Null](#Null)</code>
  - <code>[Number](#Number)</code>
  - <code>[Object](#Object)</code>
  - <code>[Pair](#Pair) ([Unknown][]) ([Unknown][])</code>
  - <code>[RegExp](#RegExp)</code>
  - <code>[StrMap](#StrMap) ([Unknown][])</code>
  - <code>[String](#String)</code>
  - <code>[Symbol](#Symbol)</code>
  - <code>[Type](#Type)</code>
  - <code>[TypeClass](#TypeClass)</code>
  - <code>[Undefined](#Undefined)</code>

#### <a name="test" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L1433">`test :: Array Type -⁠> Type -⁠> a -⁠> Boolean`</a>

Takes an environment, a type, and any value. Returns `true` if the value
is a member of the type; `false` otherwise.

The environment is only significant if the type contains
[type variables][].

### Type constructors

sanctuary-def provides several functions for defining types.

#### <a name="NullaryType" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L1453">`NullaryType :: String -⁠> String -⁠> Array Type -⁠> (Any -⁠> Boolean) -⁠> Type`</a>

Type constructor for types with no type variables (such as [`Number`][]).

To define a nullary type `t` one must provide:

  - the name of `t` (exposed as `t.name`);

  - the documentation URL of `t` (exposed as `t.url`);

  - an array of supertypes (exposed as `t.supertypes`); and

  - a predicate that accepts any value that is a member of every one of
    the given supertypes, and returns `true` if (and only if) the value
    is a member of `t`.

For example:

```javascript
//    Integer :: Type
const Integer = $.NullaryType
  ('Integer')
  ('http://example.com/my-package#Integer')
  ([])
  (x => typeof x === 'number' &&
        Math.floor (x) === x &&
        x >= Number.MIN_SAFE_INTEGER &&
        x <= Number.MAX_SAFE_INTEGER);

//    NonZeroInteger :: Type
const NonZeroInteger = $.NullaryType
  ('NonZeroInteger')
  ('http://example.com/my-package#NonZeroInteger')
  ([Integer])
  (x => x !== 0);

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
//
//   See http://example.com/my-package#Integer for information about the Integer type.

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
//
//   See http://example.com/my-package#NonZeroInteger for information about the NonZeroInteger type.
```

#### <a name="UnaryType" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L1535">`UnaryType :: Foldable f => String -⁠> String -⁠> Array Type -⁠> (Any -⁠> Boolean) -⁠> (t a -⁠> f a) -⁠> Type -⁠> Type`</a>

Type constructor for types with one type variable (such as [`Array`][]).

To define a unary type `t a` one must provide:

  - the name of `t` (exposed as `t.name`);

  - the documentation URL of `t` (exposed as `t.url`);

  - an array of supertypes (exposed as `t.supertypes`);

  - a predicate that accepts any value that is a member of every one of
    the given supertypes, and returns `true` if (and only if) the value
    is a member of `t x` for some type `x`;

  - a function that takes any value of type `t a` and returns the values
    of type `a` contained in the `t`; and

  - the type of `a`.

For example:

```javascript
const show = require ('sanctuary-show');
const type = require ('sanctuary-type-identifiers');

//    MaybeTypeRep :: TypeRep Maybe
const MaybeTypeRep = {'@@type': 'my-package/Maybe'};

//    Maybe :: Type -> Type
const Maybe = $.UnaryType
  ('Maybe')
  ('http://example.com/my-package#Maybe')
  ([])
  (x => type (x) === MaybeTypeRep['@@type'])
  (maybe => maybe.isJust ? [maybe.value] : []);

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

#### <a name="BinaryType" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L1646">`BinaryType :: Foldable f => String -⁠> String -⁠> Array Type -⁠> (Any -⁠> Boolean) -⁠> (t a b -⁠> f a) -⁠> (t a b -⁠> f b) -⁠> Type -⁠> Type -⁠> Type`</a>

Type constructor for types with two type variables (such as
[`Array2`][]).

To define a binary type `t a b` one must provide:

  - the name of `t` (exposed as `t.name`);

  - the documentation URL of `t` (exposed as `t.url`);

  - an array of supertypes (exposed as `t.supertypes`);

  - a predicate that accepts any value that is a member of every one of
    the given supertypes, and returns `true` if (and only if) the value
    is a member of `t x y` for some types `x` and `y`;

  - a function that takes any value of type `t a b` and returns the
    values of type `a` contained in the `t`;

  - a function that takes any value of type `t a b` and returns the
    values of type `b` contained in the `t`;

  - the type of `a`; and

  - the type of `b`.

For example:

```javascript
const type = require ('sanctuary-type-identifiers');

//    PairTypeRep :: TypeRep Pair
const PairTypeRep = {'@@type': 'my-package/Pair'};

//    $Pair :: Type -> Type -> Type
const $Pair = $.BinaryType
  ('Pair')
  ('http://example.com/my-package#Pair')
  ([])
  (x => type (x) === PairTypeRep['@@type'])
  (({fst}) => [fst])
  (({snd}) => [snd]);

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
  ('Rank')
  ('http://example.com/my-package#Rank')
  ([$.String])
  (x => /^(A|2|3|4|5|6|7|8|9|10|J|Q|K)$/.test (x));

//    Suit :: Type
const Suit = $.NullaryType
  ('Suit')
  ('http://example.com/my-package#Suit')
  ([$.String])
  (x => /^[\u2660\u2663\u2665\u2666]$/.test (x));

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
//
//   See http://example.com/my-package#Rank for information about the Rank type.
```

#### <a name="EnumType" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L1778">`EnumType :: String -⁠> String -⁠> Array Any -⁠> Type`</a>

Type constructor for [enumerated types][] (such as [`RegexFlags`][]).

To define an enumerated type `t` one must provide:

  - the name of `t` (exposed as `t.name`);

  - the documentation URL of `t` (exposed as `t.url`); and

  - an array of distinct values.

For example:

```javascript
//    Denomination :: Type
const Denomination = $.EnumType
  ('Denomination')
  ('http://example.com/my-package#Denomination')
  ([10, 20, 50, 100, 200]);
```

#### <a name="RecordType" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L1805">`RecordType :: StrMap Type -⁠> Type`</a>

`RecordType` is used to construct anonymous record types. The type
definition specifies the name and type of each required field. A field is
an enumerable property (either an own property or an inherited property).

To define an anonymous record type one must provide:

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

#### <a name="NamedRecordType" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L1889">`NamedRecordType :: NonEmpty String -⁠> String -⁠> Array Type -⁠> StrMap Type -⁠> Type`</a>

`NamedRecordType` is used to construct named record types. The type
definition specifies the name and type of each required field. A field is
an enumerable property (either an own property or an inherited property).

To define a named record type `t` one must provide:

  - the name of `t` (exposed as `t.name`);

  - the documentation URL of `t` (exposed as `t.url`);

  - an array of supertypes (exposed as `t.supertypes`); and

  - an object mapping field name to type.

For example:

```javascript
//    Circle :: Type
const Circle = $.NamedRecordType
  ('my-package/Circle')
  ('http://example.com/my-package#Circle')
  ([])
  ({radius: $.PositiveFiniteNumber});

//    Cylinder :: Type
const Cylinder = $.NamedRecordType
  ('Cylinder')
  ('http://example.com/my-package#Cylinder')
  ([Circle])
  ({height: $.PositiveFiniteNumber});

//    volume :: Cylinder -> PositiveFiniteNumber
const volume =
def ('volume')
    ({})
    ([Cylinder, $.FiniteNumber])
    (cyl => Math.PI * cyl.radius * cyl.radius * cyl.height);

volume ({radius: 2, height: 10});
// => 125.66370614359172

volume ({radius: 2});
// ! TypeError: Invalid value
//
//   volume :: Cylinder -> FiniteNumber
//             ^^^^^^^^
//                1
//
//   1)  {"radius": 2} :: Object, StrMap Number
//
//   The value at position 1 is not a member of ‘Cylinder’.
//
//   See http://example.com/my-package#Cylinder for information about the Cylinder type.
```

#### <a name="TypeVariable" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L1998">`TypeVariable :: String -⁠> Type`</a>

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

#### <a name="UnaryTypeVariable" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L2060">`UnaryTypeVariable :: String -⁠> Type -⁠> Type`</a>

Combines [`UnaryType`][] and [`TypeVariable`][].

To define a unary type variable `t a` one must provide:

  - a name (conventionally matching `^[a-z]$`); and

  - the type of `a`.

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

#### <a name="BinaryTypeVariable" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L2114">`BinaryTypeVariable :: String -⁠> Type -⁠> Type -⁠> Type`</a>

Combines [`BinaryType`][] and [`TypeVariable`][].

To define a binary type variable `t a b` one must provide:

  - a name (conventionally matching `^[a-z]$`);

  - the type of `a`; and

  - the type of `b`.

The more detailed explanation of [`UnaryTypeVariable`][] also applies to
`BinaryTypeVariable`.

#### <a name="Thunk" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L2139">`Thunk :: Type -⁠> Type`</a>

`$.Thunk (T)` is shorthand for `$.Function ([T])`, the type comprising
every nullary function (thunk) that returns a value of type `T`.

#### <a name="Predicate" href="https://github.com/sanctuary-js/sanctuary-def/blob/v0.20.0/index.js#L2145">`Predicate :: Type -⁠> Type`</a>

`$.Predicate (T)` is shorthand for `$.Fn (T) ($.Boolean)`, the type
comprising every predicate function that takes a value of type `T`.

### Type classes

One can trivially define a function of type `String -> String -> String`
that concatenates two strings. This is overly restrictive, though, since
other types support concatenation (`Array a`, for example).

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

[Descending]:           https://github.com/sanctuary-js/sanctuary-descending/tree/v1.1.0
[Either]:               https://github.com/sanctuary-js/sanctuary-either/tree/v1.1.0
[FL:Semigroup]:         https://github.com/fantasyland/fantasy-land#semigroup
[HTML element]:         https://developer.mozilla.org/en-US/docs/Web/HTML/Element
[Identity]:             https://github.com/sanctuary-js/sanctuary-identity/tree/v1.1.0
[Maybe]:                https://github.com/sanctuary-js/sanctuary-maybe/tree/v1.1.0
[Monoid]:               https://github.com/fantasyland/fantasy-land#monoid
[Pair]:                 https://github.com/sanctuary-js/sanctuary-pair/tree/v1.1.0
[Setoid]:               https://github.com/fantasyland/fantasy-land#setoid
[Unknown]:              #Unknown
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
[semigroup]:            https://en.wikipedia.org/wiki/Semigroup
[type class]:           #type-classes
[type variables]:       #TypeVariable
[types]:                #types
