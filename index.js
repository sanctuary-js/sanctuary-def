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
//. The next step is to define a `def` function for the environment:
//.
//. ```javascript
//. const def = $.create ({checkTypes: true, env});
//. ```
//.
//. The `checkTypes` option determines whether type checking is enabled.
//. This allows one to only pay the performance cost of run-time type checking
//. during development. For example:
//.
//. ```javascript
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
//. def ('add')
//.     ({})
//.     ([$.Number, $.Number, $.Number])
//.     (x => y => x + y);
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

(function(f) {

  'use strict';

  var util = {inspect: {}};

  /* istanbul ignore else */
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = f (require ('util'),
                        require ('sanctuary-either'),
                        require ('sanctuary-show'),
                        require ('sanctuary-type-classes'),
                        require ('sanctuary-type-identifiers'));
  } else if (typeof define === 'function' && define.amd != null) {
    define (['sanctuary-either',
             'sanctuary-show',
             'sanctuary-type-classes',
             'sanctuary-type-identifiers'],
            function(Either, show, Z, type) {
              return f (util, Either, show, Z, type);
            });
  } else {
    self.sanctuaryDef = f (util,
                           self.sanctuaryEither,
                           self.sanctuaryShow,
                           self.sanctuaryTypeClasses,
                           self.sanctuaryTypeIdentifiers);
  }

} (function(util, Either, show, Z, type) {

  'use strict';

  var MAX_SAFE_INTEGER = Math.pow (2, 53) - 1;
  var MIN_SAFE_INTEGER = -MAX_SAFE_INTEGER;

  var slice             = Array.prototype.slice;
  var hasOwnProperty    = Object.prototype.hasOwnProperty;
  var toString          = Object.prototype.toString;

  var inspect = typeof util.inspect.custom === 'symbol' ?
                util.inspect.custom :
                /* istanbul ignore next */ 'inspect';

  //  Left :: a -> Either a b
  var Left = Either.Left;

  //  Right :: b -> Either a b
  var Right = Either.Right;

  //  B :: (b -> c) -> (a -> b) -> a -> c
  function B(f) {
    return function(g) {
      return function(x) {
        return f (g (x));
      };
    };
  }

  //  I :: a -> a
  function I(x) { return x; }

  //  K :: a -> b -> a
  function K(x) { return function(y) { return x; }; }

  //  always0 :: a -> () -> a
  function always0(x) { return function() { return x; }; }

  //  always2 :: a -> (b, c) -> a
  function always2(x) { return function(y, z) { return x; }; }

  //  complement :: (a -> Boolean) -> a -> Boolean
  function complement(pred) { return function(x) { return !(pred (x)); }; }

  //  filter :: Filterable f => (a -> Boolean) -> f a -> f a
  function filter(pred) {
    return function(xs) {
      return Z.filter (pred, xs);
    };
  }

  //  init :: Array a -> Array a
  function init(xs) { return xs.slice (0, -1); }

  //  isEmpty :: Foldable f => f a -> Boolean
  function isEmpty(xs) { return Z.size (xs) === 0; }

  //  isPrefix :: Array a -> Array a -> Boolean
  function isPrefix(candidate) {
    return function(xs) {
      if (candidate.length > xs.length) return false;
      for (var idx = 0; idx < candidate.length; idx += 1) {
        if (candidate[idx] !== xs[idx]) return false;
      }
      return true;
    };
  }

  //  joinWith :: (String, Array String) -> String
  function joinWith(separator, ss) {
    return ss.join (separator);
  }

  //  last :: Array a -> a
  function last(xs) { return xs[xs.length - 1]; }

  //  memberOf :: Array a -> a -> Boolean
  function memberOf(xs) {
    return function(y) {
      return xs.some (function(x) { return Z.equals (x, y); });
    };
  }

  //  or :: (Array a, Array a) -> Array a
  function or(xs, ys) { return isEmpty (xs) ? ys : xs; }

  //  prop :: String -> {} -> a
  function prop(field) { return function(record) { return record[field]; }; }

  //  sizeEq :: Foldable f => Integer -> f a -> Boolean
  function sizeEq(n) { return function(xs) { return Z.size (xs) === n; }; }

  //  strRepeat :: (String, Integer) -> String
  function strRepeat(s, times) {
    return joinWith (s, Array (times + 1));
  }

  //  r :: Char -> String -> String
  function r(c) {
    return function(s) {
      return strRepeat (c, s.length);
    };
  }

  //  _ :: String -> String
  var _ = r (' ');

  //  sortedKeys :: Object -> Array String
  function sortedKeys(o) {
    return (Object.keys (o)).sort ();
  }

  //  toArray :: Foldable f => f a -> Array a
  function toArray(foldable) {
    return Array.isArray (foldable) ?
           foldable :
           Z.reduce (function(xs, x) { xs.push (x); return xs; },
                     [],
                     foldable);
  }

  //  toMarkdownList :: (String, String, a -> String, Array a) -> String
  function toMarkdownList(empty, s, f, xs) {
    return isEmpty (xs) ?
      empty :
      Z.reduce (function(s, x) { return s + '  - ' + f (x) + '\n'; }, s, xs);
  }

  //  trimTrailingSpaces :: String -> String
  function trimTrailingSpaces(s) {
    return s.replace (/[ ]+$/gm, '');
  }

  //  when :: Boolean -> (a -> a) -> a -> a
  function when(bool) {
    return function(f) {
      return function(x) {
        return bool ? f (x) : x;
      };
    };
  }

  //  wrap :: String -> String -> String -> String
  function wrap(prefix) {
    return function(suffix) {
      return function(s) {
        return prefix + s + suffix;
      };
    };
  }

  //  parenthesize :: (String -> String) -> String -> String
  function parenthesize(f) { return wrap (f ('(')) (f (')')); }

  //  q :: String -> String
  var q = wrap ('\u2018') ('\u2019');

  //  stripNamespace :: TypeClass -> String
  function stripNamespace(typeClass) {
    return typeClass.name.slice (typeClass.name.indexOf ('/') + 1);
  }

  function _test(env) {
    return function(x) {
      return function recur(t) {
        return t.supertypes.every (recur) && t._test (env) (x);
      };
    };
  }

  var Type$prototype = {
    'constructor': {'@@type': 'sanctuary-def/Type@1'},
    'validate': function(env) {
      var test2 = _test (env);
      var type = this;
      return function(x) {
        if (!(test2 (x) (type))) return Left ({value: x, propPath: []});
        for (var idx = 0; idx < type.keys.length; idx += 1) {
          var k = type.keys[idx];
          var t = type.types[k];
          var ys = type.extractors[k] (x);
          for (var idx2 = 0; idx2 < ys.length; idx2 += 1) {
            var result = t.validate (env) (ys[idx2]);
            if (result.isLeft) {
              return Left ({value: result.value.value,
                            propPath: Z.concat ([k], result.value.propPath)});
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
        Z.equals (this.keys, other.keys) &&
        Z.equals (this.types, other.types)
      );
    },
    '@@show': function() {
      return this.format (I, K (I));
    }
  };

  //  _Type :: ... -> Type
  function _Type(
    type,       // :: String
    name,       // :: String
    url,        // :: String
    arity,      // :: NonNegativeInteger
    format,
    // :: Nullable ((String -> String, String -> String -> String) -> String)
    supertypes, // :: Array Type
    test,       // :: Any -> Boolean
    tuples      // :: Array (Array3 String (a -> Array b) Type)
  ) {
    var t = Object.create (Type$prototype);
    t._test = test;
    t._extractors = tuples.reduce (function(_extractors, tuple) {
      _extractors[tuple[0]] = tuple[1];
      return _extractors;
    }, {});
    t.arity = arity;  // number of type parameters
    t.extractors = Z.map (B (toArray), t._extractors);
    t.format = format || function(outer, inner) {
      return Z.reduce (function(s, tuple) {
        return s +
               outer (' ') +
               when (tuple[2].arity > 0)
                    (parenthesize (outer))
                    (inner (tuple[0]) (show (tuple[2])));
      }, outer (name), tuples);
    };
    t.keys = tuples.map (function(tuple) { return tuple[0]; });
    t.name = name;
    t.supertypes = supertypes;
    t.type = type;
    t.types = tuples.reduce (function(types, tuple) {
      types[tuple[0]] = tuple[2];
      return types;
    }, {});
    t.url = url;
    return t;
  }

  var BINARY        = 'BINARY';
  var FUNCTION      = 'FUNCTION';
  var INCONSISTENT  = 'INCONSISTENT';
  var NO_ARGUMENTS  = 'NO_ARGUMENTS';
  var NULLARY       = 'NULLARY';
  var RECORD        = 'RECORD';
  var UNARY         = 'UNARY';
  var UNKNOWN       = 'UNKNOWN';
  var VARIABLE      = 'VARIABLE';

  //  Inconsistent :: Type
  var Inconsistent =
  _Type (INCONSISTENT, '', '', 0, always2 ('???'), [], K (K (false)), []);

  //  NoArguments :: Type
  var NoArguments =
  _Type (NO_ARGUMENTS, '', '', 0, always2 ('()'), [], K (K (true)), []);

  //  arityGte :: NonNegativeInteger -> Type -> Boolean
  function arityGte(n) {
    return function(t) {
      return t.arity >= n;
    };
  }

  //  typeEq :: String -> a -> Boolean
  function typeEq(name) {
    return function(x) {
      return type (x) === name;
    };
  }

  //  typeofEq :: String -> a -> Boolean
  function typeofEq(typeof_) {
    return function(x) {
      // eslint-disable-next-line valid-typeof
      return typeof x === typeof_;
    };
  }

  //  functionUrl :: String -> String
  function functionUrl(name) {
    var version = '0.20.1';  // updated programmatically
    return 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version +
           '#' + name;
  }

  var NullaryTypeWithUrl = Z.ap (NullaryType, functionUrl);
  var UnaryTypeWithUrl = Z.ap (UnaryType, functionUrl);
  var BinaryTypeWithUrl = Z.ap (BinaryType, functionUrl);

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
  var Unknown =
  _Type (UNKNOWN, '', '', 0, always2 ('Unknown'), [], K (K (true)), []);

  //# Any :: Type
  //.
  //. Type comprising every JavaScript value.
  var Any = NullaryTypeWithUrl
    ('Any')
    ([])
    (K (true));

  //# AnyFunction :: Type
  //.
  //. Type comprising every Function value.
  var AnyFunction = NullaryTypeWithUrl
    ('Function')
    ([])
    (typeofEq ('function'));

  //# Arguments :: Type
  //.
  //. Type comprising every [`arguments`][arguments] object.
  var Arguments = NullaryTypeWithUrl
    ('Arguments')
    ([])
    (typeEq ('Arguments'));

  //# Array :: Type -> Type
  //.
  //. Constructor for homogeneous Array types.
  var Array_ = UnaryTypeWithUrl
    ('Array')
    ([])
    (typeEq ('Array'))
    (I);

  //# Array0 :: Type
  //.
  //. Type whose sole member is `[]`.
  var Array0 = NullaryTypeWithUrl
    ('Array0')
    ([Array_ (Unknown)])
    (sizeEq (0));

  //# Array1 :: Type -> Type
  //.
  //. Constructor for singleton Array types.
  var Array1 = UnaryTypeWithUrl
    ('Array1')
    ([Array_ (Unknown)])
    (sizeEq (1))
    (I);

  //# Array2 :: Type -> Type -> Type
  //.
  //. Constructor for heterogeneous Array types of length 2. `['foo', true]` is
  //. a member of `Array2 String Boolean`.
  var Array2 = BinaryTypeWithUrl
    ('Array2')
    ([Array_ (Unknown)])
    (sizeEq (2))
    (function(array2) { return [array2[0]]; })
    (function(array2) { return [array2[1]]; });

  //# Boolean :: Type
  //.
  //. Type comprising `true` and `false`.
  var Boolean_ = NullaryTypeWithUrl
    ('Boolean')
    ([])
    (typeofEq ('boolean'));

  //# Date :: Type
  //.
  //. Type comprising every Date value.
  var Date_ = NullaryTypeWithUrl
    ('Date')
    ([])
    (typeEq ('Date'));

  //# ValidDate :: Type
  //.
  //. Type comprising every [`Date`][] value except `new Date (NaN)`.
  var ValidDate = NullaryTypeWithUrl
    ('ValidDate')
    ([Date_])
    (B (complement (isNaN)) (Number));

  //# Descending :: Type -> Type
  //.
  //. [Descending][] type constructor.
  var Descending = UnaryTypeWithUrl
    ('Descending')
    ([])
    (typeEq ('sanctuary-descending/Descending@1'))
    (I);

  //# Either :: Type -> Type -> Type
  //.
  //. [Either][] type constructor.
  var Either_ = BinaryTypeWithUrl
    ('Either')
    ([])
    (typeEq ('sanctuary-either/Either@1'))
    (function(either) { return either.isLeft ? [either.value] : []; })
    (function(either) { return either.isLeft ? [] : [either.value]; });

  //# Error :: Type
  //.
  //. Type comprising every Error value, including values of more specific
  //. constructors such as [`SyntaxError`][] and [`TypeError`][].
  var Error_ = NullaryTypeWithUrl
    ('Error')
    ([])
    (typeEq ('Error'));

  //# Fn :: Type -> Type -> Type
  //.
  //. Binary type constructor for unary function types. `$.Fn (I) (O)`
  //. represents `I -> O`, the type of functions that take a value of
  //. type `I` and return a value of type `O`.
  function Fn($1) { return function($2) { return Function_ ([$1, $2]); }; }

  //# Function :: NonEmpty (Array Type) -> Type
  //.
  //. Constructor for Function types.
  //.
  //. Examples:
  //.
  //.   - `$.Function ([$.Date, $.String])` represents the `Date -> String`
  //.     type; and
  //.   - `$.Function ([a, b, a])` represents the `(a, b) -> a` type.
  function Function_(types) {
    var tuples = Z.reduce (function(tuples, t) {
      tuples.push (['$' + show (tuples.length + 1), K ([]), t]);
      return tuples;
    }, [], types);

    function format(outer, inner) {
      return when (tuples.length !== 2)
                  (parenthesize (outer))
                  (joinWith (outer (', '),
                             Z.map (function(tuple) {
                               return when (tuple[2].type === FUNCTION)
                                           (parenthesize (outer))
                                           (inner (tuple[0])
                                                  (show (tuple[2])));
                             }, init (tuples)))) +
             outer (' -> ') +
             inner ((last (tuples))[0])
                   (show ((last (tuples))[2]));
    }

    return _Type (FUNCTION,
                  '',
                  '',
                  types.length,
                  format,
                  [AnyFunction],
                  K (K (true)),
                  tuples);
  }

  //# HtmlElement :: Type
  //.
  //. Type comprising every [HTML element][].
  var HtmlElement = NullaryTypeWithUrl
    ('HtmlElement')
    ([])
    (function(x) {
       return /^\[object HTML.+Element\]$/.test (toString.call (x));
     });

  //# Identity :: Type -> Type
  //.
  //. [Identity][] type constructor.
  var Identity = UnaryTypeWithUrl
    ('Identity')
    ([])
    (typeEq ('sanctuary-identity/Identity@1'))
    (I);

  //# Maybe :: Type -> Type
  //.
  //. [Maybe][] type constructor.
  var Maybe = UnaryTypeWithUrl
    ('Maybe')
    ([])
    (typeEq ('sanctuary-maybe/Maybe@1'))
    (I);

  //# NonEmpty :: Type -> Type
  //.
  //. Constructor for non-empty types. `$.NonEmpty ($.String)`, for example, is
  //. the type comprising every [`String`][] value except `''`.
  //.
  //. The given type must satisfy the [Monoid][] and [Setoid][] specifications.
  var NonEmpty = UnaryTypeWithUrl
    ('NonEmpty')
    ([])
    (function(x) {
       return Z.Monoid.test (x) &&
              Z.Setoid.test (x) &&
              !(Z.equals (x, Z.empty (x.constructor)));
     })
    (function(monoid) { return [monoid]; });

  //# Null :: Type
  //.
  //. Type whose sole member is `null`.
  var Null = NullaryTypeWithUrl
    ('Null')
    ([])
    (typeEq ('Null'));

  //# Nullable :: Type -> Type
  //.
  //. Constructor for types that include `null` as a member.
  var Nullable = UnaryTypeWithUrl
    ('Nullable')
    ([])
    (K (true))
    (function(nullable) {
       // eslint-disable-next-line eqeqeq
       return nullable === null ? [] : [nullable];
     });

  //# Number :: Type
  //.
  //. Type comprising every primitive Number value (including `NaN`).
  var Number_ = NullaryTypeWithUrl
    ('Number')
    ([])
    (typeofEq ('number'));

  function nonZero(x) { return x !== 0; }
  function nonNegative(x) { return x >= 0; }
  function positive(x) { return x > 0; }
  function negative(x) { return x < 0; }

  //# PositiveNumber :: Type
  //.
  //. Type comprising every [`Number`][] value greater than zero.
  var PositiveNumber = NullaryTypeWithUrl
    ('PositiveNumber')
    ([Number_])
    (positive);

  //# NegativeNumber :: Type
  //.
  //. Type comprising every [`Number`][] value less than zero.
  var NegativeNumber = NullaryTypeWithUrl
    ('NegativeNumber')
    ([Number_])
    (negative);

  //# ValidNumber :: Type
  //.
  //. Type comprising every [`Number`][] value except `NaN`.
  var ValidNumber = NullaryTypeWithUrl
    ('ValidNumber')
    ([Number_])
    (complement (isNaN));

  //# NonZeroValidNumber :: Type
  //.
  //. Type comprising every [`ValidNumber`][] value except `0` and `-0`.
  var NonZeroValidNumber = NullaryTypeWithUrl
    ('NonZeroValidNumber')
    ([ValidNumber])
    (nonZero);

  //# FiniteNumber :: Type
  //.
  //. Type comprising every [`ValidNumber`][] value except `Infinity` and
  //. `-Infinity`.
  var FiniteNumber = NullaryTypeWithUrl
    ('FiniteNumber')
    ([ValidNumber])
    (isFinite);

  //# NonZeroFiniteNumber :: Type
  //.
  //. Type comprising every [`FiniteNumber`][] value except `0` and `-0`.
  var NonZeroFiniteNumber = NullaryTypeWithUrl
    ('NonZeroFiniteNumber')
    ([FiniteNumber])
    (nonZero);

  //# PositiveFiniteNumber :: Type
  //.
  //. Type comprising every [`FiniteNumber`][] value greater than zero.
  var PositiveFiniteNumber = NullaryTypeWithUrl
    ('PositiveFiniteNumber')
    ([FiniteNumber])
    (positive);

  //# NegativeFiniteNumber :: Type
  //.
  //. Type comprising every [`FiniteNumber`][] value less than zero.
  var NegativeFiniteNumber = NullaryTypeWithUrl
    ('NegativeFiniteNumber')
    ([FiniteNumber])
    (negative);

  //# Integer :: Type
  //.
  //. Type comprising every integer in the range
  //. [[`Number.MIN_SAFE_INTEGER`][min] .. [`Number.MAX_SAFE_INTEGER`][max]].
  var Integer = NullaryTypeWithUrl
    ('Integer')
    ([ValidNumber])
    (function(x) {
       return Math.floor (x) === x &&
              x >= MIN_SAFE_INTEGER &&
              x <= MAX_SAFE_INTEGER;
     });

  //# NonZeroInteger :: Type
  //.
  //. Type comprising every [`Integer`][] value except `0` and `-0`.
  var NonZeroInteger = NullaryTypeWithUrl
    ('NonZeroInteger')
    ([Integer])
    (nonZero);

  //# NonNegativeInteger :: Type
  //.
  //. Type comprising every non-negative [`Integer`][] value (including `-0`).
  //. Also known as the set of natural numbers under ISO 80000-2:2009.
  var NonNegativeInteger = NullaryTypeWithUrl
    ('NonNegativeInteger')
    ([Integer])
    (nonNegative);

  //# PositiveInteger :: Type
  //.
  //. Type comprising every [`Integer`][] value greater than zero.
  var PositiveInteger = NullaryTypeWithUrl
    ('PositiveInteger')
    ([Integer])
    (positive);

  //# NegativeInteger :: Type
  //.
  //. Type comprising every [`Integer`][] value less than zero.
  var NegativeInteger = NullaryTypeWithUrl
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
  var Object_ = NullaryTypeWithUrl
    ('Object')
    ([])
    (typeEq ('Object'));

  //# Pair :: Type -> Type -> Type
  //.
  //. [Pair][] type constructor.
  var Pair = BinaryTypeWithUrl
    ('Pair')
    ([])
    (typeEq ('sanctuary-pair/Pair@1'))
    (function(pair) { return [pair.fst]; })
    (function(pair) { return [pair.snd]; });

  //# RegExp :: Type
  //.
  //. Type comprising every RegExp value.
  var RegExp_ = NullaryTypeWithUrl
    ('RegExp')
    ([])
    (typeEq ('RegExp'));

  //# GlobalRegExp :: Type
  //.
  //. Type comprising every [`RegExp`][] value whose `global` flag is `true`.
  //.
  //. See also [`NonGlobalRegExp`][].
  var GlobalRegExp = NullaryTypeWithUrl
    ('GlobalRegExp')
    ([RegExp_])
    (prop ('global'));

  //# NonGlobalRegExp :: Type
  //.
  //. Type comprising every [`RegExp`][] value whose `global` flag is `false`.
  //.
  //. See also [`GlobalRegExp`][].
  var NonGlobalRegExp = NullaryTypeWithUrl
    ('NonGlobalRegExp')
    ([RegExp_])
    (complement (prop ('global')));

  //# StrMap :: Type -> Type
  //.
  //. Constructor for homogeneous Object types.
  //.
  //. `{foo: 1, bar: 2, baz: 3}`, for example, is a member of `StrMap Number`;
  //. `{foo: 1, bar: 2, baz: 'XXX'}` is not.
  var StrMap = UnaryTypeWithUrl
    ('StrMap')
    ([Object_])
    (K (true))
    (I);

  //# String :: Type
  //.
  //. Type comprising every primitive String value.
  var String_ = NullaryTypeWithUrl
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
  var RegexFlags = NullaryTypeWithUrl
    ('RegexFlags')
    ([String_])
    (function(s) { return /^g?i?m?$/.test (s); });

  //# Symbol :: Type
  //.
  //. Type comprising every Symbol value.
  var Symbol_ = NullaryTypeWithUrl
    ('Symbol')
    ([])
    (typeofEq ('symbol'));

  //# Type :: Type
  //.
  //. Type comprising every `Type` value.
  var Type = NullaryTypeWithUrl
    ('Type')
    ([])
    (typeEq ('sanctuary-def/Type@1'));

  //# TypeClass :: Type
  //.
  //. Type comprising every [`TypeClass`][] value.
  var TypeClass = NullaryTypeWithUrl
    ('TypeClass')
    ([])
    (typeEq ('sanctuary-type-classes/TypeClass@1'));

  //# Undefined :: Type
  //.
  //. Type whose sole member is `undefined`.
  var Undefined = NullaryTypeWithUrl
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
  //.   - <code>[Boolean](#Boolean)</code>
  //.   - <code>[Date](#Date)</code>
  //.   - <code>[Descending](#Descending) ([Unknown][])</code>
  //.   - <code>[Either](#Either) ([Unknown][]) ([Unknown][])</code>
  //.   - <code>[Error](#Error)</code>
  //.   - <code>[Fn](#Fn) ([Unknown][]) ([Unknown][])</code>
  //.   - <code>[HtmlElement](#HtmlElement)</code>
  //.   - <code>[Identity](#Identity) ([Unknown][])</code>
  //.   - <code>[Maybe](#Maybe) ([Unknown][])</code>
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
  var env = [
    AnyFunction,
    Arguments,
    Array_ (Unknown),
    Array2 (Unknown) (Unknown),
    Boolean_,
    Date_,
    Descending (Unknown),
    Either_ (Unknown) (Unknown),
    Error_,
    Fn (Unknown) (Unknown),
    HtmlElement,
    Identity (Unknown),
    Maybe (Unknown),
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
    Undefined
  ];

  //  Unchecked :: String -> Type
  function Unchecked(s) { return NullaryType (s) ('') ([]) (K (true)); }

  //  production :: Boolean
  var production =
    typeof process !== 'undefined' &&
    /* global process:false */
    process != null &&
    process.env != null &&
    process.env.NODE_ENV === 'production';

  //  numbers :: Array String
  var numbers = [
    'zero',
    'one',
    'two',
    'three',
    'four',
    'five',
    'six',
    'seven',
    'eight',
    'nine'
  ];

  //  numArgs :: Integer -> String
  function numArgs(n) {
    return (n < numbers.length ? numbers[n] : show (n)) + ' ' +
           (n === 1 ? 'argument' : 'arguments');
  }

  //  expandUnknown
  //  :: Array Type
  //  -> Array Object
  //  -> Any
  //  -> (a -> Array b)
  //  -> Type
  //  -> Array Type
  function expandUnknown(env) {
    return function(seen) {
      return function(value) {
        return function(extractor) {
          return function(type) {
            return type.type === UNKNOWN ?
                   _determineActualTypes (env, seen, extractor (value)) :
                   [type];
          };
        };
      };
    };
  }

  //  _determineActualTypes :: ... -> Array Type
  function _determineActualTypes(
    env,            // :: Array Type
    seen,           // :: Array Object
    values          // :: Array Any
  ) {
    var expandUnknown4 = expandUnknown (env);

    function refine(types, value) {
      var seen$;
      if (typeof value === 'object' && value != null ||
          typeof value === 'function') {
        //  Abort if a circular reference is encountered; add the current
        //  object to the array of seen objects otherwise.
        if (seen.indexOf (value) >= 0) return [];
        seen$ = Z.concat (seen, [value]);
      } else {
        seen$ = seen;
      }
      var expandUnknown2 = expandUnknown4 (seen$) (value);
      return Z.chain (function(t) {
        return (
          (t.validate (env) (value)).isLeft ?
            [] :
          t.type === UNARY ?
            Z.map (fromUnaryType (t),
                   expandUnknown2 (t.extractors.$1) (t.types.$1)) :
          t.type === BINARY ?
            Z.lift2 (fromBinaryType (t),
                     expandUnknown2 (t.extractors.$1) (t.types.$1),
                     expandUnknown2 (t.extractors.$2) (t.types.$2)) :
          // else
            [t]
        );
      }, types);
    }

    return isEmpty (values) ?
      [Unknown] :
      or (Z.reduce (refine, env, values), [Inconsistent]);
  }

  //  isConsistent :: Type -> Boolean
  function isConsistent(t) {
    return t.type === UNARY   ? isConsistent (t.types.$1) :
           t.type === BINARY  ? isConsistent (t.types.$1) &&
                                isConsistent (t.types.$2) :
           /* else */           t.type !== INCONSISTENT;
  }

  //  determineActualTypesStrict :: (Array Type, Array Any) -> Array Type
  function determineActualTypesStrict(env, values) {
    return Z.filter (isConsistent,
                     _determineActualTypes (env, [], values));
  }

  //  determineActualTypesLoose :: (Array Type, Array Any) -> Array Type
  function determineActualTypesLoose(env, values) {
    return Z.reject (function(t) { return t.type === INCONSISTENT; },
                     _determineActualTypes (env, [], values));
  }

  //  TypeInfo = { name :: String
  //             , constraints :: StrMap (Array TypeClass)
  //             , types :: NonEmpty (Array Type) }
  //
  //  TypeVarMap = StrMap { types :: Array Type
  //                      , valuesByPath :: StrMap (Array Any) }
  //
  //  PropPath = Array (Number | String)

  //  updateTypeVarMap :: ... -> TypeVarMap
  function updateTypeVarMap(
    env,            // :: Array Type
    typeVarMap,     // :: TypeVarMap
    typeVar,        // :: Type
    index,          // :: Integer
    propPath,       // :: PropPath
    values          // :: Array Any
  ) {
    var $typeVarMap = {};
    for (var typeVarName in typeVarMap) {
      var entry = typeVarMap[typeVarName];
      var $entry = {types: entry.types.slice (), valuesByPath: {}};
      for (var k in entry.valuesByPath) {
        $entry.valuesByPath[k] = entry.valuesByPath[k].slice ();
      }
      $typeVarMap[typeVarName] = $entry;
    }
    if (!(hasOwnProperty.call ($typeVarMap, typeVar.name))) {
      $typeVarMap[typeVar.name] = {
        types: Z.filter (arityGte (typeVar.arity), env),
        valuesByPath: {}
      };
    }

    var key = JSON.stringify (Z.concat ([index], propPath));
    if (!(hasOwnProperty.call ($typeVarMap[typeVar.name].valuesByPath, key))) {
      $typeVarMap[typeVar.name].valuesByPath[key] = [];
    }

    var isValid = test (env);

    var expandUnknownStrict = B (B (B (filter (isConsistent))))
                                (expandUnknown (env) ([]));

    values.forEach (function(value) {
      var expandUnknownStrict2 = expandUnknownStrict (value);
      $typeVarMap[typeVar.name].valuesByPath[key].push (value);
      $typeVarMap[typeVar.name].types = Z.chain (function(t) {
        return (
          !(isValid (t) (value)) ?
            [] :
          typeVar.arity === 0 && t.type === UNARY ?
            Z.map (fromUnaryType (t),
                   expandUnknownStrict2 (t.extractors.$1) (t.types.$1)) :
          typeVar.arity === 0 && t.type === BINARY ?
            Z.lift2 (fromBinaryType (t),
                     expandUnknownStrict2 (t.extractors.$1) (t.types.$1),
                     expandUnknownStrict2 (t.extractors.$2) (t.types.$2)) :
          // else
            [t]
        );
      }, $typeVarMap[typeVar.name].types);
    });

    return $typeVarMap;
  }

  //  underlineTypeVars :: (TypeInfo, StrMap (Array Any)) -> String
  function underlineTypeVars(typeInfo, valuesByPath) {
    //  Note: Sorting these keys lexicographically is not "correct", but it
    //  does the right thing for indexes less than 10.
    var paths = Z.map (JSON.parse, sortedKeys (valuesByPath));
    return underline (
      typeInfo,
      K (K (_)),
      function(index) {
        return function(f) {
          return function(t) {
            return function(propPath) {
              var indexedPropPath = Z.concat ([index], propPath);
              return function(s) {
                if (paths.some (isPrefix (indexedPropPath))) {
                  var key = JSON.stringify (indexedPropPath);
                  if (!(hasOwnProperty.call (valuesByPath, key))) return s;
                  if (!(isEmpty (valuesByPath[key]))) return f (s);
                }
                return _ (s);
              };
            };
          };
        };
      }
    );
  }

  //  satisfactoryTypes :: ... -> Either (() -> Error)
  //                                     { typeVarMap :: TypeVarMap
  //                                     , types :: Array Type }
  function satisfactoryTypes(
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    typeVarMap,     // :: TypeVarMap
    expType,        // :: Type
    index,          // :: Integer
    propPath,       // :: PropPath
    values          // :: Array Any
  ) {
    var recur = satisfactoryTypes;

    for (var idx = 0; idx < values.length; idx += 1) {
      var result = expType.validate (env) (values[idx]);
      if (result.isLeft) {
        return Left (function() {
          return invalidValue (env,
                               typeInfo,
                               index,
                               Z.concat (propPath, result.value.propPath),
                               result.value.value);
        });
      }
    }

    switch (expType.type) {

      case VARIABLE:
        var typeVarName = expType.name;
        var constraints = typeInfo.constraints;
        if (hasOwnProperty.call (constraints, typeVarName)) {
          var typeClasses = constraints[typeVarName];
          for (idx = 0; idx < values.length; idx += 1) {
            for (var idx2 = 0; idx2 < typeClasses.length; idx2 += 1) {
              if (!(typeClasses[idx2].test (values[idx]))) {
                return Left (function() {
                  return typeClassConstraintViolation (
                    env,
                    typeInfo,
                    typeClasses[idx2],
                    index,
                    propPath,
                    values[idx],
                    typeVarMap
                  );
                });
              }
            }
          }
        }

        var typeVarMap$ = updateTypeVarMap (env,
                                            typeVarMap,
                                            expType,
                                            index,
                                            propPath,
                                            values);

        var okTypes = typeVarMap$[typeVarName].types;
        return isEmpty (okTypes) ?
          Left (function() {
            return typeVarConstraintViolation (
              env,
              typeInfo,
              index,
              propPath,
              typeVarMap$[typeVarName].valuesByPath
            );
          }) :
          Z.reduce (function(e, t) {
            return Z.chain (function(r) {
              //  The `a` in `Functor f => f a` corresponds to the `a`
              //  in `Maybe a` but to the `b` in `Either a b`. A type
              //  variable's $1 will correspond to either $1 or $2 of
              //  the actual type depending on the actual type's arity.
              var offset = t.arity - expType.arity;
              return expType.keys.reduce (function(e, k, idx) {
                var extractor = t.extractors[t.keys[offset + idx]];
                return Z.reduce (function(e, x) {
                  return Z.chain (function(r) {
                    return recur (env,
                                  typeInfo,
                                  r.typeVarMap,
                                  expType.types[k],
                                  index,
                                  Z.concat (propPath, [k]),
                                  [x]);
                  }, e);
                }, e, Z.chain (extractor, values));
              }, Right (r));
            }, e);
          }, Right ({typeVarMap: typeVarMap$, types: okTypes}), okTypes);

      case UNARY:
        return Z.map (
          function(result) {
            return {
              typeVarMap: result.typeVarMap,
              types: Z.map (fromUnaryType (expType),
                            or (result.types, [expType.types.$1]))
            };
          },
          recur (env,
                 typeInfo,
                 typeVarMap,
                 expType.types.$1,
                 index,
                 Z.concat (propPath, ['$1']),
                 Z.chain (expType.extractors.$1, values))
        );

      case BINARY:
        return Z.chain (
          function(result) {
            var $1s = result.types;
            return Z.map (
              function(result) {
                var $2s = result.types;
                return {
                  typeVarMap: result.typeVarMap,
                  types: Z.lift2 (fromBinaryType (expType),
                                  or ($1s, [expType.types.$1]),
                                  or ($2s, [expType.types.$2]))
                };
              },
              recur (env,
                     typeInfo,
                     result.typeVarMap,
                     expType.types.$2,
                     index,
                     Z.concat (propPath, ['$2']),
                     Z.chain (expType.extractors.$2, values))
            );
          },
          recur (env,
                 typeInfo,
                 typeVarMap,
                 expType.types.$1,
                 index,
                 Z.concat (propPath, ['$1']),
                 Z.chain (expType.extractors.$1, values))
        );

      case RECORD:
        return Z.reduce (function(e, k) {
          return Z.chain (function(r) {
            return recur (env,
                          typeInfo,
                          r.typeVarMap,
                          expType.types[k],
                          index,
                          Z.concat (propPath, [k]),
                          Z.chain (expType.extractors[k], values));
          }, e);
        }, Right ({typeVarMap: typeVarMap, types: [expType]}), expType.keys);

      default:
        return Right ({typeVarMap: typeVarMap, types: [expType]});
    }
  }

  //# test :: Array Type -> Type -> a -> Boolean
  //.
  //. Takes an environment, a type, and any value. Returns `true` if the value
  //. is a member of the type; `false` otherwise.
  //.
  //. The environment is only significant if the type contains
  //. [type variables][].
  function test(env) {
    return function(t) {
      return function(x) {
        var typeInfo = {name: 'name', constraints: {}, types: [t]};
        return (satisfactoryTypes (env, typeInfo, {}, t, 0, [], [x])).isRight;
      };
    };
  }

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
    return function(url) {
      return function(supertypes) {
        return function(test) {
          return _Type (NULLARY, name, url, 0, null, supertypes, K (test), []);
        };
      };
    };
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
  //. //    MaybeTypeRep :: TypeRep Maybe
  //. const MaybeTypeRep = {'@@type': 'my-package/Maybe'};
  //.
  //. //    Maybe :: Type -> Type
  //. const Maybe = $.UnaryType
  //.   ('Maybe')
  //.   ('http://example.com/my-package#Maybe')
  //.   ([])
  //.   (x => type (x) === MaybeTypeRep['@@type'])
  //.   (maybe => maybe.isJust ? [maybe.value] : []);
  //.
  //. //    Nothing :: Maybe a
  //. const Nothing = {
  //.   'constructor': MaybeTypeRep,
  //.   'isJust': false,
  //.   'isNothing': true,
  //.   '@@show': () => 'Nothing',
  //. };
  //.
  //. //    Just :: a -> Maybe a
  //. const Just = x => ({
  //.   'constructor': MaybeTypeRep,
  //.   'isJust': true,
  //.   'isNothing': false,
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
    return function(url) {
      return function(supertypes) {
        return function(test) {
          return function(_1) {
            return function($1) {
              return _Type (UNARY,
                            name,
                            url,
                            1,
                            null,
                            supertypes,
                            K (test),
                            [['$1', _1, $1]]);
            };
          };
        };
      };
    };
  }

  //  fromUnaryType :: Type -> Type -> Type
  function fromUnaryType(t) {
    return UnaryType (t.name)
                     (t.url)
                     (t.supertypes)
                     (t._test ([]))
                     (t._extractors.$1);
  }

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
  //. //    PairTypeRep :: TypeRep Pair
  //. const PairTypeRep = {'@@type': 'my-package/Pair'};
  //.
  //. //    $Pair :: Type -> Type -> Type
  //. const $Pair = $.BinaryType
  //.   ('Pair')
  //.   ('http://example.com/my-package#Pair')
  //.   ([])
  //.   (x => type (x) === PairTypeRep['@@type'])
  //.   (({fst}) => [fst])
  //.   (({snd}) => [snd]);
  //.
  //. //    Pair :: a -> b -> Pair a b
  //. const Pair =
  //. def ('Pair')
  //.     ({})
  //.     ([a, b, $Pair (a) (b)])
  //.     (fst => snd => ({
  //.        'constructor': PairTypeRep,
  //.        'fst': fst,
  //.        'snd': snd,
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
    return function(url) {
      return function(supertypes) {
        return function(test) {
          return function(_1) {
            return function(_2) {
              return function($1) {
                return function($2) {
                  return _Type (BINARY,
                                name,
                                url,
                                2,
                                null,
                                supertypes,
                                K (test),
                                [['$1', _1, $1],
                                 ['$2', _2, $2]]);
                };
              };
            };
          };
        };
      };
    };
  }

  //  fromBinaryType :: (Type -> Type -> Type) -> Type -> Type -> Type
  function fromBinaryType(t) {
    return BinaryType (t.name)
                      (t.url)
                      (t.supertypes)
                      (t._test ([]))
                      (t._extractors.$1)
                      (t._extractors.$2);
  }

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
    return function(url) {
      return B (NullaryType (name) (url) ([])) (memberOf);
    };
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
  function RecordType(fields) {
    var keys = sortedKeys (fields);

    function format(outer, inner) {
      if (isEmpty (keys)) return outer ('{}');
      var reprs = Z.map (function(k) {
        var t = fields[k];
        return outer (' ') +
               outer (/^(?!\d)[$\w]+$/.test (k) ? k : show (k)) +
               outer (' :: ') +
               inner (k) (show (t));
      }, keys);
      return wrap (outer ('{')) (outer (' }')) (joinWith (outer (','), reprs));
    }

    function test(env) {
      return function(x) {
        if (x == null) return false;
        var missing = {};
        keys.forEach (function(k) { missing[k] = k; });
        for (var k in x) delete missing[k];
        return isEmpty (missing);
      };
    }

    var tuples = keys.map (function(k) {
      return [k, function(x) { return [x[k]]; }, fields[k]];
    });

    return _Type (RECORD, '', '', 0, format, [], test, tuples);
  }

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
  function NamedRecordType(name) {
    return function(url) {
      return function(supertypes) {
        return function(fields) {
          var keys = sortedKeys (fields);

          function format(outer, inner) {
            return outer (name);
          }

          function test(env) {
            var test2 = _test (env);
            return function(x) {
              if (x == null) return false;
              var missing = {};
              keys.forEach (function(k) { missing[k] = k; });
              for (var k in x) delete missing[k];
              return isEmpty (missing) &&
                     keys.every (function(k) {
                       return test2 (x[k]) (fields[k]);
                     });
            };
          }

          var tuples = keys.map (function(k) {
            return [k, function(x) { return [x[k]]; }, fields[k]];
          });

          return _Type (RECORD,
                        name,
                        url,
                        0,
                        format,
                        supertypes,
                        test,
                        tuples);
        };
      };
    };
  }

  //  typeVarPred :: NonNegativeInteger -> Array Type -> Any -> Boolean
  function typeVarPred(arity) {
    var filter = arityGte (arity);
    return function(env) {
      var test2 = _test (env);
      return function(x) {
        var test1 = test2 (x);
        return env.some (function(t) { return filter (t) && test1 (t); });
      };
    };
  }

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
  function TypeVariable(name) {
    var tuples = [];
    var test = typeVarPred (tuples.length);
    return _Type (VARIABLE, name, '', 0, always2 (name), [], test, tuples);
  }

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
  function UnaryTypeVariable(name) {
    return function($1) {
      var tuples = [['$1', K ([]), $1]];
      var test = typeVarPred (tuples.length);
      return _Type (VARIABLE, name, '', 1, null, [], test, tuples);
    };
  }

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
  function BinaryTypeVariable(name) {
    return function($1) {
      return function($2) {
        var tuples = [['$1', K ([]), $1],
                      ['$2', K ([]), $2]];
        var test = typeVarPred (tuples.length);
        return _Type (VARIABLE, name, '', 2, null, [], test, tuples);
      };
    };
  }

  //# Thunk :: Type -> Type
  //.
  //. `$.Thunk (T)` is shorthand for `$.Function ([T])`, the type comprising
  //. every nullary function (thunk) that returns a value of type `T`.
  function Thunk(t) { return Function_ ([t]); }

  //# Predicate :: Type -> Type
  //.
  //. `$.Predicate (T)` is shorthand for `$.Fn (T) ($.Boolean)`, the type
  //. comprising every predicate function that takes a value of type `T`.
  function Predicate(t) { return Fn (t) (Boolean_); }

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
  function invalidArgumentsCount(typeInfo, index, numArgsExpected, args) {
    return new TypeError (trimTrailingSpaces (
      q (typeInfo.name) + ' applied to the wrong number of arguments\n\n' +
      underline (
        typeInfo,
        K (K (_)),
        function(index_) {
          return function(f) {
            return K (K (index_ === index ? f : _));
          };
        }
      ) + '\n' +
      'Expected ' + numArgs (numArgsExpected) +
      ' but received ' + numArgs (args.length) +
      toMarkdownList ('.\n', ':\n\n', show, args)
    ));
  }

  //  constraintsRepr :: ... -> String
  function constraintsRepr(
    constraints,    // :: StrMap (Array TypeClass)
    outer,          // :: String -> String
    inner           // :: String -> TypeClass -> String -> String
  ) {
    var $reprs = [];
    (sortedKeys (constraints)).forEach (function(k) {
      var f = inner (k);
      constraints[k].forEach (function(typeClass) {
        $reprs.push (f (typeClass) (stripNamespace (typeClass) + ' ' + k));
      });
    });
    return when ($reprs.length > 0)
                (wrap ('') (outer (' => ')))
                (when ($reprs.length > 1)
                      (parenthesize (outer))
                      (joinWith (outer (', '), $reprs)));
  }

  //  label :: String -> String -> String
  function label(label) {
    return function(s) {
      var delta = s.length - label.length;
      return strRepeat (' ', Math.floor (delta / 2)) + label +
             strRepeat (' ', Math.ceil (delta / 2));
    };
  }

  //  typeVarNames :: Type -> Array String
  function typeVarNames(t) {
    return Z.concat (
      t.type === VARIABLE ? [t.name] : [],
      Z.chain (function(k) { return typeVarNames (t.types[k]); }, t.keys)
    );
  }

  //  showTypeWith :: Array Type -> Type -> String
  function showTypeWith(types) {
    var names = Z.chain (typeVarNames, types);
    return function(t) {
      var code = 'a'.charCodeAt (0);
      return when (t.type === FUNCTION)
                  (parenthesize (I))
                  ((show (t)).replace (/\bUnknown\b/g, function() {
                     // eslint-disable-next-line no-plusplus
                     do var name = String.fromCharCode (code++);
                     while (names.indexOf (name) >= 0);
                     return name;
                   }));
    };
  }

  //  showValuesAndTypes :: ... -> String
  function showValuesAndTypes(
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    values,         // :: Array Any
    pos             // :: Integer
  ) {
    var showType = showTypeWith (typeInfo.types);
    return show (pos) + ')  ' + joinWith ('\n    ', Z.map (function(x) {
      return show (x) +
             ' :: ' +
             joinWith (', ',
                       or (Z.map (showType,
                                  determineActualTypesLoose (env, [x])),
                           ['(no types)']));
    }, values));
  }

  //  typeSignature :: TypeInfo -> String
  function typeSignature(typeInfo) {
    return typeInfo.name + ' :: ' +
           constraintsRepr (typeInfo.constraints, I, K (K (I))) +
           joinWith (' -> ',
                     Z.map (showTypeWith (typeInfo.types), typeInfo.types));
  }

  //  _underline :: ... -> String
  function _underline(
    t,              // :: Type
    propPath,       // :: PropPath
    formatType3     // :: Type -> Array String -> String -> String
  ) {
    return formatType3 (t) (propPath) (t.format (_, function(k) {
      return K (_underline (t.types[k],
                            Z.concat (propPath, [k]),
                            formatType3));
    }));
  }

  //  underline :: ... -> String
  function underline(
    typeInfo,               // :: TypeInfo
    underlineConstraint,    // :: String -> TypeClass -> String -> String
    formatType5
    // :: Integer -> (String -> String) -> Type -> PropPath -> String -> String
  ) {
    var st = typeInfo.types.reduce (function(st, t, index) {
      var f = B (when (t.type === FUNCTION)
                      (parenthesize (_)))
                (B (function(f) { return _underline (t, [], f); })
                   (formatType5 (index)));
      st.carets.push (f (r ('^')));
      st.numbers.push (f (function(s) {
        return label (show (st.counter += 1)) (s);
      }));
      return st;
    }, {carets: [], numbers: [], counter: 0});

    return typeSignature (typeInfo) + '\n' +
           _ (typeInfo.name + ' :: ') +
              constraintsRepr (typeInfo.constraints, _, underlineConstraint) +
              joinWith (_ (' -> '), st.carets) + '\n' +
           _ (typeInfo.name + ' :: ') +
              constraintsRepr (typeInfo.constraints, _, K (K (_))) +
              joinWith (_ (' -> '), st.numbers) + '\n';
  }

  //  resolvePropPath :: (Type, Array String) -> Type
  function resolvePropPath(t, propPath) {
    return Z.reduce (function(t, prop) { return t.types[prop]; },
                     t,
                     propPath);
  }

  //  formatType6 ::
  //    PropPath -> Integer -> (String -> String) ->
  //      Type -> PropPath -> String -> String
  function formatType6(indexedPropPath) {
    return function(index_) {
      return function(f) {
        return function(t) {
          return function(propPath_) {
            var indexedPropPath_ = Z.concat ([index_], propPath_);
            var p = isPrefix (indexedPropPath_) (indexedPropPath);
            var q = isPrefix (indexedPropPath) (indexedPropPath_);
            return p && q ? f : p ? I : _;
          };
        };
      };
    };
  }

  //  see :: (String, { name :: String, url :: String? }) -> String
  function see(label, record) {
    return record.url == null || record.url === '' ?
           '' :
           '\nSee ' + record.url +
           ' for information about the ' + record.name + ' ' + label + '.\n';
  }

  //  typeClassConstraintViolation :: ... -> Error
  function typeClassConstraintViolation(
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    typeClass,      // :: TypeClass
    index,          // :: Integer
    propPath,       // :: PropPath
    value,          // :: Any
    typeVarMap      // :: TypeVarMap
  ) {
    var expType = resolvePropPath (typeInfo.types[index], propPath);
    return new TypeError (trimTrailingSpaces (
      'Type-class constraint violation\n\n' +
      underline (typeInfo,
                 function(tvn) {
                   return function(tc) {
                     return (
                       tvn === expType.name && tc.name === typeClass.name ?
                         r ('^') :
                         _
                     );
                   };
                 },
                 formatType6 (Z.concat ([index], propPath))) +
      '\n' +
      showValuesAndTypes (env, typeInfo, [value], 1) + '\n\n' +
      q (typeInfo.name) + ' requires ' +
      q (expType.name) + ' to satisfy the ' +
      stripNamespace (typeClass) + ' type-class constraint; ' +
      'the value at position 1 does not.\n' +
      see ('type class', typeClass)
    ));
  }

  //  typeVarConstraintViolation :: ... -> Error
  function typeVarConstraintViolation(
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    index,          // :: Integer
    propPath,       // :: PropPath
    valuesByPath    // :: StrMap (Array Any)
  ) {
    //  If we apply an ‘a -> a -> a -> a’ function to Left ('x'), Right (1),
    //  and Right (null) we'd like to avoid underlining the first argument
    //  position, since Left ('x') is compatible with the other ‘a’ values.
    var key = JSON.stringify (Z.concat ([index], propPath));
    var values = valuesByPath[key];

    //  Note: Sorting these keys lexicographically is not "correct", but it
    //  does the right thing for indexes less than 10.
    var keys = Z.filter (function(k) {
      var values_ = valuesByPath[k];
      return (
        //  Keep X, the position at which the violation was observed.
        k === key ||
        //  Keep positions whose values are incompatible with the values at X.
        isEmpty (determineActualTypesStrict (env, Z.concat (values, values_)))
      );
    }, sortedKeys (valuesByPath));

    var underlinedTypeVars =
    underlineTypeVars (typeInfo,
                       Z.reduce (function($valuesByPath, k) {
                         $valuesByPath[k] = valuesByPath[k];
                         return $valuesByPath;
                       }, {}, keys));

    return new TypeError (trimTrailingSpaces (
      'Type-variable constraint violation\n\n' +
      underlinedTypeVars + '\n' +
      (Z.reduce (function(st, k) {
        var values = valuesByPath[k];
        return isEmpty (values) ? st : {
          idx: st.idx + 1,
          s: st.s +
             showValuesAndTypes (env, typeInfo, values, st.idx + 1) +
             '\n\n'
        };
      }, {idx: 0, s: ''}, keys)).s +
      'Since there is no type of which all the above values are ' +
      'members, the type-variable constraint has been violated.\n'
    ));
  }

  //  invalidValue :: ... -> Error
  function invalidValue(
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    index,          // :: Integer
    propPath,       // :: PropPath
    value           // :: Any
  ) {
    var t = resolvePropPath (typeInfo.types[index], propPath);

    var underlinedTypeVars =
    underline (typeInfo,
               K (K (_)),
               formatType6 (Z.concat ([index], propPath)));

    return new TypeError (trimTrailingSpaces (
      t.type === VARIABLE &&
      isEmpty (determineActualTypesLoose (env, [value])) ?
        'Unrecognized value\n\n' +
        underlinedTypeVars + '\n' +
        showValuesAndTypes (env, typeInfo, [value], 1) + '\n\n' +
        toMarkdownList (
          'The environment is empty! ' +
          'Polymorphic functions require a non-empty environment.\n',
          'The value at position 1 is not a member of any type in ' +
          'the environment.\n\n' +
          'The environment contains the following types:\n\n',
          showTypeWith (typeInfo.types),
          env
        ) :
      // else
        'Invalid value\n\n' +
        underlinedTypeVars + '\n' +
        showValuesAndTypes (env, typeInfo, [value], 1) + '\n\n' +
        'The value at position 1 is not a member of ' +
        q (show (t)) + '.\n' +
        see (arityGte (1) (t) ? 'type constructor' : 'type', t)
    ));
  }

  //  invalidArgumentsLength :: ... -> Error
  //
  //  This function is used in `wrapFunctionCond` to ensure that higher-order
  //  functions defined via `def` only ever apply a function argument to the
  //  correct number of arguments.
  function invalidArgumentsLength(
    typeInfo,           // :: TypeInfo
    index,              // :: Integer
    numArgsExpected,    // :: Integer
    args                // :: Array Any
  ) {
    return new TypeError (trimTrailingSpaces (
      q (typeInfo.name) +
      ' applied ' + q (show (typeInfo.types[index])) +
      ' to the wrong number of arguments\n\n' +
      underline (
        typeInfo,
        K (K (_)),
        function(index_) {
          return function(f) {
            return function(t) {
              return function(propPath) {
                return function(s) {
                  return index_ === index ?
                    t.format (_, function(k) { return k === '$1' ? f : _; }) :
                    _ (s);
                };
              };
            };
          };
        }
      ) + '\n' +
      'Expected ' + numArgs (numArgsExpected) +
      ' but received ' + numArgs (args.length) +
      toMarkdownList ('.\n', ':\n\n', show, args)
    ));
  }

  //  assertRight :: Either (() -> Error) a -> a !
  function assertRight(either) {
    if (either.isLeft) throw either.value ();
    return either.value;
  }

  //  withTypeChecking :: ... -> Function
  function withTypeChecking(
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    impl            // :: Function
  ) {
    var n = typeInfo.types.length - 1;

    //  wrapFunctionCond :: (TypeVarMap, Integer, a) -> a
    function wrapFunctionCond(_typeVarMap, index, value) {
      var expType = typeInfo.types[index];
      if (expType.type !== FUNCTION) return value;

      //  checkValue :: (TypeVarMap, Integer, String, a) -> Either (() -> Error) TypeVarMap
      function checkValue(typeVarMap, index, k, x) {
        var propPath = [k];
        var t = expType.types[k];
        return (
          t.type === VARIABLE ?
            Z.chain (
              function(typeVarMap) {
                return isEmpty (typeVarMap[t.name].types) ?
                  Left (function() {
                    return typeVarConstraintViolation (
                      env,
                      typeInfo,
                      index,
                      propPath,
                      typeVarMap[t.name].valuesByPath
                    );
                  }) :
                  Right (typeVarMap);
              },
              Right (updateTypeVarMap (env,
                                       typeVarMap,
                                       t,
                                       index,
                                       propPath,
                                       [x]))
            ) :
          // else
            Z.map (
              function(r) { return r.typeVarMap; },
              satisfactoryTypes (env,
                                 typeInfo,
                                 typeVarMap,
                                 t,
                                 index,
                                 propPath,
                                 [x])
            )
        );
      }

      var typeVarMap = _typeVarMap;
      return function(x) {
        if (arguments.length !== expType.arity - 1) {
          throw invalidArgumentsLength (typeInfo,
                                        index,
                                        expType.arity - 1,
                                        slice.call (arguments));
        }

        var args = arguments;
        typeVarMap = assertRight (
          (init (expType.keys)).reduce (function(either, k, idx) {
            var arg = args[idx];
            return Z.chain (function(typeVarMap) {
              return checkValue (typeVarMap, index, k, arg);
            }, either);
          }, Right (typeVarMap))
        );

        var output = value.apply (this, arguments);
        var k = last (expType.keys);
        typeVarMap = assertRight (checkValue (typeVarMap, index, k, output));
        return output;
      };
    }

    //  wrapNext :: (TypeVarMap, Array Any, Integer) -> (a -> b)
    function wrapNext(_typeVarMap, _values, index) {
      return function(x) {
        var args = slice.call (arguments);
        if (args.length !== 1) {
          throw invalidArgumentsCount (typeInfo, index, 1, args);
        }
        var typeVarMap = (assertRight (
          satisfactoryTypes (env,
                             typeInfo,
                             _typeVarMap,
                             typeInfo.types[index],
                             index,
                             [],
                             args)
        )).typeVarMap;

        var values = Z.concat (_values, args);
        if (index + 1 === n) {
          var value = values.reduce (function(f, x, idx) {
            return f (wrapFunctionCond (typeVarMap, idx, x));
          }, impl);
          typeVarMap = (assertRight (
            satisfactoryTypes (env,
                               typeInfo,
                               typeVarMap,
                               typeInfo.types[n],
                               n,
                               [],
                               [value])
          )).typeVarMap;
          return wrapFunctionCond (typeVarMap, n, value);
        } else {
          return wrapNext (typeVarMap, values, index + 1);
        }
      };
    }

    var wrapped = typeInfo.types[0].type === NO_ARGUMENTS ?
      function() {
        if (arguments.length !== 0) {
          throw invalidArgumentsCount (typeInfo, 0, 0, slice.call (arguments));
        }
        var value = impl ();
        var typeVarMap = (assertRight (
          satisfactoryTypes (env,
                             typeInfo,
                             {},
                             typeInfo.types[n],
                             n,
                             [],
                             [value])
        )).typeVarMap;
        return wrapFunctionCond (typeVarMap, n, value);
      } :
      wrapNext ({}, [], 0);

    wrapped[inspect] = wrapped.toString = always0 (typeSignature (typeInfo));

    return wrapped;
  }

  //  defTypes :: NonEmpty (Array Type)
  var defTypes = [
    String_,
    StrMap (Array_ (TypeClass)),
    NonEmpty (Array_ (Type)),
    AnyFunction,
    AnyFunction
  ];

  function create(opts) {
    function def(name) {
      return function(constraints) {
        return function(expTypes) {
          return function(impl) {
            return opts.checkTypes ?
              withTypeChecking (opts.env,
                                {name: name,
                                 constraints: constraints,
                                 types: expTypes.length === 1 ?
                                        Z.concat ([NoArguments], expTypes) :
                                        expTypes},
                                impl) :
              impl;
          };
        };
      };
    }
    return def (def.name) ({}) (defTypes) (def);
  }

  var def = create ({checkTypes: !production, env: env});

  //  fromUncheckedUnaryType :: (Type -> Type) -> Type -> Type
  function fromUncheckedUnaryType(typeConstructor) {
    var t = typeConstructor (Unknown);
    return def (t.name) ({}) ([Type, Type]) (fromUnaryType (t));
  }

  //  fromUncheckedBinaryType :: (Type -> Type -> Type) -> Type -> Type -> Type
  function fromUncheckedBinaryType(typeConstructor) {
    var t = typeConstructor (Unknown) (Unknown);
    return def (t.name) ({}) ([Type, Type, Type]) (fromBinaryType (t));
  }

  return {
    Any: Any,
    AnyFunction: AnyFunction,
    Arguments: Arguments,
    Array: fromUncheckedUnaryType (Array_),
    Array0: Array0,
    Array1: fromUncheckedUnaryType (Array1),
    Array2: fromUncheckedBinaryType (Array2),
    Boolean: Boolean_,
    Date: Date_,
    ValidDate: ValidDate,
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
    HtmlElement: HtmlElement,
    Identity: fromUncheckedUnaryType (Identity),
    Maybe: fromUncheckedUnaryType (Maybe),
    NonEmpty: NonEmpty,
    Null: Null,
    Nullable: fromUncheckedUnaryType (Nullable),
    Number: Number_,
    PositiveNumber: PositiveNumber,
    NegativeNumber: NegativeNumber,
    ValidNumber: ValidNumber,
    NonZeroValidNumber: NonZeroValidNumber,
    FiniteNumber: FiniteNumber,
    NonZeroFiniteNumber: NonZeroFiniteNumber,
    PositiveFiniteNumber: PositiveFiniteNumber,
    NegativeFiniteNumber: NegativeFiniteNumber,
    Integer: Integer,
    NonZeroInteger: NonZeroInteger,
    NonNegativeInteger: NonNegativeInteger,
    PositiveInteger: PositiveInteger,
    NegativeInteger: NegativeInteger,
    Object: Object_,
    Pair: fromUncheckedBinaryType (Pair),
    RegExp: RegExp_,
    GlobalRegExp: GlobalRegExp,
    NonGlobalRegExp: NonGlobalRegExp,
    RegexFlags: RegexFlags,
    StrMap: fromUncheckedUnaryType (StrMap),
    String: String_,
    Symbol: Symbol_,
    Type: Type,
    TypeClass: TypeClass,
    Undefined: Undefined,
    Unknown: Unknown,
    env: env,
    create:
      def ('create')
          ({})
          ([RecordType ({checkTypes: Boolean_, env: Array_ (Type)}),
            Unchecked (joinWith (' -> ', Z.map (show, defTypes)))])
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
          (function(name) {
             return B (B (B (B (def (name) ({}) ([Type, Type])))))
                      (UnaryType (name));
           }),
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
          (function(name) {
             return B (B (B (B (B (def (name) ({}) ([Type, Type, Type]))))))
                      (BinaryType (name));
           }),
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
          (function(name) {
             return def (name) ({}) ([Type, Type]) (UnaryTypeVariable (name));
           }),
    BinaryTypeVariable:
      def ('BinaryTypeVariable')
          ({})
          ([String_, Unchecked ('Type -> Type -> Type')])
          (function(name) {
             return def (name)
                        ({})
                        ([Type, Type, Type])
                        (BinaryTypeVariable (name));
           }),
    Thunk:
      def ('Thunk')
          ({})
          ([Type, Type])
          (Thunk),
    Predicate:
      def ('Predicate')
          ({})
          ([Type, Type])
          (Predicate)
  };

}));

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
