'use strict';

const assert = require ('assert');
const util = require ('util');

const {Left, Right} = require ('sanctuary-either');
const show = require ('sanctuary-show');
const Z = require ('sanctuary-type-classes');
const type = require ('sanctuary-type-identifiers');


const MAX_SAFE_INTEGER = Math.pow (2, 53) - 1;
const MIN_SAFE_INTEGER = -MAX_SAFE_INTEGER;

const inspect = typeof util.inspect.custom === 'symbol' ?
                util.inspect.custom :
                /* istanbul ignore next */ 'inspect';

const $ = module.exports = {};

//    toMarkdownList :: (String, String, a -> String, Array a) -> String
const toMarkdownList = (empty, s, f, xs) => {
  return isEmpty (xs) ?
    empty :
    Z.reduce (function(s, x) { return s + '  - ' + f (x) + '\n'; }, s, xs);
};

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

//    B :: (b -> c) -> (a -> b) -> a -> c
const B = f => g => x => f (g (x));

const I = x => x;

const K = x => y => x;

//    reduce :: (b -> a -> b) -> b -> Array a -> b
const reduce = f => y => xs => xs.reduce ((y, x) => f (y) (x), y);

//    isEmpty :: Foldable f => f a -> Boolean
const isEmpty = xs => Z.size (xs) === 0;

//    isPrefix :: Array a -> Array a -> Boolean
const isPrefix = candidate => xs => {
  if (candidate.length > xs.length) return false;
  for (var idx = 0; idx < candidate.length; idx += 1) {
    if (candidate[idx] !== xs[idx]) return false;
  }
  return true;
};

//    joinWith :: (String, Array String) -> String
const joinWith = (separator, ss) => ss.join (separator);

//    memberOf :: Array a -> a -> Boolean
const memberOf = xs => y => xs.some (x => Z.equals (x, y));

//    or :: (Array a, Array a) -> Array a
const or = (xs, ys) => isEmpty (xs) ? ys : xs;

//    strRepeat :: (String, Integer) -> String
const strRepeat = (s, times) => joinWith (s, Array (times + 1));

//    r :: Char -> String -> String
const r = c => s => strRepeat (c, s.length);

//    _ :: String -> String
const _ = r (' ');

//    trimTrailingSpaces :: String -> String
const trimTrailingSpaces = s => s.replace (/[ ]+$/gm, '');

//    when :: Boolean -> (a -> a) -> a -> a
const when = bool => f => x => bool ? f (x) : x;

//    wrap :: String -> String -> String -> String
const wrap = prefix => suffix => s => prefix + s + suffix;

//    parenthesize :: (String -> String) -> String -> String
const parenthesize = f => wrap (f ('(')) (f (')'));

//    q :: String -> String
const q = wrap ('\u2018') ('\u2019');

//  stripNamespace :: TypeClass -> String
const stripNamespace = typeClass => (
  typeClass.name.slice (typeClass.name.indexOf ('/') + 1)
);

//  _underline :: ... -> String
function _underline(
  t,              // :: Type
  propPath,       // :: PropPath
  formatType3     // :: Type -> Array String -> String -> String
) {
  return formatType3 (t) (propPath) (t.format (_) (function(k) {
    return K (_underline (t.blah[k].type,
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
    var f = B (when (t.type === 'FUNCTION')
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
  return Z.reduce (function(t, prop) { return t.blah[prop].type; },
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

//    see :: (String, { name :: String, url :: String? }) -> String
const see = (label, record) => (
  record.url == null || record.url === '' ?
  '' :
  '\nSee ' + record.url +
  ' for information about the ' + record.name + ' ' + label + '.\n'
);

//    InvalidArgumentsCount :: PropPath -> Integer -> Array Any -> MyError
const InvalidArgumentsCount = propPath => count => args => ({
  tagName: 'InvalidArgumentsCount',
  propPath,
  count,
  args,
});

//    InvalidValue :: PropPath -> Any -> MyError
const InvalidValue = propPath => value => ({
  tagName: 'InvalidValue',
  propPath,
  value,
});

const TypeVariableConstraintViolation = propPath => valuesByPath => ({
  tagName: 'TypeVariableConstraintViolation',
  propPath,
  valuesByPath,
});

//    prepend :: String -> MyError -> MyError
const prepend = prop => myError => {
  switch (myError.tagName) {
    case 'InvalidValue':
      return InvalidValue ([prop, ...myError.propPath]) (myError.value);
    case 'TypeVariableConstraintViolation':
      return TypeVariableConstraintViolation ([prop, ...myError.propPath]) (myError.valuesByPath);
  }
};

//    underlineTypeVars :: (TypeInfo, StrMap (Array Any)) -> String
const underlineTypeVars = (typeInfo, valuesByPath) => {
  //  Note: Sorting these keys lexicographically is not "correct", but it
  //  does the right thing for indexes less than 10.
  var paths = Z.map (JSON.parse, (Object.keys (valuesByPath)).sort ());
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
};

//    typeVarConstraintViolation :: ... -> Error
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
  }, (Object.keys (valuesByPath)).sort ());

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
};

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
    t.type === 'VARIABLE' &&
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
      see (t.arity >= 1 ? 'type constructor' : 'type', t)
  ));
}

//  expandUnknown
//  :: Array Type
//  -> Array Object
//  -> Any
//  -> (a -> Array b)
//  -> Type
//  -> Array Type
const expandUnknown = env => seen => value => extractor => type => (
  type.type === 'UNKNOWN' ?
  _determineActualTypes (env, seen, extractor (value)) :
  [type]
);

//    _determineActualTypes :: ... -> Array Type
const _determineActualTypes = (
  env,            // :: Array Type
  seen,           // :: Array Object
  values          // :: Array Any
) => {
  const expandUnknown4 = expandUnknown (env);

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
        validate (env) (t) (value) != null ?
          [] :
        t.type === 'UNARY' ?
          Z.map (fromUnaryType (t),
                 expandUnknown2 (extract ('$1') (t)) (t.blah.$1.type)) :
        t.type === 'BINARY' ?
          Z.lift2 (fromBinaryType (t),
                   expandUnknown2 (extract ('$1') (t)) (t.blah.$1.type),
                   expandUnknown2 (extract ('$2') (t)) (t.blah.$2.type)) :
        // else
          [t]
      );
    }, types);
  }

  return isEmpty (values) ?
    [$.Unknown] :
    or (Z.reduce (refine, env, values), [$.Inconsistent]);
};

//    isConsistent :: Type -> Boolean
const isConsistent = t => (
  t.type === 'UNARY'   ? isConsistent (t.types.$1) :
  t.type === 'BINARY'  ? isConsistent (t.types.$1) &&
                         isConsistent (t.types.$2) :
  /* else */             t.type !== 'INCONSISTENT'
);

//    determineActualTypesStrict :: (Array Type, Array Any) -> Array Type
const determineActualTypesStrict = (env, values) => (
  Z.filter (isConsistent,
            _determineActualTypes (env, [], values))
);

//    determineActualTypesLoose :: (Array Type, Array Any) -> Array Type
const determineActualTypesLoose = (env, values) => (
  Z.reject (function(t) { return t.type === 'INCONSISTENT'; },
            _determineActualTypes (env, [], values))
);

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
  var recur = satisfactoryTypes;

  for (var idx = 0; idx < values.length; idx += 1) {
    var result = validate (env) (expType) (values[idx]);
    if (result != null) {
      return Left (function() {
        return invalidValue (env,
                             typeInfo,
                             index,
                             Z.concat (propPath, result.propPath),
                             result.value);
      });
    }
  }

  switch (expType.type) {

    case 'VARIABLE':
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
            const keys = Object.keys (expType.blah);
            return keys.reduce (function(e, k, idx) {
              var extractor = extract (keys[offset + idx]) (t);
              return Z.reduce (function(e, x) {
                return Z.chain (function(r) {
                  return recur (env,
                                typeInfo,
                                r.typeVarMap,
                                expType.blah[k].type,
                                index,
                                Z.concat (propPath, [k]),
                                [x]);
                }, e);
              }, e, Z.chain (extractor, values));
            }, Right (r));
          }, e);
        }, Right ({typeVarMap: typeVarMap$, types: okTypes}), okTypes);

    case 'UNARY':
      return Z.map (
        function(result) {
          return {
            typeVarMap: result.typeVarMap,
            types: Z.map (fromUnaryType (expType),
                          or (result.types, [expType.blah.$1.type]))
          };
        },
        recur (env,
               typeInfo,
               typeVarMap,
               expType.blah.$1.type,
               index,
               Z.concat (propPath, ['$1']),
               Z.chain (extract ('$1') (expType), values))
      );

    case 'BINARY':
      return Z.chain (
        function(result) {
          var $1s = result.types;
          return Z.map (
            function(result) {
              var $2s = result.types;
              return {
                typeVarMap: result.typeVarMap,
                types: Z.lift2 (fromBinaryType (expType),
                                or ($1s, [expType.blah.$1.type]),
                                or ($2s, [expType.blah.$2.type]))
              };
            },
            recur (env,
                   typeInfo,
                   result.typeVarMap,
                   expType.blah.$2.type,
                   index,
                   Z.concat (propPath, ['$2']),
                   Z.chain (extract ('$2') (expType), values))
          );
        },
        recur (env,
               typeInfo,
               typeVarMap,
               expType.blah.$1.type,
               index,
               Z.concat (propPath, ['$1']),
               Z.chain (extract ('$1') (expType), values))
      );

    case 'RECORD':
      return Z.reduce (function(e, k) {
        return Z.chain (function(r) {
          return recur (env,
                        typeInfo,
                        r.typeVarMap,
                        expType.blah[k].type,
                        index,
                        Z.concat (propPath, [k]),
                        Z.chain (extract (k) (expType), values));
        }, e);
      }, Right ({typeVarMap: typeVarMap, types: [expType]}), Object.keys (expType.blah));

    default:
      return Right ({typeVarMap: typeVarMap, types: [expType]});
  }
};

const test = env => t => x => {
  const typeInfo = {name: 'name', constraints: {}, types: [t]};
  return (satisfactoryTypes (env, typeInfo, {}, t, 0, [], [x])).isRight;
};

const Type$prototype = {
  '@@type': 'sanctuary-def/Type@1',
  '@@show': function() {
    return this.format (I) (K (I));
  },
  'fantasy-land/equals': function(other) {
    return (
      Z.equals (this.type, other.type) &&
      Z.equals (this.name, other.name) &&
      Z.equals (this.url, other.url) &&
      Z.equals (this.supertypes, other.supertypes) &&
      Z.equals (Object.keys (this.blah), Object.keys (other.blah)) &&
      Z.all (k => Z.equals (this.blah[k].type, other.blah[k].type), Object.keys (this.blah))
    );
  },
};

//    ancestors :: Type -> Array Type
const ancestors = type => (
  Z.concat (Z.chain (ancestors, type.supertypes), type)
);

//    extract :: String -> Type -> Any -> Array Any
const extract = key => type => x => {
  const foldable = type.blah[key].extract (x);
  return (
    Array.isArray (foldable)
    ? foldable
    : Z.reduce ((xs, x) => (xs.push (x), xs), [], foldable)
  );
};

const validate = env => type => x => {
  if (!(Z.all (t => t._test (env) (x), ancestors (type)))) {
    return {value: x, propPath: []};
  }
  for (const k of Object.keys (type.blah)) {
    const t = type.blah[k].type;
    const ys = extract (k) (type) (x);
    for (const y of ys) {
      const result = validate (env) (t) (y);
      if (result != null) {
        return {value: result.value, propPath: Z.prepend (k, result.propPath)};
      }
    }
  }
};

$.Unknown = Object.assign (Object.create (Type$prototype), {
  type: 'UNKNOWN',
  name: '',
  url: '',
  supertypes: [],
  arity: 0,
  blah: {},
  _test: K (K (true)),
  format: outer => K (outer ('Unknown')),
});

const Unchecked = s => Object.assign (Object.create (Type$prototype), {
  type: 'NULLARY',
  name: '',
  url: '',
  supertypes: [],
  arity: 0,
  blah: {},
  _test: K (K (true)),
  format: outer => K (outer (s)),
  new: ctx => ctx.value,
});

$.Inconsistent = Object.assign (Object.create (Type$prototype), {
  type: 'INCONSISTENT',
  name: '',
  url: '',
  supertypes: [],
  arity: 0,
  blah: {},
  _test: K (K (false)),
  format: outer => K (outer ('???')),
});

$.NoArguments = Object.assign (Object.create (Type$prototype), {
  type: 'NO_ARGUMENTS',
  name: '',
  url: '',
  supertypes: [],
  arity: 0,
  blah: {},
  _test: K (K (true)),
  format: outer => K (outer ('()')),
});

$.NullaryType = name => url => supertypes => test => Object.assign (Object.create (Type$prototype), {
  type: 'NULLARY',
  name: name,
  url: url,
  supertypes: supertypes,
  arity: 0,
  blah: {},
  _test: env => test,
  format: outer => K (outer (name)),
  new: ctx => ctx.value,
});

$.UnaryType = name => url => supertypes => test => _1 => $1 => Object.assign (Object.create (Type$prototype), {
  type: 'UNARY',
  name: name,
  url: url,
  supertypes: supertypes,
  arity: 1,
  blah: {
    $1: {type: $1, extract: _1},
  },
  _test: K (test),
  format: outer => inner => (
    outer (name) +
    outer (' ') +
    when ($1.arity > 0)
         (parenthesize (outer))
         (inner ('$1') (show ($1)))
  ),
  new: ctx => {
    Z.reduce (
      (_, x) => {
        if (Z.all (t => t._test (ctx.env) (x), ancestors ($1))) {
          $1.new ({
            typeVarMap: ctx.typeVarMap,
            env: ctx.env,
            index: ctx.index,
            propPath: ['$1', ...ctx.propPath],
            fail: myError => ctx.fail (prepend ('$1') (myError)),
            value: x,
          });
        } else {
          ctx.fail (InvalidValue (['$1']) (x));
        }
      },
      undefined,
      _1 (ctx.value)
    )
    return ctx.value;
  },
});

//  fromUnaryType :: Type -> Type -> Type
const fromUnaryType = t => (
  $.UnaryType (t.name)
              (t.url)
              (t.supertypes)
              (t._test ([]))
              (t.blah.$1.extract)
);

$.BinaryType = name => url => supertypes => test => _1 => _2 => $1 => $2 => Object.assign (Object.create (Type$prototype), {
  type: 'BINARY',
  name: name,
  url: url,
  supertypes: supertypes,
  arity: 2,
  blah: {
    $1: {type: $1, extract: _1},
    $2: {type: $2, extract: _2},
  },
  _test: K (test),
  format: outer => inner => (
    outer (name) +
    outer (' ') +
    when ($1.arity > 0)
         (parenthesize (outer))
         (inner ('$1') (show ($1))) +
    outer (' ') +
    when ($2.arity > 0)
         (parenthesize (outer))
         (inner ('$2') (show ($2)))
  ),
  new: ctx => {
    Z.reduce (
      (_, x) => {
        if (Z.all (t => t._test (ctx.env) (x), ancestors ($1))) {
          $1.new ({
            typeVarMap: ctx.typeVarMap,
            env: ctx.env,
            index: ctx.index,
            propPath: ['$1', ...ctx.propPath],
            fail: myError => ctx.fail (prepend ('$1') (myError)),
            value: x,
          });
        } else {
          ctx.fail (InvalidValue (['$1']) (x));
        }
      },
      undefined,
      _1 (ctx.value)
    );
    Z.reduce (
      (_, x) => {
        if (Z.all (t => t._test (ctx.env) (x), ancestors ($2))) {
          $2.new ({
            typeVarMap: ctx.typeVarMap,
            env: ctx.env,
            index: ctx.index,
            propPath: ['$2', ...ctx.propPath],
            fail: myError => ctx.fail (prepend ('$2') (myError)),
            value: x,
          });
        } else {
          ctx.fail (InvalidValue (['$2']) (x));
        }
      },
      undefined,
      _2 (ctx.value)
    );
    return ctx.value;
  },
});

//    fromBinaryType :: (Type -> Type -> Type) -> Type -> Type -> Type
const fromBinaryType = t => (
  $.BinaryType (t.name)
               (t.url)
               (t.supertypes)
               (t._test ([]))
               (t.blah.$1.extract)
               (t.blah.$2.extract)
);

const EnumType = name => url => members => Object.assign (Object.create (Type$prototype), {
  type: 'NULLARY',
  name: name,
  url: url,
  supertypes: [],
  arity: 0,
  blah: {},
  _test: env => x => memberOf (members) (x),
  format: outer => K (outer (name)),
  new: ctx => ctx.value,
});

const TypeVariable = name => Object.assign (Object.create (Type$prototype), {
  type: 'VARIABLE',
  name: name,
  url: '',
  supertypes: [],
  arity: 0,
  blah: {},
  _test: K (K (true)),
  format: outer => K (outer (name)),
  new: ctx => {
    if (name in ctx.typeVarMap) {
      const $types = ctx.typeVarMap[name].types;
      for (let idx = $types.length - 1; idx >= 0; idx -= 1) {
        if (!(test (ctx.env) ($types[idx]) (ctx.value))) {
          $types.splice (idx, 1);
        }
      }
      const key = JSON.stringify ([ctx.index].concat (ctx.propPath));
      if (Object.prototype.hasOwnProperty.call (ctx.typeVarMap[name].valuesByPath, key)) {
        ctx.typeVarMap[name].valuesByPath[key].push (ctx.value);
      } else {
        ctx.typeVarMap[name].valuesByPath[key] = [ctx.value];
      }
      if ($types.length === 0) {
        ctx.fail (TypeVariableConstraintViolation ([]) (ctx.typeVarMap[name].valuesByPath));
      }
    } else {
      const key = JSON.stringify ([ctx.index].concat (ctx.propPath));
      ctx.typeVarMap[name] = {
        types: Z.filter (t => t.arity >= 0 && test (ctx.env) (t) (ctx.value), ctx.env),
        valuesByPath: {[key]: [ctx.value]},
      };
    }
    return ctx.value;
  },
});

const UnaryTypeVariable = name => $1 => Object.assign (Object.create (Type$prototype), {
  type: 'VARIABLE',
  name: name,
  url: '',
  supertypes: [],
  arity: 1,
  blah: {
    $1: {type: $1, extract: K ([])},
  },
  _test: K (K (true)),
  format: outer => inner => (
    outer (name) +
    outer (' ') +
    when ($1.arity > 0)
         (parenthesize (outer))
         (inner ('$1') (show ($1)))
  ),
  new: ctx => ctx.value,
});

const BinaryTypeVariable = name => $1 => $2 => Object.assign (Object.create (Type$prototype), {
  type: 'VARIABLE',
  name: name,
  url: '',
  supertypes: [],
  arity: 2,
  blah: {
    $1: {type: $1, extract: K ([])},
    $2: {type: $2, extract: K ([])},
  },
  _test: K (K (true)),
  format: outer => inner => (
    outer (name) +
    outer (' ') +
    when ($1.arity > 0)
         (parenthesize (outer))
         (inner ('$1') (show ($1))) +
    outer (' ') +
    when ($2.arity > 0)
         (parenthesize (outer))
         (inner ('$2') (show ($2)))
  ),
});

const Function_ = types => Object.assign (Object.create (Type$prototype), {
  type: 'FUNCTION',
  name: '',
  url: '',
  supertypes: [$.AnyFunction],
  arity: types.length,
  blah: {
    $1: {type: types[0], extract: K ([])},
    $2: {type: types[1], extract: K ([])},
  },
  _test: K (K (true)),
  format: outer => inner => (
    when (types.length !== 2)
         (parenthesize (outer))
         (when (types[0].type === 'FUNCTION')
               (parenthesize (outer))
               (inner ('$1') (show (types[0])))) +
    outer (' -> ') +
    inner ('$2') (show (types[1]))
  ),
});

const RecordType = fields => {
  const keys = (Object.keys (fields)).sort ();
  return Object.assign (Object.create (Type$prototype), {
    type: 'RECORD',
    name: '',
    url: '',
    supertypes: [],
    arity: 0,
    blah: keys.reduce (
      (blah, k) => (blah[k] = {type: fields[k], extract: x => [x[k]]}, blah),
      {}
    ),
    _test: env => x => {
      if (x == null) return false;
      const missing = {};
      keys.forEach (k => { missing[k] = k; });
      for (const k in x) delete missing[k];
      return isEmpty (missing);
    },
    format: outer => inner => {
      if (isEmpty (keys)) return outer ('{}');
      const reprs = Z.map (k => {
        const t = fields[k];
        return outer (' ') +
               outer (/^(?!\d)[$\w]+$/.test (k) ? k : show (k)) +
               outer (' :: ') +
               inner (k) (show (t));
      }, keys);
      return wrap (outer ('{')) (outer (' }')) (joinWith (outer (','), reprs));
    },
    new: ctx => {
      keys.forEach (k => {
        if (Z.all (t => t._test (ctx.env) (ctx.value[k]), ancestors (fields[k]))) {
          fields[k].new ({
            typeVarMap: ctx.typeVarMap,
            env: ctx.env,
            index: ctx.index,
            propPath: [k, ...ctx.propPath],
            fail: myError => ctx.fail (prepend (k) (myError)),
            value: ctx.value[k],
          });
        } else {
          ctx.fail (InvalidValue ([k]) (ctx.value[k]));
        }
      });
      return ctx.value;
    },
  });
};

const NamedRecordType = name => url => supertypes => fields => {
  const keys = (Object.keys (fields)).sort ();
  return Object.assign (Object.create (Type$prototype), {
    type: 'RECORD',
    name: name,
    url: url,
    supertypes: supertypes,
    arity: 0,
    blah: keys.reduce (
      (blah, k) => (blah[k] = {type: fields[k], extract: x => [x[k]]}, blah),
      {}
    ),
    _test: env => x => {
      if (x == null) return false;
      const missing = {};
      keys.forEach (k => { missing[k] = k; });
      for (const k in x) delete missing[k];
      if (!(isEmpty (missing))) return false;
      return keys.every (k => fields[k]._test (env) (x[k]));
    },
    format: outer => K (outer (name)),
    new: ctx => {
      keys.forEach (k => {
        if (Z.all (t => t._test (ctx.env) (ctx.value[k]), ancestors (fields[k]))) {
          fields[k].new ({
            typeVarMap: ctx.typeVarMap,
            env: ctx.env,
            index: ctx.index,
            propPath: [k, ...ctx.propPath],
            fail: myError => ctx.fail (InvalidValue ([]) (ctx.value)),
            value: ctx.value[k],
          });
        } else {
          ctx.fail (InvalidValue ([]) (ctx.value[k]));
        }
      });
      return ctx.value;
    },
  });
};

const a = TypeVariable ('a');
const b = TypeVariable ('b');

$.Void = (
  $.NullaryType ('Void')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Void')
                ([])
                (x => false)
);

$.Any = (
  $.NullaryType ('Any')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Any')
                ([])
                (x => true)
);

$.AnyFunction = (
  $.NullaryType ('Function')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Function') // XXX
                ([])
                (x => typeof x === 'function')
);

$.Arguments = (
  $.NullaryType ('Arguments')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Arguments')
                ([])
                (x => Object.prototype.toString.call (x) === '[object Arguments]')
);

$.Boolean = (
  $.NullaryType ('Boolean')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Boolean')
                ([])
                (x => typeof x === 'boolean')
);

$.Buffer = (
  $.NullaryType ('Buffer')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Buffer')
                ([])
                (x => typeof Buffer !== 'undefined' && Buffer.isBuffer (x))
);

$.Date = (
  $.NullaryType ('Date')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Date')
                ([])
                (x => Object.prototype.toString.call (x) === '[object Date]')
);

$.ValidDate = (
  $.NullaryType ('ValidDate')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#ValidDate')
                ([$.Date])
                (x => !(isNaN (Number (x))))
);

const Descending = (
  $.UnaryType ('Descending')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Descending')
              ([])
              (x => type (x) === 'sanctuary-descending/Descending@1')
              (I)
);

const Either = (
  $.BinaryType ('Either')
               ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Either')
               ([])
               (x => type (x) === 'sanctuary-either/Either@1')
               (e => e.isLeft ? [e.value] : [])
               (e => e.isLeft ? [] : [e.value])
);

$.Error = (
  $.NullaryType ('Error')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Error')
                ([])
                (x => Object.prototype.toString.call (x) === '[object Error]')
);

$.HtmlElement = (
  $.NullaryType ('HtmlElement')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#HtmlElement')
                ([])
                (x => /^\[object HTML.+Element\]$/.test (Object.prototype.toString.call (x)))
);

const Identity = (
  $.UnaryType ('Identity')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Identity')
              ([])
              (x => type (x) === 'sanctuary-identity/Identity@1')
              (I)
);

const JsMap = (
  $.BinaryType ('JsMap')
               ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#JsMap')
               ([])
               (x => Object.prototype.toString.call (x) === '[object Map]')
               (jsMap => Array.from (jsMap.keys ()))
               (jsMap => Array.from (jsMap.values ()))
);

const JsSet = (
  $.UnaryType ('JsSet')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#JsSet')
              ([])
              (x => Object.prototype.toString.call (x) === '[object Set]')
              (jsSet => Array.from (jsSet.values ()))
);

const Maybe = (
  $.UnaryType ('Maybe')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Maybe')
              ([])
              (x => type (x) === 'sanctuary-maybe/Maybe@1')
              (I)
);

$.Module = (
  $.NullaryType ('Module')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Module')
                ([])
                (x => Object.prototype.toString.call (x) === '[object Module]')
);

const NonEmpty = (
  $.UnaryType ('NonEmpty')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonEmpty')
              ([])
              (x => Z.Monoid.test (x) && Z.Setoid.test (x) && !(Z.equals (x, Z.empty (x.constructor))))
              (monoid => [monoid])
);

$.Null = (
  $.NullaryType ('Null')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Null')
                ([])
                (x => Object.prototype.toString.call (x) === '[object Null]')
);

const Nullable = (
  $.UnaryType ('Nullable')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Nullable')
              ([])
              (K (true))
              (nullable => nullable === null ? [] : [nullable])
);

$.Number = (
  $.NullaryType ('Number')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Number')
                ([])
                (x => typeof x === 'number')
);

$.ValidNumber = (
  $.NullaryType ('ValidNumber')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#ValidNumber')
                ([$.Number])
                (x => !(isNaN (x)))
);

$.PositiveNumber = (
  $.NullaryType ('PositiveNumber')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#PositiveNumber')
                ([$.Number])
                (x => x > 0)
);

$.NegativeNumber = (
  $.NullaryType ('NegativeNumber')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NegativeNumber')
                ([$.Number])
                (x => x < 0)
);

$.NonZeroValidNumber = (
  $.NullaryType ('NonZeroValidNumber')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonZeroValidNumber')
                ([$.ValidNumber])
                (x => x !== 0)
);

$.FiniteNumber = (
  $.NullaryType ('FiniteNumber')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#FiniteNumber')
                ([$.ValidNumber])
                (isFinite)
);

$.PositiveFiniteNumber = (
  $.NullaryType ('PositiveFiniteNumber')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#PositiveFiniteNumber')
                ([$.FiniteNumber])
                (x => x > 0)
);

$.NegativeFiniteNumber = (
  $.NullaryType ('NegativeFiniteNumber')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NegativeFiniteNumber')
                ([$.FiniteNumber])
                (x => x < 0)
);

$.NonZeroFiniteNumber = (
  $.NullaryType ('NonZeroFiniteNumber')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonZeroFiniteNumber')
                ([$.FiniteNumber])
                (x => x !== 0)
);

$.Integer = (
  $.NullaryType ('Integer')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Integer')
                ([$.ValidNumber])
                (x => Math.floor (x) === x && x >= MIN_SAFE_INTEGER && x <= MAX_SAFE_INTEGER)
);

$.NonZeroInteger = (
  $.NullaryType ('NonZeroInteger')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonZeroInteger')
                ([$.Integer])
                (x => x !== 0)
);

$.NonNegativeInteger = (
  $.NullaryType ('NonNegativeInteger')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonNegativeInteger')
                ([$.Integer])
                (x => x >= 0)
);

$.PositiveInteger = (
  $.NullaryType ('PositiveInteger')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#PositiveInteger')
                ([$.Integer])
                (x => x > 0)
);

$.NegativeInteger = (
  $.NullaryType ('NegativeInteger')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NegativeInteger')
                ([$.Integer])
                (x => x < 0)
);

$.Object = (
  $.NullaryType ('Object')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Object')
                ([])
                (x => type (x) === 'Object')
);

const Pair = (
  $.BinaryType ('Pair')
               ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Pair')
               ([])
               (x => type (x) === 'sanctuary-pair/Pair@1')
               (pair => [pair.fst])
               (pair => [pair.snd])
);

$.RegExp = (
  $.NullaryType ('RegExp')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#RegExp')
                ([])
                (x => Object.prototype.toString.call (x) === '[object RegExp]')
);

$.GlobalRegExp = (
  $.NullaryType ('GlobalRegExp')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#GlobalRegExp')
                ([$.RegExp])
                (regex => regex.global)
);

$.NonGlobalRegExp = (
  $.NullaryType ('NonGlobalRegExp')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonGlobalRegExp')
                ([$.RegExp])
                (regex => !regex.global)
);

$.String = (
  $.NullaryType ('String')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#String')
                ([])
                (x => typeof x === 'string')
);

$.Symbol = (
  $.NullaryType ('Symbol')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Symbol')
                ([])
                (x => typeof x === 'symbol')
);

$.RegexFlags = (
  $.NullaryType ('RegexFlags')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#RegexFlags')
                ([$.String])
                (s => /^g?i?m?$/.test (s))
);

const StrMap = (
  $.UnaryType ('StrMap')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#StrMap')
              ([$.Object])
              (K (true))
              (I)
);

$.Type = (
  $.NullaryType ('Type')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Type')
                ([])
                (x => type (x) === 'sanctuary-def/Type@1')
);

$.TypeClass = (
  $.NullaryType ('TypeClass')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#TypeClass')
                ([])
                (x => type (x) === 'sanctuary-type-classes/TypeClass@1')
);

$.Undefined = (
  $.NullaryType ('Undefined')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Undefined')
                ([])
                (x => Object.prototype.toString.call (x) === '[object Undefined]')
);

$.Array = (
  $.UnaryType ('Array')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Array')
              ([])
              (Array.isArray)
              (I)
);

$.Array0 = (
  $.NullaryType ('Array0')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Array0')
                ([$.Array ($.Unknown)])
                (xs => xs.length === 0)
);

const Array1 = (
  $.UnaryType ('Array1')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Array1')
              ([$.Array ($.Unknown)])
              (xs => xs.length === 1)
              (xs => [xs[0]])
);

const Array2 = (
  $.BinaryType ('Array2')
               ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Array2')
               ([$.Array ($.Unknown)])
               (xs => xs.length === 2)
               (xs => [xs[0]])
               (xs => [xs[1]])
);

const Fn = $1 => $2 => (
  Object.assign (
    Function_ ([$1, $2]),
    {
      new: ctx => (...args) => {
        if (args.length !== 1) {
          ctx.fail (InvalidArgumentsCount ([]) (1) (args));
        }
        const [x] = args;
        if (Z.all (t => t._test (ctx.env) (x), ancestors ($1))) {
          const i = $1.new ({
            typeVarMap: ctx.typeVarMap,
            env: ctx.env,
            index: ctx.index,
            propPath: ['$1', ...ctx.propPath],
            fail: myError => ctx.fail (prepend ('$1') (myError)),
            value: x,
          });
          const y = ctx.value (x);
          if (Z.all (t => t._test (ctx.env) (y), ancestors ($2))) {
            return $2.new ({
              typeVarMap: ctx.typeVarMap,
              env: ctx.env,
              index: ctx.index,
              propPath: ['$2', ...ctx.propPath],
              fail: myError => ctx.fail (prepend ('$2') (myError)),
              value: y,
            });
          } else {
            ctx.fail (InvalidValue (['$2']) (y));
          }
        } else {
          ctx.fail (InvalidValue (['$1']) (x));
        }
      },
    }
  )
);

const Predicate = $1 => $.Fn ($1) ($.Boolean);

const invalidArgumentsCount = (typeInfo, index, numArgsExpected, args) => {
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
};

//  constraintsRepr :: ... -> String
const constraintsRepr = (
  constraints,    // :: StrMap (Array TypeClass)
  outer,          // :: String -> String
  inner           // :: String -> TypeClass -> String -> String
) => {
  var $reprs = [];
  Object.keys (constraints)
  .sort ()
  .forEach (function(k) {
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
};

//    label :: String -> String -> String
const label = label => s => {
  const delta = s.length - label.length;
  return strRepeat (' ', Math.floor (delta / 2)) + label +
         strRepeat (' ', Math.ceil (delta / 2));
};

//    typeVarNames :: Type -> Array String
const typeVarNames = t => {
  const names = [];
  if (t.type === 'VARIABLE') names.push (t.name);
  for (const v of Object.values (t.blah)) {
    Array.prototype.push.apply (names, typeVarNames (v.type));
  }
  return names;
};

//    showTypeWith :: Array Type -> Type -> String
const showTypeWith = types => {
  var names = Z.chain (typeVarNames, types);
  return t => {
    var code = 'a'.charCodeAt (0);
    return when (t.type === 'FUNCTION')
                (parenthesize (I))
                ((show (t)).replace (/\bUnknown\b/g, function() {
                   // eslint-disable-next-line no-plusplus
                   do var name = String.fromCharCode (code++);
                   while (names.indexOf (name) >= 0);
                   return name;
                 }));
  };
}

//    showValuesAndTypes :: ... -> String
const showValuesAndTypes = (
  env,            // :: Array Type
  typeInfo,       // :: TypeInfo
  values,         // :: Array Any
  pos             // :: Integer
) => {
  const showType = showTypeWith (typeInfo.types);
  return show (pos) + ')  ' + joinWith ('\n    ', Z.map (x => (
    show (x) +
    ' :: ' +
    joinWith (', ',
              or (Z.map (showType,
                         determineActualTypesLoose (env, [x])),
                  ['(no types)']))
  ), values));
};

const typeSignature = typeInfo => (
  typeInfo.name + ' :: ' +
  constraintsRepr (typeInfo.constraints, I, K (K (I))) +
  joinWith (' -> ', Z.map (showTypeWith (typeInfo.types), typeInfo.types))
);

$.env = [
  $.AnyFunction,
  $.Arguments,
  $.Array ($.Unknown),
  Array2 ($.Unknown) ($.Unknown),
  $.Boolean,
  $.Buffer,
  $.Date,
  Descending ($.Unknown),
  Either ($.Unknown) ($.Unknown),
  $.Error,
  Fn ($.Unknown) ($.Unknown),
  $.HtmlElement,
  Identity ($.Unknown),
  JsMap ($.Unknown) ($.Unknown),
  JsSet ($.Unknown),
  Maybe ($.Unknown),
  $.Module,
  $.Null,
  $.Number,
  $.Object,
  Pair ($.Unknown) ($.Unknown),
  $.RegExp,
  StrMap ($.Unknown),
  $.String,
  $.Symbol,
  $.Type,
  $.TypeClass,
  $.Undefined,
];

const create = opts => {
  const def = name => constraints => types => impl => {
    if (!opts.checkTypes) return impl;

    const typeInfo = {
      name: name,
      constraints: constraints,
      types: types.length === 1 ? [$.NoArguments, ...types] : types,
    };

    if (types.length === 1) {
      const wrapped = (...args) => {
        if (args.length > 0) {
          throw invalidArgumentsCount (typeInfo, 0, 0, args);
        }

        const x = impl ();
        if (Z.all (t => t._test (opts.env) (x), ancestors (types[0]))) {
          return types[0].new ({
            typeVarMap: Object.create (null),
            env: opts.env,
            index: 0,
            propPath: [],
            fail: myError => TK,
            value: x,
          });
        } else {
          TK;
        }
      };
      const signature = typeSignature (typeInfo);
      wrapped[inspect] = wrapped.toString = () => signature;
      return wrapped;
    }

    return types
    .slice (0, -1)
    .reduceRight (
      (run, input, index) => _typeVarMap => f => {
        const wrapped = (_x, ...rest) => {
          if (rest.length > 0) {
            throw invalidArgumentsCount (typeInfo, index, 1, [_x, ...rest]);
          }

          const typeVarMap = Object.create (_typeVarMap);
          if (Z.all (t => t._test (opts.env) (_x), ancestors (input))) {
            const x = input.new ({
              typeVarMap,
              env: opts.env,
              index,
              propPath: [],
              fail: myError => {
                switch (myError.tagName) {
                  case 'InvalidValue':
                    throw invalidValue (
                      opts.env,
                      typeInfo,
                      index,
                      myError.propPath,
                      myError.value
                    );
                  case 'TypeVariableConstraintViolation':
                    throw typeVarConstraintViolation (
                      opts.env,
                      typeInfo,
                      index,
                      myError.propPath,
                      myError.valuesByPath
                    )
                }
              },
              value: _x,
            });
            return run (typeVarMap) (f (x));
          } else {
            throw invalidValue (opts.env, typeInfo, index, [], _x);
          }
        };
        const signature = typeSignature (typeInfo);
        wrapped[inspect] = wrapped.toString = () => signature;
        return wrapped;
      },
      typeVarMap => value => {
        if (Z.all (t => t._test (opts.env) (value), ancestors (types[types.length - 1]))) {
          return types[types.length - 1].new ({
            typeVarMap,
            env: opts.env,
            index: 0,
            propPath: [],
            fail: myError => { throw invalidValue (opts.env, typeInfo, types.length - 1, myError.propPath, myError.value); },
            value,
          });
        } else {
          throw invalidValue (opts.env, typeInfo, types.length - 1, [], value);
        }
      }
    ) (Object.create (null)) (impl);
  };
  return def ('def') ({}) (defTypes) (def);
};

//    defTypes :: NonEmpty (Array Type)
const defTypes = [
  $.String,
  StrMap ($.Array ($.TypeClass)),
  NonEmpty ($.Array ($.Type)),
  $.AnyFunction,
  $.AnyFunction,
];

const def = create ({checkTypes: true, env: $.env});

$.create = def ('create') ({}) ([RecordType ({checkTypes: $.Boolean, env: $.Array ($.Type)}), Unchecked (joinWith (' -> ', Z.map (show, defTypes)))]) (create);

$.Descending = def ('Descending') ({}) ([$.Type, $.Type]) (Descending);

$.Either = def ('Either') ({}) ([$.Type, $.Type, $.Type]) (Either);

$.Fn = def ('Fn') ({}) ([$.Type, $.Type, $.Type]) (Fn);

$.Identity = def ('Identity') ({}) ([$.Type, $.Type]) (Identity);

$.JsMap = def ('JsMap') ({}) ([$.Type, $.Type, $.Type]) (JsMap);

$.JsSet = def ('JsSet') ({}) ([$.Type, $.Type]) (JsSet);

$.Maybe = def ('Maybe') ({}) ([$.Type, $.Type]) (Maybe);

$.NonEmpty = def ('NonEmpty') ({}) ([$.Type, $.Type]) (NonEmpty);

$.Predicate = def ('Predicate') ({}) ([$.Type, $.Type]) (Predicate);

$.StrMap = def ('StrMap') ({}) ([$.Type, $.Type]) (StrMap);

$.RecordType = def ('RecordType') ({}) ([$.StrMap ($.Type), $.Type]) (RecordType);

$.NamedRecordType = def ('NamedRecordType') ({}) ([$.NonEmpty ($.String), $.String, $.Array ($.Type), $.StrMap ($.Type), $.Type]) (NamedRecordType);

$.Array1 = def ('Array1') ({}) ([$.Type, $.Type]) (Array1);

$.Array2 = def ('Array2') ({}) ([$.Type, $.Type, $.Type]) (Array2);

$.Nullable = def ('Nullable') ({}) ([$.Type, $.Type]) (Nullable);

$.Pair = def ('Pair') ({}) ([$.Type, $.Type, $.Type]) (Pair);

$.test = def ('test') ({}) ([$.Array ($.Type), $.Type, $.Any, $.Boolean]) (test);

$.EnumType = def ('EnumType') ({}) ([$.String, $.String, $.Array ($.Any), $.Type]) (EnumType);

$.Function = def ('Function') ({}) ([$.NonEmpty ($.Array ($.Type)), $.Type]) (Function_);

$.Thunk = def ('Thunk') ({}) ([$.Type, $.Type]) ($1 => Function_ ([$1]));

$.TypeVariable = def ('TypeVariable') ({}) ([$.String, $.Type]) (TypeVariable);

$.UnaryTypeVariable = def ('UnaryTypeVariable') ({}) ([$.String, Unchecked ('Type -> Type')]) (name => def (name) ({}) ([$.Type, $.Type]) (UnaryTypeVariable (name)));

$.BinaryTypeVariable = def ('BinaryTypeVariable') ({}) ([$.String, Unchecked ('Type -> Type -> Type')]) (name => def (name) ({}) ([$.Type, $.Type, $.Type]) (BinaryTypeVariable (name)));
