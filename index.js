/*              ___                 ______
               /  /\               /  ___/\
        ______/  / / _______    __/  /___\/
       /  ___   / / /  ___  \  /_   __/\
      /  /\_/  / / /  /__/  /\ \/  /\_\/
     /  / //  / / /  ______/ / /  / /
    /  /_//  / / /  /______\/ /  / /
    \_______/ /  \_______/\  /__/ /
     \______\/    \______\/  \__*/

//. # sanctuary-def
//.
//. sanctuary-def is a run-time type system for JavaScript. It facilitates
//. the definition of curried JavaScript functions that are explicit about
//. the number of arguments to which they may be applied and the types of
//. those arguments.
//.
//. It is conventional to import the package as `$`:
//.
//. ```javascript
//. const $ = require ('sanctuary-def');
//. ```
//.
//. The next step is to define an environment. An environment is an array
//. of [types][]. [`env`][] is an environment containing all the built-in
//. JavaScript types. It may be used as the basis for environments that
//. include custom types in addition to the built-in types:
//.
//. ```javascript
//. //    Integer :: Type
//. const Integer = '...';
//.
//. //    NonZeroInteger :: Type
//. const NonZeroInteger = '...';
//.
//. //    env :: Array Type
//. const env = $.env.concat ([Integer, NonZeroInteger]);
//. ```
//.
//. Type constructors such as `List :: Type -> Type` cannot be included in
//. an environment as they're not of the correct type. One could, though,
//. use a type constructor to define a fixed number of concrete types:
//.
//. ```javascript
//. //    env :: Array Type
//. const env = $.env.concat ([
//.   List ($.Number),                // :: Type
//.   List ($.String),                // :: Type
//.   List (List ($.Number)),         // :: Type
//.   List (List ($.String)),         // :: Type
//.   List (List (List ($.Number))),  // :: Type
//.   List (List (List ($.String))),  // :: Type
//. ]);
//. ```
//.
//. Not only would this be tedious, but one could never enumerate all possible
//. types as there are infinitely many. Instead, one should use [`Unknown`][]:
//.
//. ```javascript
//. //    env :: Array Type
//. const env = $.env.concat ([List ($.Unknown)]);
//. ```
//.
//. The next step is to define a `def` function for the environment using
//. `$.create`:
//.
//. ```javascript
//. //    def :: String -> StrMap (Array TypeClass) -> Array Type -> Function -> Function
//. const def = $.create ({checkTypes: true, env});
//. ```
//.
//. The `checkTypes` option determines whether type checking is enabled.
//. This allows one to only pay the performance cost of run-time type checking
//. during development. For example:
//.
//. ```javascript
//. //    def :: String -> StrMap (Array TypeClass) -> Array Type -> Function -> Function
//. const def = $.create ({
//.   checkTypes: process.env.NODE_ENV === 'development',
//.   env,
//. });
//. ```
//.
//. `def` is a function for defining functions. For example:
//.
//. ```javascript
//. //    add :: Number -> Number -> Number
//. const add =
//. def ('add')                           // name
//.     ({})                              // type-class constraints
//.     ([$.Number, $.Number, $.Number])  // input and output types
//.     (x => y => x + y);                // implementation
//. ```
//.
//. `[$.Number, $.Number, $.Number]` specifies that `add` takes two arguments
//. of type `Number`, one at a time, and returns a value of type `Number`.
//.
//. Applying `add` to two arguments, one at a time, gives the expected result:
//.
//. ```javascript
//. add (2) (2);
//. // => 4
//. ```
//.
//. Applying `add` to multiple arguments at once results in an exception being
//. thrown:
//.
//. ```javascript
//. add (2, 2, 2);
//. // ! TypeError: ‘add’ applied to the wrong number of arguments
//. //
//. //   add :: Number -> Number -> Number
//. //          ^^^^^^
//. //            1
//. //
//. //   Expected one argument but received three arguments:
//. //
//. //     - 2
//. //     - 2
//. //     - 2
//. ```
//.
//. Applying `add` to one argument produces a function awaiting the remaining
//. argument. This is known as partial application. Partial application allows
//. more specific functions to be defined in terms of more general ones:
//.
//. ```javascript
//. //    inc :: Number -> Number
//. const inc = add (1);
//.
//. inc (7);
//. // => 8
//. ```
//.
//. JavaScript's implicit type coercion often obfuscates the source of type
//. errors. Consider the following function:
//.
//. ```javascript
//. //    _add :: Number -> Number -> Number
//. const _add = x => y => x + y;
//. ```
//.
//. The type signature indicates that `_add` takes arguments of type `Number`,
//. but this is not enforced. This allows type errors to be silently ignored:
//.
//. ```javascript
//. _add ('2') ('2');
//. // => '22'
//. ```
//.
//. `add`, on the other hand, throws if applied to arguments of the wrong
//. types:
//.
//. ```javascript
//. add ('2') ('2');
//. // ! TypeError: Invalid value
//. //
//. //   add :: Number -> Number -> Number
//. //          ^^^^^^
//. //            1
//. //
//. //   1)  "2" :: String
//. //
//. //   The value at position 1 is not a member of ‘Number’.
//. ```
//.
//. Type checking is performed as arguments are provided (rather than once all
//. arguments have been provided), so type errors are reported early:
//.
//. ```javascript
//. add ('X');
//. // ! TypeError: Invalid value
//. //
//. //   add :: Number -> Number -> Number
//. //          ^^^^^^
//. //            1
//. //
//. //   1)  "X" :: String
//. //
//. //   The value at position 1 is not a member of ‘Number’.
//. ```

(f => {

  'use strict';

  /* istanbul ignore else */
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = f (require ('sanctuary-either'),
                        require ('sanctuary-show'),
                        require ('sanctuary-type-classes'),
                        require ('sanctuary-type-identifiers'));
  } else if (typeof define === 'function' && define.amd != null) {
    define (['sanctuary-either',
             'sanctuary-show',
             'sanctuary-type-classes',
             'sanctuary-type-identifiers'],
            f);
  } else {
    self.sanctuaryDef = f (self.sanctuaryEither,
                           self.sanctuaryShow,
                           self.sanctuaryTypeClasses,
                           self.sanctuaryTypeIdentifiers);
  }

}) ((Either, show, Z, type) => {

  'use strict';

  const {hasOwnProperty, toString} = Object.prototype;

  const {Left, Right} = Either;

  //  B :: (b -> c) -> (a -> b) -> a -> c
  const B = f => g => x => f (g (x));

  //  complement :: (a -> Boolean) -> a -> Boolean
  const complement = pred => x => !(pred (x));

  //  isPrefix :: Array a -> Array a -> Boolean
  const isPrefix = candidate => xs => {
    if (candidate.length > xs.length) return false;
    for (let idx = 0; idx < candidate.length; idx += 1) {
      if (candidate[idx] !== xs[idx]) return false;
    }
    return true;
  };

  //  toArray :: Foldable f => f a -> Array a
  const toArray = foldable => (
    Array.isArray (foldable)
    ? foldable
    : Z.reduce ((xs, x) => ((xs.push (x), xs)), [], foldable)
  );

  //  stripNamespace :: TypeClass -> String
  const stripNamespace = ({name}) => name.slice (name.indexOf ('/') + 1);

  const _test = env => x => function recur(t) {
    return t.supertypes.every (recur) && t._test (env) (x);
  };

  const Type$prototype = {
    '@@type': 'sanctuary-def/Type@1',
    '@@show': function() {
      return this.format (s => s, k => s => s);
    },
    'validate': function(env) {
      const test2 = _test (env);
      return x => {
        if (!(test2 (x) (this))) return Left ({value: x, propPath: []});
        for (let idx = 0; idx < this.keys.length; idx += 1) {
          const k = this.keys[idx];
          const t = this.types[k];
          const ys = this.extractors[k] (x);
          for (let idx2 = 0; idx2 < ys.length; idx2 += 1) {
            const result = t.validate (env) (ys[idx2]);
            if (result.isLeft) {
              return Left ({value: result.value.value,
                            propPath: [k, ...result.value.propPath]});
            }
          }
        }
        return Right (x);
      };
    },
    'fantasy-land/equals': function(other) {
      return (
        Z.equals (this.type, other.type) &&
        Z.equals (this.name, other.name) &&
        Z.equals (this.url, other.url) &&
        Z.equals (this.supertypes, other.supertypes) &&
        this.keys.length === other.keys.length &&
        this.keys.every (k => other.keys.includes (k)) &&
        Z.equals (this.types, other.types)
      );
    },
  };

  //  _Type :: ... -> Type
  const _Type = (
    type,       // :: String
    name,       // :: String
    url,        // :: String
    arity,      // :: NonNegativeInteger
    format,
    // :: Nullable ((String -> String, String -> String -> String) -> String)
    supertypes, // :: Array Type
    test,       // :: Array Type -> Any -> Boolean
    tuples      // :: Array (Array3 String (a -> Array b) Type)
  ) => {
    const t = Object.create (Type$prototype);
    t._test = test;
    t._extractors = tuples.reduce (
      (_extractors, [k, e]) => ((_extractors[k] = e, _extractors)),
      {}
    );
    t.arity = arity;  // number of type parameters
    t.extractors = Z.map (B (toArray), t._extractors);
    t.format = format || ((outer, inner) =>
      outer (name) +
      Z.foldMap (
        String,
        ([k, , t]) => (
          t.arity > 0
          ? outer (' ') + outer ('(') + inner (k) (show (t)) + outer (')')
          : outer (' ')               + inner (k) (show (t))
        ),
        tuples
      )
    );
    t.keys = tuples.map (([k]) => k);
    t.name = name;
    t.supertypes = supertypes;
    t.type = type;
    t.types = tuples.reduce ((types, [k, , t]) => ((types[k] = t, types)), {});
    t.url = url;
    return t;
  };

  const BINARY        = 'BINARY';
  const FUNCTION      = 'FUNCTION';
  const INCONSISTENT  = 'INCONSISTENT';
  const NO_ARGUMENTS  = 'NO_ARGUMENTS';
  const NULLARY       = 'NULLARY';
  const RECORD        = 'RECORD';
  const UNARY         = 'UNARY';
  const UNKNOWN       = 'UNKNOWN';
  const VARIABLE      = 'VARIABLE';

  //  Inconsistent :: Type
  const Inconsistent = _Type (
    INCONSISTENT,
    '',
    '',
    0,
    (outer, inner) => '???',
    [],
    null,
    []
  );

  //  NoArguments :: Type
  const NoArguments = _Type (
    NO_ARGUMENTS,
    '',
    '',
    0,
    (outer, inner) => '()',
    [],
    null,
    []
  );

  //  typeEq :: String -> a -> Boolean
  const typeEq = name => x => type (x) === name;

  //  typeofEq :: String -> a -> Boolean
  const typeofEq = typeof_ => x => (
    typeof x === typeof_  // eslint-disable-line valid-typeof
  );

  //  functionUrl :: String -> String
  const functionUrl = name => {
    const version = '0.22.0';  // updated programmatically
    return (
      `https://github.com/sanctuary-js/sanctuary-def/tree/v${version}#${name}`
    );
  };

  const NullaryTypeWithUrl = Z.ap (NullaryType, functionUrl);
  const UnaryTypeWithUrl = Z.ap (UnaryType, functionUrl);
  const BinaryTypeWithUrl = Z.ap (BinaryType, functionUrl);

  //. ### Types
  //.
  //. Conceptually, a type is a set of values. One can think of a value of
  //. type `Type` as a function of type `Any -> Boolean` that tests values
  //. for membership in the set (though this is an oversimplification).

  //# Unknown :: Type
  //.
  //. Type used to represent missing type information. The type of `[]`,
  //. for example, is `Array ???`.
  //.
  //. May be used with type constructors when defining environments. Given a
  //. type constructor `List :: Type -> Type`, one could use `List ($.Unknown)`
  //. to include an infinite number of types in an environment:
  //.
  //.   - `List Number`
  //.   - `List String`
  //.   - `List (List Number)`
  //.   - `List (List String)`
  //.   - `List (List (List Number))`
  //.   - `List (List (List String))`
  //.   - `...`
  const Unknown = _Type (
    UNKNOWN,
    '',
    '',
    0,
    (outer, inner) => 'Unknown',
    [],
    env => x => true,
    []
  );

  //# Void :: Type
  //.
  //. Uninhabited type.
  //.
  //. May be used to convey that a type parameter of an algebraic data type
  //. will not be used. For example, a future of type `Future Void String`
  //. will never be rejected.
  const Void = NullaryTypeWithUrl
    ('Void')
    ([])
    (x => false);

  //# Any :: Type
  //.
  //. Type comprising every JavaScript value.
  const Any = NullaryTypeWithUrl
    ('Any')
    ([])
    (x => true);

  //# AnyFunction :: Type
  //.
  //. Type comprising every Function value.
  const AnyFunction = NullaryTypeWithUrl
    ('Function')
    ([])
    (typeofEq ('function'));

  //# Arguments :: Type
  //.
  //. Type comprising every [`arguments`][arguments] object.
  const Arguments = NullaryTypeWithUrl
    ('Arguments')
    ([])
    (typeEq ('Arguments'));

  //# Array :: Type -> Type
  //.
  //. Constructor for homogeneous Array types.
  const Array_ = UnaryTypeWithUrl
    ('Array')
    ([])
    (typeEq ('Array'))
    (array => array);

  //# Array0 :: Type
  //.
  //. Type whose sole member is `[]`.
  const Array0 = NullaryTypeWithUrl
    ('Array0')
    ([Array_ (Unknown)])
    (array => array.length === 0);

  //# Array1 :: Type -> Type
  //.
  //. Constructor for singleton Array types.
  const Array1 = UnaryTypeWithUrl
    ('Array1')
    ([Array_ (Unknown)])
    (array => array.length === 1)
    (array1 => array1);

  //# Array2 :: Type -> Type -> Type
  //.
  //. Constructor for heterogeneous Array types of length 2. `['foo', true]` is
  //. a member of `Array2 String Boolean`.
  const Array2 = BinaryTypeWithUrl
    ('Array2')
    ([Array_ (Unknown)])
    (array => array.length === 2)
    (array2 => [array2[0]])
    (array2 => [array2[1]]);

  //# BigInt :: Type
  //.
  //. Type comprising every BigInt value.
  const BigInt_ = NullaryTypeWithUrl
    ('BigInt')
    ([])
    (typeofEq ('bigint'));

  //# Boolean :: Type
  //.
  //. Type comprising `true` and `false`.
  const Boolean_ = NullaryTypeWithUrl
    ('Boolean')
    ([])
    (typeofEq ('boolean'));

  //# Buffer :: Type
  //.
  //. Type comprising every [Buffer][] object.
  const Buffer_ = NullaryTypeWithUrl
    ('Buffer')
    ([])
    // eslint-disable-next-line no-undef
    (x => typeof Buffer !== 'undefined' && Buffer.isBuffer (x));

  //# Date :: Type
  //.
  //. Type comprising every Date value.
  const Date_ = NullaryTypeWithUrl
    ('Date')
    ([])
    (typeEq ('Date'));

  //# ValidDate :: Type
  //.
  //. Type comprising every [`Date`][] value except `new Date (NaN)`.
  const ValidDate = NullaryTypeWithUrl
    ('ValidDate')
    ([Date_])
    (B (complement (Number.isNaN)) (Number));

  //# Descending :: Type -> Type
  //.
  //. [Descending][] type constructor.
  const Descending = UnaryTypeWithUrl
    ('Descending')
    ([])
    (typeEq ('sanctuary-descending/Descending@1'))
    (descending => descending);

  //# Either :: Type -> Type -> Type
  //.
  //. [Either][] type constructor.
  const Either_ = BinaryTypeWithUrl
    ('Either')
    ([])
    (typeEq ('sanctuary-either/Either@1'))
    (either => either.isLeft ? [either.value] : [])
    (either => either.isLeft ? [] : [either.value]);

  //# Error :: Type
  //.
  //. Type comprising every Error value, including values of more specific
  //. constructors such as [`SyntaxError`][] and [`TypeError`][].
  const Error_ = NullaryTypeWithUrl
    ('Error')
    ([])
    (typeEq ('Error'));

  //# Fn :: Type -> Type -> Type
  //.
  //. Binary type constructor for unary function types. `$.Fn (I) (O)`
  //. represents `I -> O`, the type of functions that take a value of
  //. type `I` and return a value of type `O`.
  const Fn = $1 => $2 => Function_ ([$1, $2]);

  //# Function :: NonEmpty (Array Type) -> Type
  //.
  //. Constructor for Function types.
  //.
  //. Examples:
  //.
  //.   - `$.Function ([$.Date, $.String])` represents the `Date -> String`
  //.     type; and
  //.   - `$.Function ([a, b, a])` represents the `(a, b) -> a` type.
  const Function_ = types => (
    _Type (
      FUNCTION,
      '',
      '',
      types.length,
      (outer, inner) => {
        const repr = (
          types
          .slice (0, -1)
          .map ((t, idx) =>
            t.type === FUNCTION
            ? outer ('(') + inner (`$${idx + 1}`) (show (t)) + outer (')')
            : inner (`$${idx + 1}`) (show (t))
          )
          .join (outer (', '))
        );
        return (
          (types.length === 2 ? repr : outer ('(') + repr + outer (')')) +
          outer (' -> ') +
          inner (`$${types.length}`)
                (show (types[types.length - 1]))
        );
      },
      [AnyFunction],
      env => x => true,
      types.map ((t, idx) => [`$${idx + 1}`, x => [], t])
    )
  );

  //# HtmlElement :: Type
  //.
  //. Type comprising every [HTML element][].
  const HtmlElement = NullaryTypeWithUrl
    ('HtmlElement')
    ([])
    (x => /^\[object HTML.*Element\]$/.test (toString.call (x)));

  //# Identity :: Type -> Type
  //.
  //. [Identity][] type constructor.
  const Identity = UnaryTypeWithUrl
    ('Identity')
    ([])
    (typeEq ('sanctuary-identity/Identity@1'))
    (identity => identity);

  //# JsMap :: Type -> Type -> Type
  //.
  //. Constructor for native Map types. `$.JsMap ($.Number) ($.String)`,
  //. for example, is the type comprising every native Map whose keys are
  //. numbers and whose values are strings.
  const JsMap = BinaryTypeWithUrl
    ('JsMap')
    ([])
    (x => toString.call (x) === '[object Map]')
    (jsMap => Array.from (jsMap.keys ()))
    (jsMap => Array.from (jsMap.values ()));

  //# JsSet :: Type -> Type
  //.
  //. Constructor for native Set types. `$.JsSet ($.Number)`, for example,
  //. is the type comprising every native Set whose values are numbers.
  const JsSet = UnaryTypeWithUrl
    ('JsSet')
    ([])
    (x => toString.call (x) === '[object Set]')
    (jsSet => Array.from (jsSet.values ()));

  //# Maybe :: Type -> Type
  //.
  //. [Maybe][] type constructor.
  const Maybe = UnaryTypeWithUrl
    ('Maybe')
    ([])
    (typeEq ('sanctuary-maybe/Maybe@1'))
    (maybe => maybe);

  //# Module :: Type
  //.
  //. Type comprising every ES module.
  const Module = NullaryTypeWithUrl
    ('Module')
    ([])
    (x => toString.call (x) === '[object Module]');

  //# NonEmpty :: Type -> Type
  //.
  //. Constructor for non-empty types. `$.NonEmpty ($.String)`, for example, is
  //. the type comprising every [`String`][] value except `''`.
  //.
  //. The given type must satisfy the [Monoid][] and [Setoid][] specifications.
  const NonEmpty = UnaryTypeWithUrl
    ('NonEmpty')
    ([])
    (x => Z.Monoid.test (x) &&
          Z.Setoid.test (x) &&
          !(Z.equals (x, Z.empty (x.constructor))))
    (monoid => [monoid]);

  //# Null :: Type
  //.
  //. Type whose sole member is `null`.
  const Null = NullaryTypeWithUrl
    ('Null')
    ([])
    (typeEq ('Null'));

  //# Nullable :: Type -> Type
  //.
  //. Constructor for types that include `null` as a member.
  const Nullable = UnaryTypeWithUrl
    ('Nullable')
    ([])
    (x => true)
    // eslint-disable-next-line eqeqeq
    (nullable => nullable === null ? [] : [nullable]);

  //# Number :: Type
  //.
  //. Type comprising every primitive Number value (including `NaN`).
  const Number_ = NullaryTypeWithUrl
    ('Number')
    ([])
    (typeofEq ('number'));

  const nonZero = x => x !== 0;
  const nonNegative = x => x >= 0;
  const positive = x => x > 0;
  const negative = x => x < 0;

  //# PositiveNumber :: Type
  //.
  //. Type comprising every [`Number`][] value greater than zero.
  const PositiveNumber = NullaryTypeWithUrl
    ('PositiveNumber')
    ([Number_])
    (positive);

  //# NegativeNumber :: Type
  //.
  //. Type comprising every [`Number`][] value less than zero.
  const NegativeNumber = NullaryTypeWithUrl
    ('NegativeNumber')
    ([Number_])
    (negative);

  //# ValidNumber :: Type
  //.
  //. Type comprising every [`Number`][] value except `NaN`.
  const ValidNumber = NullaryTypeWithUrl
    ('ValidNumber')
    ([Number_])
    (complement (Number.isNaN));

  //# NonZeroValidNumber :: Type
  //.
  //. Type comprising every [`ValidNumber`][] value except `0` and `-0`.
  const NonZeroValidNumber = NullaryTypeWithUrl
    ('NonZeroValidNumber')
    ([ValidNumber])
    (nonZero);

  //# FiniteNumber :: Type
  //.
  //. Type comprising every [`ValidNumber`][] value except `Infinity` and
  //. `-Infinity`.
  const FiniteNumber = NullaryTypeWithUrl
    ('FiniteNumber')
    ([ValidNumber])
    (isFinite);

  //# NonZeroFiniteNumber :: Type
  //.
  //. Type comprising every [`FiniteNumber`][] value except `0` and `-0`.
  const NonZeroFiniteNumber = NullaryTypeWithUrl
    ('NonZeroFiniteNumber')
    ([FiniteNumber])
    (nonZero);

  //# PositiveFiniteNumber :: Type
  //.
  //. Type comprising every [`FiniteNumber`][] value greater than zero.
  const PositiveFiniteNumber = NullaryTypeWithUrl
    ('PositiveFiniteNumber')
    ([FiniteNumber])
    (positive);

  //# NegativeFiniteNumber :: Type
  //.
  //. Type comprising every [`FiniteNumber`][] value less than zero.
  const NegativeFiniteNumber = NullaryTypeWithUrl
    ('NegativeFiniteNumber')
    ([FiniteNumber])
    (negative);

  //# Integer :: Type
  //.
  //. Type comprising every integer in the range
  //. [[`Number.MIN_SAFE_INTEGER`][min] .. [`Number.MAX_SAFE_INTEGER`][max]].
  const Integer = NullaryTypeWithUrl
    ('Integer')
    ([ValidNumber])
    (x => Math.floor (x) === x &&
          x >= Number.MIN_SAFE_INTEGER &&
          x <= Number.MAX_SAFE_INTEGER);

  //# NonZeroInteger :: Type
  //.
  //. Type comprising every [`Integer`][] value except `0` and `-0`.
  const NonZeroInteger = NullaryTypeWithUrl
    ('NonZeroInteger')
    ([Integer])
    (nonZero);

  //# NonNegativeInteger :: Type
  //.
  //. Type comprising every non-negative [`Integer`][] value (including `-0`).
  //. Also known as the set of natural numbers under ISO 80000-2:2009.
  const NonNegativeInteger = NullaryTypeWithUrl
    ('NonNegativeInteger')
    ([Integer])
    (nonNegative);

  //# PositiveInteger :: Type
  //.
  //. Type comprising every [`Integer`][] value greater than zero.
  const PositiveInteger = NullaryTypeWithUrl
    ('PositiveInteger')
    ([Integer])
    (positive);

  //# NegativeInteger :: Type
  //.
  //. Type comprising every [`Integer`][] value less than zero.
  const NegativeInteger = NullaryTypeWithUrl
    ('NegativeInteger')
    ([Integer])
    (negative);

  //# Object :: Type
  //.
  //. Type comprising every "plain" Object value. Specifically, values
  //. created via:
  //.
  //.   - object literal syntax;
  //.   - [`Object.create`][]; or
  //.   - the `new` operator in conjunction with `Object` or a custom
  //.     constructor function.
  const Object_ = NullaryTypeWithUrl
    ('Object')
    ([])
    (typeEq ('Object'));

  //# Pair :: Type -> Type -> Type
  //.
  //. [Pair][] type constructor.
  const Pair = BinaryTypeWithUrl
    ('Pair')
    ([])
    (typeEq ('sanctuary-pair/Pair@1'))
    (pair => [pair.fst])
    (pair => [pair.snd]);

  //# RegExp :: Type
  //.
  //. Type comprising every RegExp value.
  const RegExp_ = NullaryTypeWithUrl
    ('RegExp')
    ([])
    (typeEq ('RegExp'));

  //# GlobalRegExp :: Type
  //.
  //. Type comprising every [`RegExp`][] value whose `global` flag is `true`.
  //.
  //. See also [`NonGlobalRegExp`][].
  const GlobalRegExp = NullaryTypeWithUrl
    ('GlobalRegExp')
    ([RegExp_])
    (regexp => regexp.global);

  //# NonGlobalRegExp :: Type
  //.
  //. Type comprising every [`RegExp`][] value whose `global` flag is `false`.
  //.
  //. See also [`GlobalRegExp`][].
  const NonGlobalRegExp = NullaryTypeWithUrl
    ('NonGlobalRegExp')
    ([RegExp_])
    (regexp => !regexp.global);

  //# StrMap :: Type -> Type
  //.
  //. Constructor for homogeneous Object types.
  //.
  //. `{foo: 1, bar: 2, baz: 3}`, for example, is a member of `StrMap Number`;
  //. `{foo: 1, bar: 2, baz: 'XXX'}` is not.
  const StrMap = UnaryTypeWithUrl
    ('StrMap')
    ([Object_])
    (x => true)
    (strMap => strMap);

  //# String :: Type
  //.
  //. Type comprising every primitive String value.
  const String_ = NullaryTypeWithUrl
    ('String')
    ([])
    (typeofEq ('string'));

  //# RegexFlags :: Type
  //.
  //. Type comprising the canonical RegExp flags:
  //.
  //.   - `''`
  //.   - `'g'`
  //.   - `'i'`
  //.   - `'m'`
  //.   - `'gi'`
  //.   - `'gm'`
  //.   - `'im'`
  //.   - `'gim'`
  const RegexFlags = NullaryTypeWithUrl
    ('RegexFlags')
    ([String_])
    (s => /^g?i?m?$/.test (s));

  //# Symbol :: Type
  //.
  //. Type comprising every Symbol value.
  const Symbol_ = NullaryTypeWithUrl
    ('Symbol')
    ([])
    (typeofEq ('symbol'));

  //# Type :: Type
  //.
  //. Type comprising every `Type` value.
  const Type = NullaryTypeWithUrl
    ('Type')
    ([])
    (typeEq ('sanctuary-def/Type@1'));

  //# TypeClass :: Type
  //.
  //. Type comprising every [`TypeClass`][] value.
  const TypeClass = NullaryTypeWithUrl
    ('TypeClass')
    ([])
    (typeEq ('sanctuary-type-classes/TypeClass@1'));

  //# Undefined :: Type
  //.
  //. Type whose sole member is `undefined`.
  const Undefined = NullaryTypeWithUrl
    ('Undefined')
    ([])
    (typeEq ('Undefined'));

  //# env :: Array Type
  //.
  //. An array of [types][]:
  //.
  //.   - <code>[AnyFunction](#AnyFunction)</code>
  //.   - <code>[Arguments](#Arguments)</code>
  //.   - <code>[Array](#Array) ([Unknown][])</code>
  //.   - <code>[Array2](#Array2) ([Unknown][]) ([Unknown][])</code>
  //.   - <code>[BigInt](#BigInt)</code>
  //.   - <code>[Boolean](#Boolean)</code>
  //.   - <code>[Buffer](#Buffer)</code>
  //.   - <code>[Date](#Date)</code>
  //.   - <code>[Descending](#Descending) ([Unknown][])</code>
  //.   - <code>[Either](#Either) ([Unknown][]) ([Unknown][])</code>
  //.   - <code>[Error](#Error)</code>
  //.   - <code>[Fn](#Fn) ([Unknown][]) ([Unknown][])</code>
  //.   - <code>[HtmlElement](#HtmlElement)</code>
  //.   - <code>[Identity](#Identity) ([Unknown][])</code>
  //.   - <code>[JsMap](#JsMap) ([Unknown][]) ([Unknown][])</code>
  //.   - <code>[JsSet](#JsSet) ([Unknown][])</code>
  //.   - <code>[Maybe](#Maybe) ([Unknown][])</code>
  //.   - <code>[Module](#Module)</code>
  //.   - <code>[Null](#Null)</code>
  //.   - <code>[Number](#Number)</code>
  //.   - <code>[Object](#Object)</code>
  //.   - <code>[Pair](#Pair) ([Unknown][]) ([Unknown][])</code>
  //.   - <code>[RegExp](#RegExp)</code>
  //.   - <code>[StrMap](#StrMap) ([Unknown][])</code>
  //.   - <code>[String](#String)</code>
  //.   - <code>[Symbol](#Symbol)</code>
  //.   - <code>[Type](#Type)</code>
  //.   - <code>[TypeClass](#TypeClass)</code>
  //.   - <code>[Undefined](#Undefined)</code>
  const env = [
    AnyFunction,
    Arguments,
    Array_ (Unknown),
    Array2 (Unknown) (Unknown),
    BigInt_,
    Boolean_,
    Buffer_,
    Date_,
    Descending (Unknown),
    Either_ (Unknown) (Unknown),
    Error_,
    Fn (Unknown) (Unknown),
    HtmlElement,
    Identity (Unknown),
    JsMap (Unknown) (Unknown),
    JsSet (Unknown),
    Maybe (Unknown),
    Module,
    Null,
    Number_,
    Object_,
    Pair (Unknown) (Unknown),
    RegExp_,
    StrMap (Unknown),
    String_,
    Symbol_,
    Type,
    TypeClass,
    Undefined,
  ];

  //  Unchecked :: String -> Type
  const Unchecked = s => NullaryType (s) ('') ([]) (x => true);

  //  production :: Boolean
  const production =
    typeof process !== 'undefined' &&
    /* global process:false */
    process != null &&
    process.env != null &&
    process.env.NODE_ENV === 'production';

  //  numbers :: Array String
  const numbers = [
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine',
  ];

  //  numArgs :: Integer -> String
  const numArgs = n => `${
    n < numbers.length ? numbers[n] : show (n)
  } ${
    n === 1 ? 'argument' : 'arguments'
  }`;

  //  expandUnknown :: (Array Type, Array Object, Any, (a -> Array b), Type)
  //                -> Array Type
  const expandUnknown = (env, seen, value, extractor, type) => (
    type.type === UNKNOWN
    ? _determineActualTypes (env, seen, extractor (value))
    : [type]
  );

  //  _determineActualTypes :: ... -> Array Type
  const _determineActualTypes = (
    env,            // :: Array Type
    seen,           // :: Array Object
    values          // :: Array Any
  ) => {
    if (values.length === 0) return [Unknown];

    const refine = (types, value) => {
      let seen$;
      if (typeof value === 'object' && value != null ||
          typeof value === 'function') {
        //  Abort if a circular reference is encountered; add the current
        //  object to the array of seen objects otherwise.
        if (seen.indexOf (value) >= 0) return [];
        seen$ = [...seen, value];
      } else {
        seen$ = seen;
      }
      return Z.chain (
        t => (
          (t.validate (env) (value)).isLeft ?
            [] :
          t.type === UNARY ?
            Z.map (
              fromUnaryType (t),
              expandUnknown (env, seen$, value, t.extractors.$1, t.types.$1)
            ) :
          t.type === BINARY ?
            Z.lift2 (
              fromBinaryType (t),
              expandUnknown (env, seen$, value, t.extractors.$1, t.types.$1),
              expandUnknown (env, seen$, value, t.extractors.$2, t.types.$2)
            ) :
          // else
            [t]
        ),
        types
      );
    };
    const types = values.reduce (refine, env);
    return types.length > 0 ? types : [Inconsistent];
  };

  //  isConsistent :: Type -> Boolean
  const isConsistent = t => {
    switch (t.type) {
      case INCONSISTENT:
        return false;
      case UNARY:
        return isConsistent (t.types.$1);
      case BINARY:
        return isConsistent (t.types.$1) &&
               isConsistent (t.types.$2);
      default:
        return true;
    }
  };

  //  determineActualTypesStrict :: (Array Type, Array Any) -> Array Type
  const determineActualTypesStrict = (env, values) => (
    Z.filter (isConsistent,
              _determineActualTypes (env, [], values))
  );

  //  determineActualTypesLoose :: (Array Type, Array Any) -> Array Type
  const determineActualTypesLoose = (env, values) => (
    Z.reject (t => t.type === INCONSISTENT,
              _determineActualTypes (env, [], values))
  );

  //  TypeInfo = { name :: String
  //             , constraints :: StrMap (Array TypeClass)
  //             , types :: NonEmpty (Array Type) }
  //
  //  TypeVarMap = StrMap { types :: Array Type
  //                      , valuesByPath :: StrMap (Array Any) }
  //
  //  PropPath = Array (Number | String)

  //  updateTypeVarMap :: ... -> TypeVarMap
  const updateTypeVarMap = (
    env,            // :: Array Type
    typeVarMap,     // :: TypeVarMap
    typeVar,        // :: Type
    index,          // :: Integer
    propPath,       // :: PropPath
    values          // :: Array Any
  ) => {
    const $typeVarMap = {};
    for (const typeVarName in typeVarMap) {
      const entry = typeVarMap[typeVarName];
      const $entry = {types: entry.types.slice (), valuesByPath: {}};
      for (const k in entry.valuesByPath) {
        $entry.valuesByPath[k] = entry.valuesByPath[k].slice ();
      }
      $typeVarMap[typeVarName] = $entry;
    }
    if (!(hasOwnProperty.call ($typeVarMap, typeVar.name))) {
      $typeVarMap[typeVar.name] = {
        types: Z.filter (t => t.arity >= typeVar.arity, env),
        valuesByPath: {},
      };
    }

    const key = JSON.stringify ([index, ...propPath]);
    if (!(hasOwnProperty.call ($typeVarMap[typeVar.name].valuesByPath, key))) {
      $typeVarMap[typeVar.name].valuesByPath[key] = [];
    }

    const isValid = test (env);

    values.forEach (value => {
      $typeVarMap[typeVar.name].valuesByPath[key].push (value);
      $typeVarMap[typeVar.name].types = Z.chain (
        t => (
          !(isValid (t) (value)) ?
            [] :
          typeVar.arity === 0 && t.type === UNARY ?
            Z.map (
              fromUnaryType (t),
              Z.filter (
                isConsistent,
                expandUnknown (env, [], value, t.extractors.$1, t.types.$1)
              )
            ) :
          typeVar.arity === 0 && t.type === BINARY ?
            Z.lift2 (
              fromBinaryType (t),
              Z.filter (
                isConsistent,
                expandUnknown (env, [], value, t.extractors.$1, t.types.$1)
              ),
              Z.filter (
                isConsistent,
                expandUnknown (env, [], value, t.extractors.$2, t.types.$2)
              )
            ) :
          // else
            [t]
        ),
        $typeVarMap[typeVar.name].types
      );
    });

    return $typeVarMap;
  };

  //  underlineTypeVars :: (TypeInfo, StrMap (Array Any)) -> String
  const underlineTypeVars = (typeInfo, valuesByPath) => {
    //  Note: Sorting these keys lexicographically is not "correct", but it
    //  does the right thing for indexes less than 10.
    const paths = Z.map (JSON.parse, Z.sort (Object.keys (valuesByPath)));
    return (
      underline_ (typeInfo)
                 (index => f => t => propPath => s => {
                    const indexedPropPath = [index, ...propPath];
                    if (paths.some (isPrefix (indexedPropPath))) {
                      const key = JSON.stringify (indexedPropPath);
                      if (!(hasOwnProperty.call (valuesByPath, key))) return s;
                      if (valuesByPath[key].length > 0) return f (s);
                    }
                    return ' '.repeat (s.length);
                  })
    );
  };

  //  satisfactoryTypes :: ... -> Either (() -> Error)
  //                                     { typeVarMap :: TypeVarMap
  //                                     , types :: Array Type }
  const satisfactoryTypes = (
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    typeVarMap,     // :: TypeVarMap
    expType,        // :: Type
    index,          // :: Integer
    propPath,       // :: PropPath
    values          // :: Array Any
  ) => {
    const recur = satisfactoryTypes;

    for (let idx = 0; idx < values.length; idx += 1) {
      const result = expType.validate (env) (values[idx]);
      if (result.isLeft) {
        return Left (() =>
          invalidValue (env,
                        typeInfo,
                        index,
                        [...propPath, ...result.value.propPath],
                        result.value.value)
        );
      }
    }

    switch (expType.type) {
      case VARIABLE: {
        const typeVarName = expType.name;
        const {constraints} = typeInfo;
        if (hasOwnProperty.call (constraints, typeVarName)) {
          const typeClasses = constraints[typeVarName];
          for (let idx = 0; idx < values.length; idx += 1) {
            for (let idx2 = 0; idx2 < typeClasses.length; idx2 += 1) {
              if (!(typeClasses[idx2].test (values[idx]))) {
                return Left (() =>
                  typeClassConstraintViolation (
                    env,
                    typeInfo,
                    typeClasses[idx2],
                    index,
                    propPath,
                    values[idx]
                  )
                );
              }
            }
          }
        }

        const typeVarMap$ = updateTypeVarMap (env,
                                              typeVarMap,
                                              expType,
                                              index,
                                              propPath,
                                              values);

        const okTypes = typeVarMap$[typeVarName].types;
        return (
          okTypes.length === 0
          ? Left (() =>
              typeVarConstraintViolation (
                env,
                typeInfo,
                index,
                propPath,
                typeVarMap$[typeVarName].valuesByPath
              )
            )
          : Z.reduce ((e, t) => (
              Z.chain (r => {
                //  The `a` in `Functor f => f a` corresponds to the `a`
                //  in `Maybe a` but to the `b` in `Either a b`. A type
                //  variable's $1 will correspond to either $1 or $2 of
                //  the actual type depending on the actual type's arity.
                const offset = t.arity - expType.arity;
                return expType.keys.reduce ((e, k, idx) => {
                  const extractor = t.extractors[t.keys[offset + idx]];
                  return Z.reduce ((e, x) => (
                    Z.chain (r => recur (
                      env,
                      typeInfo,
                      r.typeVarMap,
                      expType.types[k],
                      index,
                      [...propPath, k],
                      [x]
                    ), e)
                  ), e, Z.chain (extractor, values));
                }, Right (r));
              }, e)
            ), Right ({typeVarMap: typeVarMap$, types: okTypes}), okTypes)
        );
      }
      case UNARY: {
        return Z.map (
          result => ({
            typeVarMap: result.typeVarMap,
            types: Z.map (
              fromUnaryType (expType),
              /* istanbul ignore next */
              result.types.length > 0
              ? result.types
              : [expType.types.$1]
            ),
          }),
          recur (
            env,
            typeInfo,
            typeVarMap,
            expType.types.$1,
            index,
            [...propPath, '$1'],
            Z.chain (expType.extractors.$1, values)
          )
        );
      }
      case BINARY: {
        return Z.chain (
          result => {
            const $1s = result.types;
            return Z.map (
              result => {
                const $2s = result.types;
                return {
                  typeVarMap: result.typeVarMap,
                  types: Z.lift2 (fromBinaryType (expType),
                                  /* istanbul ignore next */
                                  $1s.length > 0 ? $1s : [expType.types.$1],
                                  /* istanbul ignore next */
                                  $2s.length > 0 ? $2s : [expType.types.$2]),
                };
              },
              recur (
                env,
                typeInfo,
                result.typeVarMap,
                expType.types.$2,
                index,
                [...propPath, '$2'],
                Z.chain (expType.extractors.$2, values)
              )
            );
          },
          recur (
            env,
            typeInfo,
            typeVarMap,
            expType.types.$1,
            index,
            [...propPath, '$1'],
            Z.chain (expType.extractors.$1, values)
          )
        );
      }
      case RECORD: {
        return Z.reduce ((e, k) => (
          Z.chain (r => recur (
            env,
            typeInfo,
            r.typeVarMap,
            expType.types[k],
            index,
            [...propPath, k],
            Z.chain (expType.extractors[k], values)
          ), e)
        ), Right ({typeVarMap, types: [expType]}), expType.keys);
      }
      default: {
        return Right ({typeVarMap, types: [expType]});
      }
    }
  };

  //# test :: Array Type -> Type -> a -> Boolean
  //.
  //. Takes an environment, a type, and any value. Returns `true` if the value
  //. is a member of the type; `false` otherwise.
  //.
  //. The environment is only significant if the type contains
  //. [type variables][].
  const test = env => t => x => {
    const typeInfo = {name: 'name', constraints: {}, types: [t]};
    return (satisfactoryTypes (env, typeInfo, {}, t, 0, [], [x])).isRight;
  };

  //. ### Type constructors
  //.
  //. sanctuary-def provides several functions for defining types.

  //# NullaryType :: String -> String -> Array Type -> (Any -> Boolean) -> Type
  //.
  //. Type constructor for types with no type variables (such as [`Number`][]).
  //.
  //. To define a nullary type `t` one must provide:
  //.
  //.   - the name of `t` (exposed as `t.name`);
  //.
  //.   - the documentation URL of `t` (exposed as `t.url`);
  //.
  //.   - an array of supertypes (exposed as `t.supertypes`); and
  //.
  //.   - a predicate that accepts any value that is a member of every one of
  //.     the given supertypes, and returns `true` if (and only if) the value
  //.     is a member of `t`.
  //.
  //. For example:
  //.
  //. ```javascript
  //. //    Integer :: Type
  //. const Integer = $.NullaryType
  //.   ('Integer')
  //.   ('http://example.com/my-package#Integer')
  //.   ([])
  //.   (x => typeof x === 'number' &&
  //.         Math.floor (x) === x &&
  //.         x >= Number.MIN_SAFE_INTEGER &&
  //.         x <= Number.MAX_SAFE_INTEGER);
  //.
  //. //    NonZeroInteger :: Type
  //. const NonZeroInteger = $.NullaryType
  //.   ('NonZeroInteger')
  //.   ('http://example.com/my-package#NonZeroInteger')
  //.   ([Integer])
  //.   (x => x !== 0);
  //.
  //. //    rem :: Integer -> NonZeroInteger -> Integer
  //. const rem =
  //. def ('rem')
  //.     ({})
  //.     ([Integer, NonZeroInteger, Integer])
  //.     (x => y => x % y);
  //.
  //. rem (42) (5);
  //. // => 2
  //.
  //. rem (0.5);
  //. // ! TypeError: Invalid value
  //. //
  //. //   rem :: Integer -> NonZeroInteger -> Integer
  //. //          ^^^^^^^
  //. //             1
  //. //
  //. //   1)  0.5 :: Number
  //. //
  //. //   The value at position 1 is not a member of ‘Integer’.
  //. //
  //. //   See http://example.com/my-package#Integer for information about the Integer type.
  //.
  //. rem (42) (0);
  //. // ! TypeError: Invalid value
  //. //
  //. //   rem :: Integer -> NonZeroInteger -> Integer
  //. //                     ^^^^^^^^^^^^^^
  //. //                           1
  //. //
  //. //   1)  0 :: Number
  //. //
  //. //   The value at position 1 is not a member of ‘NonZeroInteger’.
  //. //
  //. //   See http://example.com/my-package#NonZeroInteger for information about the NonZeroInteger type.
  //. ```
  function NullaryType(name) {
    return url => supertypes => test => (
      _Type (NULLARY, name, url, 0, null, supertypes, env => test, [])
    );
  }

  //# UnaryType :: Foldable f => String -> String -> Array Type -> (Any -> Boolean) -> (t a -> f a) -> Type -> Type
  //.
  //. Type constructor for types with one type variable (such as [`Array`][]).
  //.
  //. To define a unary type `t a` one must provide:
  //.
  //.   - the name of `t` (exposed as `t.name`);
  //.
  //.   - the documentation URL of `t` (exposed as `t.url`);
  //.
  //.   - an array of supertypes (exposed as `t.supertypes`);
  //.
  //.   - a predicate that accepts any value that is a member of every one of
  //.     the given supertypes, and returns `true` if (and only if) the value
  //.     is a member of `t x` for some type `x`;
  //.
  //.   - a function that takes any value of type `t a` and returns the values
  //.     of type `a` contained in the `t`; and
  //.
  //.   - the type of `a`.
  //.
  //. For example:
  //.
  //. ```javascript
  //. const show = require ('sanctuary-show');
  //. const type = require ('sanctuary-type-identifiers');
  //.
  //. //    maybeTypeIdent :: String
  //. const maybeTypeIdent = 'my-package/Maybe';
  //.
  //. //    Maybe :: Type -> Type
  //. const Maybe = $.UnaryType
  //.   ('Maybe')
  //.   ('http://example.com/my-package#Maybe')
  //.   ([])
  //.   (x => type (x) === maybeTypeIdent)
  //.   (maybe => maybe.isJust ? [maybe.value] : []);
  //.
  //. //    Nothing :: Maybe a
  //. const Nothing = {
  //.   'isJust': false,
  //.   'isNothing': true,
  //.   '@@type': maybeTypeIdent,
  //.   '@@show': () => 'Nothing',
  //. };
  //.
  //. //    Just :: a -> Maybe a
  //. const Just = x => ({
  //.   'isJust': true,
  //.   'isNothing': false,
  //.   '@@type': maybeTypeIdent,
  //.   '@@show': () => `Just (${show (x)})`,
  //.   'value': x,
  //. });
  //.
  //. //    fromMaybe :: a -> Maybe a -> a
  //. const fromMaybe =
  //. def ('fromMaybe')
  //.     ({})
  //.     ([a, Maybe (a), a])
  //.     (x => m => m.isJust ? m.value : x);
  //.
  //. fromMaybe (0) (Just (42));
  //. // => 42
  //.
  //. fromMaybe (0) (Nothing);
  //. // => 0
  //.
  //. fromMaybe (0) (Just ('XXX'));
  //. // ! TypeError: Type-variable constraint violation
  //. //
  //. //   fromMaybe :: a -> Maybe a -> a
  //. //                ^          ^
  //. //                1          2
  //. //
  //. //   1)  0 :: Number
  //. //
  //. //   2)  "XXX" :: String
  //. //
  //. //   Since there is no type of which all the above values are members, the type-variable constraint has been violated.
  //. ```
  function UnaryType(name) {
    return url => supertypes => test => _1 => $1 => (
      _Type (UNARY,
             name,
             url,
             1,
             null,
             supertypes,
             env => test,
             [['$1', _1, $1]])
    );
  }

  //  fromUnaryType :: Type -> Type -> Type
  const fromUnaryType = t => (
    UnaryType (t.name)
              (t.url)
              (t.supertypes)
              (t._test ([]))
              (t._extractors.$1)
  );

  //# BinaryType :: Foldable f => String -> String -> Array Type -> (Any -> Boolean) -> (t a b -> f a) -> (t a b -> f b) -> Type -> Type -> Type
  //.
  //. Type constructor for types with two type variables (such as
  //. [`Array2`][]).
  //.
  //. To define a binary type `t a b` one must provide:
  //.
  //.   - the name of `t` (exposed as `t.name`);
  //.
  //.   - the documentation URL of `t` (exposed as `t.url`);
  //.
  //.   - an array of supertypes (exposed as `t.supertypes`);
  //.
  //.   - a predicate that accepts any value that is a member of every one of
  //.     the given supertypes, and returns `true` if (and only if) the value
  //.     is a member of `t x y` for some types `x` and `y`;
  //.
  //.   - a function that takes any value of type `t a b` and returns the
  //.     values of type `a` contained in the `t`;
  //.
  //.   - a function that takes any value of type `t a b` and returns the
  //.     values of type `b` contained in the `t`;
  //.
  //.   - the type of `a`; and
  //.
  //.   - the type of `b`.
  //.
  //. For example:
  //.
  //. ```javascript
  //. const type = require ('sanctuary-type-identifiers');
  //.
  //. //    pairTypeIdent :: String
  //. const pairTypeIdent = 'my-package/Pair';
  //.
  //. //    $Pair :: Type -> Type -> Type
  //. const $Pair = $.BinaryType
  //.   ('Pair')
  //.   ('http://example.com/my-package#Pair')
  //.   ([])
  //.   (x => type (x) === pairTypeIdent)
  //.   (({fst}) => [fst])
  //.   (({snd}) => [snd]);
  //.
  //. //    Pair :: a -> b -> Pair a b
  //. const Pair =
  //. def ('Pair')
  //.     ({})
  //.     ([a, b, $Pair (a) (b)])
  //.     (fst => snd => ({
  //.        'fst': fst,
  //.        'snd': snd,
  //.        '@@type': pairTypeIdent,
  //.        '@@show': () => `Pair (${show (fst)}) (${show (snd)})`,
  //.      }));
  //.
  //. //    Rank :: Type
  //. const Rank = $.NullaryType
  //.   ('Rank')
  //.   ('http://example.com/my-package#Rank')
  //.   ([$.String])
  //.   (x => /^(A|2|3|4|5|6|7|8|9|10|J|Q|K)$/.test (x));
  //.
  //. //    Suit :: Type
  //. const Suit = $.NullaryType
  //.   ('Suit')
  //.   ('http://example.com/my-package#Suit')
  //.   ([$.String])
  //.   (x => /^[\u2660\u2663\u2665\u2666]$/.test (x));
  //.
  //. //    Card :: Type
  //. const Card = $Pair (Rank) (Suit);
  //.
  //. //    showCard :: Card -> String
  //. const showCard =
  //. def ('showCard')
  //.     ({})
  //.     ([Card, $.String])
  //.     (card => card.fst + card.snd);
  //.
  //. showCard (Pair ('A') ('♠'));
  //. // => 'A♠'
  //.
  //. showCard (Pair ('X') ('♠'));
  //. // ! TypeError: Invalid value
  //. //
  //. //   showCard :: Pair Rank Suit -> String
  //. //                    ^^^^
  //. //                     1
  //. //
  //. //   1)  "X" :: String
  //. //
  //. //   The value at position 1 is not a member of ‘Rank’.
  //. //
  //. //   See http://example.com/my-package#Rank for information about the Rank type.
  //. ```
  function BinaryType(name) {
    return url => supertypes => test => _1 => _2 => $1 => $2 => (
      _Type (BINARY,
             name,
             url,
             2,
             null,
             supertypes,
             env => test,
             [['$1', _1, $1],
              ['$2', _2, $2]])
    );
  }

  //  fromBinaryType :: (Type -> Type -> Type) -> Type -> Type -> Type
  const fromBinaryType = t => (
    BinaryType (t.name)
               (t.url)
               (t.supertypes)
               (t._test ([]))
               (t._extractors.$1)
               (t._extractors.$2)
  );

  //# EnumType :: String -> String -> Array Any -> Type
  //.
  //. Type constructor for [enumerated types][] (such as [`RegexFlags`][]).
  //.
  //. To define an enumerated type `t` one must provide:
  //.
  //.   - the name of `t` (exposed as `t.name`);
  //.
  //.   - the documentation URL of `t` (exposed as `t.url`); and
  //.
  //.   - an array of distinct values.
  //.
  //. For example:
  //.
  //. ```javascript
  //. //    Denomination :: Type
  //. const Denomination = $.EnumType
  //.   ('Denomination')
  //.   ('http://example.com/my-package#Denomination')
  //.   ([10, 20, 50, 100, 200]);
  //. ```
  function EnumType(name) {
    return url => members => (
      NullaryType (name) (url) ([]) (x => members.some (m => Z.equals (x, m)))
    );
  }

  //# RecordType :: StrMap Type -> Type
  //.
  //. `RecordType` is used to construct anonymous record types. The type
  //. definition specifies the name and type of each required field. A field is
  //. an enumerable property (either an own property or an inherited property).
  //.
  //. To define an anonymous record type one must provide:
  //.
  //.   - an object mapping field name to type.
  //.
  //. For example:
  //.
  //. ```javascript
  //. //    Point :: Type
  //. const Point = $.RecordType ({x: $.FiniteNumber, y: $.FiniteNumber});
  //.
  //. //    dist :: Point -> Point -> FiniteNumber
  //. const dist =
  //. def ('dist')
  //.     ({})
  //.     ([Point, Point, $.FiniteNumber])
  //.     (p => q => Math.sqrt (Math.pow (p.x - q.x, 2) +
  //.                           Math.pow (p.y - q.y, 2)));
  //.
  //. dist ({x: 0, y: 0}) ({x: 3, y: 4});
  //. // => 5
  //.
  //. dist ({x: 0, y: 0}) ({x: 3, y: 4, color: 'red'});
  //. // => 5
  //.
  //. dist ({x: 0, y: 0}) ({x: NaN, y: NaN});
  //. // ! TypeError: Invalid value
  //. //
  //. //   dist :: { x :: FiniteNumber, y :: FiniteNumber } -> { x :: FiniteNumber, y :: FiniteNumber } -> FiniteNumber
  //. //                                                              ^^^^^^^^^^^^
  //. //                                                                   1
  //. //
  //. //   1)  NaN :: Number
  //. //
  //. //   The value at position 1 is not a member of ‘FiniteNumber’.
  //.
  //. dist (0);
  //. // ! TypeError: Invalid value
  //. //
  //. //   dist :: { x :: FiniteNumber, y :: FiniteNumber } -> { x :: FiniteNumber, y :: FiniteNumber } -> FiniteNumber
  //. //           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //. //                              1
  //. //
  //. //   1)  0 :: Number
  //. //
  //. //   The value at position 1 is not a member of ‘{ x :: FiniteNumber, y :: FiniteNumber }’.
  //. ```
  const RecordType = fields => {
    const keys = Object.keys (fields);
    return _Type (
      RECORD,
      '',
      '',
      0,
      (outer, inner) => {
        if (keys.length === 0) return outer ('{}');
        const reprs = Z.map (k => {
          const t = fields[k];
          return outer (' ') +
                 outer (/^(?!\d)[$\w]+$/.test (k) ? k : show (k)) +
                 outer (' :: ') +
                 inner (k) (show (t));
        }, keys);
        return outer ('{') + reprs.join (outer (',')) + outer (' }');
      },
      [],
      env => x => {
        if (x == null) return false;
        const missing = {};
        keys.forEach (k => { missing[k] = k; });
        for (const k in x) delete missing[k];
        return Z.size (missing) === 0;
      },
      keys.map (k => [k, x => [x[k]], fields[k]])
    );
  };

  //# NamedRecordType :: NonEmpty String -> String -> Array Type -> StrMap Type -> Type
  //.
  //. `NamedRecordType` is used to construct named record types. The type
  //. definition specifies the name and type of each required field. A field is
  //. an enumerable property (either an own property or an inherited property).
  //.
  //. To define a named record type `t` one must provide:
  //.
  //.   - the name of `t` (exposed as `t.name`);
  //.
  //.   - the documentation URL of `t` (exposed as `t.url`);
  //.
  //.   - an array of supertypes (exposed as `t.supertypes`); and
  //.
  //.   - an object mapping field name to type.
  //.
  //. For example:
  //.
  //. ```javascript
  //. //    Circle :: Type
  //. const Circle = $.NamedRecordType
  //.   ('my-package/Circle')
  //.   ('http://example.com/my-package#Circle')
  //.   ([])
  //.   ({radius: $.PositiveFiniteNumber});
  //.
  //. //    Cylinder :: Type
  //. const Cylinder = $.NamedRecordType
  //.   ('Cylinder')
  //.   ('http://example.com/my-package#Cylinder')
  //.   ([Circle])
  //.   ({height: $.PositiveFiniteNumber});
  //.
  //. //    volume :: Cylinder -> PositiveFiniteNumber
  //. const volume =
  //. def ('volume')
  //.     ({})
  //.     ([Cylinder, $.FiniteNumber])
  //.     (cyl => Math.PI * cyl.radius * cyl.radius * cyl.height);
  //.
  //. volume ({radius: 2, height: 10});
  //. // => 125.66370614359172
  //.
  //. volume ({radius: 2});
  //. // ! TypeError: Invalid value
  //. //
  //. //   volume :: Cylinder -> FiniteNumber
  //. //             ^^^^^^^^
  //. //                1
  //. //
  //. //   1)  {"radius": 2} :: Object, StrMap Number
  //. //
  //. //   The value at position 1 is not a member of ‘Cylinder’.
  //. //
  //. //   See http://example.com/my-package#Cylinder for information about the Cylinder type.
  //. ```
  const NamedRecordType = name => url => supertypes => fields => {
    const keys = Z.sort (Object.keys (fields));
    return _Type (
      RECORD,
      name,
      url,
      0,
      (outer, inner) => outer (name),
      supertypes,
      env => x => {
        if (x == null) return false;
        const missing = {};
        keys.forEach (k => { missing[k] = k; });
        for (const k in x) delete missing[k];
        return Z.size (missing) === 0 &&
               keys.every (k => _test (env) (x[k]) (fields[k]));
      },
      keys.map (k => [k, x => [x[k]], fields[k]])
    );
  };

  //# TypeVariable :: String -> Type
  //.
  //. Polymorphism is powerful. Not being able to define a function for
  //. all types would be very limiting indeed: one couldn't even define the
  //. identity function!
  //.
  //. Before defining a polymorphic function one must define one or more type
  //. variables:
  //.
  //. ```javascript
  //. const a = $.TypeVariable ('a');
  //. const b = $.TypeVariable ('b');
  //.
  //. //    id :: a -> a
  //. const id = def ('id') ({}) ([a, a]) (x => x);
  //.
  //. id (42);
  //. // => 42
  //.
  //. id (null);
  //. // => null
  //. ```
  //.
  //. The same type variable may be used in multiple positions, creating a
  //. constraint:
  //.
  //. ```javascript
  //. //    cmp :: a -> a -> Number
  //. const cmp =
  //. def ('cmp')
  //.     ({})
  //.     ([a, a, $.Number])
  //.     (x => y => x < y ? -1 : x > y ? 1 : 0);
  //.
  //. cmp (42) (42);
  //. // => 0
  //.
  //. cmp ('a') ('z');
  //. // => -1
  //.
  //. cmp ('z') ('a');
  //. // => 1
  //.
  //. cmp (0) ('1');
  //. // ! TypeError: Type-variable constraint violation
  //. //
  //. //   cmp :: a -> a -> Number
  //. //          ^    ^
  //. //          1    2
  //. //
  //. //   1)  0 :: Number
  //. //
  //. //   2)  "1" :: String
  //. //
  //. //   Since there is no type of which all the above values are members, the type-variable constraint has been violated.
  //. ```
  const TypeVariable = name => (
    _Type (VARIABLE,
           name,
           '',
           0,
           (outer, inner) => name,
           [],
           env => x => env.some (t => t.arity >= 0 && _test (env) (x) (t)),
           [])
  );

  //# UnaryTypeVariable :: String -> Type -> Type
  //.
  //. Combines [`UnaryType`][] and [`TypeVariable`][].
  //.
  //. To define a unary type variable `t a` one must provide:
  //.
  //.   - a name (conventionally matching `^[a-z]$`); and
  //.
  //.   - the type of `a`.
  //.
  //. Consider the type of a generalized `map`:
  //.
  //. ```haskell
  //. map :: Functor f => (a -> b) -> f a -> f b
  //. ```
  //.
  //. `f` is a unary type variable. With two (nullary) type variables, one
  //. unary type variable, and one [type class][] it's possible to define a
  //. fully polymorphic `map` function:
  //.
  //. ```javascript
  //. const $ = require ('sanctuary-def');
  //. const Z = require ('sanctuary-type-classes');
  //.
  //. const a = $.TypeVariable ('a');
  //. const b = $.TypeVariable ('b');
  //. const f = $.UnaryTypeVariable ('f');
  //.
  //. //    map :: Functor f => (a -> b) -> f a -> f b
  //. const map =
  //. def ('map')
  //.     ({f: [Z.Functor]})
  //.     ([$.Function ([a, b]), f (a), f (b)])
  //.     (f => functor => Z.map (f, functor));
  //. ```
  //.
  //. Whereas a regular type variable is fully resolved (`a` might become
  //. `Array (Array String)`, for example), a unary type variable defers to
  //. its type argument, which may itself be a type variable. The type argument
  //. corresponds to the type argument of a unary type or the *second* type
  //. argument of a binary type. The second type argument of `Map k v`, for
  //. example, is `v`. One could replace `Functor => f` with `Map k` or with
  //. `Map Integer`, but not with `Map`.
  //.
  //. This shallow inspection makes it possible to constrain a value's "outer"
  //. and "inner" types independently.
  const UnaryTypeVariable = name => $1 => (
    _Type (VARIABLE,
           name,
           '',
           1,
           null,
           [],
           env => x => env.some (t => t.arity >= 1 && _test (env) (x) (t)),
           [['$1', x => [], $1]])
  );

  //# BinaryTypeVariable :: String -> Type -> Type -> Type
  //.
  //. Combines [`BinaryType`][] and [`TypeVariable`][].
  //.
  //. To define a binary type variable `t a b` one must provide:
  //.
  //.   - a name (conventionally matching `^[a-z]$`);
  //.
  //.   - the type of `a`; and
  //.
  //.   - the type of `b`.
  //.
  //. The more detailed explanation of [`UnaryTypeVariable`][] also applies to
  //. `BinaryTypeVariable`.
  const BinaryTypeVariable = name => $1 => $2 => (
    _Type (VARIABLE,
           name,
           '',
           2,
           null,
           [],
           env => x => env.some (t => t.arity >= 2 && _test (env) (x) (t)),
           [['$1', x => [], $1],
            ['$2', x => [], $2]])
  );

  //# Thunk :: Type -> Type
  //.
  //. `$.Thunk (T)` is shorthand for `$.Function ([T])`, the type comprising
  //. every nullary function (thunk) that returns a value of type `T`.
  const Thunk = t => Function_ ([t]);

  //# Predicate :: Type -> Type
  //.
  //. `$.Predicate (T)` is shorthand for `$.Fn (T) ($.Boolean)`, the type
  //. comprising every predicate function that takes a value of type `T`.
  const Predicate = t => Fn (t) (Boolean_);

  //. ### Type classes
  //.
  //. One can trivially define a function of type `String -> String -> String`
  //. that concatenates two strings. This is overly restrictive, though, since
  //. other types support concatenation (`Array a`, for example).
  //.
  //. One could use a type variable to define a polymorphic "concat" function:
  //.
  //. ```javascript
  //. //    _concat :: a -> a -> a
  //. const _concat =
  //. def ('_concat')
  //.     ({})
  //.     ([a, a, a])
  //.     (x => y => x.concat (y));
  //.
  //. _concat ('fizz') ('buzz');
  //. // => 'fizzbuzz'
  //.
  //. _concat ([1, 2]) ([3, 4]);
  //. // => [1, 2, 3, 4]
  //.
  //. _concat ([1, 2]) ('buzz');
  //. // ! TypeError: Type-variable constraint violation
  //. //
  //. //   _concat :: a -> a -> a
  //. //              ^    ^
  //. //              1    2
  //. //
  //. //   1)  [1, 2] :: Array Number
  //. //
  //. //   2)  "buzz" :: String
  //. //
  //. //   Since there is no type of which all the above values are members, the type-variable constraint has been violated.
  //. ```
  //.
  //. The type of `_concat` is misleading: it suggests that it can operate on
  //. any two values of *any* one type. In fact there's an implicit constraint,
  //. since the type must support concatenation (in [mathematical][semigroup]
  //. terms, the type must have a [semigroup][FL:Semigroup]). Violating this
  //. implicit constraint results in a run-time error in the implementation:
  //.
  //. ```javascript
  //. _concat (null) (null);
  //. // ! TypeError: Cannot read property 'concat' of null
  //. ```
  //.
  //. The solution is to constrain `a` by first defining a [`TypeClass`][]
  //. value, then specifying the constraint in the definition of the "concat"
  //. function:
  //.
  //. ```javascript
  //. const Z = require ('sanctuary-type-classes');
  //.
  //. //    Semigroup :: TypeClass
  //. const Semigroup = Z.TypeClass (
  //.   'my-package/Semigroup',
  //.   'http://example.com/my-package#Semigroup',
  //.   [],
  //.   x => x != null && typeof x.concat === 'function'
  //. );
  //.
  //. //    concat :: Semigroup a => a -> a -> a
  //. const concat =
  //. def ('concat')
  //.     ({a: [Semigroup]})
  //.     ([a, a, a])
  //.     (x => y => x.concat (y));
  //.
  //. concat ([1, 2]) ([3, 4]);
  //. // => [1, 2, 3, 4]
  //.
  //. concat (null) (null);
  //. // ! TypeError: Type-class constraint violation
  //. //
  //. //   concat :: Semigroup a => a -> a -> a
  //. //             ^^^^^^^^^^^    ^
  //. //                            1
  //. //
  //. //   1)  null :: Null
  //. //
  //. //   ‘concat’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.
  //. //
  //. //   See http://example.com/my-package#Semigroup for information about the my-package/Semigroup type class.
  //. ```
  //.
  //. Multiple constraints may be placed on a type variable by including
  //. multiple `TypeClass` values in the array (e.g. `{a: [Foo, Bar, Baz]}`).

  //  invalidArgumentsCount :: (TypeInfo, Integer, Integer, Array Any) -> Error
  //
  //  This function is used in `curry` when a function defined via `def`
  //  is applied to too many arguments.
  const invalidArgumentsCount = (typeInfo, index, numArgsExpected, args) => (
    new TypeError (
      `‘${
        typeInfo.name
      }’ applied to the wrong number of arguments\n\n${
        underline_ (typeInfo)
                   (index_ => f => t => propPath => s =>
                      index_ === index ? f (s) : ' '.repeat (s.length))
      }\nExpected ${
        numArgs (numArgsExpected)
      } but received ${
        numArgs (args.length)
      }${
        /* istanbul ignore next */
        args.length === 0
        ? '.\n'
        : ':\n\n' + Z.foldMap (String, x => `  - ${show (x)}\n`, args)
      }`
    )
  );

  //  constraintsRepr :: ... -> String
  const constraintsRepr = (
    constraints,    // :: StrMap (Array TypeClass)
    outer,          // :: String -> String
    inner           // :: String -> TypeClass -> String -> String
  ) => {
    const reprs = Z.chain (
      k => (
        constraints[k].map (typeClass =>
          inner (k) (typeClass) (`${stripNamespace (typeClass)} ${k}`)
        )
      ),
      Object.keys (constraints)
    );
    switch (reprs.length) {
      case 0:
        return '';
      case 1:
        return reprs.join (outer (', ')) + outer (' => ');
      default:
        return outer ('(') + reprs.join (outer (', ')) + outer (') => ');
    }
  };

  //  label :: String -> String -> String
  const label = label => s => {
    const delta = s.length - label.length;
    return ' '.repeat (Math.floor (delta / 2)) + label +
           ' '.repeat (Math.ceil (delta / 2));
  };

  //  typeVarNames :: Type -> Array String
  const typeVarNames = t => [
    ...(t.type === VARIABLE ? [t.name] : []),
    ...(Z.chain (k => typeVarNames (t.types[k]), t.keys)),
  ];

  //  showTypeWith :: Array Type -> Type -> String
  const showTypeWith = types => {
    const names = Z.chain (typeVarNames, types);
    return t => {
      let code = 'a'.charCodeAt (0);
      const repr = (
        show (t)
        .replace (/\bUnknown\b/g, () => {
          let name;
          // eslint-disable-next-line no-plusplus
          do name = String.fromCharCode (code++);
          while (names.indexOf (name) >= 0);
          return name;
        })
      );
      return t.type === FUNCTION ? '(' + repr + ')' : repr;
    };
  };

  //  showValuesAndTypes :: ... -> String
  const showValuesAndTypes = (
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    values,         // :: Array Any
    pos             // :: Integer
  ) => {
    const showType = showTypeWith (typeInfo.types);
    return `${
      show (pos)
    })  ${
      values
      .map (x => {
        const types = determineActualTypesLoose (env, [x]);
        return `${
          show (x)
        } :: ${
          types.length > 0 ? (types.map (showType)).join (', ') : '(no types)'
        }`;
      })
      .join ('\n    ')
    }`;
  };

  //  typeSignature :: TypeInfo -> String
  const typeSignature = typeInfo => `${
    typeInfo.name
  } :: ${
    constraintsRepr (typeInfo.constraints, s => s, tvn => tc => s => s)
  }${
    typeInfo.types
    .map (showTypeWith (typeInfo.types))
    .join (' -> ')
  }`;

  //  _underline :: ... -> String
  const _underline = (
    t,              // :: Type
    propPath,       // :: PropPath
    formatType3     // :: Type -> Array String -> String -> String
  ) => (
    formatType3 (t)
                (propPath)
                (t.format (s => ' '.repeat (s.length),
                           k => s => _underline (t.types[k],
                                                 [...propPath, k],
                                                 formatType3)))
  );

  //  underline :: ... -> String
  const underline = underlineConstraint => typeInfo => formatType5 => {
    const st = typeInfo.types.reduce ((st, t, index) => {
      const f = f => (
        t.type === FUNCTION
        ? ' ' + _underline (t, [], formatType5 (index) (f)) + ' '
        :       _underline (t, [], formatType5 (index) (f))
      );
      st.carets.push (f (s => '^'.repeat (s.length)));
      st.numbers.push (f (s => label (show (st.counter += 1)) (s)));
      return st;
    }, {carets: [], numbers: [], counter: 0});

    return (
      `${
        typeSignature (typeInfo)
      }\n${
        ' '.repeat (`${typeInfo.name} :: `.length)
      }${
        constraintsRepr (
          typeInfo.constraints,
          s => ' '.repeat (s.length),
          underlineConstraint
        )
      }${
        st.carets.join (' '.repeat (' -> '.length))
      }\n${
        ' '.repeat (`${typeInfo.name} :: `.length)
      }${
        constraintsRepr (
          typeInfo.constraints,
          s => ' '.repeat (s.length),
          tvn => tc => s => ' '.repeat (s.length)
        )
      }${
        st.numbers.join (' '.repeat (' -> '.length))
      }\n`
    ).replace (/[ ]+$/gm, '');
  };

  //  underline_ :: ... -> String
  const underline_ = underline (tvn => tc => s => ' '.repeat (s.length));

  //  formatType6 ::
  //    PropPath -> Integer -> (String -> String) ->
  //      Type -> PropPath -> String -> String
  const formatType6 = indexedPropPath => index_ => f => t => propPath_ => {
    const indexedPropPath_ = [index_, ...propPath_];
    const p = isPrefix (indexedPropPath_) (indexedPropPath);
    const q = isPrefix (indexedPropPath) (indexedPropPath_);
    return s => p && q ? f (s) : p ? s : ' '.repeat (s.length);
  };

  //  typeClassConstraintViolation :: ... -> Error
  const typeClassConstraintViolation = (
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    typeClass,      // :: TypeClass
    index,          // :: Integer
    propPath,       // :: PropPath
    value           // :: Any
  ) => {
    const expType = propPath.reduce (
      (t, prop) => t.types[prop],
      typeInfo.types[index]
    );
    return new TypeError (
      `Type-class constraint violation\n\n${
        underline (tvn => tc => s =>
                     tvn === expType.name && tc.name === typeClass.name
                     ? '^'.repeat (s.length)
                     : ' '.repeat (s.length))
                  (typeInfo)
                  (formatType6 ([index, ...propPath]))
      }\n${
        showValuesAndTypes (env, typeInfo, [value], 1)
      }\n\n‘${
        typeInfo.name
      }’ requires ‘${
        expType.name
      }’ to satisfy the ${
        stripNamespace (typeClass)
      } type-class constraint; the value at position 1 does not.\n${
        /* istanbul ignore next */
        typeClass.url == null ||
        typeClass.url === ''
        ? ''
        : `\nSee ${
            typeClass.url
          } for information about the ${
            typeClass.name
          } type class.\n`
      }`
    );
  };

  //  typeVarConstraintViolation :: ... -> Error
  const typeVarConstraintViolation = (
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    index,          // :: Integer
    propPath,       // :: PropPath
    valuesByPath    // :: StrMap (Array Any)
  ) => {
    //  If we apply an ‘a -> a -> a -> a’ function to Left ('x'), Right (1),
    //  and Right (null) we'd like to avoid underlining the first argument
    //  position, since Left ('x') is compatible with the other ‘a’ values.
    const key = JSON.stringify ([index, ...propPath]);
    const values = valuesByPath[key];

    //  Note: Sorting these keys lexicographically is not "correct", but it
    //  does the right thing for indexes less than 10.
    const keys = Z.filter (k => {
      const values_ = valuesByPath[k];
      return (
        //  Keep X, the position at which the violation was observed.
        k === key ||
        //  Keep positions whose values are incompatible with the values at X.
        (determineActualTypesStrict (env, [...values, ...values_])).length
          === 0
      );
    }, Z.sort (Object.keys (valuesByPath)));

    return new TypeError (
      `Type-variable constraint violation\n\n${
        underlineTypeVars (
          typeInfo,
          keys.reduce (($valuesByPath, k) => ((
            $valuesByPath[k] = valuesByPath[k],
            $valuesByPath
          )), {})
        )
      }\n${
        keys.reduce (({idx, s}, k) => {
          const values = valuesByPath[k];
          return values.length === 0
                 ? {idx, s}
                 : {idx: idx + 1,
                    s: s + showValuesAndTypes (env, typeInfo, values, idx + 1)
                         + '\n\n'};
        }, {idx: 0, s: ''})
        .s
      }` +
      'Since there is no type of which all the above values are ' +
      'members, the type-variable constraint has been violated.\n'
    );
  };

  //  invalidValue :: ... -> Error
  const invalidValue = (
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    index,          // :: Integer
    propPath,       // :: PropPath
    value           // :: Any
  ) => {
    const t = propPath.reduce (
      (t, prop) => t.types[prop],
      typeInfo.types[index]
    );
    return new TypeError (
      t.type === VARIABLE &&
      (determineActualTypesLoose (env, [value])).length === 0 ?
        `Unrecognized value\n\n${
          underline_ (typeInfo) (formatType6 ([index, ...propPath]))
        }\n${
          showValuesAndTypes (env, typeInfo, [value], 1)
        }\n\n${
          env.length === 0
          ? 'The environment is empty! ' +
            'Polymorphic functions require a non-empty environment.\n'
          : 'The value at position 1 is not a member of any type in ' +
            'the environment.\n\n' +
            'The environment contains the following types:\n\n' +
            Z.foldMap (
              String,
              t => `  - ${showTypeWith (typeInfo.types) (t)}\n`,
              env
            )
        }` :
      // else
        `Invalid value\n\n${
          underline_ (typeInfo) (formatType6 ([index, ...propPath]))
        }\n${
          showValuesAndTypes (env, typeInfo, [value], 1)
        }\n\nThe value at position 1 is not a member of ‘${
          show (t)
        }’.\n${
          t.url == null || t.url === ''
          ? ''
          : `\nSee ${
              t.url
            } for information about the ${
              t.name
            } ${
              t.arity > 0 ? 'type constructor' : 'type'
            }.\n`
        }`
    );
  };

  //  invalidArgumentsLength :: ... -> Error
  //
  //  This function is used in `wrapFunctionCond` to ensure that higher-order
  //  functions defined via `def` only ever apply a function argument to the
  //  correct number of arguments.
  const invalidArgumentsLength = (
    typeInfo,           // :: TypeInfo
    index,              // :: Integer
    numArgsExpected,    // :: Integer
    args                // :: Array Any
  ) => (
    new TypeError (
      `‘${
        typeInfo.name
      }’ applied ‘${
        show (typeInfo.types[index])
      }’ to the wrong number of arguments\n\n${
        underline_ (typeInfo)
                   (index_ => f => t => propPath => s =>
                      index_ === index
                      ? t.format (
                          s => ' '.repeat (s.length),
                          k => k === '$1' ? f : s => ' '.repeat (s.length)
                        )
                      : ' '.repeat (s.length))
      }\nExpected ${
        numArgs (numArgsExpected)
      } but received ${
        numArgs (args.length)
      }${
        args.length === 0
        ? '.\n'
        : ':\n\n' + Z.foldMap (String, x => `  - ${show (x)}\n`, args)
      }`
    )
  );

  //  assertRight :: Either (() -> Error) a -> a !
  const assertRight = either => {
    if (either.isLeft) throw either.value ();
    return either.value;
  };

  //  withTypeChecking :: ... -> Function
  const withTypeChecking = (
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    impl            // :: Function
  ) => {
    const n = typeInfo.types.length - 1;

    //  wrapFunctionCond :: (TypeVarMap, Integer, a) -> a
    const wrapFunctionCond = (_typeVarMap, index, value) => {
      const expType = typeInfo.types[index];
      if (expType.type !== FUNCTION) return value;

      //  checkValue :: (TypeVarMap, Integer, String, a) -> Either (() -> Error) TypeVarMap
      const checkValue = (typeVarMap, index, k, x) => {
        const propPath = [k];
        const t = expType.types[k];
        return (
          t.type === VARIABLE ?
            Z.chain (
              typeVarMap => (
                typeVarMap[t.name].types.length === 0
                ? Left (() =>
                    typeVarConstraintViolation (
                      env,
                      typeInfo,
                      index,
                      propPath,
                      typeVarMap[t.name].valuesByPath
                    )
                  )
                : Right (typeVarMap)
              ),
              Right (updateTypeVarMap (env,
                                       typeVarMap,
                                       t,
                                       index,
                                       propPath,
                                       [x]))
            ) :
          // else
            Z.map (
              r => r.typeVarMap,
              satisfactoryTypes (env,
                                 typeInfo,
                                 typeVarMap,
                                 t,
                                 index,
                                 propPath,
                                 [x])
            )
        );
      };

      let typeVarMap = _typeVarMap;
      return (...args) => {
        if (args.length !== expType.arity - 1) {
          throw invalidArgumentsLength (typeInfo,
                                        index,
                                        expType.arity - 1,
                                        args);
        }

        typeVarMap = assertRight (
          expType.keys
          .slice (0, -1)
          .reduce (
            (either, k, idx) => (
              Z.chain (
                typeVarMap => checkValue (typeVarMap, index, k, args[idx]),
                either
              )
            ),
            Right (typeVarMap)
          )
        );

        const output = value.apply (this, args);
        const k = expType.keys[expType.keys.length - 1];
        typeVarMap = assertRight (checkValue (typeVarMap, index, k, output));
        return output;
      };
    };

    //  wrapNext :: (TypeVarMap, Array Any, Integer) -> (a -> b)
    const wrapNext = (_typeVarMap, _values, index) => (head, ...tail) => {
      const args = [head, ...tail];
      if (args.length !== 1) {
        throw invalidArgumentsCount (typeInfo, index, 1, args);
      }
      let {typeVarMap} = assertRight (
        satisfactoryTypes (env,
                           typeInfo,
                           _typeVarMap,
                           typeInfo.types[index],
                           index,
                           [],
                           args)
      );

      const values = [..._values, ...args];
      if (index + 1 === n) {
        const value = values.reduce (
          (f, x, idx) => f (wrapFunctionCond (typeVarMap, idx, x)),
          impl
        );
        ({typeVarMap} = assertRight (
          satisfactoryTypes (env,
                             typeInfo,
                             typeVarMap,
                             typeInfo.types[n],
                             n,
                             [],
                             [value])
        ));
        return wrapFunctionCond (typeVarMap, n, value);
      } else {
        return wrapNext (typeVarMap, values, index + 1);
      }
    };

    const wrapped = typeInfo.types[0].type === NO_ARGUMENTS ?
      (...args) => {
        if (args.length !== 0) {
          throw invalidArgumentsCount (typeInfo, 0, 0, args);
        }
        const value = impl ();
        const {typeVarMap} = assertRight (
          satisfactoryTypes (env,
                             typeInfo,
                             {},
                             typeInfo.types[n],
                             n,
                             [],
                             [value])
        );
        return wrapFunctionCond (typeVarMap, n, value);
      } :
      wrapNext ({}, [], 0);

    wrapped.toString = () => typeSignature (typeInfo);
    /* istanbul ignore else */
    if (
      typeof process !== 'undefined' &&
      process != null &&
      process.versions != null &&
      process.versions.node != null
    ) wrapped[Symbol.for ('nodejs.util.inspect.custom')] = wrapped.toString;
    /* istanbul ignore if */
    if (typeof Deno !== 'undefined') {
      if (Deno != null && typeof Deno.customInspect === 'symbol') {
        wrapped[Deno.customInspect] = wrapped.toString;
      }
    }

    return wrapped;
  };

  //  defTypes :: NonEmpty (Array Type)
  const defTypes = [
    String_,
    StrMap (Array_ (TypeClass)),
    NonEmpty (Array_ (Type)),
    AnyFunction,
    AnyFunction,
  ];

  const create = opts => {
    const def = name => constraints => expTypes => impl => (
      opts.checkTypes
      ? withTypeChecking (opts.env,
                          {name,
                           constraints,
                           types: expTypes.length === 1
                                  ? [NoArguments, ...expTypes]
                                  : expTypes},
                          impl)
      : impl
    );
    return def ('def') ({}) (defTypes) (def);
  };

  const def = create ({checkTypes: !production, env});

  //  fromUncheckedUnaryType :: (Type -> Type) -> Type -> Type
  const fromUncheckedUnaryType = typeConstructor => {
    const t = typeConstructor (Unknown);
    return def (t.name) ({}) ([Type, Type]) (fromUnaryType (t));
  };

  //  fromUncheckedBinaryType :: (Type -> Type -> Type) -> Type -> Type -> Type
  const fromUncheckedBinaryType = typeConstructor => {
    const t = typeConstructor (Unknown) (Unknown);
    return def (t.name) ({}) ([Type, Type, Type]) (fromBinaryType (t));
  };

  return {
    Any,
    AnyFunction,
    Arguments,
    Array: fromUncheckedUnaryType (Array_),
    Array0,
    Array1: fromUncheckedUnaryType (Array1),
    Array2: fromUncheckedBinaryType (Array2),
    BigInt: BigInt_,
    Boolean: Boolean_,
    Buffer: Buffer_,
    Date: Date_,
    ValidDate,
    Descending: fromUncheckedUnaryType (Descending),
    Either: fromUncheckedBinaryType (Either_),
    Error: Error_,
    Fn:
      def ('Fn')
          ({})
          ([Type, Type, Type])
          (Fn),
    Function:
      def ('Function')
          ({})
          ([NonEmpty (Array_ (Type)), Type])
          (Function_),
    HtmlElement,
    Identity: fromUncheckedUnaryType (Identity),
    JsMap: fromUncheckedBinaryType (JsMap),
    JsSet: fromUncheckedUnaryType (JsSet),
    Maybe: fromUncheckedUnaryType (Maybe),
    Module,
    NonEmpty,
    Null,
    Nullable: fromUncheckedUnaryType (Nullable),
    Number: Number_,
    PositiveNumber,
    NegativeNumber,
    ValidNumber,
    NonZeroValidNumber,
    FiniteNumber,
    NonZeroFiniteNumber,
    PositiveFiniteNumber,
    NegativeFiniteNumber,
    Integer,
    NonZeroInteger,
    NonNegativeInteger,
    PositiveInteger,
    NegativeInteger,
    Object: Object_,
    Pair: fromUncheckedBinaryType (Pair),
    RegExp: RegExp_,
    GlobalRegExp,
    NonGlobalRegExp,
    RegexFlags,
    StrMap: fromUncheckedUnaryType (StrMap),
    String: String_,
    Symbol: Symbol_,
    Type,
    TypeClass,
    Undefined,
    Unknown,
    Void,
    env,
    create:
      def ('create')
          ({})
          ([RecordType ({checkTypes: Boolean_, env: Array_ (Type)}),
            Unchecked ((defTypes.map (show)).join (' -> '))])
          (create),
    test:
      def ('test')
          ({})
          ([Array_ (Type), Type, Any, Boolean_])
          (test),
    NullaryType:
      def ('NullaryType')
          ({})
          ([String_,
            String_,
            Array_ (Type),
            Unchecked ('(Any -> Boolean)'),
            Type])
          (NullaryType),
    UnaryType:
      def ('UnaryType')
          ({f: [Z.Foldable]})
          ([String_,
            String_,
            Array_ (Type),
            Unchecked ('(Any -> Boolean)'),
            Unchecked ('(t a -> f a)'),
            Unchecked ('Type -> Type')])
          (name => B (B (B (B (def (name) ({}) ([Type, Type])))))
                     (UnaryType (name))),
    BinaryType:
      def ('BinaryType')
          ({f: [Z.Foldable]})
          ([String_,
            String_,
            Array_ (Type),
            Unchecked ('(Any -> Boolean)'),
            Unchecked ('(t a b -> f a)'),
            Unchecked ('(t a b -> f b)'),
            Unchecked ('Type -> Type -> Type')])
          (name => B (B (B (B (B (def (name) ({}) ([Type, Type, Type]))))))
                     (BinaryType (name))),
    EnumType:
      def ('EnumType')
          ({})
          ([String_, String_, Array_ (Any), Type])
          (EnumType),
    RecordType:
      def ('RecordType')
          ({})
          ([StrMap (Type), Type])
          (RecordType),
    NamedRecordType:
      def ('NamedRecordType')
          ({})
          ([NonEmpty (String_), String_, Array_ (Type), StrMap (Type), Type])
          (NamedRecordType),
    TypeVariable:
      def ('TypeVariable')
          ({})
          ([String_, Type])
          (TypeVariable),
    UnaryTypeVariable:
      def ('UnaryTypeVariable')
          ({})
          ([String_, Unchecked ('Type -> Type')])
          (name => def (name)
                       ({})
                       ([Type, Type])
                       (UnaryTypeVariable (name))),
    BinaryTypeVariable:
      def ('BinaryTypeVariable')
          ({})
          ([String_, Unchecked ('Type -> Type -> Type')])
          (name => def (name)
                       ({})
                       ([Type, Type, Type])
                       (BinaryTypeVariable (name))),
    Thunk:
      def ('Thunk')
          ({})
          ([Type, Type])
          (Thunk),
    Predicate:
      def ('Predicate')
          ({})
          ([Type, Type])
          (Predicate),
  };

});

//. [Buffer]:               https://nodejs.org/api/buffer.html#buffer_buffer
//. [Descending]:           v:sanctuary-js/sanctuary-descending
//. [Either]:               v:sanctuary-js/sanctuary-either
//. [FL:Semigroup]:         https://github.com/fantasyland/fantasy-land#semigroup
//. [HTML element]:         https://developer.mozilla.org/en-US/docs/Web/HTML/Element
//. [Identity]:             v:sanctuary-js/sanctuary-identity
//. [Maybe]:                v:sanctuary-js/sanctuary-maybe
//. [Monoid]:               https://github.com/fantasyland/fantasy-land#monoid
//. [Pair]:                 v:sanctuary-js/sanctuary-pair
//. [Setoid]:               https://github.com/fantasyland/fantasy-land#setoid
//. [Unknown]:              #Unknown
//. [`Array`]:              #Array
//. [`Array2`]:             #Array2
//. [`BinaryType`]:         #BinaryType
//. [`Date`]:               #Date
//. [`FiniteNumber`]:       #FiniteNumber
//. [`GlobalRegExp`]:       #GlobalRegExp
//. [`Integer`]:            #Integer
//. [`NonGlobalRegExp`]:    #NonGlobalRegExp
//. [`Number`]:             #Number
//. [`Object.create`]:      https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
//. [`RegExp`]:             #RegExp
//. [`RegexFlags`]:         #RegexFlags
//. [`String`]:             #String
//. [`SyntaxError`]:        https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SyntaxError
//. [`TypeClass`]:          https://github.com/sanctuary-js/sanctuary-type-classes#TypeClass
//. [`TypeError`]:          https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError
//. [`TypeVariable`]:       #TypeVariable
//. [`UnaryType`]:          #UnaryType
//. [`UnaryTypeVariable`]:  #UnaryTypeVariable
//. [`Unknown`]:            #Unknown
//. [`ValidNumber`]:        #ValidNumber
//. [`env`]:                #env
//. [arguments]:            https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/arguments
//. [enumerated types]:     https://en.wikipedia.org/wiki/Enumerated_type
//. [max]:                  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MAX_SAFE_INTEGER
//. [min]:                  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/MIN_SAFE_INTEGER
//. [semigroup]:            https://en.wikipedia.org/wiki/Semigroup
//. [type class]:           #type-classes
//. [type variables]:       #TypeVariable
//. [types]:                #types
