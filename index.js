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
//. const $ = require('sanctuary-def');
//. ```
//.
//. The next step is to define an environment. An environment is an array
//. of [types][]. [`env`][] is an environment containing all the built-in
//. JavaScript types. It may be used as the basis for environments which
//. include custom types in addition to the built-in types:
//.
//. ```javascript
//. //    Integer :: Type
//. const Integer = ...;
//.
//. //    NonZeroInteger :: Type
//. const NonZeroInteger = ...;
//.
//. //    env :: Array Type
//. const env = $.env.concat([Integer, NonZeroInteger]);
//. ```
//.
//. The next step is to define a `def` function for the environment:
//.
//. ```javascript
//. const def = $.create({checkTypes: true, env: env});
//. ```
//.
//. The `checkTypes` option determines whether type checking is enabled.
//. This allows one to only pay the performance cost of run-time type checking
//. during development. For example:
//.
//. ```javascript
//. const def = $.create({
//.   checkTypes: process.env.NODE_ENV === 'development',
//.   env: env,
//. });
//. ```
//.
//. `def` is a function for defining functions. For example:
//.
//. ```javascript
//. //    add :: Number -> Number -> Number
//. const add =
//. def('add', {}, [$.Number, $.Number, $.Number], (x, y) => x + y);
//. ```
//.
//. `[$.Number, $.Number, $.Number]` specifies that `add` takes two arguments
//. of type `Number` and returns a value of type `Number`.
//.
//. Applying `add` to two arguments gives the expected result:
//.
//. ```javascript
//. add(2, 2);
//. // => 4
//. ```
//.
//. Applying `add` to greater than two arguments results in an exception being
//. thrown:
//.
//. ```javascript
//. add(2, 2, 2);
//. // ! TypeError: ‘add’ requires two arguments; received three arguments
//. ```
//.
//. Applying `add` to fewer than two arguments results in a function
//. awaiting the remaining arguments. This is known as partial application.
//. Partial application is convenient as it allows more specific functions
//. to be defined in terms of more general ones:
//.
//. ```javascript
//. //    inc :: Number -> Number
//. const inc = add(1);
//.
//. inc(7);
//. // => 8
//. ```
//.
//. JavaScript's implicit type coercion often obfuscates the source of type
//. errors. Consider the following function:
//.
//. ```javascript
//. //    _add :: (Number, Number) -> Number
//. const _add = (x, y) => x + y;
//. ```
//.
//. The type signature indicates that `_add` takes two arguments of type
//. `Number`, but this is not enforced. This allows type errors to be silently
//. ignored:
//.
//. ```javascript
//. _add('2', '2');
//. // => '22'
//. ```
//.
//. `add`, on the other hand, throws if applied to arguments of the wrong
//. types:
//.
//. ```javascript
//. add('2', '2');
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
//. add('X');
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
    module.exports = f(require('sanctuary-type-classes'),
                       require('sanctuary-type-identifiers'));
  } else if (typeof define === 'function' && define.amd != null) {
    define(['sanctuary-type-classes', 'sanctuary-type-identifiers'], f);
  } else {
    self.sanctuaryDef = f(self.sanctuaryTypeClasses,
                          self.sanctuaryTypeIdentifiers);
  }

}(function(Z, type) {

  'use strict';

  //# __ :: Placeholder
  //.
  //. The special placeholder value.
  //.
  //. One may wish to partially apply a function whose parameters are in the
  //. "wrong" order. Functions defined via sanctuary-def accommodate this by
  //. accepting placeholders for arguments yet to be provided. For example:
  //.
  //. ```javascript
  //. //    concatS :: String -> String -> String
  //. const concatS =
  //. def('concatS', {}, [$.String, $.String, $.String], (x, y) => x + y);
  //.
  //. //    exclaim :: String -> String
  //. const exclaim = concatS($.__, '!');
  //.
  //. exclaim('ahoy');
  //. // => 'ahoy!'
  //. ```
  var __ = {'@@functional/placeholder': true};

  var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;
  var MIN_SAFE_INTEGER = -MAX_SAFE_INTEGER;

  var slice             = Array.prototype.slice;
  var hasOwnProperty    = Object.prototype.hasOwnProperty;

  function Either(tag, value) {
    this.isLeft = tag === 'Left';
    this.isRight = tag === 'Right';
    this.value = value;
  }

  Either['@@type'] = 'sanctuary-def/Either';

  Either.prototype['fantasy-land/map'] = function(f) {
    return this.isLeft ? this : Right(f(this.value));
  };

  Either.prototype['fantasy-land/chain'] = function(f) {
    return this.isLeft ? this : f(this.value);
  };

  //  Left :: a -> Either a b
  function Left(x) { return new Either('Left', x); }

  //  Right :: b -> Either a b
  function Right(x) { return new Either('Right', x); }

  //  K :: a -> b -> a
  function K(x) { return function(y) { return x; }; }

  //  always :: a -> (-> a)
  function always(x) { return function() { return x; }; }

  //  always2 :: a -> (b, c) -> a
  function always2(x) { return function(y, z) { return x; }; }

  //  id :: a -> a
  function id(x) { return x; }

  //  init :: Array a -> Array a
  function init(xs) { return xs.slice(0, -1); }

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

  //  last :: Array a -> a
  function last(xs) { return xs[xs.length - 1]; }

  //  memberOf :: Array a -> a -> Boolean
  function memberOf(xs) {
    return function(y) {
      return xs.some(function(x) { return Z.equals(x, y); });
    };
  }

  //  or :: (Array a, Array a) -> Array a
  function or(xs, ys) { return isEmpty(xs) ? ys : xs; }

  //  range :: (Number, Number) -> Array Number
  function range(start, stop) {
    var result = [];
    for (var n = start; n < stop; n += 1) result.push(n);
    return result;
  }

  //  strRepeat :: (String, Integer) -> String
  function strRepeat(s, times) {
    return Array(times + 1).join(s);
  }

  //  r :: Char -> String -> String
  function r(c) {
    return function(s) {
      return strRepeat(c, s.length);
    };
  }

  //  _ :: String -> String
  var _ = r(' ');

  //  stripOutermostParens :: String -> String
  function stripOutermostParens(s) {
    return s.slice('('.length, -')'.length);
  }

  //  trimTrailingSpaces :: String -> String
  function trimTrailingSpaces(s) {
    return s.replace(/[ ]+$/gm, '');
  }

  //  unless :: (Boolean, (a -> a), a) -> a
  function unless(bool, f, x) {
    return bool ? x : f(x);
  }

  //  when :: (Boolean, (a -> a), a) -> a
  function when(bool, f, x) {
    return bool ? f(x) : x;
  }

  //  wrap :: String -> String -> String -> String
  function wrap(prefix) {
    return function(suffix) {
      return function(s) {
        return prefix + s + suffix;
      };
    };
  }

  //  q :: String -> String
  var q = wrap('\u2018')('\u2019');

  //  stripNamespace :: String -> String
  function stripNamespace(s) { return s.slice(s.indexOf('/') + 1); }

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

  _Type.prototype.validate = function(x) {
    if (!this._test(x)) return Left({value: x, propPath: []});
    for (var idx = 0; idx < this.keys.length; idx += 1) {
      var k = this.keys[idx];
      var t = this.types[k];
      for (var idx2 = 0, ys = t.extractor(x); idx2 < ys.length; idx2 += 1) {
        var result = t.type.validate(ys[idx2]);
        if (result.isLeft) {
          var value = result.value.value;
          var propPath = Z.concat([k], result.value.propPath);
          return Left({value: value, propPath: propPath});
        }
      }
    }
    return Right(x);
  };

  _Type.prototype.toString = function() {
    return this.format(id, K(id));
  };

  var BINARY        = 'BINARY';
  var FUNCTION      = 'FUNCTION';
  var INCONSISTENT  = 'INCONSISTENT';
  var NULLARY       = 'NULLARY';
  var RECORD        = 'RECORD';
  var UNARY         = 'UNARY';
  var UNKNOWN       = 'UNKNOWN';
  var VARIABLE      = 'VARIABLE';

  //  Inconsistent :: Type
  var Inconsistent =
  new _Type(INCONSISTENT, '', '', always2('???'), K(false), [], {});

  //  typeEq :: String -> a -> Boolean
  function typeEq(name) {
    return function(x) {
      return type(x) === name;
    };
  }

  //  typeofEq :: String -> a -> Boolean
  function typeofEq(typeof_) {
    return function(x) {
      return typeof x === typeof_;
    };
  }

  //  functionUrl :: String -> String
  function functionUrl(name) {
    var version = '0.9.0';  // updated programmatically
    return 'https://github.com/sanctuary-js/sanctuary-def/tree/v' + version +
           '#' + stripNamespace(name);
  }

  //  NullaryTypeWithUrl :: (String, Any -> Boolean) -> Type
  function NullaryTypeWithUrl(name, test) {
    return NullaryType(name, functionUrl(name), test);
  }

  //  EnumTypeWithUrl :: (String, Array Any) -> Type
  function EnumTypeWithUrl(name, members) {
    return EnumType(name, functionUrl(name), members);
  }

  //  UnaryTypeWithUrl ::
  //    (String, Any -> Boolean, t a -> Array a) -> (Type -> Type)
  function UnaryTypeWithUrl(name, test, _1) {
    return UnaryType(name, functionUrl(name), test, _1);
  }

  //  BinaryTypeWithUrl ::
  //    (String, Any -> Boolean, t a b -> Array a, t a b -> Array b) ->
  //      ((Type, Type) -> Type)
  function BinaryTypeWithUrl(name, test, _1, _2) {
    return BinaryType(name, functionUrl(name), test, _1, _2);
  }

  //  applyParameterizedTypes :: Array Type -> Array Type
  function applyParameterizedTypes(types) {
    return Z.map(function(x) {
      return typeof x === 'function' ?
        x.apply(null, Z.map(K(Unknown), range(0, x.length))) :
        x;
    }, types);
  }

  //. ### Types
  //.
  //. Conceptually, a type is a set of values. One can think of a value of
  //. type `Type` as a function of type `Any -> Boolean` which tests values
  //. for membership in the set (though this is an oversimplification).

  //# Any :: Type
  //.
  //. Type comprising every JavaScript value.
  var Any = NullaryTypeWithUrl('sanctuary-def/Any', K(true));

  //# AnyFunction :: Type
  //.
  //. Type comprising every Function value.
  var AnyFunction = NullaryTypeWithUrl('Function', typeEq('Function'));

  //# Arguments :: Type
  //.
  //. Type comprising every [`arguments`][arguments] object.
  var Arguments = NullaryTypeWithUrl('Arguments', typeEq('Arguments'));

  //# Array :: Type -> Type
  //.
  //. Constructor for homogeneous Array types.
  var Array_ = UnaryTypeWithUrl('Array', typeEq('Array'), id);

  //# Boolean :: Type
  //.
  //. Type comprising `true` and `false`.
  var Boolean_ = NullaryTypeWithUrl('Boolean', typeofEq('boolean'));

  //# Date :: Type
  //.
  //. Type comprising every Date value.
  var Date_ = NullaryTypeWithUrl('Date', typeEq('Date'));

  //# Error :: Type
  //.
  //. Type comprising every Error value, including values of more specific
  //. constructors such as [`SyntaxError`][] and [`TypeError`][].
  var Error_ = NullaryTypeWithUrl('Error', typeEq('Error'));

  //# FiniteNumber :: Type
  //.
  //. Type comprising every [`ValidNumber`][] value except `Infinity` and
  //. `-Infinity`.
  var FiniteNumber = NullaryTypeWithUrl(
    'sanctuary-def/FiniteNumber',
    function(x) { return ValidNumber._test(x) && isFinite(x); }
  );

  //# Function :: Array Type -> Type
  //.
  //. Constructor for Function types.
  //.
  //. Examples:
  //.
  //.   - `$.Function([$.Date, $.String])` represents the `Date -> String`
  //.     type; and
  //.   - `$.Function([a, b, a])` represents the `(a, b) -> a` type.
  function Function_(types) {
    function format(outer, inner) {
      var xs = types.map(function(t, idx) {
        return unless(t.type === RECORD || isEmpty(t.keys),
                      stripOutermostParens,
                      inner('$' + String(idx + 1))(String(t)));
      });
      var parenthesize = wrap(outer('('))(outer(')'));
      return parenthesize(unless(types.length === 2,
                                 parenthesize,
                                 init(xs).join(outer(', '))) +
                          outer(' -> ') +
                          last(xs));
    }

    var test = AnyFunction._test;

    var $keys = [];
    var $types = {};
    types.forEach(function(t, idx) {
      var k = '$' + String(idx + 1);
      $keys.push(k);
      $types[k] = {extractor: K([]), type: t};
    });

    return new _Type(FUNCTION, '', '', format, test, $keys, $types);
  }

  //# GlobalRegExp :: Type
  //.
  //. Type comprising every [`RegExp`][] value whose `global` flag is `true`.
  //.
  //. See also [`NonGlobalRegExp`][].
  var GlobalRegExp = NullaryTypeWithUrl(
    'sanctuary-def/GlobalRegExp',
    function(x) { return RegExp_._test(x) && x.global; }
  );

  //# Integer :: Type
  //.
  //. Type comprising every integer in the range
  //. [[`Number.MIN_SAFE_INTEGER`][min] .. [`Number.MAX_SAFE_INTEGER`][max]].
  var Integer = NullaryTypeWithUrl(
    'sanctuary-def/Integer',
    function(x) {
      return ValidNumber._test(x) &&
             Math.floor(x) === x &&
             x >= MIN_SAFE_INTEGER &&
             x <= MAX_SAFE_INTEGER;
    }
  );

  //# NegativeFiniteNumber :: Type
  //.
  //. Type comprising every [`FiniteNumber`][] value less than zero.
  var NegativeFiniteNumber = NullaryTypeWithUrl(
    'sanctuary-def/NegativeFiniteNumber',
    function(x) { return FiniteNumber._test(x) && x < 0; }
  );

  //# NegativeInteger :: Type
  //.
  //. Type comprising every [`Integer`][] value less than zero.
  var NegativeInteger = NullaryTypeWithUrl(
    'sanctuary-def/NegativeInteger',
    function(x) { return Integer._test(x) && x < 0; }
  );

  //# NegativeNumber :: Type
  //.
  //. Type comprising every [`Number`][] value less than zero.
  var NegativeNumber = NullaryTypeWithUrl(
    'sanctuary-def/NegativeNumber',
    function(x) { return Number_._test(x) && x < 0; }
  );

  //# NonGlobalRegExp :: Type
  //.
  //. Type comprising every [`RegExp`][] value whose `global` flag is `false`.
  //.
  //. See also [`GlobalRegExp`][].
  var NonGlobalRegExp = NullaryTypeWithUrl(
    'sanctuary-def/NonGlobalRegExp',
    function(x) { return RegExp_._test(x) && !x.global; }
  );

  //# NonZeroFiniteNumber :: Type
  //.
  //. Type comprising every [`FiniteNumber`][] value except `0` and `-0`.
  var NonZeroFiniteNumber = NullaryTypeWithUrl(
    'sanctuary-def/NonZeroFiniteNumber',
    function(x) { return FiniteNumber._test(x) && x !== 0; }
  );

  //# NonZeroInteger :: Type
  //.
  //. Type comprising every [`Integer`][] value except `0` and `-0`.
  var NonZeroInteger = NullaryTypeWithUrl(
    'sanctuary-def/NonZeroInteger',
    function(x) { return Integer._test(x) && x !== 0; }
  );

  //# NonZeroValidNumber :: Type
  //.
  //. Type comprising every [`ValidNumber`][] value except `0` and `-0`.
  var NonZeroValidNumber = NullaryTypeWithUrl(
    'sanctuary-def/NonZeroValidNumber',
    function(x) { return ValidNumber._test(x) && x !== 0; }
  );

  //# Null :: Type
  //.
  //. Type whose sole member is `null`.
  var Null = NullaryTypeWithUrl('Null', typeEq('Null'));

  //# Nullable :: Type -> Type
  //.
  //. Constructor for types which include `null` as a member.
  var Nullable = UnaryTypeWithUrl(
    'sanctuary-def/Nullable',
    K(true),
    function(nullable) { return nullable === null ? [] : [nullable]; }
  );

  //# Number :: Type
  //.
  //. Type comprising every primitive Number value (including `NaN`).
  var Number_ = NullaryTypeWithUrl('Number', typeofEq('number'));

  //# Object :: Type
  //.
  //. Type comprising every "plain" Object value. Specifically, values
  //. created via:
  //.
  //.   - object literal syntax;
  //.   - [`Object.create`][]; or
  //.   - the `new` operator in conjunction with `Object` or a custom
  //.     constructor function.
  var Object_ = NullaryTypeWithUrl('Object', typeEq('Object'));

  //# Pair :: Type -> Type -> Type
  //.
  //. Constructor for tuple types of length 2. Arrays are said to represent
  //. tuples. `['foo', 42]` is a member of `Pair String Number`.
  var Pair = BinaryTypeWithUrl(
    'sanctuary-def/Pair',
    function(x) { return typeEq('Array')(x) && x.length === 2; },
    function(pair) { return [pair[0]]; },
    function(pair) { return [pair[1]]; }
  );

  //# PositiveFiniteNumber :: Type
  //.
  //. Type comprising every [`FiniteNumber`][] value greater than zero.
  var PositiveFiniteNumber = NullaryTypeWithUrl(
    'sanctuary-def/PositiveFiniteNumber',
    function(x) { return FiniteNumber._test(x) && x > 0; }
  );

  //# PositiveInteger :: Type
  //.
  //. Type comprising every [`Integer`][] value greater than zero.
  var PositiveInteger = NullaryTypeWithUrl(
    'sanctuary-def/PositiveInteger',
    function(x) { return Integer._test(x) && x > 0; }
  );

  //# PositiveNumber :: Type
  //.
  //. Type comprising every [`Number`][] value greater than zero.
  var PositiveNumber = NullaryTypeWithUrl(
    'sanctuary-def/PositiveNumber',
    function(x) { return Number_._test(x) && x > 0; }
  );

  //# RegExp :: Type
  //.
  //. Type comprising every RegExp value.
  var RegExp_ = NullaryTypeWithUrl('RegExp', typeEq('RegExp'));

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
  var RegexFlags = EnumTypeWithUrl(
    'sanctuary-def/RegexFlags',
    ['', 'g', 'i', 'm', 'gi', 'gm', 'im', 'gim']
  );

  //# StrMap :: Type -> Type
  //.
  //. Constructor for homogeneous Object types.
  //.
  //. `{foo: 1, bar: 2, baz: 3}`, for example, is a member of `StrMap Number`;
  //. `{foo: 1, bar: 2, baz: 'XXX'}` is not.
  var StrMap = UnaryTypeWithUrl(
    'sanctuary-def/StrMap',
    Object_._test,
    function(strMap) {
      return Z.map(function(k) { return strMap[k]; },
                   Object.keys(strMap).sort());
    }
  );

  //# String :: Type
  //.
  //. Type comprising every primitive String value.
  var String_ = NullaryTypeWithUrl('String', typeofEq('string'));

  //# Undefined :: Type
  //.
  //. Type whose sole member is `undefined`.
  var Undefined = NullaryTypeWithUrl('Undefined', typeEq('Undefined'));

  //# Unknown :: Type
  //.
  //. Type used internally to represent missing type information. The type of
  //. `[]`, for example, is `Array ???`. This type is exported solely for use
  //. by other Sanctuary packages.
  var Unknown = new _Type(UNKNOWN, '', '', always2('???'), K(true), [], {});

  //# ValidDate :: Type
  //.
  //. Type comprising every [`Date`][] value except `new Date(NaN)`.
  var ValidDate = NullaryTypeWithUrl(
    'sanctuary-def/ValidDate',
    function(x) { return Date_._test(x) && !isNaN(x.valueOf()); }
  );

  //# ValidNumber :: Type
  //.
  //. Type comprising every [`Number`][] value except `NaN`.
  var ValidNumber = NullaryTypeWithUrl(
    'sanctuary-def/ValidNumber',
    function(x) { return Number_._test(x) && !isNaN(x); }
  );

  //# env :: Array Type
  //.
  //. An array of [types][]:
  //.
  //.   - [`AnyFunction`][]
  //.   - [`Arguments`][]
  //.   - [`Array`][]
  //.   - [`Boolean`][]
  //.   - [`Date`][]
  //.   - [`Error`][]
  //.   - [`Null`][]
  //.   - [`Number`][]
  //.   - [`Object`][]
  //.   - [`RegExp`][]
  //.   - [`StrMap`][]
  //.   - [`String`][]
  //.   - [`Undefined`][]
  var env = applyParameterizedTypes([
    AnyFunction,
    Arguments,
    Array_,
    Boolean_,
    Date_,
    Error_,
    Null,
    Number_,
    Object_,
    RegExp_,
    StrMap,
    String_,
    Undefined
  ]);

  //  Type :: Type
  var Type = NullaryType(
    'sanctuary-def/Type',
    '',
    typeEq('sanctuary-def/Type')
  );

  //  TypeClass :: Type
  var TypeClass = NullaryType(
    'sanctuary-type-classes/TypeClass',
    '',
    typeEq('sanctuary-type-classes/TypeClass')
  );

  //  Unchecked :: String -> Type
  function Unchecked(s) { return NullaryType(s, '', K(true)); }

  var def = _create({checkTypes: true, env: env});

  //  arity :: (Number, Function) -> Function
  function arity(n, f) {
    return (
      n === 0 ?
        function() {
          return f.apply(this, arguments);
        } :
      n === 1 ?
        function($1) {
          return f.apply(this, arguments);
        } :
      n === 2 ?
        function($1, $2) {
          return f.apply(this, arguments);
        } :
      n === 3 ?
        function($1, $2, $3) {
          return f.apply(this, arguments);
        } :
      n === 4 ?
        function($1, $2, $3, $4) {
          return f.apply(this, arguments);
        } :
      n === 5 ?
        function($1, $2, $3, $4, $5) {
          return f.apply(this, arguments);
        } :
      n === 6 ?
        function($1, $2, $3, $4, $5, $6) {
          return f.apply(this, arguments);
        } :
      n === 7 ?
        function($1, $2, $3, $4, $5, $6, $7) {
          return f.apply(this, arguments);
        } :
      n === 8 ?
        function($1, $2, $3, $4, $5, $6, $7, $8) {
          return f.apply(this, arguments);
        } :
      // else
        function($1, $2, $3, $4, $5, $6, $7, $8, $9) {
          return f.apply(this, arguments);
        }
    );
  }

  //  numArgs :: Number -> String
  function numArgs(n) {
    switch (n) {
      case  0:  return  'zero arguments';
      case  1:  return   'one argument';
      case  2:  return   'two arguments';
      case  3:  return 'three arguments';
      case  4:  return  'four arguments';
      case  5:  return  'five arguments';
      case  6:  return   'six arguments';
      case  7:  return 'seven arguments';
      case  8:  return 'eight arguments';
      case  9:  return  'nine arguments';
      default:  return  n + ' arguments';
    }
  }

  //  _determineActualTypes :: ... -> Array Type
  function _determineActualTypes(
    loose,          // :: Boolean
    env,            // :: Array Type
    types,          // :: Array Type
    seen,           // :: Array Object
    values          // :: Array Any
  ) {
    var recur = _determineActualTypes;

    function refine(types, value) {
      var seen$;
      if (typeof value === 'object' && value != null ||
          typeof value === 'function') {
        //  Abort if a circular reference is encountered; add the current
        //  object to the array of seen objects otherwise.
        if (seen.indexOf(value) >= 0) return [];
        seen$ = Z.concat(seen, [value]);
      } else {
        seen$ = seen;
      }
      return Z.chain(function(t) {
        return (
          t.name === 'sanctuary-def/Nullable' || t.validate(value).isLeft ?
            [] :
          t.type === UNARY ?
            Z.map(fromUnaryType(t),
                  recur(loose, env, env, seen$, t.types.$1.extractor(value))) :
          t.type === BINARY ?
            xprod(
              t,
              t.types.$1.type.type === UNKNOWN ?
                recur(loose, env, env, seen$, t.types.$1.extractor(value)) :
                [t.types.$1.type],
              t.types.$2.type.type === UNKNOWN ?
                recur(loose, env, env, seen$, t.types.$2.extractor(value)) :
                [t.types.$2.type]
            ) :
          // else
            [t]
        );
      }, types);
    }

    return isEmpty(values) ?
      [Unknown] :
      or(Z.reduce(refine, types, values), loose ? [Inconsistent] : []);
  }

  //  rejectInconsistent :: Array Type -> Array Type
  function rejectInconsistent(types) {
    return types.filter(function(t) {
      return t.type !== INCONSISTENT && t.type !== UNKNOWN;
    });
  }

  //  determineActualTypesStrict ::
  //    (Array Type, Array Type, Array Any) -> Array Type
  function determineActualTypesStrict(env, types, values) {
    var types$ = _determineActualTypes(false, env, types, [], values);
    return rejectInconsistent(types$);
  }

  //  determineActualTypesLoose ::
  //    (Array Type, Array Type, Array Any) -> Array Type
  function determineActualTypesLoose(env, types, values) {
    var types$ = _determineActualTypes(true, env, types, [], values);
    return rejectInconsistent(types$);
  }

  //  TypeInfo = { name :: String
  //             , constraints :: StrMap (Array TypeClass)
  //             , types :: Array Type }
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
      var $entry = {types: entry.types.slice(), valuesByPath: {}};
      for (var k in entry.valuesByPath) {
        $entry.valuesByPath[k] = entry.valuesByPath[k].slice();
      }
      $typeVarMap[typeVarName] = $entry;
    }
    if (!hasOwnProperty.call($typeVarMap, typeVar.name)) {
      $typeVarMap[typeVar.name] = {types: env.slice(), valuesByPath: {}};
    }

    var key = JSON.stringify(Z.concat([index], propPath));
    if (!hasOwnProperty.call($typeVarMap[typeVar.name].valuesByPath, key)) {
      $typeVarMap[typeVar.name].valuesByPath[key] = [];
    }

    values.forEach(function(value) {
      $typeVarMap[typeVar.name].valuesByPath[key].push(value);
      $typeVarMap[typeVar.name].types = Z.chain(
        function(t) {
          var xs;
          var invalid = !test(env, t, value);
          return (
            invalid ?
              [] :
            typeVar.keys.length > 0 ?
              [t].filter(function(t) {
                return (
                  t.type !== RECORD &&
                  t.keys.length >= typeVar.keys.length &&
                  t.keys.slice(-typeVar.keys.length).every(function(k) {
                    var xs = t.types[k].extractor(value);
                    return isEmpty(xs) ||
                           !isEmpty(determineActualTypesStrict(env, env, xs));
                  })
                );
              }) :
            t.type === UNARY ?
              t.types.$1.type.type === UNKNOWN &&
              !isEmpty(xs = t.types.$1.extractor(value)) ?
                Z.map(fromUnaryType(t),
                      determineActualTypesStrict(env, env, xs)) :
                [t] :
            t.type === BINARY ?
              xprod(t,
                    t.types.$1.type.type === UNKNOWN &&
                    !isEmpty(xs = t.types.$1.extractor(value)) ?
                      determineActualTypesStrict(env, env, xs) :
                      [t.types.$1.type],
                    t.types.$2.type.type === UNKNOWN &&
                    !isEmpty(xs = t.types.$2.extractor(value)) ?
                      determineActualTypesStrict(env, env, xs) :
                      [t.types.$2.type]) :
            // else
              [t]
          );
        },
        $typeVarMap[typeVar.name].types
      );
    });

    return $typeVarMap;
  }

  //  underlineTypeVars :: (TypeInfo, StrMap (Array Any)) -> String
  function underlineTypeVars(typeInfo, valuesByPath) {
    //  Note: Sorting these keys lexicographically is not "correct", but it
    //  does the right thing for indexes less than 10.
    var paths = Z.map(JSON.parse, Object.keys(valuesByPath).sort());
    return underline(
      typeInfo,
      K(K(_)),
      function(index) {
        return function(f) {
          return function(t) {
            return function(propPath) {
              var indexedPropPath = Z.concat([index], propPath);
              return function(s) {
                if (t.type === VARIABLE) {
                  var key = JSON.stringify(indexedPropPath);
                  var exists = hasOwnProperty.call(valuesByPath, key);
                  return (exists && !isEmpty(valuesByPath[key]) ? f : _)(s);
                } else {
                  return unless(paths.some(isPrefix(indexedPropPath)), _, s);
                }
              };
            };
          };
        };
      }
    );
  }

  //  satisfactoryTypes ::
  //    ... -> Either (() -> Error) { typeVarMap :: TypeVarMap
  //                                , types :: Array Type }
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
      var result = expType.validate(values[idx]);
      if (result.isLeft) {
        return Left(function() {
          return invalidValue(env,
                              typeInfo,
                              index,
                              result.value.propPath,
                              result.value.value);
        });
      }
    }

    switch (expType.type) {

      case VARIABLE:
        var typeVarName = expType.name;
        var constraints = typeInfo.constraints;
        if (hasOwnProperty.call(constraints, typeVarName)) {
          var typeClasses = constraints[typeVarName];
          for (idx = 0; idx < values.length; idx += 1) {
            for (var idx2 = 0; idx2 < typeClasses.length; idx2 += 1) {
              if (!typeClasses[idx2].test(values[idx])) {
                return Left(function() {
                  return typeClassConstraintViolation(
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

        var typeVarMap$ = updateTypeVarMap(env,
                                           typeVarMap,
                                           expType,
                                           index,
                                           propPath,
                                           values);

        var okTypes = typeVarMap$[typeVarName].types;
        return isEmpty(okTypes) && !isEmpty(values) ?
          Left(function() {
            return typeVarConstraintViolation(
              env,
              typeInfo,
              index,
              propPath,
              typeVarMap$[typeVarName].valuesByPath
            );
          }) :
          Z.reduce(function(e, t) {
            return isEmpty(expType.keys) || isEmpty(t.keys) ?
              e :
              Z.chain(function(r) {
                var $1 = expType.types[expType.keys[0]].type;
                var k = last(t.keys);
                var innerValues = Z.chain(t.types[k].extractor, values);
                return Z.reduce(function(e, x) {
                  return Z.chain(function(r) {
                    return $1.type === VARIABLE || test(env, $1, x) ?
                      Right(r) :
                      Left(function() {
                        return invalidValue(env,
                                            typeInfo,
                                            index,
                                            Z.concat(propPath, [k]),
                                            x);
                      });
                  }, e);
                }, Right(r), innerValues);
              }, e);
          }, Right({typeVarMap: typeVarMap$, types: okTypes}), okTypes);

      case UNARY:
        return Z.map(
          function(result) {
            return {
              typeVarMap: result.typeVarMap,
              types: Z.map(fromUnaryType(expType),
                           or(result.types, [expType.types.$1.type]))
            };
          },
          recur(env,
                typeInfo,
                typeVarMap,
                expType.types.$1.type,
                index,
                Z.concat(propPath, ['$1']),
                Z.chain(expType.types.$1.extractor, values))
        );

      case BINARY:
        return Z.chain(
          function(result) {
            var $1s = result.types;
            return Z.map(
              function(result) {
                var $2s = result.types;
                return {
                  typeVarMap: result.typeVarMap,
                  types: xprod(expType,
                               or($1s, [expType.types.$1.type]),
                               or($2s, [expType.types.$2.type]))
                };
              },
              recur(env,
                    typeInfo,
                    result.typeVarMap,
                    expType.types.$2.type,
                    index,
                    Z.concat(propPath, ['$2']),
                    Z.chain(expType.types.$2.extractor, values))
            );
          },
          recur(env,
                typeInfo,
                typeVarMap,
                expType.types.$1.type,
                index,
                Z.concat(propPath, ['$1']),
                Z.chain(expType.types.$1.extractor, values))
        );

      case RECORD:
        return Z.reduce(function(e, k) {
          return Z.chain(function(r) {
            return recur(env,
                         typeInfo,
                         r.typeVarMap,
                         expType.types[k].type,
                         index,
                         Z.concat(propPath, [k]),
                         Z.chain(expType.types[k].extractor, values));
          }, e);
        }, Right({typeVarMap: typeVarMap, types: [expType]}), expType.keys);

      default:
        return Right({typeVarMap: typeVarMap, types: [expType]});
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
  //. const NonNegativeInteger = $.NullaryType(
  //.   'my-package/NonNegativeInteger',
  //.   'http://example.com/my-package#NonNegativeInteger',
  //.   x => $.test([], $.Integer, x) && x >= 0
  //. );
  //. ```
  //.
  //. Using types as predicates is useful in other contexts too. One could,
  //. for example, define a [record type][] for each endpoint of a REST API
  //. and validate the bodies of incoming POST requests against these types.
  function test(_env, t, x) {
    var env = applyParameterizedTypes(_env);
    var typeInfo = {name: 'name', constraints: {}, types: [t]};
    return satisfactoryTypes(env, typeInfo, {}, t, 0, [], [x]).isRight;
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
  //. const Integer = $.NullaryType(
  //.   'my-package/Integer',
  //.   'http://example.com/my-package#Integer',
  //.   x => typeof x === 'number' &&
  //.        Math.floor(x) === x &&
  //.        x >= Number.MIN_SAFE_INTEGER &&
  //.        x <= Number.MAX_SAFE_INTEGER
  //. );
  //.
  //. //    NonZeroInteger :: Type
  //. const NonZeroInteger = $.NullaryType(
  //.   'my-package/NonZeroInteger',
  //.   'http://example.com/my-package#NonZeroInteger',
  //.   x => $.test([], Integer, x) && x !== 0
  //. );
  //.
  //. //    rem :: Integer -> NonZeroInteger -> Integer
  //. const rem =
  //. def('rem', {}, [Integer, NonZeroInteger, Integer], (x, y) => x % y);
  //.
  //. rem(42, 5);
  //. // => 2
  //.
  //. rem(0.5);
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
  //. rem(42, 0);
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
  function NullaryType(name, url, test) {
    function format(outer, inner) {
      return outer(stripNamespace(name));
    }
    return new _Type(NULLARY, name, url, format, test, [], {});
  }

  var CheckedNullaryType =
  def('NullaryType',
      {},
      [String_, String_, Function_([Any, Boolean_]), Type],
      NullaryType);

  //# UnaryType :: String -> String -> (Any -> Boolean) -> (t a -> Array a) -> (Type -> Type)
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
  //. const type = require('sanctuary-type-identifiers');
  //.
  //. //    maybeTypeIdent :: String
  //. const maybeTypeIdent = 'my-package/Maybe';
  //.
  //. //    Maybe :: Type -> Type
  //. const Maybe = $.UnaryType(
  //.   maybeTypeIdent,
  //.   'http://example.com/my-package#Maybe',
  //.   x => type(x) === maybeTypeIdent,
  //.   maybe => maybe.isJust ? [maybe.value] : []
  //. );
  //.
  //. //    MaybeTypeRep :: TypeRep Maybe
  //. const MaybeTypeRep = {'@@type': maybeTypeIdent};
  //.
  //. //    Nothing :: Maybe a
  //. const Nothing = {
  //.   constructor: MaybeTypeRep,
  //.   isJust: false,
  //.   isNothing: true,
  //.   toString: () => 'Nothing',
  //. };
  //.
  //. //    Just :: a -> Maybe a
  //. const Just = x => ({
  //.   constructor: MaybeTypeRep,
  //.   isJust: true,
  //.   isNothing: false,
  //.   toString: () => 'Just(' + Z.toString(x) + ')',
  //.   value: x,
  //. });
  //.
  //. //    fromMaybe :: a -> Maybe a -> a
  //. const fromMaybe =
  //. def('fromMaybe', {}, [a, Maybe(a), a], (x, m) => m.isJust ? m.value : x);
  //.
  //. fromMaybe(0, Just(42));
  //. // => 42
  //.
  //. fromMaybe(0, Nothing);
  //. // => 0
  //.
  //. fromMaybe(0, Just('XXX'));
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
  function UnaryType(name, url, test, _1) {
    return function($1) {
      function format(outer, inner) {
        return outer('(' + stripNamespace(name) + ' ') +
               inner('$1')(String($1)) + outer(')');
      }
      var types = {$1: {extractor: _1, type: $1}};
      return new _Type(UNARY, name, url, format, test, ['$1'], types);
    };
  }

  var CheckedUnaryType =
  def('UnaryType',
      {},
      [String_,
       String_,
       Function_([Any, Boolean_]),
       Function_([Unchecked('t a'), Array_(Unchecked('a'))]),
       Function_([Type, Type])],
      function(name, url, test, _1) {
        return def(stripNamespace(name),
                   {},
                   [Type, Type],
                   UnaryType(name, url, test, _1));
      });

  //  fromUnaryType :: Type -> (Type -> Type)
  function fromUnaryType(t) {
    return UnaryType(t.name, t.url, t._test, t.types.$1.extractor);
  }

  //# BinaryType :: String -> String -> (Any -> Boolean) -> (t a b -> Array a) -> (t a b -> Array b) -> (Type -> Type -> Type)
  //.
  //. Type constructor for types with two type variables (such as [`Pair`][]).
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
  //. const type = require('sanctuary-type-identifiers');
  //.
  //. //    pairTypeIdent :: String
  //. const pairTypeIdent = 'my-package/Pair';
  //.
  //. //    $Pair :: Type -> Type -> Type
  //. const $Pair = $.BinaryType(
  //.   pairTypeIdent,
  //.   'http://example.com/my-package#Pair',
  //.   x => type(x) === pairTypeIdent,
  //.   pair => [pair[0]],
  //.   pair => [pair[1]]
  //. );
  //.
  //. //    PairTypeRep :: TypeRep Pair
  //. const PairTypeRep = {'@@type': pairTypeIdent};
  //.
  //. //    Pair :: a -> b -> Pair a b
  //. const Pair = def('Pair', {}, [a, b, $Pair(a, b)], (x, y) => ({
  //.   '0': x,
  //.   '1': y,
  //.   constructor: PairTypeRep,
  //.   length: 2,
  //.   toString: () => 'Pair(' + Z.toString(x) + ', ' + Z.toString(y) + ')',
  //. }));
  //.
  //. //    Rank :: Type
  //. const Rank = $.NullaryType(
  //.   'my-package/Rank',
  //.   'http://example.com/my-package#Rank',
  //.   x => typeof x === 'string' && /^([A23456789JQK]|10)$/.test(x)
  //. );
  //.
  //. //    Suit :: Type
  //. const Suit = $.NullaryType(
  //.   'my-package/Suit',
  //.   'http://example.com/my-package#Suit',
  //.   x => typeof x === 'string' && /^[\u2660\u2663\u2665\u2666]$/.test(x)
  //. );
  //.
  //. //    Card :: Type
  //. const Card = $Pair(Rank, Suit);
  //.
  //. //    showCard :: Card -> String
  //. const showCard =
  //. def('showCard', {}, [Card, $.String], card => card[0] + card[1]);
  //.
  //. showCard(Pair('A', '♠'));
  //. // => 'A♠'
  //.
  //. showCard(Pair('X', '♠'));
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
  function BinaryType(name, url, test, _1, _2) {
    return function($1, $2) {
      function format(outer, inner) {
        return outer('(' + stripNamespace(name) + ' ') +
               inner('$1')(String($1)) + outer(' ') +
               inner('$2')(String($2)) + outer(')');
      }
      var types = {$1: {extractor: _1, type: $1},
                   $2: {extractor: _2, type: $2}};
      return new _Type(BINARY, name, url, format, test, ['$1', '$2'], types);
    };
  }

  var CheckedBinaryType =
  def('BinaryType',
      {},
      [String_,
       String_,
       Function_([Any, Boolean_]),
       Function_([Unchecked('t a b'), Array_(Unchecked('a'))]),
       Function_([Unchecked('t a b'), Array_(Unchecked('b'))]),
       Function_([Type, Type, Type])],
      function(name, url, test, _1, _2) {
        return def(stripNamespace(name),
                   {},
                   [Type, Type, Type],
                   BinaryType(name, url, test, _1, _2));
      });

  //  xprod :: (Type, Array Type, Array Type) -> Array Type
  function xprod(t, $1s, $2s) {
    var specialize = BinaryType(t.name,
                                t.url,
                                t._test,
                                t.types.$1.extractor,
                                t.types.$2.extractor);
    var $types = [];
    $1s.forEach(function($1) {
      $2s.forEach(function($2) {
        $types.push(specialize($1, $2));
      });
    });
    return $types;
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
  //. const Denomination = $.EnumType(
  //.   'my-package/Denomination',
  //.   'http://example.com/my-package#Denomination',
  //.   [10, 20, 50, 100, 200]
  //. );
  //. ```
  function EnumType(name, url, members) {
    return NullaryType(name, url, memberOf(members));
  }

  var CheckedEnumType =
  def('EnumType', {}, [String_, String_, Array_(Any), Type], EnumType);

  //# RecordType :: StrMap Type -> Type
  //.
  //. `RecordType` is used to construct record types. The type definition
  //. specifies the name and type of each required field.
  //.
  //. To define a record type one must provide:
  //.
  //.   - an object mapping field name to type.
  //.
  //. For example:
  //.
  //. ```javascript
  //. //    Point :: Type
  //. const Point = $.RecordType({x: $.FiniteNumber, y: $.FiniteNumber});
  //.
  //. //    dist :: Point -> Point -> FiniteNumber
  //. const dist =
  //. def('dist', {}, [Point, Point, $.FiniteNumber],
  //.     (p, q) => Math.sqrt(Math.pow(p.x - q.x, 2) +
  //.                         Math.pow(p.y - q.y, 2)));
  //.
  //. dist({x: 0, y: 0}, {x: 3, y: 4});
  //. // => 5
  //.
  //. dist({x: 0, y: 0}, {x: 3, y: 4, color: 'red'});
  //. // => 5
  //.
  //. dist({x: 0, y: 0}, {x: NaN, y: NaN});
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
  //. dist(0);
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
    var keys = Object.keys(fields).sort();

    function format(outer, inner) {
      return wrap(outer('{'))(outer(' }'))(Z.map(function(k) {
        var t = fields[k];
        return outer(' ' + k + ' :: ') +
               unless(t.type === RECORD || isEmpty(t.keys),
                      stripOutermostParens,
                      inner(k)(String(t)));
      }, keys).join(outer(',')));
    }

    function test(x) {
      return x != null &&
             keys.every(function(k) { return hasOwnProperty.call(x, k); });
    }

    var $types = {};
    keys.forEach(function(k) {
      $types[k] = {extractor: function(x) { return [x[k]]; }, type: fields[k]};
    });

    return new _Type(RECORD, '', '', format, test, keys, $types);
  }

  var CheckedRecordType =
  def('RecordType', {}, [StrMap(Type), Type], RecordType);

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
  //. const a = $.TypeVariable('a');
  //. const b = $.TypeVariable('b');
  //.
  //. //    id :: a -> a
  //. const id = def('id', {}, [a, a], x => x);
  //.
  //. id(42);
  //. // => 42
  //.
  //. id(null);
  //. // => null
  //. ```
  //.
  //. The same type variable may be used in multiple positions, creating a
  //. constraint:
  //.
  //. ```javascript
  //. //    cmp :: a -> a -> Number
  //. const cmp =
  //. def('cmp', {}, [a, a, $.Number], (x, y) => x < y ? -1 : x > y ? 1 : 0);
  //.
  //. cmp(42, 42);
  //. // => 0
  //.
  //. cmp('a', 'z');
  //. // => -1
  //.
  //. cmp('z', 'a');
  //. // => 1
  //.
  //. cmp(0, '1');
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
    return new _Type(VARIABLE, name, '', always2(name), K(true), [], {});
  }

  var CheckedTypeVariable =
  def('TypeVariable', {}, [String_, Type], TypeVariable);

  //# UnaryTypeVariable :: String -> (Type -> Type)
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
  //. const $ = require('sanctuary-def');
  //. const Z = require('sanctuary-type-classes');
  //.
  //. const a = $.TypeVariable('a');
  //. const b = $.TypeVariable('b');
  //. const f = $.UnaryTypeVariable('f');
  //.
  //. //    map :: Functor f => (a -> b) -> f a -> f b
  //. const map =
  //. def('map',
  //.     {f: [Z.Functor]},
  //.     [$.Function([a, b]), f(a), f(b)],
  //.     Z.map);
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
        return outer('(' + name + ' ') + inner('$1')(String($1)) + outer(')');
      }
      var types = {$1: {extractor: K([]), type: $1}};
      return new _Type(VARIABLE, name, '', format, K(true), ['$1'], types);
    };
  }

  var CheckedUnaryTypeVariable =
  def('UnaryTypeVariable',
      {},
      [String_, Function_([Type, Type])],
      function(name) {
        return def(name, {}, [Type, Type], UnaryTypeVariable(name));
      });

  //# BinaryTypeVariable :: String -> (Type -> Type -> Type)
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
    return function($1, $2) {
      function format(outer, inner) {
        return outer('(' + name + ' ') + inner('$1')(String($1)) + outer(' ') +
                                         inner('$2')(String($2)) + outer(')');
      }
      var keys = ['$1', '$2'];
      var types = {$1: {extractor: K([]), type: $1},
                   $2: {extractor: K([]), type: $2}};
      return new _Type(VARIABLE, name, '', format, K(true), keys, types);
    };
  }

  var CheckedBinaryTypeVariable =
  def('BinaryTypeVariable',
      {},
      [String_, Function_([Type, Type, Type])],
      function(name) {
        return def(name, {}, [Type, Type, Type], BinaryTypeVariable(name));
      });

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
  //. def('_concat', {}, [a, a, a], (x, y) => x.concat(y));
  //.
  //. _concat('fizz', 'buzz');
  //. // => 'fizzbuzz'
  //.
  //. _concat([1, 2], [3, 4]);
  //. // => [1, 2, 3, 4]
  //.
  //. _concat([1, 2], 'buzz');
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
  //. terms, the type must have a [semigroup][FL:Semigroup]). The run-time type
  //. errors that result when this constraint is violated are not particularly
  //. descriptive:
  //.
  //. ```javascript
  //. _concat({}, {});
  //. // ! TypeError: undefined is not a function
  //.
  //. _concat(null, null);
  //. // ! TypeError: Cannot read property 'concat' of null
  //. ```
  //.
  //. The solution is to constrain `a` by first defining a [`TypeClass`][]
  //. value, then specifying the constraint in the definition of the "concat"
  //. function:
  //.
  //. ```javascript
  //. const Z = require('sanctuary-type-classes');
  //.
  //. //    Semigroup :: TypeClass
  //. const Semigroup = Z.TypeClass(
  //.   'my-package/Semigroup',
  //.   [],
  //.   x => x != null && typeof x.concat === 'function'
  //. );
  //.
  //. //    concat :: Semigroup a => a -> a -> a
  //. const concat =
  //. def('concat', {a: [Semigroup]}, [a, a, a], (x, y) => x.concat(y));
  //.
  //. concat([1, 2], [3, 4]);
  //. // => [1, 2, 3, 4]
  //.
  //. concat({}, {});
  //. // ! TypeError: Type-class constraint violation
  //. //
  //. //   concat :: Semigroup a => a -> a -> a
  //. //             ^^^^^^^^^^^    ^
  //. //                            1
  //. //
  //. //   1)  {} :: Object, StrMap ???
  //. //
  //. //   ‘concat’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.
  //.
  //. concat(null, null);
  //. // ! TypeError: Type-class constraint violation
  //. //
  //. //   concat :: Semigroup a => a -> a -> a
  //. //             ^^^^^^^^^^^    ^
  //. //                            1
  //. //
  //. //   1)  null :: Null
  //. //
  //. //   ‘concat’ requires ‘a’ to satisfy the Semigroup type-class constraint; the value at position 1 does not.
  //. ```
  //.
  //. Multiple constraints may be placed on a type variable by including
  //. multiple `TypeClass` values in the array (e.g. `{a: [Foo, Bar, Baz]}`).

  //  checkValue :: ... -> Undefined
  function checkValue(
    env,                // :: Array Type
    typeInfo,           // :: TypeInfo
    $typeVarMapBox,     // :: Box TypeVarMap
    index,              // :: Integer
    propPath,           // :: PropPath
    t,                  // :: Type
    value               // :: Any
  ) {
    if (t.type === VARIABLE) {
      $typeVarMapBox[0] =
        updateTypeVarMap(env, $typeVarMapBox[0], t, index, propPath, [value]);
      if (isEmpty($typeVarMapBox[0][t.name].types)) {
        throw typeVarConstraintViolation(
          env,
          typeInfo,
          index,
          propPath,
          $typeVarMapBox[0][t.name].valuesByPath
        );
      }
    } else if (!test(env, t, value)) {
      throw invalidValue(env, typeInfo, index, propPath, value);
    }
  }

  //  wrapFunction :: ... -> Function
  function wrapFunction(
    env,                // :: Array Type
    typeInfo,           // :: TypeInfo
    $typeVarMapBox,     // :: Box TypeVarMap
    index,              // :: Integer
    f                   // :: Function
  ) {
    return function() {
      var args = slice.call(arguments);
      var expType = typeInfo.types[index];
      var numArgsExpected = expType.keys.length - 1;
      if (args.length !== numArgsExpected) {
        throw invalidArgumentsLength(typeInfo, index, numArgsExpected, args);
      }
      function checkValue$(propPath, t, x) {
        checkValue(env,
                   typeInfo,
                   $typeVarMapBox,
                   index,
                   propPath,
                   t,
                   x);
      }
      init(expType.keys).forEach(function(k, idx) {
        checkValue$([k], expType.types[k].type, args[idx]);
      });

      var output = f.apply(this, arguments);
      var k = last(expType.keys);
      checkValue$([k], expType.types[k].type, output);
      return output;
    };
  }

  //  wrapFunctions :: ... -> Array Any
  function wrapFunctions(
    env,                // :: Array Type
    typeInfo,           // :: TypeInfo
    $typeVarMapBox,     // :: Box TypeVarMap
    values              // :: Array Any
  ) {
    return values.map(function(value, idx) {
      return typeInfo.types[idx].type === FUNCTION ?
        wrapFunction(env,
                     typeInfo,
                     $typeVarMapBox,
                     idx,
                     value) :
        value;
    });
  }

  //  tooManyArguments :: (TypeInfo, Integer) -> Error
  //
  //  This function is used in `curry` when a function defined via `def`
  //  is applied to too many arguments.
  function tooManyArguments(typeInfo, numArgsReceived) {
    var numArgsExpected = typeInfo.types.length - 1;
    return new TypeError(trimTrailingSpaces(
      'Function applied to too many arguments\n\n' +
      typeSignature(typeInfo) + '\n\n' +
      q(typeInfo.name) + ' expected' +
      (numArgsExpected > 0 ? ' at most ' : ' ') + numArgs(numArgsExpected) +
      ' but received ' + numArgs(numArgsReceived) + '.\n'
    ));
  }

  //  constraintsRepr :: ... -> String
  function constraintsRepr(
    constraints,    // :: StrMap (Array TypeClass)
    outer,          // :: String -> String
    inner           // :: String -> TypeClass -> String -> String
  ) {
    var $reprs = [];
    Object.keys(constraints).sort().forEach(function(k) {
      var f = inner(k);
      constraints[k].forEach(function(typeClass) {
        $reprs.push(f(typeClass)(stripNamespace(typeClass.name) + ' ' + k));
      });
    });
    return when($reprs.length > 0,
                function(s) { return s + outer(' => '); },
                when($reprs.length > 1,
                     wrap(outer('('))(outer(')')),
                     $reprs.join(outer(', '))));
  }

  //  label :: String -> String -> String
  function label(label) {
    return function(s) {
      var delta = s.length - label.length;
      return strRepeat(' ', Math.floor(delta / 2)) + label +
             strRepeat(' ', Math.ceil(delta / 2));
    };
  }

  //  showType :: Type -> String
  function showType(t) {
    return unless(t.type === FUNCTION || t.type === RECORD || isEmpty(t.keys),
                  stripOutermostParens,
                  String(t));
  }

  //  showTypeQuoted :: Type -> String
  function showTypeQuoted(t) {
    return q(unless(t.type === RECORD || isEmpty(t.keys),
                    stripOutermostParens,
                    String(t)));
  }

  //  showValuesAndTypes :: (Array Type, Array Any, Integer) -> String
  function showValuesAndTypes(env, values, pos) {
    return String(pos) + ')  ' + Z.map(function(x) {
      var types = determineActualTypesLoose(env, env, [x]);
      return Z.toString(x) + ' :: ' + Z.map(showType, types).join(', ');
    }, values).join('\n    ');
  }

  //  typeSignature :: TypeInfo -> String
  function typeSignature(typeInfo) {
    var reprs = Z.map(showType, typeInfo.types);
    var arity = reprs.length - 1;
    return typeInfo.name + ' :: ' +
             constraintsRepr(typeInfo.constraints, id, K(K(id))) +
             when(arity === 0,
                  wrap('(')(')'),
                  init(reprs).join(' -> ')) +
             ' -> ' + last(reprs);
  }

  //  _underline :: ... -> String
  function _underline(
    t,              // :: Type
    propPath,       // :: PropPath
    formatType3     // :: Type -> Array String -> String -> String
  ) {
    return unless(t.type === RECORD ||
                    isEmpty(t.keys) ||
                    t.type === FUNCTION && isEmpty(propPath) ||
                    !isEmpty(propPath),
                  stripOutermostParens,
                  formatType3(t)(propPath)(t.format(_, function(k) {
                    return K(_underline(t.types[k].type,
                                        Z.concat(propPath, [k]),
                                        formatType3));
                  })));
  }

  //  underline :: ... -> String
  function underline(
    typeInfo,               // :: TypeInfo
    underlineConstraint,    // :: String -> TypeClass -> String -> String
    formatType5             // :: Integer -> (String -> String) -> Type ->
                            //      PropPath -> String -> String
  ) {
    var st = typeInfo.types.reduce(function(st, t, index) {
      var formatType4 = formatType5(index);
      var counter = st.counter;
      function replace(s) { return label(String(counter += 1))(s); }
      return {
        carets: Z.concat(st.carets, [_underline(t, [], formatType4(r('^')))]),
        numbers: Z.concat(st.numbers,
                          [_underline(t, [], formatType4(replace))]),
        counter: counter
      };
    }, {carets: [], numbers: [], counter: 0});

    return typeSignature(typeInfo) + '\n' +
           _(typeInfo.name + ' :: ') +
             constraintsRepr(typeInfo.constraints, _, underlineConstraint) +
             st.carets.join(_(' -> ')) + '\n' +
           _(typeInfo.name + ' :: ') +
             constraintsRepr(typeInfo.constraints, _, K(K(_))) +
             st.numbers.join(_(' -> ')) + '\n';
  }

  //  resolvePropPath :: (Type, Array String) -> Type
  function resolvePropPath(t, propPath) {
    return Z.reduce(function(t, prop) { return t.types[prop].type; },
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
            var indexedPropPath_ = Z.concat([index_], propPath_);
            var p = isPrefix(indexedPropPath_)(indexedPropPath);
            var q = isPrefix(indexedPropPath)(indexedPropPath_);
            return p && q ? f : p ? id : _;
          };
        };
      };
    };
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
    var expType = resolvePropPath(typeInfo.types[index], propPath);
    return new TypeError(trimTrailingSpaces(
      'Type-class constraint violation\n\n' +
      underline(typeInfo,
                function(tvn) {
                  return function(tc) {
                    return tvn === expType.name && tc.name === typeClass.name ?
                      r('^') :
                      _;
                  };
                },
                formatType6(Z.concat([index], propPath))) +
      '\n' +
      showValuesAndTypes(env, [value], 1) + '\n\n' +
      q(typeInfo.name) + ' requires ' + q(expType.name) + ' to satisfy the ' +
      stripNamespace(typeClass.name) + ' type-class constraint; ' +
      'the value at position 1 does not.\n'
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
    //  If we apply an ‘a -> a -> a -> a’ function to Left('x'), Right(1), and
    //  Right(null) we'd like to avoid underlining the first argument position,
    //  since Left('x') is compatible with the other ‘a’ values.
    var key = JSON.stringify(Z.concat([index], propPath));
    var values = valuesByPath[key];

    //  Note: Sorting these keys lexicographically is not "correct", but it
    //  does the right thing for indexes less than 10.
    var keys = Object.keys(valuesByPath).sort().filter(function(k) {
      var values_ = valuesByPath[k];
      return (
        //  Keep X, the position at which the violation was observed.
        k === key ||
        //  Keep positions whose values are incompatible with the values at X.
        isEmpty(determineActualTypesStrict(env,
                                           env,
                                           Z.concat(values, values_)))
      );
    });

    return new TypeError(trimTrailingSpaces(
      'Type-variable constraint violation\n\n' +
      underlineTypeVars(typeInfo,
                        Z.reduce(function($valuesByPath, k) {
                          $valuesByPath[k] = valuesByPath[k];
                          return $valuesByPath;
                        }, {}, keys)) +
      Z.reduce(function(st, k) {
        var values = valuesByPath[k];
        return isEmpty(values) ? st : {
          idx: st.idx + 1,
          s: st.s + '\n' + showValuesAndTypes(env, values, st.idx + 1) + '\n'
        };
      }, {idx: 0, s: ''}, keys).s + '\n' +
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
    var t = resolvePropPath(typeInfo.types[index], propPath);
    return new TypeError(trimTrailingSpaces(
      'Invalid value\n\n' +
      underline(typeInfo,
                K(K(_)),
                formatType6(Z.concat([index], propPath))) +
      '\n' +
      showValuesAndTypes(env, [value], 1) + '\n\n' +
      'The value at position 1 is not a member of ' + showTypeQuoted(t) + '.' +
      '\n' +
      (t.url &&
       '\nSee ' + t.url + ' for information about the ' + t.name + ' type.\n')
    ));
  }

  //  invalidArgumentsLength :: ... -> Error
  //
  //  This function is used in `wrapFunction` to ensure that higher-order
  //  functions defined via `def` only ever apply a function argument to
  //  the correct number of arguments.
  function invalidArgumentsLength(
    typeInfo,           // :: TypeInfo
    index,              // :: Integer
    numArgsExpected,    // :: Integer
    args                // :: Array Any
  ) {
    return new TypeError(trimTrailingSpaces(
      q(typeInfo.name) + ' applied ' + showTypeQuoted(typeInfo.types[index]) +
      ' to the wrong number of arguments\n\n' +
      underline(
        typeInfo,
        K(K(_)),
        function(index_) {
          return function(f) {
            return function(t) {
              return function(propPath) {
                return function(s) {
                  return index_ === index ?
                    String(t).replace(
                      /^[(](.*) -> (.*)[)]$/,
                      function(s, $1, $2) {
                        return _('(') + f($1) + _(' -> ' + $2 + ')');
                      }
                    ) :
                    _(s);
                };
              };
            };
          };
        }
      ) + '\n' +
      'Expected ' + numArgs(numArgsExpected) +
      ' but received ' + numArgs(args.length) +
      (args.length === 0 ?
         '.\n' :
         Z.reduce(function(s, x) { return s + '  - ' + Z.toString(x) + '\n'; },
                  ':\n\n',
                  args))
    ));
  }

  //  assertRight :: Either (() -> Error) a -> a !
  function assertRight(either) {
    if (either.isLeft) throw either.value();
    return either.value;
  }

  //  curry :: ... -> Function
  function curry(
    opts,         // :: Options
    typeInfo,     // :: TypeInfo
    _typeVarMap,  // :: TypeVarMap
    _values,      // :: Array Any
    _indexes,     // :: Array Integer
    impl          // :: Function
  ) {
    var n = typeInfo.types.length - 1;
    var curried = arity(_indexes.length, function() {
      if (opts.checkTypes) {
        var delta = _indexes.length - arguments.length;
        if (delta < 0) throw tooManyArguments(typeInfo, n - delta);
      }
      var typeVarMap = _typeVarMap;
      var values = _values.slice();
      var indexes = [];
      for (var idx = 0; idx < _indexes.length; idx += 1) {
        var index = _indexes[idx];

        if (idx < arguments.length &&
            !(typeof arguments[idx] === 'object' &&
              arguments[idx] != null &&
              arguments[idx]['@@functional/placeholder'] === true)) {

          var value = arguments[idx];
          if (opts.checkTypes) {
            var result = satisfactoryTypes(opts.env,
                                           typeInfo,
                                           typeVarMap,
                                           typeInfo.types[index],
                                           index,
                                           [],
                                           [value]);
            typeVarMap = assertRight(result).typeVarMap;
          }
          values[index] = value;
        } else {
          indexes.push(index);
        }
      }
      if (isEmpty(indexes)) {
        if (opts.checkTypes) {
          var returnValue = impl.apply(this,
                                       wrapFunctions(opts.env,
                                                     typeInfo,
                                                     [typeVarMap],
                                                     values));
          assertRight(satisfactoryTypes(opts.env,
                                        typeInfo,
                                        typeVarMap,
                                        typeInfo.types[n],
                                        n,
                                        [],
                                        [returnValue]));
          return returnValue;
        } else {
          return impl.apply(this, values);
        }
      } else {
        return curry(opts, typeInfo, typeVarMap, values, indexes, impl);
      }
    });
    curried.inspect = curried.toString = always(typeSignature(typeInfo));
    return curried;
  }

  function _create(opts) {
    function def(name, constraints, expTypes, impl) {
      var values = new Array(expTypes.length - 1);
      if (values.length > 9) {
        throw new RangeError(q(def.name) + ' cannot define a function ' +
                             'with arity greater than nine');
      }
      return curry({checkTypes: opts.checkTypes,
                    env: applyParameterizedTypes(opts.env)},
                   {name: name, constraints: constraints, types: expTypes},
                   {},
                   values,
                   range(0, values.length),
                   impl);
    }
    return def(def.name,
               {},
               [String_,
                StrMap(Array_(TypeClass)),
                Array_(Type),
                AnyFunction,
                AnyFunction],
               def);
  }

  var create =
  def('create',
      {},
      [RecordType({checkTypes: Boolean_, env: Array_(Any)}),
       Function_([String_,
                  StrMap(Array_(TypeClass)),
                  Array_(Type),
                  AnyFunction,
                  AnyFunction])],
      _create);

  //  fromUncheckedUnaryType :: (Type -> Type) -> (Type -> Type)
  function fromUncheckedUnaryType(typeConstructor) {
    var t = typeConstructor(Unknown);
    var _1 = t.types.$1.extractor;
    return CheckedUnaryType(t.name, t.url, t._test, _1);
  }

  //  fromUncheckedBinaryType :: ((Type, Type) -> Type) ->
  //                             (Type -> Type -> Type)
  function fromUncheckedBinaryType(typeConstructor) {
    var t = typeConstructor(Unknown, Unknown);
    var _1 = t.types.$1.extractor;
    var _2 = t.types.$2.extractor;
    return CheckedBinaryType(t.name, t.url, t._test, _1, _2);
  }

  return {
    __: __,
    Any: Any,
    AnyFunction: AnyFunction,
    Arguments: Arguments,
    Array: fromUncheckedUnaryType(Array_),
    Boolean: Boolean_,
    Date: Date_,
    Error: Error_,
    FiniteNumber: FiniteNumber,
    Function: def('Function', {}, [Array_(Type), Type], Function_),
    GlobalRegExp: GlobalRegExp,
    Integer: Integer,
    NegativeFiniteNumber: NegativeFiniteNumber,
    NegativeInteger: NegativeInteger,
    NegativeNumber: NegativeNumber,
    NonGlobalRegExp: NonGlobalRegExp,
    NonZeroFiniteNumber: NonZeroFiniteNumber,
    NonZeroInteger: NonZeroInteger,
    NonZeroValidNumber: NonZeroValidNumber,
    Null: Null,
    Nullable: fromUncheckedUnaryType(Nullable),
    Number: Number_,
    Object: Object_,
    Pair: fromUncheckedBinaryType(Pair),
    PositiveFiniteNumber: PositiveFiniteNumber,
    PositiveInteger: PositiveInteger,
    PositiveNumber: PositiveNumber,
    RegExp: RegExp_,
    RegexFlags: RegexFlags,
    StrMap: fromUncheckedUnaryType(StrMap),
    String: String_,
    Undefined: Undefined,
    Unknown: Unknown,
    ValidDate: ValidDate,
    ValidNumber: ValidNumber,
    env: env,
    create: create,
    test: def('test', {}, [Array_(Type), Type, Any, Boolean_], test),
    NullaryType: CheckedNullaryType,
    UnaryType: CheckedUnaryType,
    BinaryType: CheckedBinaryType,
    EnumType: CheckedEnumType,
    RecordType: CheckedRecordType,
    TypeVariable: CheckedTypeVariable,
    UnaryTypeVariable: CheckedUnaryTypeVariable,
    BinaryTypeVariable: CheckedBinaryTypeVariable
  };

}));

//. [FL:Semigroup]:         https://github.com/fantasyland/fantasy-land#semigroup
//. [`AnyFunction`]:        #AnyFunction
//. [`Arguments`]:          #Arguments
//. [`Array`]:              #Array
//. [`BinaryType`]:         #BinaryType
//. [`Boolean`]:            #Boolean
//. [`Date`]:               #Date
//. [`Error`]:              #Error
//. [`FiniteNumber`]:       #FiniteNumber
//. [`GlobalRegExp`]:       #GlobalRegExp
//. [`Integer`]:            #Integer
//. [`NonGlobalRegExp`]:    #NonGlobalRegExp
//. [`Null`]:               #Null
//. [`Number`]:             #Number
//. [`Object`]:             #Object
//. [`Object.create`]:      https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/create
//. [`Pair`]:               #Pair
//. [`RegExp`]:             #RegExp
//. [`RegexFlags`]:         #RegexFlags
//. [`StrMap`]:             #StrMap
//. [`String`]:             #String
//. [`SyntaxError`]:        https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/SyntaxError
//. [`TypeClass`]:          https://github.com/sanctuary-js/sanctuary-type-classes#TypeClass
//. [`TypeError`]:          https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/TypeError
//. [`TypeVariable`]:       #TypeVariable
//. [`UnaryType`]:          #UnaryType
//. [`UnaryTypeVariable`]:  #UnaryTypeVariable
//. [`Undefined`]:          #Undefined
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
