/* global define, self */

;(function(f) {

  'use strict';

  /* istanbul ignore else */
  if (typeof module !== 'undefined') {
    module.exports = f();
  } else if (typeof define === 'function' && define.amd != null) {
    define([], f);
  } else {
    self.sanctuaryDef = f();
  }

}(function() {

  'use strict';

  var $ = {};

  var MAX_SAFE_INTEGER = Math.pow(2, 53) - 1;
  var MIN_SAFE_INTEGER = -MAX_SAFE_INTEGER;

  var LEFT_SINGLE_QUOTATION_MARK = '\u2018';
  var RIGHT_SINGLE_QUOTATION_MARK = '\u2019';

  var push              = Array.prototype.push;
  var hasOwnProperty    = Object.prototype.hasOwnProperty;
  var toString          = Object.prototype.toString;

  //  K :: a -> b -> a
  var K = function(x) { return function(y) { return x; }; };

  //  all :: ([a], (a -> Boolean)) -> Boolean
  var all = function(xs, pred) {
    for (var idx = 0; idx < xs.length; idx += 1) {
      if (!pred(xs[idx])) return false;
    }
    return true;
  };

  //  always :: a -> (-> a)
  var always = function(x) { return function() { return x; }; };

  //  any :: ([a], (a -> Boolean)) -> Boolean
  var any = function(xs, pred) {
    for (var idx = 0; idx < xs.length; idx += 1) {
      if (pred(xs[idx])) return true;
    }
    return false;
  };

  //  chain :: ([a], (a -> [b])) -> [b]
  var chain = function(xs, f) {
    var result = [];
    for (var idx = 0; idx < xs.length; idx += 1) {
      push.apply(result, f(xs[idx]));
    }
    return result;
  };

  //  eqProps :: String -> Object -> Object -> Boolean
  var eqProps = function(key) {
    return function(o1) {
      return function(o2) {
        return o1[key] === o2[key];
      };
    };
  };

  //  has :: (String, Object) -> Boolean
  var has = function(key, obj) { return hasOwnProperty.call(obj, key); };

  //  id :: a -> a
  var id = function(x) { return x; };

  //  isEmpty :: [a] -> Boolean
  var isEmpty = function(xs) { return xs.length === 0; };

  //  keys :: Object -> [String]
  var keys = function(obj) {
    var result = [];
    for (var key in obj) if (has(key, obj)) result.push(key);
    return result.sort();
  };

  //  map :: ([a], (a -> b)) -> [b]
  var map = function(xs, f) {
    var result = [];
    for (var idx = 0; idx < xs.length; idx += 1) result.push(f(xs[idx]));
    return result;
  };

  //  or :: ([a], [a]) -> [a]
  var or = function(xs, ys) { return isEmpty(xs) ? ys : xs; };

  //  prefix :: String -> String -> String
  var prefix = function(x) {
    return function(y) {
      return x + y;
    };
  };

  //  quote :: String -> String
  var quote = function(s) {
    var escaped = s
      .replace(/\\/g, '\\\\')
      // \b matches word boundary; [\b] matches backspace
      .replace(/[\b]/g, '\\b')
      .replace(/\f/g, '\\f')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/\v/g, '\\v')
      .replace(/\0/g, '\\0');

    return '"' + escaped.replace(/"/g, '\\"') + '"';
  };

  //  range :: (Number, Number) -> [Number]
  var range = function(start, stop) {
    var result = [];
    for (var n = start; n < stop; n += 1) result.push(n);
    return result;
  };

  //  stripNamespace :: String -> String
  var stripNamespace = function(s) { return s.slice(s.indexOf('/') + 1); };

  //  typeOf :: a -> String
  var typeOf = function(x) {
    return toString.call(x).slice('[object '.length, -']'.length);
  };

  var _show = function show(x, seen) {
    var recur = function(y) {
      var xs = seen.concat([x]);
      return xs.indexOf(y) >= 0 ? '<Circular>' : show(y, xs);
    };

    //  formatKeyVal :: Object -> String -> String
    var formatKeyVal = function(obj) {
      return function(key) {
        return quote(key) + ': ' + recur(obj[key]);
      };
    };

    switch (typeOf(x)) {
      case 'Arguments':
        return '(function() { return arguments; }(' +
               map(x, recur).join(', ') + '))';
      case 'Array':
        var reprs = map(x, recur).concat(chain(keys(x), function(k) {
          return /^\d+$/.test(k) ? [] : [formatKeyVal(x)(k)];
        }));
        return '[' + reprs.join(', ') + ']';
      case 'Boolean':
        return typeof x === 'object' ?
          'new Boolean(' + recur(x.valueOf()) + ')' :
          x.toString();
      case 'Date':
        return 'new Date(' +
               (isNaN(x.valueOf()) ? recur(NaN) : quote(x.toISOString())) +
               ')';
      case 'Null':
        return 'null';
      case 'Number':
        return typeof x === 'object' ?
          'new Number(' + recur(x.valueOf()) + ')' :
          1 / x === -Infinity ? '-0' : x.toString(10);
      case 'String':
        return typeof x === 'object' ?
          'new String(' + recur(x.valueOf()) + ')' :
          quote(x);
      case 'Undefined':
        return 'undefined';
      default:
        if (typeof x.toString === 'function') {
          var repr = x.toString();
          if (repr !== '[object Object]') return repr;
        }
        return '{' + map(keys(x), formatKeyVal(x)).join(', ') + '}';
    }
  };

  //  show :: a -> String
  var show = function(x) { return _show(x, []); };

  //  TypeClass :: (String, (a -> Boolean)) -> TypeClass
  $.TypeClass = function(name, test) {
    return {
      name: name,
      test: test,
      toString: always(stripNamespace(name))
    };
  };

  //  Any :: Type
  var Any = {
    '@@type': 'sanctuary-def/Type',
    type: 'ANY',
    test: K(true),
    toString: always('Any')
  };

  //  Unknown :: Type
  var Unknown = {
    '@@type': 'sanctuary-def/Type',
    type: 'UNKNOWN',
    test: K(true),
    toString: always('???')
  };

  //  TypeVariable :: String -> Type
  $.TypeVariable = function(name) {
    return {
      '@@type': 'sanctuary-def/Type',
      type: 'VARIABLE',
      name: name,
      test: K(true),
      toString: always(name)
    };
  };

  //  NullaryType :: (String, (x -> Boolean)) -> Type
  var NullaryType = $.NullaryType = function(name, test) {
    return {
      '@@type': 'sanctuary-def/Type',
      type: 'NULLARY',
      name: name,
      test: test,
      toString: always(stripNamespace(name))
    };
  };

  //  UnaryType :: (String, (x -> Boolean), (t a -> [a])) -> Type -> Type
  var UnaryType = $.UnaryType = function(name, test, _1) {
    return function($1) {
      return {
        '@@type': 'sanctuary-def/Type',
        type: 'UNARY',
        name: name,
        test: function(x) { return test(x) && all(_1(x), $1.test); },
        toString: always('(' + stripNamespace(name) + ' ' + $1 + ')'),
        _1: _1,
        $1: $1
      };
    };
  };

  //  UnaryType.from :: Type -> Type
  UnaryType.from = function(t) {
    return UnaryType(t.name, t.test, t._1);
  };

  //  BinaryType :: (String, (x -> Boolean), (t a b -> [a]), (t a b -> [b])) ->
  //                  (Type, Type) -> Type
  var BinaryType = $.BinaryType = function(name, test, _1, _2) {
    return function($1, $2) {
      return {
        '@@type': 'sanctuary-def/Type',
        type: 'BINARY',
        name: name,
        test: function(x) { return test(x) && all(_1(x), $1.test) &&
                                              all(_2(x), $2.test); },
        toString:
          always('(' + stripNamespace(name) + ' ' + $1 + ' ' + $2 + ')'),
        _1: _1,
        _2: _2,
        $1: $1,
        $2: $2
      };
    };
  };

  //  BinaryType.from :: Type -> Type
  BinaryType.from = function(t) {
    return BinaryType(t.name, t.test, t._1, t._2);
  };

  //  BinaryType.xprod :: (Type, [Type], [Type]) -> [Type]
  BinaryType.xprod = function(t, $1s, $2s) {
    var specialize = BinaryType.from(t);
    return chain($1s, function($1) {
      return map($2s, function($2) {
        return specialize($1, $2);
      });
    });
  };

  //  EnumType :: [Any] -> Type
  var EnumType = $.EnumType = function(members) {
    var types = map(members, $$type);
    var reprs = map(members, show);
    return {
      '@@type': 'sanctuary-def/Type',
      type: 'ENUM',
      test: function(x) {
        //  We use `show` to perform value-based equality checks (since we
        //  don't have access to `R.equals` and don't want to implement it).
        //  We avoid a lot of unnecessary work by checking the type of `x`
        //  before determining its string representation. Only if `x` is of
        //  the same type as one or more of the `members` do we incur the
        //  cost of determining its string representation.
        return types.indexOf($$type(x)) >= 0 && reprs.indexOf(show(x)) >= 0;
      },
      toString: always('(' + reprs.join(' | ') + ')')
    };
  };

  //  RecordType :: {Type} -> Type
  var RecordType = $.RecordType = function(fields) {
    var names = keys(fields);

    //  invalidMappings :: [String]
    var invalidMappings = chain(names, function(name) {
      return $$type(fields[name]) === 'sanctuary-def/Type' ?
        [] :
        [show(name) + ': ' + show(fields[name])];
    });

    if (!isEmpty(invalidMappings)) {
      throw new TypeError(
        'Invalid values\n\n' +
        'The argument to ‘RecordType’ must be an object mapping field name ' +
        'to type.\n\n' +
        'The following mappings are invalid:\n\n' +
        map(invalidMappings, prefix('  - ')).join('\n')
      );
    }

    return {
      '@@type': 'sanctuary-def/Type',
      type: 'RECORD',
      test: function(x) {
        if (x == null) return false;
        for (var idx = 0; idx < names.length; idx += 1) {
          var name = names[idx];
          if (!has(name, x) || !fields[name].test(x[name])) return false;
        }
        return true;
      },
      toString: function() {
        var s = '{';
        for (var idx = 0; idx < names.length; idx += 1) {
          var name = names[idx];
          s += idx === 0 ? ' ' : ', ';
          s += name + ' :: ' + fields[name];
          if (idx === names.length - 1) s += ' ';
        }
        return s + '}';
      },
      fields: fields
    };
  };

  //  Nullable :: Type -> Type
  $.Nullable = UnaryType(
    'sanctuary-def/Nullable',
    K(true),
    function(nullable) { return nullable === null ? [] : [nullable]; }
  );

  //  $$type :: a -> String
  var $$type = function(x) {
    return x != null && typeOf(x['@@type']) === 'String' ?
      x['@@type'] :
      typeOf(x);
  };

  //  $$typeEq :: String -> a -> Boolean
  var $$typeEq = function(name) {
    return function(x) {
      return $$type(x) === name;
    };
  };

  //  type0 :: String -> Type
  var type0 = function(name) {
    return NullaryType(name, $$typeEq(name));
  };

  //  type1 :: (String, (t a -> [a])) -> Type -> Type
  var type1 = function(name, _1) {
    return UnaryType(name, $$typeEq(name), _1);
  };

  //  $.env :: [Type]
  $.env = [
    ($.Any        = Any),
    ($.Array      = type1('Array', id)),
    ($.Boolean    = type0('Boolean')),
    ($.Date       = type0('Date')),
    ($.Error      = type0('Error')),
    ($.Function   = type0('Function')),
    ($.Null       = type0('Null')),
    ($.Number     = type0('Number')),
    ($.Object     = type0('Object')),
    ($.RegExp     = type0('RegExp')),
    ($.String     = type0('String')),
    ($.Undefined  = type0('Undefined'))
  ];

  //  ValidDate :: Type
  $.ValidDate = NullaryType(
    'sanctuary-def/ValidDate',
    function(x) { return $.Date.test(x) && !isNaN(x.valueOf()); }
  );

  //  PositiveNumber :: Type
  $.PositiveNumber = NullaryType(
    'sanctuary-def/PositiveNumber',
    function(x) { return $.Number.test(x) && x > 0; }
  );

  //  NegativeNumber :: Type
  $.NegativeNumber = NullaryType(
    'sanctuary-def/NegativeNumber',
    function(x) { return $.Number.test(x) && x < 0; }
  );

  //  ValidNumber :: Type
  var ValidNumber = $.ValidNumber = NullaryType(
    'sanctuary-def/ValidNumber',
    function(x) { return $.Number.test(x) && !isNaN(x); }
  );

  //  NonZeroValidNumber :: Type
  $.NonZeroValidNumber = NullaryType(
    'sanctuary-def/NonZeroValidNumber',
    function(x) { return ValidNumber.test(x) && x != 0; }
  );

  //  FiniteNumber :: Type
  var FiniteNumber = $.FiniteNumber = NullaryType(
    'sanctuary-def/FiniteNumber',
    function(x) { return ValidNumber.test(x) && isFinite(x); }
  );

  //  PositiveFiniteNumber :: Type
  $.PositiveFiniteNumber = NullaryType(
    'sanctuary-def/PositiveFiniteNumber',
    function(x) { return FiniteNumber.test(x) && x > 0; }
  );

  //  NegativeFiniteNumber :: Type
  $.NegativeFiniteNumber = NullaryType(
    'sanctuary-def/NegativeFiniteNumber',
    function(x) { return FiniteNumber.test(x) && x < 0; }
  );

  //  NonZeroFiniteNumber :: Type
  $.NonZeroFiniteNumber = NullaryType(
    'sanctuary-def/NonZeroFiniteNumber',
    function(x) { return FiniteNumber.test(x) && x != 0; }
  );

  //  Integer :: Type
  var Integer = $.Integer = NullaryType(
    'sanctuary-def/Integer',
    function(x) {
      return ValidNumber.test(x) &&
             Math.floor(x) == x &&
             x >= MIN_SAFE_INTEGER &&
             x <= MAX_SAFE_INTEGER;
    }
  );

  //  PositiveInteger :: Type
  $.PositiveInteger = NullaryType(
    'sanctuary-def/PositiveInteger',
    function(x) { return Integer.test(x) && x > 0; }
  );

  //  NegativeInteger :: Type
  $.NegativeInteger = NullaryType(
    'sanctuary-def/NegativeInteger',
    function(x) { return Integer.test(x) && x < 0; }
  );

  //  NonZeroInteger :: Type
  $.NonZeroInteger = NullaryType(
    'sanctuary-def/NonZeroInteger',
    function(x) { return Integer.test(x) && x != 0; }
  );

  //  RegexFlags :: Type
  $.RegexFlags = EnumType(['', 'g', 'i', 'm', 'gi', 'gm', 'im', 'gim']);

  //  arity :: (Number, Function) -> Function
  var arity = function(n, f) {
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
  };

  //  numArgs :: Number -> String
  var numArgs = function(n) {
    switch (n) {
      case  0:  return  'zero arguments';
      case  1:  return   'one argument' ;
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
  };

  //  replaceTypeVars :: {[Type]} -> Type -> [Type]
  var replaceTypeVars = function(typeVarMap) {
    return function recur(t) {
      switch (t.type) {
        case 'VARIABLE':
          return has(t.name, typeVarMap) ? typeVarMap[t.name] : [t];
        case 'UNARY':
          return map(recur(t.$1), UnaryType.from(t));
        case 'BINARY':
          return BinaryType.xprod(t, recur(t.$1), recur(t.$2));
        default:
          return [t];
      }
    };
  };

  //  rejectInconsistent :: Type -> [Type]
  var rejectInconsistent = function recur(t) {
    switch (t.type) {
      case 'ANY':
        return [];
      case 'UNARY':
        return map(recur(t.$1), UnaryType.from(t));
      case 'BINARY':
        return BinaryType.xprod(t, recur(t.$1), recur(t.$2));
      default:
        return [t];
    }
  };

  //  equalTypes :: (Type, Type) -> Boolean
  var equalTypes = function equalTypes(t1, t2) {
    if (t1.type === 'UNKNOWN' || t2.type === 'UNKNOWN') return true;
    switch (t1.type) {
      case 'ANY':
        return t1.type === t2.type && t1.name === t2.name;
      case 'NULLARY':
        return t1.type === t2.type && t1.name === t2.name;
      case 'UNARY':
        return t1.type === t2.type && t1.name === t2.name &&
               equalTypes(t1.$1, t2.$1);
      case 'BINARY':
        return t1.type === t2.type && t1.name === t2.name &&
               equalTypes(t1.$1, t2.$1) &&
               equalTypes(t1.$2, t2.$2);
      case 'ENUM':
        return t1.type === t2.type && show(t1) === show(t2);
      case 'RECORD':
        return t1.type === t2.type && show(t1) === show(t2);
      /* istanbul ignore next */
      default:
        throw new TypeError(
          'Unexpected type ' +
          LEFT_SINGLE_QUOTATION_MARK + t1.type + RIGHT_SINGLE_QUOTATION_MARK
        );
    }
  };

  //  commonTypes :: [[Type]] -> [Type]
  var commonTypes = function(typeses) {
    if (isEmpty(typeses)) return [];

    return chain(typeses[0], function(t) {
      var common = true;
      for (var idx = 1; idx < typeses.length; idx += 1) {
        common = false;
        for (var idx2 = 0; idx2 < typeses[idx].length; idx2 += 1) {
          if (equalTypes(t, typeses[idx][idx2])) {
            common = true;
            break;
          }
        }
      }
      return common ? [t] : [];
    });
  };

  //  ordinals :: [String]
  var ordinals = [
    'first',
    'second',
    'third',
    'fourth',
    'fifth',
    'sixth',
    'seventh',
    'eighth',
    'ninth'
  ];

  var invalidArgumentsLength = function(name, expectedLength, actualLength) {
    return new TypeError(
      LEFT_SINGLE_QUOTATION_MARK + name + RIGHT_SINGLE_QUOTATION_MARK +
      ' requires ' + numArgs(expectedLength) + ';' +
      ' received ' + numArgs(actualLength)
    );
  };

  var typeNotInEnvironment = function(env, name, type) {
    return new TypeError(
      'Definition of ' + LEFT_SINGLE_QUOTATION_MARK + name +
      RIGHT_SINGLE_QUOTATION_MARK + ' references ' + type.name +
      ' which is not in the environment:\n\n' +
      map(chain(env, rejectInconsistent), prefix('  - ')).join('\n')
    );
  };

  var invalidArgument = function(name, types, value, index) {
    return new TypeError(
      LEFT_SINGLE_QUOTATION_MARK + name + RIGHT_SINGLE_QUOTATION_MARK +
      ' expected a value of type ' + types.join(' or ') + ' as its ' +
      ordinals[index] + ' argument; received ' + show(value)
    );
  };

  var orphanArgument = function(env, name, value, index) {
    return new TypeError(
      LEFT_SINGLE_QUOTATION_MARK + name + RIGHT_SINGLE_QUOTATION_MARK +
      ' received ' + show(value) + ' as its ' + ordinals[index] +
      ' argument, but this value is not a member of any of the types ' +
      'in the environment:\n\n' +
      map(chain(env, rejectInconsistent), prefix('  - ')).join('\n')
    );
  };

  var invalidReturnValue = function(name, types, value) {
    return new TypeError(
      LEFT_SINGLE_QUOTATION_MARK + name + RIGHT_SINGLE_QUOTATION_MARK +
      ' is expected to return a value of type ' + types.join(' or ') +
      '; returned ' + show(value)
    );
  };

  var invalidValue = function(name, types, value, index) {
    return isNaN(index) ?
      invalidReturnValue(name, types, value) :
      invalidArgument(name, types, value, index);
  };

  var constraintViolation = function(name, typeVarName, typeClasses, _types) {
    var types = chain(_types, rejectInconsistent);
    return new TypeError(
      LEFT_SINGLE_QUOTATION_MARK + name + RIGHT_SINGLE_QUOTATION_MARK +
      ' requires ' + LEFT_SINGLE_QUOTATION_MARK + typeVarName +
      RIGHT_SINGLE_QUOTATION_MARK + ' to implement ' +
      typeClasses.join(' and ') + '; ' + types.join(' and ') + ' ' +
      (types.length === 1 ? 'does' : 'do') + ' not'
    );
  };

  //  create :: (Boolean, [Type]) -> Function
  $.create = function(checkTypes, _env) {
    //  env :: [Type]
    var env = map(_env, function(x) {
      return typeof x === 'function' ?
        x.apply(null, map(range(0, x.length), K(Unknown))) :
        x;
    });

    //  assertExpectedTypesInEnvironment :: String -> [Type] -> Undefined
    var assertExpectedTypesInEnvironment = function(name) {
      return function recur(expTypes) {
        for (var idx = 0; idx < expTypes.length; idx += 1) {
          var expType = expTypes[idx];
          if (expType.type !== 'VARIABLE') {
            if (!any(env, eqProps('name')(expType))) {
              throw typeNotInEnvironment(env, name, expType);
            }
            if (expType.type === 'UNARY') {
              recur([expType.$1]);
            } else if (expType.type === 'BINARY') {
              recur([expType.$1, expType.$2]);
            }
          }
        }
      };
    };

    //  determineActualTypes :: a -> [Type]
    var determineActualTypes = function recur(value) {
      return chain(env, function(t) {
        return (
          t.name === 'sanctuary-def/Nullable' || !t.test(value) ?
            [] :
          t.type === 'UNARY' ?
            map(commonTypes(or(map(t._1(value), recur), [[Unknown]])),
                UnaryType.from(t)) :
          t.type === 'BINARY' ?
            BinaryType.xprod(
              t,
              commonTypes(or(map(t._1(value), recur), [[Unknown]])),
              commonTypes(or(map(t._2(value), recur), [[Unknown]]))
            ) :
          // else
            [t]
        );
      });
    };

    var _satisfactoryTypes =
    function(name, constraints, $typeVarMap, _value, index) {
      return function recur(expType, values, nest) {
        var $1s, $2s, idx, okTypes;

        switch (expType.type) {

          case 'VARIABLE':
            var typeVarName = expType.name;
            if (has(typeVarName, constraints)) {
              var typeClasses = constraints[typeVarName];
              for (idx = 0; idx < values.length; idx += 1) {
                for (var idx2 = 0; idx2 < typeClasses.length; idx2 += 1) {
                  if (!typeClasses[idx2].test(values[idx])) {
                    throw constraintViolation(
                      name,
                      typeVarName,
                      typeClasses,
                      commonTypes(map(values, determineActualTypes))
                    );
                  }
                }
              }
            }
            if (has(typeVarName, $typeVarMap)) {
              var types = $typeVarMap[typeVarName];
              okTypes = chain(types, function(t) {
                return all(values, t.test) ? [t] : [];
              });
              if (isEmpty(okTypes)) {
                throw invalidValue(name, map(types, nest), _value, index);
              }
            } else {
              okTypes = chain(commonTypes(map(values, determineActualTypes)),
                              rejectInconsistent);
              if (isEmpty(okTypes) && !isEmpty(values)) {
                throw orphanArgument(env, name, _value, index);
              }
            }
            if (!isEmpty(okTypes)) $typeVarMap[typeVarName] = okTypes;
            return okTypes;

          case 'UNARY':
            $1s = recur(expType.$1,
                        chain(values, expType._1),
                        UnaryType.from(expType));
            return map(or($1s, [expType.$1]), UnaryType.from(expType));

          case 'BINARY':
            var specialize = BinaryType.from(expType);
            $1s = recur(expType.$1,
                        chain(values, expType._1),
                        function($1) { return specialize($1, expType.$2); });
            $2s = recur(expType.$2,
                        chain(values, expType._2),
                        function($2) { return specialize(expType.$1, $2); });
            return BinaryType.xprod(expType,
                                    or($1s, [expType.$1]),
                                    or($2s, [expType.$2]));

          default:
            return commonTypes(map(values, determineActualTypes));
        }
      };
    };

    var satisfactoryTypes =
    function(name, constraints, $typeVarMap, expType, value, index) {
      return _satisfactoryTypes(name, constraints, $typeVarMap, value, index)
                               (expType, [value], id);
    };

    var curry = function(name, constraints, expArgTypes, expRetType,
                         _typeVarMap, _values, _indexes, impl) {
      return arity(_indexes.length, function() {
        if (checkTypes) {
          var delta = _indexes.length - arguments.length;
          if (delta < 0) {
            throw invalidArgumentsLength(name,
                                         expArgTypes.length,
                                         expArgTypes.length - delta);
          }
        }
        var $typeVarMap = {};
        for (var typeVarName in _typeVarMap) {
          $typeVarMap[typeVarName] = _typeVarMap[typeVarName].slice();
        }
        var values = _values.slice();
        var indexes = [];
        for (var idx = 0; idx < _indexes.length; idx += 1) {
          var index = _indexes[idx];

          if (idx < arguments.length &&
              !(typeof arguments[idx] === 'object' &&
                arguments[idx] != null &&
                arguments[idx]['@@functional/placeholder'] === true)) {

            var value = arguments[idx];
            if (checkTypes) {
              var expType = expArgTypes[index];
              if (!expType.test(value) ||
                  isEmpty(satisfactoryTypes(name, constraints, $typeVarMap,
                                            expType, value, index))) {
                throw invalidValue(name,
                                   replaceTypeVars($typeVarMap)(expType),
                                   value,
                                   index);
              }
            }
            values[index] = value;
          } else {
            indexes.push(index);
          }
        }
        if (isEmpty(indexes)) {
          var returnValue = impl.apply(this, values);
          if (checkTypes) {
            if (!expRetType.test(returnValue)) {
              throw invalidReturnValue(name, [expRetType], returnValue);
            }
            satisfactoryTypes(name, constraints, $typeVarMap,
                              expRetType, returnValue, NaN);
          }
          return returnValue;
        } else {
          return curry(name, constraints, expArgTypes, expRetType,
                       $typeVarMap, values, indexes, impl);
        }
      });
    };

    return function def(name, constraints, expTypes, impl) {
      if (checkTypes) {
        if (arguments.length !== def.length) {
          throw invalidArgumentsLength('def', def.length, arguments.length);
        }

        var Type = RecordType({test: $.Function});
        var types = [$.String, $.Object, $.Array(Type), $.Function];
        for (var idx = 0; idx < types.length; idx += 1) {
          if (!types[idx].test(arguments[idx])) {
            throw invalidArgument('def', [types[idx]], arguments[idx], idx);
          }
        }
      }

      var expArgTypes = expTypes.slice(0, -1);
      var arity = expArgTypes.length;
      if (arity > 9) {
        throw new RangeError(
          LEFT_SINGLE_QUOTATION_MARK + 'def' + RIGHT_SINGLE_QUOTATION_MARK +
          ' cannot define a function with arity greater than nine'
        );
      }

      if (checkTypes) assertExpectedTypesInEnvironment(name)(expTypes);

      return curry(name,
                   constraints,
                   expArgTypes,
                   expTypes[expTypes.length - 1],
                   {},
                   new Array(arity),
                   range(0, arity),
                   impl);
    };
  };

  return $;

}));
