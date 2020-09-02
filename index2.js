'use strict';

const assert = require ('assert');

const {Left, Right} = require ('sanctuary-either');
const show = require ('sanctuary-show');
const Z = require ('sanctuary-type-classes');
const type = require ('sanctuary-type-identifiers');


const MAX_SAFE_INTEGER = Math.pow (2, 53) - 1;
const MIN_SAFE_INTEGER = -MAX_SAFE_INTEGER;

const $ = module.exports = {};

//    B :: (b -> c) -> (a -> b) -> a -> c
const B = f => g => x => f (g (x));

const I = x => x;

const K = x => y => x;

const log = (...args) => {
  console.log (...args);
};

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

//    or :: (Array a, Array a) -> Array a
const or = (xs, ys) => isEmpty (xs) ? ys : xs;

//    strRepeat :: (String, Integer) -> String
const strRepeat = (s, times) => joinWith (s, Array (times + 1));

//    r :: Char -> String -> String
const r = c => s => strRepeat (c, s.length);

//    _ :: String -> String
const _ = r (' ');

//    toArray :: Foldable f => f a -> Array a
const toArray = foldable => (
  Array.isArray (foldable) ?
  foldable :
  Z.reduce ((xs, x) => { xs.push (x); return xs; }, [], foldable)
);

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

const types_ = x => {
  switch (Object.prototype.toString.call (x)) {
    case '[object Array]':  return ['Array'];
    case '[object Number]': return ['Number'];
    case '[object String]': return ['String'];
    default:                throw new TypeError ('Unknown type');
  }
};

let _nextInt = 0
const nextInt = () => (_nextInt += 1);

const showEnv = env => {
  return `[${(String (env._ts)).padStart (2, '0')}]${'a' in env ? ` a = ${env['a']}` : ''}${'b' in env ? ` b = ${env['b']}` : ''}`;
};

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

//    see :: (String, { name :: String, url :: String? }) -> String
const see = (label, record) => (
  record.url == null || record.url === '' ?
  '' :
  '\nSee ' + record.url +
  ' for information about the ' + record.name + ' ' + label + '.\n'
);

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
      see (t.types.length >= 1 ? 'type constructor' : 'type', t)
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
  type.type === UNKNOWN ?
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
        (t.validate (env) (value)).isLeft ?
          [] :
        t.type === 'UNARY' ?
          Z.map (fromUnaryType (t),
                 expandUnknown2 (t.extractors.$1) (t.types.$1)) :
        t.type === 'BINARY' ?
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
    or (Z.reduce (refine, env, values), [$.Inconsistent]);
};

//    determineActualTypesLoose :: (Array Type, Array Any) -> Array Type
const determineActualTypesLoose = (env, values) => (
  Z.reject (function(t) { return t.type === 'INCONSISTENT'; },
            _determineActualTypes (env, [], values))
);

const _test = env => x => function recur(t) {
  return t.supertypes.every (recur) && t._test (env) (x);
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

    case 'UNARY':
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

    case 'RECORD':
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
};

const test = $.test = env => t => x => {
  const typeInfo = {name: 'name', constraints: {}, types: [t]};
  return (satisfactoryTypes (env, typeInfo, {}, t, 0, [], [x])).isRight;
};

const Type$prototype = {
  '@@type': 'sanctuary-def/Type@1',
  '@@show': function() {
    return this.format (I, K (I));
  },
  'validate': function(env) {
    const test2 = _test (env);
    const type = this;
    return x => {
      if (!(test2 (x) (this))) return Left ({value: x, propPath: []});
      for (const k of this.keys) {
        const t = type.types[k];
        console.log ('k:', k, 'type.types:', type.types);
        const ys = type.extractors[k] (x);
        for (const y of ys) {
          const result = t.validate (env) (y);
          if (result.isLeft) {
            return Left ({value: result.value.value,
                          propPath: Z.prepend (k, result.value.propPath)});
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
};

$.Unknown = Object.assign (Object.create (Type$prototype), {
  type: 'UNKNOWN',
  name: '',
  url: '',
  supertypes: [],
  arity: 0,
  keys: [],
  _extractors: {},
  extractors: {},
  types: {},
  _test: K (K (true)),
  format: (outer, inner) => 'Unknown',
});

$.NullaryType = name => url => supertypes => test => Object.assign (Object.create (Type$prototype), {
  type: 'NULLARY',
  name: name,
  url: url,
  supertypes: supertypes,
  arity: 0,
  keys: [],
  _extractors: {},
  extractors: {},
  types: {},
  _test: K (test),
  format: (outer, inner) => outer (name),
});

$.UnaryType = name => url => supertypes => test => _1 => $1 => Object.assign (Object.create (Type$prototype), {
  type: 'UNARY',
  name: name,
  url: url,
  supertypes: supertypes,
  arity: 1,
  keys: ['$1'],
  _extractors: {$1: _1},
  extractors: {$1: B (toArray) (_1)},
  types: {$1: $1},
  _test: K (test),
  format: (outer, inner) => (
    outer (name) +
    outer (' ') +
    when ($1.arity > 0)
         (parenthesize (outer))
         (inner ('$1') (show ($1)))
  ),
});

//  fromUnaryType :: Type -> Type -> Type
const fromUnaryType = t => (
  $.UnaryType (t.name)
              (t.url)
              (t.supertypes)
              (t._test ([]))
              (t._extractors.$1)
);

$.BinaryType = name => url => supertypes => test => _1 => _2 => $1 => $2 => Object.assign (Object.create (Type$prototype), {
  type: 'BINARY',
  name: name,
  url: url,
  supertypes: supertypes,
  arity: 2,
  keys: ['$1', '$2'],
  _extractors: {$1: _1, $2: _2},
  extractors: {$1: B (toArray) (_1), $2: B (toArray) (_2)},
  types: {$1: $1, $2: $2},
  _test: K (test),
  format: (outer, inner) => (
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

//    fromBinaryType :: (Type -> Type -> Type) -> Type -> Type -> Type
const fromBinaryType = t => (
  $.BinaryType (t.name)
               (t.url)
               (t.supertypes)
               (t._test ([]))
               (t._extractors.$1)
               (t._extractors.$2)
);

$.TypeVariable = name => Object.assign (Object.create (Type$prototype), {
  type: 'VARIABLE',
  name: name,
  url: '',
  supertypes: [],
  arity: 0,
  keys: [],
  _extractors: {},
  extractors: {},
  types: {},
  _test: K (K (true)),
  format: (outer, inner) => name,
  new: env => x => {
    const these = types_ (x);
    if (name in env) {
      const ts = env[name].filter (t => these.includes (t));
      if (ts.length === 0) return Left (`Incompatible ${show (name)} types`);
      env[name] = ts;
    } else {
      env[name] = these;
    }
    return Right (x);
  },
});

$.UnaryTypeVariable = name => $1 => Object.assign (Object.create (Type$prototype), {
  type: 'VARIABLE',
  name: name,
  url: '',
  supertypes: [],
  arity: 1,
  keys: ['$1'],
  _extractors: {$1: K ([])},
  extractors: {$1: K ([])},
  types: {$1: $1},
  _test: K (K (true)),
  format: (outer, inner) => (
    outer (name) +
    outer (' ') +
    when ($1.arity > 0)
         (parenthesize (outer))
         (inner ('$1') (show ($1)))
  ),
});

$.BinaryTypeVariable = name => $1 => $2 => Object.assign (Object.create (Type$prototype), {
  type: 'VARIABLE',
  name: name,
  url: '',
  supertypes: [],
  arity: 2,
  keys: ['$1', '$2'],
  _extractors: {$1: K ([]), $2: K ([])},
  extractors: {$1: K ([]), $2: K ([])},
  types: {$1: $1, $2: $2},
  _test: K (K (true)),
  format: (outer, inner) => (
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

$.Function = types => Object.assign (Object.create (Type$prototype), {
  type: 'FUNCTION',
  name: '',
  url: '',
  supertypes: [$.AnyFunction],
  arity: types.length,
  keys: ['$1', '$2'],
  _extractors: {$1: K ([]), $2: K ([])},
  extractors: {$1: K ([]), $2: K ([])},
  types: {$1: types[0], $2: types[1]},
  _test: K (K (true)),
  format: (outer, inner) => (
    when (types.length !== 2)
         (parenthesize (outer))
         (when (types[0].type === 'FUNCTION')
               (parenthesize (outer))
               (inner ('$1') (show (types[0])))) +
    outer (' -> ') +
    inner ('$2') (show (types[1]))
  ),
});

$.RecordType = fields => {
  const keys = (Object.keys (fields)).sort ();
  return Object.assign (Object.create (Type$prototype), {
    type: 'RECORD',
    name: '',
    url: '',
    supertypes: [],
    arity: 0,
    keys: [],
    _extractors: keys.reduce ((extractors, k) => (extractors[k] = x => [x[k]], extractors)),
    extractors: keys.reduce ((extractors, k) => (extractors[k] = x => [x[k]], extractors)),
    types: keys.reduce ((types, k) => (types[k] = fields[k], types), {}),
    _test: env => x => TK,
    format: (outer, inner) => TK,
  });
};

const a = $.TypeVariable ('a');
const b = $.TypeVariable ('b');

$.Void = Object.assign (
  $.NullaryType ('Void')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Void')
                ([])
                (x => false),
  {
    new: env => x => Right (TK),
  }
);

$.Any = Object.assign (
  $.NullaryType ('Any')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Any')
                ([])
                (x => true),
  {
    new: env => x => Right (TK),
  }
);

$.AnyFunction = Object.assign (
  $.NullaryType ('Function')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Function') // XXX
                ([])
                (x => typeof x === 'function'),
  {
    new: env => x => Right (TK),
  }
);

$.Arguments = Object.assign (
  $.NullaryType ('Arguments')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Arguments')
                ([])
                (x => Object.prototype.toString.call (x) === '[object Arguments]'),
  {
    new: env => x => Right (TK),
  }
);

$.Boolean = Object.assign (
  $.NullaryType ('Boolean')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Boolean')
                ([])
                (x => typeof x === 'boolean'),
  {
    new: env => x => Right (TK),
  }
);

$.Buffer = Object.assign (
  $.NullaryType ('Buffer')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Buffer')
                ([])
                (x => typeof Buffer !== 'undefined' && Buffer.isBuffer (x)),
  {
    new: env => x => Right (TK),
  }
);

$.Date = Object.assign (
  $.NullaryType ('Date')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Date')
                ([])
                (x => Object.prototype.toString.call (x) === '[object Date]'),
  {
    new: env => x => Right (TK),
  }
);

const Descending = $1 => Object.assign (
  $.UnaryType ('Descending')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Descending')
              ([])
              (x => type (x) === 'sanctuary-descending/Descending@1')
              (I)
              ($1),
  {
    new: env => x => Right (TK),
  }
);

const Either = $1 => $2 => Object.assign (
  $.BinaryType ('Either')
               ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Either')
               ([])
               (x => type (x) === 'sanctuary-either/Either@1')
               (e => e.isLeft ? [e.value] : [])
               (e => e.isLeft ? [] : [e.value])
               ($1)
               ($2),
  {
    new: env => x => Right (TK),
  }
);

$.Error = Object.assign (
  $.NullaryType ('Error')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Error')
                ([])
                (x => Object.prototype.toString.call (x) === '[object Error]'),
  {
    new: env => x => Right (TK),
  }
);

$.HtmlElement = Object.assign (
  $.NullaryType ('HtmlElement')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#HtmlElement')
                ([])
                (x => /^\[object HTML.+Element\]$/.test (Object.prototype.toString.call (x))),
  {
    new: env => x => Right (TK),
  }
);

const Identity_ = $1 => Object.assign (
  $.UnaryType ('Identity')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Identity')
              ([])
              (x => type (x) === 'sanctuary-identity/Identity@1')
              (I)
              ($1),
  {
    new: env => x => Right (TK),
  }
);

const JsMap = $1 => $2 => Object.assign (
  $.BinaryType ('JsMap')
               ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#JsMap')
               ([])
               (x => Object.prototype.toString.call (x) === '[object Map]')
               (jsMap => Array.from (jsMap.keys ()))
               (jsMap => Array.from (jsMap.values ()))
               ($1)
               ($2),
  {
    new: env => x => Right (TK),
  }
);

const JsSet = $1 => Object.assign (
  $.UnaryType ('JsSet')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#JsSet')
              ([])
              (x => Object.prototype.toString.call (x) === '[object Set]')
              (jsSet => Array.from (jsSet.values ()))
              ($1),
  {
    new: env => x => Right (TK),
  }
);

const Maybe = $1 => Object.assign (
  $.UnaryType ('Maybe')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Maybe')
              ([])
              (x => type (x) === 'sanctuary-maybe/Maybe@1')
              (I)
              ($1),
  {
    new: env => x => Right (TK),
  }
);

const NonEmpty = $1 => Object.assign (
  $.UnaryType ('NonEmpty')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonEmpty')
              ([])
              (x => Z.Monoid.test (x) && Z.Setoid.test (x) && !(Z.equals (x, Z.empty (x.constructor))))
              (monoid => [monoid])
              ($1),
  {
    new: env => x => Right (TK),
  }
);

$.Null = Object.assign (
  $.NullaryType ('Null')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Null')
                ([])
                (x => Object.prototype.toString.call (x) === '[object Null]'),
  {
    new: env => x => Right (TK),
  }
);

$.Number = Object.assign (
  $.NullaryType ('Number')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Number')
                ([])
                (x => typeof x === 'number'),
  {
    new: env => x => {
      if (typeof x !== 'number') return Left (`Not a number: ${JSON.stringify (x)}`);
      return Right (x);
    },
  }
);

$.ValidNumber = Object.assign (
  $.NullaryType ('ValidNumber')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#ValidNumber')
                ([$.Number])
                (x => !(isNaN (x))),
  {
    new: env => x => Right (TK),
  }
);

$.NonZeroValidNumber = Object.assign (
  $.NullaryType ('NonZeroValidNumber')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonZeroValidNumber')
                ([$.ValidNumber])
                (x => x !== 0),
  {
    new: env => x => Right (TK),
  }
);

$.FiniteNumber = Object.assign (
  $.NullaryType ('FiniteNumber')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#FiniteNumber')
                ([$.ValidNumber])
                (isFinite),
  {
    new: env => x => Right (TK),
  }
);

$.PositiveFiniteNumber = Object.assign (
  $.NullaryType ('PositiveFiniteNumber')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#PositiveFiniteNumber')
                ([$.FiniteNumber])
                (x => x > 0),
  {
    new: env => x => Right (TK),
  }
);

$.NegativeFiniteNumber = Object.assign (
  $.NullaryType ('NegativeFiniteNumber')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NegativeFiniteNumber')
                ([$.FiniteNumber])
                (x => x < 0),
  {
    new: env => x => Right (TK),
  }
);

$.NonZeroFiniteNumber = Object.assign (
  $.NullaryType ('NonZeroFiniteNumber')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonZeroFiniteNumber')
                ([$.FiniteNumber])
                (x => x !== 0),
  {
    new: env => x => Right (TK),
  }
);

$.Integer = Object.assign (
  $.NullaryType ('Integer')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Integer')
                ([$.ValidNumber])
                (x => Math.floor (x) === x && x >= MIN_SAFE_INTEGER && x <= MAX_SAFE_INTEGER),
  {
    new: env => x => Right (TK),
  }
);

$.NonZeroInteger = Object.assign (
  $.NullaryType ('NonZeroInteger')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonZeroInteger')
                ([$.Integer])
                (x => x !== 0),
  {
    new: env => x => Right (TK),
  }
);

$.NonNegativeInteger = Object.assign (
  $.NullaryType ('NonNegativeInteger')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonNegativeInteger')
                ([$.Integer])
                (x => x >= 0),
  {
    new: env => x => Right (TK),
  }
);

$.PositiveInteger = Object.assign (
  $.NullaryType ('PositiveInteger')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#PositiveInteger')
                ([$.Integer])
                (x => x > 0),
  {
    new: env => x => Right (TK),
  }
);

$.NegativeInteger = Object.assign (
  $.NullaryType ('NegativeInteger')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NegativeInteger')
                ([$.Integer])
                (x => x < 0),
  {
    new: env => x => Right (TK),
  }
);

$.Object = Object.assign (
  $.NullaryType ('Object')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Object')
                ([])
                (x => Object.prototype.toString.call (x) === '[object Object]'),
  {
    new: env => x => Right (TK),
  }
);

$.RegExp = Object.assign (
  $.NullaryType ('RegExp')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#RegExp')
                ([])
                (x => Object.prototype.toString.call (x) === '[object RegExp]'),
  {
    new: env => x => Right (TK),
  }
);

$.GlobalRegExp = Object.assign (
  $.NullaryType ('GlobalRegExp')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#GlobalRegExp')
                ([$.RegExp])
                (regex => regex.global),
  {
    new: env => x => Right (TK),
  }
);

$.NonGlobalRegExp = Object.assign (
  $.NullaryType ('NonGlobalRegExp')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonGlobalRegExp')
                ([$.RegExp])
                (regex => !regex.global),
  {
    new: env => x => Right (TK),
  }
);

$.String = Object.assign (
  $.NullaryType ('String')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#String')
                ([])
                (x => typeof x === 'string'),
  {
    new: env => x => {
      if (typeof x !== 'string') return Left (`Not a string: ${JSON.stringify (x)}`);
      return Right (x);
    },
  }
);

$.RegexFlags = Object.assign (
  $.NullaryType ('RegexFlags')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#RegexFlags')
                ([$.String])
                (s => /^g?i?m?$/.test (s)),
  {
    new: env => x => Right (TK),
  }
);

$.Type = Object.assign (
  $.NullaryType ('Type')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Type')
                ([])
                (x => type (x) === 'sanctuary-def/Type@1'),
  {
    new: env => x => Right (x),
  }
);

$.Undefined = Object.assign (
  $.NullaryType ('Undefined')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Undefined')
                ([])
                (x => Object.prototype.toString.call (x) === '[object Undefined]'),
  {
    new: env => x => Right (TK),
  }
);

$.Array = $1 => (
  Object.assign (
    $.UnaryType ('Array')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Array')
                ([])
                (Array.isArray)
                (I)
                ($1),
    {
      new: env => xs => {
        if (!(Array.isArray (xs))) return Left ('Not an array');

        for (const x of xs) {
          const e = $1.new (env) (x);
          if (e.isLeft) return e;
        }

        return Right (xs);
      },
    }
  )
);

const Fn = $1 => $2 => (
  Object.assign (
    $.Function ([$1, $2]),
    {
      new: env => f => {
        if (typeof f !== 'function') return Left ('Not a function');
        return Right (x => {
          const i = $1.new (env) (x);
          if (i.isLeft) throw new TypeError (i.value);
          log ('updateEnv 3', showEnv (env));
          const o = $2.new (env) (f (x));
          if (o.isLeft) throw new TypeError (o.value);
          log ('updateEnv 4', showEnv (env));
          return o.value;
        });
      },
    }
  )
);

const Predicate = $1 => $.Fn ($1) ($.Boolean);

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
const typeVarNames = t => (
  Z.concat (
    t.type === 'VARIABLE' ? [t.name] : [],
    Z.chain (k => typeVarNames (t.types[k]), t.keys)
  )
);

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

const def = $.def = name => constraints => types => {
  const typeInfo = {name: name, constraints: constraints, types: types};
  const [output, ...inputs] = Z.reverse (types);

  return reduce (run => input => _env => f => {
                   const wrapped = _x => {
                     const env = Object.assign (Object.create (_env), {_ts: nextInt ()});
                     const x = input.new (env) (_x);
                     if (x.isLeft) {
                       throw invalidValue (
                         [$.Number, $.String, $.Null, $.Undefined],
                         typeInfo,
                         0,  // index
                         [],  // propPath
                         _x  // value
                       );
                     }
                     log ('updateEnv 1', showEnv (env));
                     return run (env) (f (x.value));
                   };
                   const signature = typeSignature (typeInfo);
                   wrapped.toString = () => signature;
                   return wrapped;
                 })
                (env => _x => {
                   log ('updateEnv 2', showEnv (env));
                   const e = output.new (env) (_x);
                   if (e.isLeft) throw new TypeError (e.value);
                   return e.value;
                 })
                (inputs)
                (Object.assign (Object.create (null), {_ts: nextInt ()}));
};

$.Descending = def ('Descending') ({}) ([$.Type, $.Type]) (Descending);

$.Either = def ('Either') ({}) ([$.Type, $.Type, $.Type]) (Either);

$.Fn = def ('Fn') ({}) ([$.Type, $.Type, $.Type]) (Fn);

$.Identity = def ('Identity') ({}) ([$.Type, $.Type]) (Identity_);

$.JsMap = def ('JsMap') ({}) ([$.Type, $.Type, $.Type]) (JsMap);

$.JsSet = def ('JsSet') ({}) ([$.Type, $.Type]) (JsSet);

$.Maybe = def ('Maybe') ({}) ([$.Type, $.Type]) (Maybe);

$.NonEmpty = def ('NonEmpty') ({}) ([$.Type, $.Type]) (NonEmpty);

$.Predicate = def ('Predicate') ({}) ([$.Type, $.Type]) (Predicate);

/*****************************************************************************/

return;

const length =
def ('length')
    ({})
    ([$.String, $.Number])
    (s => s.length);

assert.deepStrictEqual (length (''), 0);
assert.deepStrictEqual (length ('foo'), 3);
assert.deepStrictEqual (length ('foobar'), 6);

const concat3 =
def ('concat3')
    ({})
    ([$.Array (a),
      $.Array (a),
      $.Array (a),
      $.Array (a)])
    ($1 => $2 => $3 => [].concat ($1, $2, $3));

assert.deepStrictEqual (concat3 ([1, 2, 3]) ([4, 5, 6]) ([7, 8, 9]), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
assert.deepStrictEqual (concat3 (['1', '2', '3']) (['4', '5', '6']) (['7', '8', '9']), ['1', '2', '3', '4', '5', '6', '7', '8', '9']);
assert.throws (() => concat3 (['1', '2', '3']) ([4, 5, 6]), new TypeError ('Incompatible "a" types'));

assert.deepStrictEqual (
  def ('map')
      ({})
      ([$.Fn (a) (b),
        $.Array (a),
        $.Array (b)])
      (f => xs => xs.map (x => f (x)))
      (length)
      (['foo', 'bar', 'baz', 'quux']),
  [3, 3, 3, 4]
);

assert.throws (
  () => def ('map')
            ({})
            ([$.Fn (a) (b),
              $.Array (a),
              $.Array (b)])
            (f => xs => xs.map (x => { f (x); return x; }))
            (length)
            (['foo', 'bar', 'baz', 'quux']),
  new TypeError ('Incompatible "b" types')
);
