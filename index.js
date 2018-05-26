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
//. the definition of curried JavaScript functions which are explicit about
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
//. JavaScript types. It may be used as the basis for environments which
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

} (function(Either, show, Z, type) {

  'use strict';

  var MAX_SAFE_INTEGER = Math.pow (2, 53) - 1;
  var MIN_SAFE_INTEGER = -MAX_SAFE_INTEGER;

  var slice             = Array.prototype.slice;
  var hasOwnProperty    = Object.prototype.hasOwnProperty;

  //  Left :: a -> Either a b
  var Left = Either.Left;

  //  Right :: b -> Either a b
  var Right = Either.Right;

  //  K :: a -> b -> a
  function K(x) { return function(y) { return x; }; }

  //  W :: (a -> a -> b) -> a -> b
  function W(f) { return function(x) { return f (x) (x); }; }

  //  always0 :: a -> () -> a
  function always0(x) { return function() { return x; }; }

  //  always2 :: a -> (b, c) -> a
  function always2(x) { return function(y, z) { return x; }; }

  //  compose :: (b -> c, a -> b) -> (a -> c)
  function compose(f, g) {
    return function(x) {
      return f (g (x));
    };
  }

  //  id :: a -> a
  function id(x) { return x; }

  //  init :: Array a -> Array a
  function init(xs) { return xs.slice (0, -1); }

  //  isEmpty :: Array a -> Boolean
  function isEmpty(xs) { return xs.length === 0; }

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

  //  stripOutermostParens :: String -> String
  function stripOutermostParens(s) {
    return s.slice ('('.length, -')'.length);
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

  //  unless :: (Boolean, (a -> a), a) -> a
  function unless(bool, f, x) {
    return bool ? x : f (x);
  }

  //  when :: (Boolean, (a -> a), a) -> a
  function when(bool, f, x) {
    return bool ? f (x) : x;
  }

  //  wrap :: String -> String -> String -> String
  function wrap(prefix) {
    return function(suffix) {
      return function(s) {
        return prefix + s + suffix;
      };
    };
  }

  //  parenthesize :: String -> String
  var parenthesize = wrap ('(') (')');

  //  q :: String -> String
  var q = wrap ('\u2018') ('\u2019');

  //  stripNamespace :: String -> String
  function stripNamespace(s) { return s.slice (s.indexOf ('/') + 1); }

  //  _Type :: ... -> Type
  function _Type(
    type,       // :: String
    name,       // :: String
    url,        // :: String
    format,     // :: (String -> String, String -> String -> String) -> String
    test,       // :: Any -> Boolean
    keys,       // :: Array String
    types       // :: StrMap { extractor :: a -> Array b, type :: Type }
  ) {
    this._test = test;
    this.format = format;
    this.keys = keys;
    this.name = name;
    this.type = type;
    this.types = types;
    this.url = url;
  }

  _Type['@@type'] = 'sanctuary-def/Type';

  //  Type#fantasy-land/equals :: Type ~> Type -> Boolean
  _Type.prototype['fantasy-land/equals'] = function(other) {
    return (
      Z.equals (this.type, other.type) &&
      Z.equals (this.name, other.name) &&
      Z.equals (this.url, other.url) &&
      Z.equals (this.keys, other.keys) &&
      this.keys.every (function(k) {
        return Z.equals (this.types[k].type, other.types[k].type);
      }, this)
    );
  };

  _Type.prototype.validate = function(x) {
    if (!(this._test (x))) return Left ({value: x, propPath: []});
    for (var idx = 0; idx < this.keys.length; idx += 1) {
      var k = this.keys[idx];
      var t = this.types[k];
      for (var idx2 = 0, ys = t.extractor (x); idx2 < ys.length; idx2 += 1) {
        var result = t.type.validate (ys[idx2]);
        if (result.isLeft) {
          var value = result.value.value;
          var propPath = Z.concat ([k], result.value.propPath);
          return Left ({value: value, propPath: propPath});
        }
      }
    }
    return Right (x);
  };

  _Type.prototype['@@show'] = function() {
    return this.format (id, K (id));
  };

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
  new _Type (INCONSISTENT, '', '', always2 ('???'), K (false), [], {});

  //  NoArguments :: Type
  var NoArguments =
  new _Type (NO_ARGUMENTS, '', '', always2 ('()'), K (true), [], {});

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
    var version = '0.17.1';  // updated programmatically
    return 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version +
           '#' + stripNamespace (name);
  }

  //  NullaryTypeWithUrl :: (String, Any -> Boolean) -> Type
  function NullaryTypeWithUrl(name, test) {
    return NullaryType (name) (functionUrl (name)) (test);
  }

  //  EnumTypeWithUrl :: (String, Array Any) -> Type
  function EnumTypeWithUrl(name, members) {
    return EnumType (name) (functionUrl (name)) (members);
  }

  //  UnaryTypeWithUrl ::
  //    (String, Any -> Boolean, t a -> Array a) -> (Type -> Type)
  function UnaryTypeWithUrl(name, test, _1) {
    return UnaryType (name) (functionUrl (name)) (test) (_1);
  }

  //  BinaryTypeWithUrl ::
  //    (String, Any -> Boolean, t a b -> Array a, t a b -> Array b) ->
  //      ((Type, Type) -> Type)
  function BinaryTypeWithUrl(name, test, _1, _2) {
    return BinaryType (name) (functionUrl (name)) (test) (_1) (_2);
  }

  //. ### Types
  //.
  //. Conceptually, a type is a set of values. One can think of a value of
  //. type `Type` as a function of type `Any -> Boolean` which tests values
  //. for membership in the set (though this is an oversimplification).

  //# Any :: Type
  //.
  //. Type comprising every JavaScript value.
  var Any = NullaryTypeWithUrl ('sanctuary-def/Any', K (true));

  //# AnyFunction :: Type
  //.
  //. Type comprising every Function value.
  var AnyFunction = NullaryTypeWithUrl ('Function', typeofEq ('function'));

  //# Arguments :: Type
  //.
  //. Type comprising every [`arguments`][arguments] object.
  var Arguments = NullaryTypeWithUrl ('Arguments', typeEq ('Arguments'));

  //# Array :: Type -> Type
  //.
  //. Constructor for homogeneous Array types.
  var Array_ = UnaryTypeWithUrl ('Array', typeEq ('Array'), id);

  //# Array0 :: Type
  //.
  //. Type whose sole member is `[]`.
  var Array0 = NullaryTypeWithUrl (
    'sanctuary-def/Array0',
    function(x) { return typeEq ('Array') (x) && x.length === 0; }
  );

  //# Array1 :: Type -> Type
  //.
  //. Constructor for singleton Array types.
  var Array1 = UnaryTypeWithUrl (
    'sanctuary-def/Array1',
    function(x) { return typeEq ('Array') (x) && x.length === 1; },
    id
  );

  //# Array2 :: Type -> Type -> Type
  //.
  //. Constructor for heterogeneous Array types of length 2. `['foo', true]` is
  //. a member of `Array2 String Boolean`.
  var Array2 = BinaryTypeWithUrl (
    'sanctuary-def/Array2',
    function(x) { return typeEq ('Array') (x) && x.length === 2; },
    function(array2) { return [array2[0]]; },
    function(array2) { return [array2[1]]; }
  );

  //# Boolean :: Type
  //.
  //. Type comprising `true` and `false`.
  var Boolean_ = NullaryTypeWithUrl ('Boolean', typeofEq ('boolean'));

  //# Date :: Type
  //.
  //. Type comprising every Date value.
  var Date_ = NullaryTypeWithUrl ('Date', typeEq ('Date'));

  //# Error :: Type
  //.
  //. Type comprising every Error value, including values of more specific
  //. constructors such as [`SyntaxError`][] and [`TypeError`][].
  var Error_ = NullaryTypeWithUrl ('Error', typeEq ('Error'));

  //# FiniteNumber :: Type
  //.
  //. Type comprising every [`ValidNumber`][] value except `Infinity` and
  //. `-Infinity`.
  var FiniteNumber = NullaryTypeWithUrl (
    'sanctuary-def/FiniteNumber',
    function(x) { return ValidNumber._test (x) && isFinite (x); }
  );

  //  augmentThunk :: NonEmpty (Array Type) -> NonEmpty (Array Type)
  function augmentThunk(types) {
    return types.length === 1 ? Z.concat ([NoArguments], types) : types;
  }

  //# Function :: NonEmpty (Array Type) -> Type
  //.
  //. Constructor for Function types.
  //.
  //. Examples:
  //.
  //.   - `$.Function ([$.Date, $.String])` represents the `Date -> String`
  //.     type; and
  //.   - `$.Function ([a, b, a])` represents the `(a, b) -> a` type.
  function Function_(_types) {
    var types = augmentThunk (_types);

    function format(outer, inner) {
      var xs = types.map (function(t, idx) {
        return unless (t.type === RECORD || isEmpty (t.keys),
                       stripOutermostParens,
                       inner ('$' + show (idx + 1)) (show (t)));
      });
      var parenthesize = wrap (outer ('(')) (outer (')'));
      return parenthesize (unless (types.length === 2,
                                   parenthesize,
                                   joinWith (outer (', '), init (xs))) +
                           outer (' -> ') +
                           last (xs));
    }

    var test = AnyFunction._test;

    var $keys = [];
    var $types = {};
    types.forEach (function(t, idx) {
      var k = '$' + show (idx + 1);
      $keys.push (k);
      $types[k] = {extractor: K ([]), type: t};
    });

    return new _Type (FUNCTION, '', '', format, test, $keys, $types);
  }

  //# GlobalRegExp :: Type
  //.
  //. Type comprising every [`RegExp`][] value whose `global` flag is `true`.
  //.
  //. See also [`NonGlobalRegExp`][].
  var GlobalRegExp = NullaryTypeWithUrl (
    'sanctuary-def/GlobalRegExp',
    function(x) { return RegExp_._test (x) && x.global; }
  );

  //# Integer :: Type
  //.
  //. Type comprising every integer in the range
  //. [[`Number.MIN_SAFE_INTEGER`][min] .. [`Number.MAX_SAFE_INTEGER`][max]].
  var Integer = NullaryTypeWithUrl (
    'sanctuary-def/Integer',
    function(x) {
      return ValidNumber._test (x) &&
             Math.floor (x) === x &&
             x >= MIN_SAFE_INTEGER &&
             x <= MAX_SAFE_INTEGER;
    }
  );

  //# NegativeFiniteNumber :: Type
  //.
  //. Type comprising every [`FiniteNumber`][] value less than zero.
  var NegativeFiniteNumber = NullaryTypeWithUrl (
    'sanctuary-def/NegativeFiniteNumber',
    function(x) { return FiniteNumber._test (x) && x < 0; }
  );

  //# NegativeInteger :: Type
  //.
  //. Type comprising every [`Integer`][] value less than zero.
  var NegativeInteger = NullaryTypeWithUrl (
    'sanctuary-def/NegativeInteger',
    function(x) { return Integer._test (x) && x < 0; }
  );

  //# NegativeNumber :: Type
  //.
  //. Type comprising every [`Number`][] value less than zero.
  var NegativeNumber = NullaryTypeWithUrl (
    'sanctuary-def/NegativeNumber',
    function(x) { return Number_._test (x) && x < 0; }
  );

  //# NonEmpty :: Type -> Type
  //.
  //. Constructor for non-empty types. `$.NonEmpty ($.String)`, for example, is
  //. the type comprising every [`String`][] value except `''`.
  //.
  //. The given type must satisfy the [Monoid][] and [Setoid][] specifications.
  var NonEmpty = UnaryTypeWithUrl (
    'sanctuary-def/NonEmpty',
    function(x) {
      return Z.Monoid.test (x) &&
             Z.Setoid.test (x) &&
             !(Z.equals (x, Z.empty (x.constructor)));
    },
    function(monoid) { return [monoid]; }
  );

  //# NonGlobalRegExp :: Type
  //.
  //. Type comprising every [`RegExp`][] value whose `global` flag is `false`.
  //.
  //. See also [`GlobalRegExp`][].
  var NonGlobalRegExp = NullaryTypeWithUrl (
    'sanctuary-def/NonGlobalRegExp',
    function(x) { return RegExp_._test (x) && !x.global; }
  );

  //# NonNegativeInteger :: Type
  //.
  //. Type comprising every non-negative [`Integer`][] value (including `-0`).
  //. Also known as the set of natural numbers under ISO 80000-2:2009.
  var NonNegativeInteger = NullaryTypeWithUrl (
    'sanctuary-def/NonNegativeInteger',
    function(x) { return Integer._test (x) && x >= 0; }
  );

  //# NonZeroFiniteNumber :: Type
  //.
  //. Type comprising every [`FiniteNumber`][] value except `0` and `-0`.
  var NonZeroFiniteNumber = NullaryTypeWithUrl (
    'sanctuary-def/NonZeroFiniteNumber',
    function(x) { return FiniteNumber._test (x) && x !== 0; }
  );

  //# NonZeroInteger :: Type
  //.
  //. Type comprising every [`Integer`][] value except `0` and `-0`.
  var NonZeroInteger = NullaryTypeWithUrl (
    'sanctuary-def/NonZeroInteger',
    function(x) { return Integer._test (x) && x !== 0; }
  );

  //# NonZeroValidNumber :: Type
  //.
  //. Type comprising every [`ValidNumber`][] value except `0` and `-0`.
  var NonZeroValidNumber = NullaryTypeWithUrl (
    'sanctuary-def/NonZeroValidNumber',
    function(x) { return ValidNumber._test (x) && x !== 0; }
  );

  //# Null :: Type
  //.
  //. Type whose sole member is `null`.
  var Null = NullaryTypeWithUrl ('Null', typeEq ('Null'));

  //# Nullable :: Type -> Type
  //.
  //. Constructor for types which include `null` as a member.
  var Nullable = UnaryTypeWithUrl (
    'sanctuary-def/Nullable',
    K (true),
    function(nullable) {
      // eslint-disable-next-line eqeqeq
      return nullable === null ? [] : [nullable];
    }
  );

  //# Number :: Type
  //.
  //. Type comprising every primitive Number value (including `NaN`).
  var Number_ = NullaryTypeWithUrl ('Number', typeofEq ('number'));

  //# Object :: Type
  //.
  //. Type comprising every "plain" Object value. Specifically, values
  //. created via:
  //.
  //.   - object literal syntax;
  //.   - [`Object.create`][]; or
  //.   - the `new` operator in conjunction with `Object` or a custom
  //.     constructor function.
  var Object_ = NullaryTypeWithUrl ('Object', typeEq ('Object'));

  //# PositiveFiniteNumber :: Type
  //.
  //. Type comprising every [`FiniteNumber`][] value greater than zero.
  var PositiveFiniteNumber = NullaryTypeWithUrl (
    'sanctuary-def/PositiveFiniteNumber',
    function(x) { return FiniteNumber._test (x) && x > 0; }
  );

  //# PositiveInteger :: Type
  //.
  //. Type comprising every [`Integer`][] value greater than zero.
  var PositiveInteger = NullaryTypeWithUrl (
    'sanctuary-def/PositiveInteger',
    function(x) { return Integer._test (x) && x > 0; }
  );

  //# PositiveNumber :: Type
  //.
  //. Type comprising every [`Number`][] value greater than zero.
  var PositiveNumber = NullaryTypeWithUrl (
    'sanctuary-def/PositiveNumber',
    function(x) { return Number_._test (x) && x > 0; }
  );

  //# RegExp :: Type
  //.
  //. Type comprising every RegExp value.
  var RegExp_ = NullaryTypeWithUrl ('RegExp', typeEq ('RegExp'));

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
  var RegexFlags = EnumTypeWithUrl (
    'sanctuary-def/RegexFlags',
    ['', 'g', 'i', 'm', 'gi', 'gm', 'im', 'gim']
  );

  //# StrMap :: Type -> Type
  //.
  //. Constructor for homogeneous Object types.
  //.
  //. `{foo: 1, bar: 2, baz: 3}`, for example, is a member of `StrMap Number`;
  //. `{foo: 1, bar: 2, baz: 'XXX'}` is not.
  var StrMap = UnaryTypeWithUrl (
    'sanctuary-def/StrMap',
    Object_._test,
    function(strMap) {
      return Z.reduce (function(xs, x) { xs.push (x); return xs; },
                       [],
                       strMap);
    }
  );

  //# String :: Type
  //.
  //. Type comprising every primitive String value.
  var String_ = NullaryTypeWithUrl ('String', typeofEq ('string'));

  //# Symbol :: Type
  //.
  //. Type comprising every Symbol value.
  var Symbol_ = NullaryTypeWithUrl ('Symbol', typeofEq ('symbol'));

  //# Type :: Type
  //.
  //. Type comprising every `Type` value.
  var Type = NullaryTypeWithUrl ('Type', typeEq ('sanctuary-def/Type'));

  //# TypeClass :: Type
  //.
  //. Type comprising every [`TypeClass`][] value.
  var TypeClass = NullaryTypeWithUrl (
    'TypeClass',
    typeEq ('sanctuary-type-classes/TypeClass')
  );

  //# Undefined :: Type
  //.
  //. Type whose sole member is `undefined`.
  var Undefined = NullaryTypeWithUrl ('Undefined', typeEq ('Undefined'));

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
  new _Type (UNKNOWN, '', '', always2 ('Unknown'), K (true), [], {});

  //# ValidDate :: Type
  //.
  //. Type comprising every [`Date`][] value except `new Date (NaN)`.
  var ValidDate = NullaryTypeWithUrl (
    'sanctuary-def/ValidDate',
    function(x) { return Date_._test (x) && !isNaN (x.valueOf ()); }
  );

  //# ValidNumber :: Type
  //.
  //. Type comprising every [`Number`][] value except `NaN`.
  var ValidNumber = NullaryTypeWithUrl (
    'sanctuary-def/ValidNumber',
    function(x) { return Number_._test (x) && !isNaN (x); }
  );

  //# env :: Array Type
  //.
  //. An array of [types][]:
  //.
  //.   - <code>[AnyFunction](#AnyFunction)</code>
  //.   - <code>[Arguments](#Arguments)</code>
  //.   - <code>[Array](#Array) ([Unknown](#Unknown))</code>
  //.   - <code>[Boolean](#Boolean)</code>
  //.   - <code>[Date](#Date)</code>
  //.   - <code>[Error](#Error)</code>
  //.   - <code>[Null](#Null)</code>
  //.   - <code>[Number](#Number)</code>
  //.   - <code>[Object](#Object)</code>
  //.   - <code>[RegExp](#RegExp)</code>
  //.   - <code>[StrMap](#StrMap) ([Unknown](#Unknown))</code>
  //.   - <code>[String](#String)</code>
  //.   - <code>[Symbol](#Symbol)</code>
  //.   - <code>[Undefined](#Undefined)</code>
  var env = [
    AnyFunction,
    Arguments,
    Array_ (Unknown),
    Boolean_,
    Date_,
    Error_,
    Null,
    Number_,
    Object_,
    RegExp_,
    StrMap (Unknown),
    String_,
    Symbol_,
    Undefined
  ];

  //  Unchecked :: String -> Type
  function Unchecked(s) { return NullaryType (s) ('') (K (true)); }

  //  production :: Boolean
  var production =
    typeof process !== 'undefined' &&
    /* global process:false */
    process != null &&
    process.env != null &&
    process.env.NODE_ENV === 'production';

  var def = _create ({checkTypes: !production, env: env});

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

  //  expandUnknown :: ... -> Array Type
  function expandUnknown(
    env,            // :: Array Type
    seen,           // :: Array Object
    value,          // :: Any
    r               // :: { extractor :: a -> Array b, type :: Type }
  ) {
    return r.type.type === UNKNOWN ?
      _determineActualTypes (env, seen, r.extractor (value)) :
      [r.type];
  }

  //  _determineActualTypes :: ... -> Array Type
  function _determineActualTypes(
    env,            // :: Array Type
    seen,           // :: Array Object
    values          // :: Array Any
  ) {
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
      return Z.chain (function(t) {
        return (
          t.name === 'sanctuary-def/Nullable' || (t.validate (value)).isLeft ?
            [] :
          t.type === UNARY ?
            Z.map (fromUnaryType (t),
                   expandUnknown (env, seen$, value, t.types.$1)) :
          t.type === BINARY ?
            xprod (t,
                   expandUnknown (env, seen$, value, t.types.$1),
                   expandUnknown (env, seen$, value, t.types.$2)) :
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
    return t.type === UNARY   ? isConsistent (t.types.$1.type) :
           t.type === BINARY  ? isConsistent (t.types.$1.type) &&
                                isConsistent (t.types.$2.type) :
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
      $typeVarMap[typeVar.name] = {types: env.slice (), valuesByPath: {}};
    }

    var key = JSON.stringify (Z.concat ([index], propPath));
    if (!(hasOwnProperty.call ($typeVarMap[typeVar.name].valuesByPath, key))) {
      $typeVarMap[typeVar.name].valuesByPath[key] = [];
    }

    var isNullaryTypeVar = isEmpty (typeVar.keys);
    var isValid = test (env);

    function expandUnknownStrict(value, r) {
      return Z.filter (isConsistent, expandUnknown (env, [], value, r));
    }

    values.forEach (function(value) {
      $typeVarMap[typeVar.name].valuesByPath[key].push (value);
      $typeVarMap[typeVar.name].types = Z.chain (function(t) {
        return (
          t.keys.length < typeVar.keys.length || !isValid (t) (value) ?
            [] :
          isNullaryTypeVar && t.type === UNARY ?
            Z.map (fromUnaryType (t),
                   expandUnknownStrict (value, t.types.$1)) :
          isNullaryTypeVar && t.type === BINARY ?
            xprod (t,
                   expandUnknownStrict (value, t.types.$1),
                   expandUnknownStrict (value, t.types.$2)) :
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
      var result = expType.validate (values[idx]);
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
              if (!typeClasses[idx2].test (values[idx])) {
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
              var offset = t.keys.length - expType.keys.length;
              return expType.keys.reduce (function(e, k, idx) {
                var extractor = t.types[t.keys[offset + idx]].extractor;
                return Z.reduce (function(e, x) {
                  return Z.chain (function(r) {
                    return recur (env,
                                  typeInfo,
                                  r.typeVarMap,
                                  expType.types[k].type,
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
                            or (result.types, [expType.types.$1.type]))
            };
          },
          recur (env,
                 typeInfo,
                 typeVarMap,
                 expType.types.$1.type,
                 index,
                 Z.concat (propPath, ['$1']),
                 Z.chain (expType.types.$1.extractor, values))
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
                  types: xprod (expType,
                                or ($1s, [expType.types.$1.type]),
                                or ($2s, [expType.types.$2.type]))
                };
              },
              recur (env,
                     typeInfo,
                     result.typeVarMap,
                     expType.types.$2.type,
                     index,
                     Z.concat (propPath, ['$2']),
                     Z.chain (expType.types.$2.extractor, values))
            );
          },
          recur (env,
                 typeInfo,
                 typeVarMap,
                 expType.types.$1.type,
                 index,
                 Z.concat (propPath, ['$1']),
                 Z.chain (expType.types.$1.extractor, values))
        );

      case RECORD:
        return Z.reduce (function(e, k) {
          return Z.chain (function(r) {
            return recur (env,
                          typeInfo,
                          r.typeVarMap,
                          expType.types[k].type,
                          index,
                          Z.concat (propPath, [k]),
                          Z.chain (expType.types[k].extractor, values));
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
  //.
  //. One may define a more restrictive type in terms of a more general one:
  //.
  //. ```javascript
  //. //    NonNegativeInteger :: Type
  //. const NonNegativeInteger = $.NullaryType
  //.   ('my-package/NonNegativeInteger')
  //.   ('http://example.com/my-package#NonNegativeInteger')
  //.   (x => $.test ([]) ($.Integer) (x) && x >= 0);
  //. ```
  //.
  //. Using types as predicates is useful in other contexts too. One could,
  //. for example, define a [record type][] for each endpoint of a REST API
  //. and validate the bodies of incoming POST requests against these types.
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

  //# NullaryType :: String -> String -> (Any -> Boolean) -> Type
  //.
  //. Type constructor for types with no type variables (such as [`Number`][]).
  //.
  //. To define a nullary type `t` one must provide:
  //.
  //.   - the name of `t` (exposed as `t.name`);
  //.
  //.   - the documentation URL of `t` (exposed as `t.url`); and
  //.
  //.   - a predicate which accepts any JavaScript value and returns `true` if
  //.     (and only if) the value is a member of `t`.
  //.
  //. For example:
  //.
  //. ```javascript
  //. //    Integer :: Type
  //. const Integer = $.NullaryType
  //.   ('my-package/Integer')
  //.   ('http://example.com/my-package#Integer')
  //.   (x => typeof x === 'number' &&
  //.         Math.floor (x) === x &&
  //.         x >= Number.MIN_SAFE_INTEGER &&
  //.         x <= Number.MAX_SAFE_INTEGER);
  //.
  //. //    NonZeroInteger :: Type
  //. const NonZeroInteger = $.NullaryType
  //.   ('my-package/NonZeroInteger')
  //.   ('http://example.com/my-package#NonZeroInteger')
  //.   (x => $.test ([]) (Integer) (x) && x !== 0);
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
  //. ```
  function NullaryType(name) {
    function format(outer, inner) {
      return outer (stripNamespace (name));
    }
    return function(url) {
      return function(test) {
        return new _Type (NULLARY, name, url, format, test, [], {});
      };
    };
  }

  var CheckedNullaryType =
  def ('NullaryType')
      ({})
      ([String_, String_, Function_ ([Any, Boolean_]), Type])
      (NullaryType);

  //# UnaryType :: String -> String -> (Any -> Boolean) -> (t a -> Array a) -> Type -> Type
  //.
  //. Type constructor for types with one type variable (such as [`Array`][]).
  //.
  //. To define a unary type `t a` one must provide:
  //.
  //.   - the name of `t` (exposed as `t.name`);
  //.
  //.   - the documentation URL of `t` (exposed as `t.url`);
  //.
  //.   - a predicate which accepts any JavaScript value and returns `true`
  //.     if (and only if) the value is a member of `t x` for some type `x`;
  //.
  //.   - a function which takes any value of type `t a` and returns an array
  //.     of the values of type `a` contained in the `t` (exposed as
  //.     `t.types.$1.extractor`); and
  //.
  //.   - the type of `a` (exposed as `t.types.$1.type`).
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
  //.   (maybeTypeIdent)
  //.   ('http://example.com/my-package#Maybe')
  //.   (x => type (x) === maybeTypeIdent)
  //.   (maybe => maybe.isJust ? [maybe.value] : []);
  //.
  //. //    MaybeTypeRep :: TypeRep Maybe
  //. const MaybeTypeRep = {'@@type': maybeTypeIdent};
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
      return function(test) {
        return function(_1) {
          return function($1) {
            function format(outer, inner) {
              return outer ('(' + stripNamespace (name) + ' ') +
                     inner ('$1') (show ($1)) +
                     outer (')');
            }
            var types = {$1: {extractor: _1, type: $1}};
            return new _Type (UNARY, name, url, format, test, ['$1'], types);
          };
        };
      };
    };
  }

  var CheckedUnaryType =
  def ('UnaryType')
      ({})
      ([String_,
        String_,
        Function_ ([Any, Boolean_]),
        Function_ ([Unchecked ('t a'), Array_ (Unchecked ('a'))]),
        AnyFunction])
      (function(name) {
         return function(url) {
           return function(test) {
             return compose (def (stripNamespace (name)) ({}) ([Type, Type]),
                             UnaryType (name) (url) (test));
           };
         };
       });

  //  fromUnaryType :: Type -> (Type -> Type)
  function fromUnaryType(t) {
    return UnaryType (t.name) (t.url) (t._test) (t.types.$1.extractor);
  }

  //# BinaryType :: String -> String -> (Any -> Boolean) -> (t a b -> Array a) -> (t a b -> Array b) -> Type -> Type -> Type
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
  //.   - a predicate which accepts any JavaScript value and returns `true`
  //.     if (and only if) the value is a member of `t x y` for some types
  //.     `x` and `y`;
  //.
  //.   - a function which takes any value of type `t a b` and returns an array
  //.     of the values of type `a` contained in the `t` (exposed as
  //.     `t.types.$1.extractor`);
  //.
  //.   - a function which takes any value of type `t a b` and returns an array
  //.     of the values of type `b` contained in the `t` (exposed as
  //.     `t.types.$2.extractor`);
  //.
  //.   - the type of `a` (exposed as `t.types.$1.type`); and
  //.
  //.   - the type of `b` (exposed as `t.types.$2.type`).
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
  //.   (pairTypeIdent)
  //.   ('http://example.com/my-package#Pair')
  //.   (x => type (x) === pairTypeIdent)
  //.   (({fst}) => [fst])
  //.   (({snd}) => [snd]);
  //.
  //. //    PairTypeRep :: TypeRep Pair
  //. const PairTypeRep = {'@@type': pairTypeIdent};
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
  //.   ('my-package/Rank')
  //.   ('http://example.com/my-package#Rank')
  //.   (x => typeof x === 'string' &&
  //.         /^(A|2|3|4|5|6|7|8|9|10|J|Q|K)$/.test (x));
  //.
  //. //    Suit :: Type
  //. const Suit = $.NullaryType
  //.   ('my-package/Suit')
  //.   ('http://example.com/my-package#Suit')
  //.   (x => typeof x === 'string' &&
  //.         /^[\u2660\u2663\u2665\u2666]$/.test (x));
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
  //. ```
  function BinaryType(name) {
    return function(url) {
      return function(test) {
        return function(_1) {
          return function(_2) {
            return function($1) {
              return function($2) {
                function format(outer, inner) {
                  return outer ('(' + stripNamespace (name) + ' ') +
                         inner ('$1') (show ($1)) +
                         outer (' ') +
                         inner ('$2') (show ($2)) +
                         outer (')');
                }
                return new _Type (BINARY,
                                  name,
                                  url,
                                  format,
                                  test,
                                  ['$1', '$2'],
                                  {$1: {extractor: _1, type: $1},
                                   $2: {extractor: _2, type: $2}});
              };
            };
          };
        };
      };
    };
  }

  var CheckedBinaryType =
  def ('BinaryType')
      ({})
      ([String_,
        String_,
        Function_ ([Any, Boolean_]),
        Function_ ([Unchecked ('t a b'), Array_ (Unchecked ('a'))]),
        Function_ ([Unchecked ('t a b'), Array_ (Unchecked ('b'))]),
        AnyFunction])
      (function(name) {
         return function(url) {
           return function(test) {
             return function(_1) {
               return function(_2) {
                 return def (stripNamespace (name))
                            ({})
                            ([Type, Type, Type])
                            (BinaryType (name) (url) (test) (_1) (_2));
               };
             };
           };
         };
       });

  //  xprod :: (Type, Array Type, Array Type) -> Array Type
  function xprod(t, $1s, $2s) {
    return Z.chain (
      function(specialize) { return Z.map (specialize, $2s); },
      Z.map (BinaryType (t.name)
                        (t.url)
                        (t._test)
                        (t.types.$1.extractor)
                        (t.types.$2.extractor),
             $1s)
    );
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
  //.   ('my-package/Denomination')
  //.   ('http://example.com/my-package#Denomination')
  //.   ([10, 20, 50, 100, 200]);
  //. ```
  function EnumType(name) {
    return function(url) {
      return compose (NullaryType (name) (url), memberOf);
    };
  }

  var CheckedEnumType =
  def ('EnumType')
      ({})
      ([String_, String_, Array_ (Any), Type])
      (EnumType);

  //# RecordType :: StrMap Type -> Type
  //.
  //. `RecordType` is used to construct record types. The type definition
  //. specifies the name and type of each required field. A field is an
  //. enumerable property (either an own property or an inherited property).
  //.
  //. To define a record type one must provide:
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
               unless (t.type === RECORD || isEmpty (t.keys),
                       stripOutermostParens,
                       inner (k) (show (t)));
      }, keys);
      return wrap (outer ('{')) (outer (' }')) (joinWith (outer (','), reprs));
    }

    function test(x) {
      var missing = {};
      keys.forEach (function(k) { missing[k] = k; });
      for (var k in x) delete missing[k];
      return isEmpty (Object.keys (missing));
    }

    var $types = {};
    keys.forEach (function(k) {
      $types[k] = {extractor: function(x) { return [x[k]]; }, type: fields[k]};
    });

    return new _Type (RECORD, '', '', format, test, keys, $types);
  }

  var CheckedRecordType =
  def ('RecordType') ({}) ([StrMap (Type), Type]) (RecordType);

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
    return new _Type (VARIABLE, name, '', always2 (name), K (true), [], {});
  }

  var CheckedTypeVariable =
  def ('TypeVariable') ({}) ([String_, Type]) (TypeVariable);

  //# UnaryTypeVariable :: String -> Type -> Type
  //.
  //. Combines [`UnaryType`][] and [`TypeVariable`][].
  //.
  //. To define a unary type variable `t a` one must provide:
  //.
  //.   - a name (conventionally matching `^[a-z]$`); and
  //.
  //.   - the type of `a` (exposed as `t.types.$1.type`).
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
      function format(outer, inner) {
        return outer ('(' + name + ' ') +
               inner ('$1') (show ($1)) +
               outer (')');
      }
      var types = {$1: {extractor: K ([]), type: $1}};
      return new _Type (VARIABLE, name, '', format, K (true), ['$1'], types);
    };
  }

  var CheckedUnaryTypeVariable =
  def ('UnaryTypeVariable')
      ({})
      ([String_, AnyFunction])
      (function(name) {
         return def (name) ({}) ([Type, Type]) (UnaryTypeVariable (name));
       });

  //# BinaryTypeVariable :: String -> Type -> Type -> Type
  //.
  //. Combines [`BinaryType`][] and [`TypeVariable`][].
  //.
  //. To define a binary type variable `t a b` one must provide:
  //.
  //.   - a name (conventionally matching `^[a-z]$`);
  //.
  //.   - the type of `a` (exposed as `t.types.$1.type`); and
  //.
  //.   - the type of `b` (exposed as `t.types.$2.type`).
  //.
  //. The more detailed explanation of [`UnaryTypeVariable`][] also applies to
  //. `BinaryTypeVariable`.
  function BinaryTypeVariable(name) {
    return function($1) {
      return function($2) {
        function format(outer, inner) {
          return outer ('(' + name + ' ') +
                 inner ('$1') (show ($1)) +
                 outer (' ') +
                 inner ('$2') (show ($2)) +
                 outer (')');
        }
        var keys = ['$1', '$2'];
        var types = {$1: {extractor: K ([]), type: $1},
                     $2: {extractor: K ([]), type: $2}};
        return new _Type (VARIABLE, name, '', format, K (true), keys, types);
      };
    };
  }

  var CheckedBinaryTypeVariable =
  def ('BinaryTypeVariable')
      ({})
      ([String_, AnyFunction])
      (function(name) {
         return def (name)
                    ({})
                    ([Type, Type, Type])
                    (BinaryTypeVariable (name));
       });

  //# Thunk :: Type -> Type
  //.
  //. `$.Thunk (T)` is shorthand for `$.Function ([T])`, the type comprising
  //. every nullary function (thunk) which returns a value of type `T`.
  var Thunk =
  def ('Thunk')
      ({})
      ([Type, Type])
      (function(t) { return Function_ ([t]); });

  //# Predicate :: Type -> Type
  //.
  //. `$.Predicate (T)` is shorthand for `$.Function ([T, $.Boolean])`, the
  //. type comprising every predicate function which takes a value of type `T`.
  var Predicate =
  def ('Predicate')
      ({})
      ([Type, Type])
      (function(t) { return Function_ ([t, Boolean_]); });

  //. ### Type classes
  //.
  //. `concatS`, defined earlier, is a function which concatenates two strings.
  //. This is overly restrictive, since other types support concatenation
  //. (Array, for example).
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
        $reprs.push (
          f (typeClass) (stripNamespace (typeClass.name) + ' ' + k)
        );
      });
    });
    return when ($reprs.length > 0,
                 function(s) { return s + outer (' => '); },
                 when ($reprs.length > 1,
                       wrap (outer ('(')) (outer (')')),
                       joinWith (outer (', '), $reprs)));
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
      Z.chain (function(k) { return typeVarNames (t.types[k].type); }, t.keys)
    );
  }

  //  showTypeWith :: TypeInfo -> Type -> String
  function showTypeWith(typeInfo) {
    var names = Z.chain (typeVarNames, typeInfo.types);
    return function(t) {
      var code = 'a'.charCodeAt (0);
      return unless (
        t.type === FUNCTION || t.type === RECORD || isEmpty (t.keys),
        stripOutermostParens,
        (show (t)).replace (/\bUnknown\b/g, function() {
          // eslint-disable-next-line no-plusplus
          do var name = String.fromCharCode (code++);
          while (names.indexOf (name) >= 0);
          return name;
        })
      );
    };
  }

  //  showTypeQuoted :: Type -> String
  function showTypeQuoted(t) {
    return q (unless (t.type === RECORD || isEmpty (t.keys),
                      stripOutermostParens,
                      show (t)));
  }

  //  showValuesAndTypes :: ... -> String
  function showValuesAndTypes(
    env,            // :: Array Type
    typeInfo,       // :: TypeInfo
    values,         // :: Array Any
    pos             // :: Integer
  ) {
    var showType = showTypeWith (typeInfo);
    return show (pos) + ')  ' + joinWith ('\n    ', Z.map (function(x) {
      var types = determineActualTypesLoose (env, [x]);
      return show (x) + ' :: ' + joinWith (', ', Z.map (showType, types));
    }, values));
  }

  //  typeSignature :: TypeInfo -> String
  function typeSignature(typeInfo) {
    var reprs = Z.map (showTypeWith (typeInfo), typeInfo.types);
    var arity = reprs.length - 1;
    return typeInfo.name + ' :: ' +
             constraintsRepr (typeInfo.constraints, id, K (K (id))) +
             when (arity === 0,
                   parenthesize,
                   joinWith (' -> ', init (reprs))) +
             ' -> ' + last (reprs);
  }

  //  _underline :: ... -> String
  function _underline(
    t,              // :: Type
    propPath,       // :: PropPath
    formatType3     // :: Type -> Array String -> String -> String
  ) {
    return unless (t.type === RECORD ||
                     isEmpty (t.keys) ||
                     t.type === FUNCTION && isEmpty (propPath) ||
                     !isEmpty (propPath),
                   stripOutermostParens,
                   formatType3 (t) (propPath) (t.format (_, function(k) {
                     return K (_underline (t.types[k].type,
                                           Z.concat (propPath, [k]),
                                           formatType3));
                   })));
  }

  //  underline :: ... -> String
  function underline(
    typeInfo,               // :: TypeInfo
    underlineConstraint,    // :: String -> TypeClass -> String -> String
    formatType5
    // :: Integer -> (String -> String) -> Type -> PropPath -> String -> String
  ) {
    var st = typeInfo.types.reduce (function(st, t, index) {
      var formatType4 = formatType5 (index);
      st.numbers.push (_underline (t, [], formatType4 (function(s) {
        return label (show (st.counter += 1)) (s);
      })));
      st.carets.push (_underline (t, [], W (function(type) {
        var repr = show (type);
        var parenthesized = repr.slice (0, 1) + repr.slice (-1) === '()';
        return formatType4 (function(s) {
          return parenthesized && repr !== '()' && s.length === repr.length ?
            _ ('(') + r ('^') (s.slice (1, -1)) + _ (')') :
            r ('^') (s);
        });
      })));
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
    return Z.reduce (function(t, prop) { return t.types[prop].type; },
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
            return p && q ? f : p ? id : _;
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
      stripNamespace (typeClass.name) + ' type-class constraint; ' +
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
      values.length === 1 &&
      isEmpty (determineActualTypesLoose (env, values)) ?
        'Unrecognized value\n\n' +
        underlinedTypeVars + '\n' +
        '1)  ' + show (values[0]) + ' :: (no types)\n\n' +
        toMarkdownList (
          'The environment is empty! ' +
          'Polymorphic functions require a non-empty environment.\n',
          'The value at position 1 is not a member of any type in ' +
          'the environment.\n\n' +
          'The environment contains the following types:\n\n',
          showTypeWith (typeInfo),
          env
        ) :
      // else
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
    return new TypeError (trimTrailingSpaces (
      'Invalid value\n\n' +
      underline (typeInfo,
                 K (K (_)),
                 formatType6 (Z.concat ([index], propPath))) +
      '\n' +
      showValuesAndTypes (env, typeInfo, [value], 1) + '\n\n' +
      'The value at position 1 is not a member of ' +
      showTypeQuoted (t) + '.\n' +
      see ('type', t)
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
      ' applied ' + showTypeQuoted (typeInfo.types[index]) +
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
      if (typeInfo.types[index].type !== FUNCTION) return value;

      var expType = typeInfo.types[index];

      //  checkValue :: (TypeVarMap, Integer, String, a) -> Either (() -> Error) TypeVarMap
      function checkValue(typeVarMap, index, k, x) {
        var propPath = [k];
        var t = expType.types[k].type;
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

      var isThunk = expType.types.$1.type.type === NO_ARGUMENTS;
      var numArgsExpected = isThunk ? 0 : expType.keys.length - 1;
      var typeVarMap = _typeVarMap;
      return function(x) {
        if (arguments.length !== numArgsExpected) {
          throw invalidArgumentsLength (typeInfo,
                                        index,
                                        numArgsExpected,
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
        var typeVarMap = assertRight (
          satisfactoryTypes (env,
                             typeInfo,
                             {},
                             typeInfo.types[n],
                             n,
                             [],
                             [value])
        ).typeVarMap;
        return wrapFunctionCond (typeVarMap, n, value);
      } :
      wrapNext ({}, [], 0);

    wrapped.inspect = wrapped.toString = always0 (typeSignature (typeInfo));

    return wrapped;
  }

  function _create(opts) {
    function def(name) {
      return function(constraints) {
        return function(expTypes) {
          return function(impl) {
            return opts.checkTypes ?
              withTypeChecking (opts.env,
                                {name: name,
                                 constraints: constraints,
                                 types: augmentThunk (expTypes)},
                                impl) :
              impl;
          };
        };
      };
    }
    return def (def.name)
               ({})
               ([String_,
                 StrMap (Array_ (TypeClass)),
                 NonEmpty (Array_ (Type)),
                 AnyFunction,
                 AnyFunction])
               (def);
  }

  var create =
  def ('create')
      ({})
      ([RecordType ({checkTypes: Boolean_, env: Array_ (Any)}), AnyFunction])
      (_create);

  //  fromUncheckedUnaryType :: (Type -> Type) -> Type -> Type
  function fromUncheckedUnaryType(typeConstructor) {
    var t = typeConstructor (Unknown);
    var _1 = t.types.$1.extractor;
    return CheckedUnaryType (t.name) (t.url) (t._test) (_1);
  }

  //  fromUncheckedBinaryType :: (Type -> Type -> Type) -> Type -> Type -> Type
  function fromUncheckedBinaryType(typeConstructor) {
    var t = typeConstructor (Unknown) (Unknown);
    var _1 = t.types.$1.extractor;
    var _2 = t.types.$2.extractor;
    return CheckedBinaryType (t.name) (t.url) (t._test) (_1) (_2);
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
    Error: Error_,
    FiniteNumber: FiniteNumber,
    Function: def ('Function') ({}) ([Array_ (Type), Type]) (Function_),
    GlobalRegExp: GlobalRegExp,
    Integer: Integer,
    NegativeFiniteNumber: NegativeFiniteNumber,
    NegativeInteger: NegativeInteger,
    NegativeNumber: NegativeNumber,
    NonEmpty: NonEmpty,
    NonGlobalRegExp: NonGlobalRegExp,
    NonNegativeInteger: NonNegativeInteger,
    NonZeroFiniteNumber: NonZeroFiniteNumber,
    NonZeroInteger: NonZeroInteger,
    NonZeroValidNumber: NonZeroValidNumber,
    Null: Null,
    Nullable: fromUncheckedUnaryType (Nullable),
    Number: Number_,
    Object: Object_,
    PositiveFiniteNumber: PositiveFiniteNumber,
    PositiveInteger: PositiveInteger,
    PositiveNumber: PositiveNumber,
    RegExp: RegExp_,
    RegexFlags: RegexFlags,
    StrMap: fromUncheckedUnaryType (StrMap),
    String: String_,
    Symbol: Symbol_,
    Type: Type,
    TypeClass: TypeClass,
    Undefined: Undefined,
    Unknown: Unknown,
    ValidDate: ValidDate,
    ValidNumber: ValidNumber,
    env: env,
    create: create,
    test: def ('test') ({}) ([Array_ (Type), Type, Any, Boolean_]) (test),
    NullaryType: CheckedNullaryType,
    UnaryType: CheckedUnaryType,
    BinaryType: CheckedBinaryType,
    EnumType: CheckedEnumType,
    RecordType: CheckedRecordType,
    TypeVariable: CheckedTypeVariable,
    UnaryTypeVariable: CheckedUnaryTypeVariable,
    BinaryTypeVariable: CheckedBinaryTypeVariable,
    Thunk: Thunk,
    Predicate: Predicate
  };

}));

//. [FL:Semigroup]:         https://github.com/fantasyland/fantasy-land#semigroup
//. [Monoid]:               https://github.com/fantasyland/fantasy-land#monoid
//. [Setoid]:               https://github.com/fantasyland/fantasy-land#setoid
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
//. [record type]:          #RecordType
//. [semigroup]:            https://en.wikipedia.org/wiki/Semigroup
//. [type class]:           #type-classes
//. [type variables]:       #TypeVariable
//. [types]:                #types
