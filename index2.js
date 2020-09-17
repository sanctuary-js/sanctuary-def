'use strict';

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

const nil = {tail: null};
const cons = head => tail => ({head, tail});
const clone = list => list.tail == null ? {tail: null} : {head: list.head, tail: list.tail};
const toArray = list => {
  const result = [];
  for (let xs = list; xs.tail != null; xs = xs.tail) result.push (xs.head);
  return result;
};

//    bool :: Boolean -> Thunk a -> Thunk a -> a
const bool = predicate => alternative => consequent => (
  (predicate ? consequent : alternative) ()
);

//    reduceRight :: Foldable f => (b -> a -> b) -> b -> f a -> b
const reduceRight = f => b => foldable => (
  Z.reduce (
    (as, a) => { as.push (a); return as; },
    [],
    foldable
  )
  .reduceRight ((b, a) => f (b) (a), b)
);

//    toMarkdownList :: (String, String, a -> String, Array a) -> String
const toMarkdownList = (empty, s, f, xs) => (
  isEmpty (xs) ? empty : Z.reduce ((s, x) => s + '  - ' + f (x) + '\n', s, xs)
);

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
function numArgs(n) {
  return (n < numbers.length ? numbers[n] : show (n)) + ' ' +
         (n === 1 ? 'argument' : 'arguments');
}

//    B :: (b -> c) -> (a -> b) -> a -> c
const B = f => g => x => f (g (x));

const I = x => x;

const K = x => y => x;

//    isEmpty :: Foldable f => f a -> Boolean
const isEmpty = xs => Z.size (xs) === 0;

//    isPrefix :: Array a -> Array a -> Boolean
const isPrefix = candidate => xs => {
  if (candidate.length > xs.length) return false;
  for (let idx = 0; idx < candidate.length; idx += 1) {
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
  return formatType3 (t) (propPath) (t.format (_) (k => (
    K (_underline (t.blah[k].type,
                   Z.concat (propPath, [k]),
                   formatType3))
  )));
}

//  underline :: ... -> String
function underline(
  typeInfo,               // :: TypeInfo
  underlineConstraint,    // :: String -> TypeClass -> String -> String
  formatType5
  // :: Integer -> (String -> String) -> Type -> PropPath -> String -> String
) {
  const st = typeInfo.types.reduce ((st, t, index) => {
    const f = B (when (t.type === 'FUNCTION')
                      (parenthesize (_)))
                (B (f => _underline (t, [], f))
                   (formatType5 (index)));
    st.carets.push (f (r ('^')));
    st.numbers.push (f (s => label (show (st.counter += 1)) (s)));
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
  return Z.reduce ((t, prop) => t.blah[prop].type, t, propPath);
}

//  formatType6 ::
//    PropPath -> Integer -> (String -> String) ->
//      Type -> PropPath -> String -> String
const formatType6 = indexedPropPath => index_ => f => t => propPath_ => {
  const indexedPropPath_ = Z.concat ([index_], propPath_);
  const p = isPrefix (indexedPropPath_) (indexedPropPath);
  const q = isPrefix (indexedPropPath) (indexedPropPath_);
  return p && q ? f : p ? I : _;
};

//    see :: (String, { name :: String, url :: String? }) -> String
const see = (label, record) => (
  record.url == null || record.url === '' ?
  '' :
  '\nSee ' + record.url +
  ' for information about the ' + record.name + ' ' + label + '.\n'
);

//    typeClassConstraintViolation :: ... -> Error
const typeClassConstraintViolation = (
  env,            // :: Array Type
  typeInfo,       // :: TypeInfo
  typeClass,      // :: TypeClass
  index,          // :: Integer
  propPath,       // :: PropPath
  value           // :: Any
) => {
  const expType = resolvePropPath (typeInfo.types[index], propPath);
  return new TypeError (trimTrailingSpaces (
    'Type-class constraint violation\n\n' +
    underline (typeInfo,
               tvn => tc => (
                 tvn === expType.name && tc.name === typeClass.name ? r ('^') : _
               ),
               formatType6 (Z.concat ([index], propPath))) +
    '\n' +
    showValuesAndTypes (env, typeInfo, [value], 1) + '\n\n' +
    q (typeInfo.name) + ' requires ' +
    q (expType.name) + ' to satisfy the ' +
    stripNamespace (typeClass) + ' type-class constraint; ' +
    'the value at position 1 does not.\n' +
    see ('type class', typeClass)
  ));
};

//    underlineTypeVars :: (TypeInfo, StrMap (Array Any)) -> String
const underlineTypeVars = (typeInfo, valuesByPath) => {
  //  Note: Sorting these keys lexicographically is not "correct", but it
  //  does the right thing for indexes less than 10.
  const paths = Z.map (JSON.parse, (Object.keys (valuesByPath)).sort ());
  return underline (
    typeInfo,
    K (K (_)),
    index => f => t => propPath => {
      const indexedPropPath = Z.concat ([index], propPath);
      return s => {
        if (paths.some (isPrefix (indexedPropPath))) {
          const key = JSON.stringify (indexedPropPath);
          if (!(hasOwnProperty.call (valuesByPath, key))) return s;
          if (!(isEmpty (valuesByPath[key]))) return f (s);
        }
        return _ (s);
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
  values_
) => {
  const valuesAtPath = Z.reverse (toArray (values_));
  //  If we apply an ‘a -> a -> a -> a’ function to Left ('x'), Right (1),
  //  and Right (null) we'd like to avoid underlining the first argument
  //  position, since Left ('x') is compatible with the other ‘a’ values.
  const key = JSON.stringify (Z.concat ([index], propPath));
  const values = Z.chain (({path, value}) => path === key ? [value] : [], valuesAtPath);

  const {name} = propPath.reduce ((t, prop) => t.blah[prop].type, typeInfo.types[index]);

  const valuesByPath = Z.reduce (
    (acc, {path, value}) => {
      const [index, ...propPath] = JSON.parse (path);
      const {name: name_} = propPath.reduce ((t, prop) => t.blah[prop].type, typeInfo.types[index]);
      if (name_ === name) {
        if (!(path in acc)) {
          acc[path] = [];
        }
        acc[path].push (value);
      }
      return acc;
    },
    Object.create (null),
    valuesAtPath
  );

  //  Note: Sorting these keys lexicographically is not "correct", but it
  //  does the right thing for indexes less than 10.
  const keys = Z.filter (k => {
    const values_ = Z.chain (({path, value}) => path === k ? [value] : [], valuesAtPath);
    return (
      //  Keep X, the position at which the violation was observed.
      k === key ||
      //  Keep positions whose values are incompatible with the values at X.
      isEmpty (determineActualTypesStrict (env, Z.concat (values, values_)))
    );
  }, (Object.keys (valuesByPath)).sort ());

  const underlinedTypeVars =
  underlineTypeVars (typeInfo,
                     Z.reduce (($valuesByPath, k) => {
                       $valuesByPath[k] = valuesByPath[k];
                       return $valuesByPath;
                     }, {}, keys));

  return new TypeError (trimTrailingSpaces (
    'Type-variable constraint violation\n\n' +
    underlinedTypeVars + '\n' +
    (Z.reduce ((st, k) => {
      const values = valuesByPath[k];
      return isEmpty (values) ? st : {
        idx: st.idx + 1,
        s: st.s +
           showValuesAndTypes (env, typeInfo, values, st.idx + 1) +
           '\n\n',
      };
    }, {idx: 0, s: ''}, keys)).s +
    'Since there is no type of which all the above values are ' +
    'members, the type-variable constraint has been violated.\n'
  ));
};

//    unrecognizedValue :: ... -> Error
const unrecognizedValue = (
  env,            // :: Array Type
  typeInfo,       // :: TypeInfo
  index,          // :: Integer
  propPath,       // :: PropPath
  value           // :: Any
) => {
  const underlinedTypeVars =
  underline (typeInfo,
             K (K (_)),
             formatType6 (Z.concat ([index], propPath)));

  return new TypeError (trimTrailingSpaces (
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
    )
  ));
};

//    invalidValue :: ... -> Error
const invalidValue = (
  env,            // :: Array Type
  typeInfo,       // :: TypeInfo
  index,          // :: Integer
  propPath,       // :: PropPath
  value           // :: Any
) => {
  const t = resolvePropPath (typeInfo.types[index], propPath);

  const underlinedTypeVars =
  underline (typeInfo,
             K (K (_)),
             formatType6 (Z.concat ([index], propPath)));

  return new TypeError (trimTrailingSpaces (
    'Invalid value\n\n' +
    underlinedTypeVars + '\n' +
    showValuesAndTypes (env, typeInfo, [value], 1) + '\n\n' +
    'The value at position 1 is not a member of ' +
    q (show (t)) + '.\n' +
    see (t.arity >= 1 ? 'type constructor' : 'type', t)
  ));
};

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
    let seen$;
    if (typeof value === 'object' && value != null ||
        typeof value === 'function') {
      //  Abort if a circular reference is encountered; add the current
      //  object to the array of seen objects otherwise.
      if (seen.indexOf (value) >= 0) return [];
      seen$ = Z.concat (seen, [value]);
    } else {
      seen$ = seen;
    }
    const expandUnknown2 = expandUnknown4 (seen$) (value);
    return Z.chain (t => (
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
    ), types);
  }

  return isEmpty (values) ?
    [$.Unknown] :
    or (Z.reduce (refine, env, values), [$.Inconsistent]);
};

//    isConsistent :: Type -> Boolean
const isConsistent = t => (
  t.type === 'UNARY'   ? isConsistent (t.blah.$1.type) :
  t.type === 'BINARY'  ? isConsistent (t.blah.$1.type) &&
                         isConsistent (t.blah.$2.type) :
  /* else */             t.type !== 'INCONSISTENT'
);

//    determineActualTypesStrict :: (Array Type, Array Any) -> Array Type
const determineActualTypesStrict = (env, values) => (
  Z.filter (isConsistent,
            _determineActualTypes (env, [], values))
);

//    determineActualTypesLoose :: (Array Type, Array Any) -> Array Type
const determineActualTypesLoose = (env, values) => (
  Z.reject (t => t.type === 'INCONSISTENT',
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
  const recur = satisfactoryTypes;

  for (let idx = 0; idx < values.length; idx += 1) {
    const result = validate (env) (expType) (values[idx]);
    if (result != null) {
      return Left (null);
    }
  }

  switch (expType.type) {

    case 'UNARY':
      return Z.map (
        result => ({
          typeVarMap: result.typeVarMap,
          types: Z.map (fromUnaryType (expType),
                        or (result.types, [expType.blah.$1.type])),
        }),
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
        result => {
          const $1s = result.types;
          return Z.map (
            result => {
              const $2s = result.types;
              return {
                typeVarMap: result.typeVarMap,
                types: Z.lift2 (fromBinaryType (expType),
                                or ($1s, [expType.blah.$1.type]),
                                or ($2s, [expType.blah.$2.type])),
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
      return Z.reduce ((e, k) => (
        Z.chain (r => (
          recur (env,
                 typeInfo,
                 r.typeVarMap,
                 expType.blah[k].type,
                 index,
                 Z.concat (propPath, [k]),
                 Z.chain (extract (k) (expType), values))
        ), e)
      ), Right ({typeVarMap: typeVarMap, types: [expType]}), Object.keys (expType.blah));

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
    // eslint-disable-next-line no-sequences
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
  new: cont => env => typeInfo => index => ctx => neueTypeVarMap => values => cont (neueTypeVarMap) (values) (ctx.value),
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

const NullaryType = name => url => supertypes => test => Object.assign (Object.create (Type$prototype), {
  type: 'NULLARY',
  name: name,
  url: url,
  supertypes: supertypes,
  arity: 0,
  blah: {},
  _test: env => test,
  format: outer => K (outer (name)),
  new: cont => env => typeInfo => index => ctx => neueTypeVarMap => values => {
    if (test (ctx.value)) return cont (neueTypeVarMap) (values) (ctx.value);
    throw invalidValue (env, typeInfo, index, ctx.propPath, ctx.value);
  },
});

const UnaryType = name => url => supertypes => test => _1 => $1 => Object.assign (Object.create (Type$prototype), {
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
  new: cont => env => typeInfo => index => ctx => (
    reduceRight
      (run => x => neueTypeVarMap => (
         bool (Z.all (t => t._test (env) (x), ancestors ($1)))
              (() => { throw invalidValue (env, typeInfo, index, [...ctx.propPath, '$1'], x); })
              (() => $1.new
                       (neueTypeVarMap => values => K (run (neueTypeVarMap) (values)))
                       (env)
                       (typeInfo)
                       (index)
                       ({propPath: [...ctx.propPath, '$1'],
                         value: x})
                       (neueTypeVarMap))
       ))
      (neueTypeVarMap => values => cont (neueTypeVarMap) (values) (ctx.value))
      (_1 (ctx.value))
  ),
});

//  fromUnaryType :: Type -> Type -> Type
const fromUnaryType = t => (
  UnaryType (t.name)
            (t.url)
            (t.supertypes)
            (t._test ([]))
            (t.blah.$1.extract)
);

const BinaryType = name => url => supertypes => test => _1 => _2 => $1 => $2 => Object.assign (Object.create (Type$prototype), {
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
  new: cont => env => typeInfo => index => ctx => (
    reduceRight
      (run => x => (
         bool (Z.all (t => t._test (env) (x), ancestors ($1)))
              (() => { throw invalidValue (env, typeInfo, index, [...ctx.propPath, '$1'], x); })
              (() => $1.new
                       (neueTypeVarMap => values => K (run (neueTypeVarMap) (values)))
                       (env)
                       (typeInfo)
                       (index)
                       ({propPath: [...ctx.propPath, '$1'],
                         value: x}))
       ))
      (reduceRight
         (run => x => (
            bool (Z.all (t => t._test (env) (x), ancestors ($2)))
                 (() => { throw invalidValue (env, typeInfo, index, [...ctx.propPath, '$2'], x); })
                 (() => $2.new
                          (neueTypeVarMap => values => K (run (neueTypeVarMap) (values)))
                          (env)
                          (typeInfo)
                          (index)
                          ({propPath: [...ctx.propPath, '$2'],
                            value: x}))
          ))
         (neueTypeVarMap => values => cont (neueTypeVarMap) (values) (ctx.value))
         (_2 (ctx.value)))
      (_1 (ctx.value))
  ),
});

//    fromBinaryType :: (Type -> Type -> Type) -> Type -> Type -> Type
const fromBinaryType = t => (
  BinaryType (t.name)
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
  new: cont => env => typeInfo => index => ctx => neueTypeVarMap => values => cont (neueTypeVarMap) (values) (ctx.value),
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
  new: cont => env => typeInfo => index => ctx => neueTypeVarMap => _values => {
    const key = JSON.stringify ([index].concat (ctx.propPath));
    const values = cons ({path: key, value: ctx.value}) (_values);

    if (Object.prototype.hasOwnProperty.call (typeInfo.constraints, name)) {
      for (let idx = 0; idx < typeInfo.constraints[name].length; idx += 1) {
        const typeClass = typeInfo.constraints[name][idx];
        if (!typeClass.test (ctx.value)) {
          throw typeClassConstraintViolation (
            env,
            typeInfo,
            typeClass,
            index,
            ctx.propPath,
            ctx.value
          );
        }
      }
    }

    const neueNeueTypeVarMap = name_ => (
      name_ === name
      ? Z.chain (
          t => (
            t.arity === 2 ? Z.lift2 (
              fromBinaryType (t),
              Z.filter (isConsistent, expandUnknown (env) ([]) (ctx.value) (t.blah.$1.extract) (t.blah.$1.type)),
              Z.filter (isConsistent, expandUnknown (env) ([]) (ctx.value) (t.blah.$2.extract) (t.blah.$2.type))
            ) :
            t.arity === 1 ? Z.map (
              fromUnaryType (t),
              Z.filter (isConsistent, expandUnknown (env) ([]) (ctx.value) (t.blah.$1.extract) (t.blah.$1.type))
            ) :
            [t]
          ),
          Z.filter (
            t => test (env) (t) (ctx.value),
            neueTypeVarMap (name)
          )
        )
      : neueTypeVarMap (name_)
    );

    const neueNeueNeueTypeVarMap = Z.reduce (
      (neueTypeVarMap, t) => {
        switch (t.arity) {
          case 1:
            return Z.reduce (
              (neueTypeVarMap, x) => (
                t.blah.$1.type.new
                  (neueTypeVarMap => values => value => neueTypeVarMap)
                  (env)
                  (typeInfo)
                  (index)
                  ({propPath: [...ctx.propPath, '$1'],
                    value: x})
                  (neueTypeVarMap)
                  (values)
              ),
              neueTypeVarMap,
              t.blah.$1.extract (ctx.value)
            );
          case 2: {
            return Z.reduce (
              (neueTypeVarMap, x) => (
                t.blah.$2.type.new
                  (neueTypeVarMap => values => value => neueTypeVarMap)
                  (env)
                  (typeInfo)
                  (index)
                  ({propPath: [...ctx.propPath, '$2'],
                    value: x})
                  (neueTypeVarMap)
                  (values)
              ),
              Z.reduce (
                (neueTypeVarMap, x) => (
                  t.blah.$1.type.new
                    (neueTypeVarMap => values => value => neueTypeVarMap)
                    (env)
                    (typeInfo)
                    (index)
                    ({propPath: [...ctx.propPath, '$1'],
                      value: x})
                    (neueTypeVarMap)
                    (values)
                ),
                neueTypeVarMap,
                t.blah.$1.extract (ctx.value)
              ),
              t.blah.$2.extract (ctx.value)
            );
          }
          default:
            return neueTypeVarMap;
        }
      },
      neueNeueTypeVarMap,
      neueNeueTypeVarMap (name)
    );

    if ((neueNeueNeueTypeVarMap (name)).length > 0) {
      return cont (neueNeueTypeVarMap) (values) (ctx.value);
    } else if (Z.any (t => test (env) (t) (ctx.value), env)) {
      throw typeVarConstraintViolation (env, typeInfo, index, ctx.propPath, values);
    } else {
      throw unrecognizedValue (env, typeInfo, index, ctx.propPath, ctx.value);
    }
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
  new: cont => env => typeInfo => index => ctx => neueTypeVarMap => _values => {
    const key = JSON.stringify ([index].concat (ctx.propPath));
    const values = (cons ({path: key, value: ctx.value})) (_values);

    const neueNeueTypeVarMap = name_ => (
      name_ === name
      ? Z.chain (
          t => (
            t.arity === 2 ? Z.lift2 (
              fromBinaryType (t),
              Z.filter (isConsistent, expandUnknown (env) ([]) (ctx.value) (t.blah.$1.extract) (t.blah.$1.type)),
              Z.filter (isConsistent, expandUnknown (env) ([]) (ctx.value) (t.blah.$2.extract) (t.blah.$2.type))
            ) :
            t.arity === 1 ? Z.map (
              fromUnaryType (t),
              Z.filter (isConsistent, expandUnknown (env) ([]) (ctx.value) (t.blah.$1.extract) (t.blah.$1.type))
            ) :
            [t]
          ),
          Z.filter (
            t => test (env) (t) (ctx.value),
            neueTypeVarMap (name)
          )
        )
      : neueTypeVarMap (name_)
    );

    if ((neueNeueTypeVarMap (name)).length === 0) {
      throw invalidValue (env, typeInfo, index, ctx.propPath, ctx.value);
    }

    if (Object.prototype.hasOwnProperty.call (typeInfo.constraints, name)) {
      for (let idx = 0; idx < typeInfo.constraints[name].length; idx += 1) {
        const typeClass = typeInfo.constraints[name][idx];
        if (!typeClass.test (ctx.value)) {
          throw typeClassConstraintViolation (
            env,
            typeInfo,
            typeClass,
            index,
            ctx.propPath,
            ctx.value
          );
        }
      }
    }

    return cont (neueNeueTypeVarMap)
                (Z.reduce ((values, t) => {
                             switch (t.arity) {
                               case 1:
                                 return Z.reduce (
                                   (values, x) => (
                                     $1.new
                                       (neueTypeVarMap => values => value => values)
                                       (env)
                                       (typeInfo)
                                       (index)
                                       ({propPath: ['$1', ...ctx.propPath],
                                         value: x})
                                       (neueTypeVarMap)
                                       (values)
                                   ),
                                   values,
                                   t.blah.$1.extract (ctx.value)
                                 );
                               case 2:
                                 return Z.reduce (
                                   (values, x) => (
                                     $1.new
                                       (neueTypeVarMap => values => value => values)
                                       (env)
                                       (typeInfo)
                                       (index)
                                       ({propPath: ['$2', ...ctx.propPath],
                                         value: x})
                                       (neueTypeVarMap)
                                       (values)
                                   ),
                                   values,
                                   t.blah.$2.extract (ctx.value)
                                 );
                             }
                           },
                           values,
                           neueNeueTypeVarMap (name)))
                (ctx.value);
  },
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
  new: cont => env => typeInfo => index => ctx => neueTypeVarMap => values => {
    // a         Pair ('abc') (123)
    // a         Pair String Number
    //
    // f a       Pair ('abc') (123)
    // f         Pair String
    // a         Number
    //
    // f a b     Pair ('abc') (123)
    // f         Pair
    // a         String
    // b         Number

    const neueNeueTypeVarMap = name_ => (
      name_ === name
      ? Z.filter (t => test (env) (t) (ctx.value), neueTypeVarMap (name))
      : neueTypeVarMap (name_)
    );

    const key = JSON.stringify ([index].concat (ctx.propPath));

    Z.map (
      t => {
        Z.map (
          x => {
            if (!($1._test (env) (x))) {
              throw invalidValue (
                env,
                typeInfo,
                index,
                [...ctx.propPath, '$1'],
                x
              );
            }
            $1.new
              (neueTypeVarMap => values => value => value)
              (env)
              (typeInfo)
              (index)
              ({propPath: ['$1', ...ctx.propPath],
                value: x})
              (neueTypeVarMap)
              (values);
          },
          t.blah.$1.extract (ctx.value)
        );
        Z.map (
          x => {
            if (!($2._test (env) (x))) {
              throw invalidValue (
                env,
                typeInfo,
                index,
                [...ctx.propPath, '$2'],
                x
              );
            }
            $2.new
              (neueTypeVarMap => values => value => value)
              (env)
              (typeInfo)
              (index)
              ({propPath: ['$2', ...ctx.propPath],
                value: x})
              (neueTypeVarMap)
              (values);
          },
          t.blah.$2.extract (ctx.value)
        );
      },
      neueNeueTypeVarMap (name)
    );

    if ((neueNeueTypeVarMap (name)).length === 0) {
      throw invalidValue (
        env,
        typeInfo,
        index,
        ctx.propPath,
        ctx.value
      );
    }

    return cont (neueNeueTypeVarMap)
                (cons ({path: key, value: ctx.value}) (values))
                (ctx.value);
  },
});

const Function_ = types => Object.assign (Object.create (Type$prototype), {
  type: 'FUNCTION',
  name: '',
  url: '',
  supertypes: [$.AnyFunction],
  arity: types.length,
  blah: types.reduce (
    (blah, t, idx) => {
      blah[`$${idx + 1}`] = {type: t, extract: K ([])};
      return blah;
    },
    {}
  ),
  _test: K (K (true)),
  format: outer => inner => (
    when (types.length !== 2)
         (parenthesize (outer))
         (types
          .slice (0, -1)
          .map ((t, idx) => when (t.type === 'FUNCTION')
                                 (parenthesize (outer))
                                 (inner (`$${idx + 1}`) (show (t))))
          .join (outer (', '))) +
    outer (' -> ') +
    inner (`$${types.length}`) (show (types[types.length - 1]))
  ),
  new: cont => env => typeInfo => index => ctx => neueTypeVarMap => values => (
    cont (neueTypeVarMap) (values) ((...args) => {
      const returnValue = ctx.value (...args);
      if (Z.all (t => t._test (env) (returnValue), ancestors (types[types.length - 1]))) {
        return types[types.length - 1].new
          (neueTypeVarMap => values => value => value)
          (env)
          (typeInfo)
          (index)
          ({propPath: [...ctx.propPath, `$${types.length}`],
            value: returnValue})
          (neueTypeVarMap)
          (args.reduce ((values, arg, idx) => {
             if (Z.all (t => t._test (env) (arg), ancestors (types[idx]))) {
               return types[idx].new
                 (neueTypeVarMap => values => value => values)
                 (env)
                 (typeInfo)
                 (index)
                 ({propPath: [...ctx.propPath, `$${idx + 1}`],
                   value: arg})
                 (neueTypeVarMap)
                 (values);
             }
           }, values));
      } else {
        throw invalidValue (env, typeInfo, index, [...ctx.propPath, `$${types.length}`], returnValue);
      }
    })
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
      // eslint-disable-next-line no-sequences
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
    new: cont => env => typeInfo => index => ctx => (
      reduceRight
        (run => key => neueTypeVarMap => (
           bool (Z.all (t => t._test (env) (ctx.value[key]), ancestors (fields[key])))
                (() => { throw invalidValue (env, typeInfo, index, [...ctx.propPath, key], ctx.value[key]); })
                (() => fields[key].new
                         (neueTypeVarMap => values => K (run (neueTypeVarMap) (values)))
                         (env)
                         (typeInfo)
                         (index)
                         ({propPath: [key, ...ctx.propPath],
                           value: ctx.value[key]})
                         (neueTypeVarMap))
         ))
        (neueTypeVarMap => values => cont (neueTypeVarMap) (values) (ctx.value))
        (keys)
    ),
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
      // eslint-disable-next-line no-sequences
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
    new: cont => env => typeInfo => index => ctx => neueTypeVarMap => values => {
      keys.forEach (k => {
        if (Z.all (t => t._test (env) (ctx.value[k]), ancestors (fields[k]))) {
          fields[k].new
            (neueTypeVarMap => values => value => value)
            (env)
            (typeInfo)
            (index)
            ({propPath: [k, ...ctx.propPath],
              value: ctx.value[k]})
            (neueTypeVarMap)
            (values);
        }
      });
      return cont (neueTypeVarMap) (values) (ctx.value);
    },
  });
};

$.Void = (
  NullaryType ('Void')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Void')
              ([])
              (x => false)
);

$.Any = (
  NullaryType ('Any')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Any')
              ([])
              (x => true)
);

$.AnyFunction = (
  NullaryType ('Function')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Function') // XXX
              ([])
              (x => typeof x === 'function')
);

$.Arguments = (
  NullaryType ('Arguments')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Arguments')
              ([])
              (x => Object.prototype.toString.call (x) === '[object Arguments]')
);

$.Boolean = (
  NullaryType ('Boolean')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Boolean')
              ([])
              (x => typeof x === 'boolean')
);

$.Buffer = (
  NullaryType ('Buffer')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Buffer')
              ([])
              (x => typeof Buffer !== 'undefined' && Buffer.isBuffer (x))
);

$.Date = (
  NullaryType ('Date')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Date')
              ([])
              (x => Object.prototype.toString.call (x) === '[object Date]')
);

$.ValidDate = (
  NullaryType ('ValidDate')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#ValidDate')
              ([$.Date])
              (x => !(isNaN (Number (x))))
);

const Descending = (
  UnaryType ('Descending')
            ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Descending')
            ([])
            (x => type (x) === 'sanctuary-descending/Descending@1')
            (I)
);

const Either = (
  BinaryType ('Either')
             ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Either')
             ([])
             (x => type (x) === 'sanctuary-either/Either@1')
             (e => e.isLeft ? [e.value] : [])
             (e => e.isLeft ? [] : [e.value])
);

$.Error = (
  NullaryType ('Error')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Error')
              ([])
              (x => Object.prototype.toString.call (x) === '[object Error]')
);

$.HtmlElement = (
  NullaryType ('HtmlElement')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#HtmlElement')
              ([])
              (x => /^\[object HTML.+Element\]$/.test (Object.prototype.toString.call (x)))
);

const Identity = (
  UnaryType ('Identity')
            ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Identity')
            ([])
            (x => type (x) === 'sanctuary-identity/Identity@1')
            (I)
);

const JsMap = (
  BinaryType ('JsMap')
             ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#JsMap')
             ([])
             (x => Object.prototype.toString.call (x) === '[object Map]')
             (jsMap => Array.from (jsMap.keys ()))
             (jsMap => Array.from (jsMap.values ()))
);

const JsSet = (
  UnaryType ('JsSet')
            ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#JsSet')
            ([])
            (x => Object.prototype.toString.call (x) === '[object Set]')
            (jsSet => Array.from (jsSet.values ()))
);

const Maybe = (
  UnaryType ('Maybe')
            ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Maybe')
            ([])
            (x => type (x) === 'sanctuary-maybe/Maybe@1')
            (I)
);

$.Module = (
  NullaryType ('Module')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Module')
              ([])
              (x => Object.prototype.toString.call (x) === '[object Module]')
);

const NonEmpty = (
  UnaryType ('NonEmpty')
            ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonEmpty')
            ([])
            (x => Z.Monoid.test (x) && Z.Setoid.test (x) && !(Z.equals (x, Z.empty (x.constructor))))
            (monoid => [monoid])
);

$.Null = (
  NullaryType ('Null')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Null')
              ([])
              (x => Object.prototype.toString.call (x) === '[object Null]')
);

const Nullable = (
  UnaryType ('Nullable')
            ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Nullable')
            ([])
            (K (true))
            // eslint-disable-next-line eqeqeq
            (nullable => nullable === null ? [] : [nullable])
);

$.Number = (
  NullaryType ('Number')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Number')
              ([])
              (x => typeof x === 'number')
);

$.ValidNumber = (
  NullaryType ('ValidNumber')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#ValidNumber')
              ([$.Number])
              (x => !(isNaN (x)))
);

$.PositiveNumber = (
  NullaryType ('PositiveNumber')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#PositiveNumber')
              ([$.Number])
              (x => x > 0)
);

$.NegativeNumber = (
  NullaryType ('NegativeNumber')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NegativeNumber')
              ([$.Number])
              (x => x < 0)
);

$.NonZeroValidNumber = (
  NullaryType ('NonZeroValidNumber')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonZeroValidNumber')
              ([$.ValidNumber])
              (x => x !== 0)
);

$.FiniteNumber = (
  NullaryType ('FiniteNumber')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#FiniteNumber')
              ([$.ValidNumber])
              (isFinite)
);

$.PositiveFiniteNumber = (
  NullaryType ('PositiveFiniteNumber')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#PositiveFiniteNumber')
              ([$.FiniteNumber])
              (x => x > 0)
);

$.NegativeFiniteNumber = (
  NullaryType ('NegativeFiniteNumber')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NegativeFiniteNumber')
              ([$.FiniteNumber])
              (x => x < 0)
);

$.NonZeroFiniteNumber = (
  NullaryType ('NonZeroFiniteNumber')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonZeroFiniteNumber')
              ([$.FiniteNumber])
              (x => x !== 0)
);

$.Integer = (
  NullaryType ('Integer')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Integer')
              ([$.ValidNumber])
              (x => Math.floor (x) === x && x >= MIN_SAFE_INTEGER && x <= MAX_SAFE_INTEGER)
);

$.NonZeroInteger = (
  NullaryType ('NonZeroInteger')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonZeroInteger')
              ([$.Integer])
              (x => x !== 0)
);

$.NonNegativeInteger = (
  NullaryType ('NonNegativeInteger')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonNegativeInteger')
              ([$.Integer])
              (x => x >= 0)
);

$.PositiveInteger = (
  NullaryType ('PositiveInteger')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#PositiveInteger')
              ([$.Integer])
              (x => x > 0)
);

$.NegativeInteger = (
  NullaryType ('NegativeInteger')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NegativeInteger')
              ([$.Integer])
              (x => x < 0)
);

$.Object = (
  NullaryType ('Object')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Object')
              ([])
              (x => type (x) === 'Object')
);

const Pair = (
  BinaryType ('Pair')
             ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Pair')
             ([])
             (x => type (x) === 'sanctuary-pair/Pair@1')
             (pair => [pair.fst])
             (pair => [pair.snd])
);

$.RegExp = (
  NullaryType ('RegExp')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#RegExp')
              ([])
              (x => Object.prototype.toString.call (x) === '[object RegExp]')
);

$.GlobalRegExp = (
  NullaryType ('GlobalRegExp')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#GlobalRegExp')
              ([$.RegExp])
              (regex => regex.global)
);

$.NonGlobalRegExp = (
  NullaryType ('NonGlobalRegExp')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#NonGlobalRegExp')
              ([$.RegExp])
              (regex => !regex.global)
);

$.String = (
  NullaryType ('String')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#String')
              ([])
              (x => typeof x === 'string')
);

$.Symbol = (
  NullaryType ('Symbol')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Symbol')
              ([])
              (x => typeof x === 'symbol')
);

$.RegexFlags = (
  NullaryType ('RegexFlags')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#RegexFlags')
              ([$.String])
              (s => /^g?i?m?$/.test (s))
);

const StrMap = (
  UnaryType ('StrMap')
            ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#StrMap')
            ([$.Object])
            (K (true))
            (I)
);

$.Type = (
  NullaryType ('Type')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Type')
              ([])
              (x => type (x) === 'sanctuary-def/Type@1')
);

$.TypeClass = (
  NullaryType ('TypeClass')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#TypeClass')
              ([])
              (x => type (x) === 'sanctuary-type-classes/TypeClass@1')
);

$.Undefined = (
  NullaryType ('Undefined')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Undefined')
              ([])
              (x => Object.prototype.toString.call (x) === '[object Undefined]')
);

$.Array = (
  UnaryType ('Array')
            ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Array')
            ([])
            (Array.isArray)
            (I)
);

$.Array0 = (
  NullaryType ('Array0')
              ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Array0')
              ([$.Array ($.Unknown)])
              (xs => xs.length === 0)
);

const Array1 = (
  UnaryType ('Array1')
            ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Array1')
            ([$.Array ($.Unknown)])
            (xs => xs.length === 1)
            (xs => [xs[0]])
);

const Array2 = (
  BinaryType ('Array2')
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
      new: cont => env => typeInfo => index => ctx => _neueTypeVarMap => values => {
        let neueTypeVarMap = _neueTypeVarMap;
        const $values = clone (values);
        return cont (name => neueTypeVarMap (name)) ($values) ((...args) => {
          if (args.length !== 1) {
            throw invalidArgumentsLength (typeInfo, index, 1, args);
          }
          const [x] = args;
          if (Z.all (t => t._test (env) (x), ancestors ($1))) {
            $1.new
              (neueTypeVarMap_ => values => value => {
                 neueTypeVarMap = neueTypeVarMap_;
                 $values.head = {path: JSON.stringify ([index, ...ctx.propPath, '$1']), value};
                 $values.tail = clone ($values);
                 return value;
               })
              (env)
              (typeInfo)
              (index)
              ({propPath: ['$1', ...ctx.propPath],
                value: x})
              (neueTypeVarMap)
              ($values);
            const y = ctx.value (x);
            return bool (Z.all (t => t._test (env) (y), ancestors ($2)))
                        (() => { throw invalidValue (env, typeInfo, index, [...ctx.propPath, '$2'], y); })
                        (() => $2.new
                                 (neueTypeVarMap_ => values => value => {
                                    neueTypeVarMap = neueTypeVarMap_;
                                    $values.head = {path: JSON.stringify ([index, ...ctx.propPath, '$2']), value};
                                    $values.tail = clone ($values);
                                    return value;
                                  })
                                 (env)
                                 (typeInfo)
                                 (index)
                                 ({propPath: ['$2', ...ctx.propPath],
                                   value: y})
                                 (neueTypeVarMap)
                                 ($values))
          } else {
            throw invalidValue (env, typeInfo, index, [...ctx.propPath, '$1'], x);
          }
        });
      },
    }
  )
);

const Predicate = $1 => $.Fn ($1) ($.Boolean);

const invalidArgumentsCount = (typeInfo, index, numArgsExpected, args) => (
  new TypeError (trimTrailingSpaces (
    q (typeInfo.name) + ' applied to the wrong number of arguments\n\n' +
    underline (
      typeInfo,
      K (K (_)),
      index_ => f => K (K (index_ === index ? f : _))
    ) + '\n' +
    'Expected ' + numArgs (numArgsExpected) +
    ' but received ' + numArgs (args.length) +
    toMarkdownList ('.\n', ':\n\n', show, args)
  ))
);

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
  new TypeError (trimTrailingSpaces (
    q (typeInfo.name) +
    ' applied ' + q (show (typeInfo.types[index])) +
    ' to the wrong number of arguments\n\n' +
    underline (
      typeInfo,
      K (K (_)),
      index_ => f => t => propPath => s => (
        index_ === index ? t.format (_) (k => k === '$1' ? f : _) : _ (s)
      )
    ) + '\n' +
    'Expected ' + numArgs (numArgsExpected) +
    ' but received ' + numArgs (args.length) +
    toMarkdownList ('.\n', ':\n\n', show, args)
  ))
);

//  constraintsRepr :: ... -> String
const constraintsRepr = (
  constraints,    // :: StrMap (Array TypeClass)
  outer,          // :: String -> String
  inner           // :: String -> TypeClass -> String -> String
) => {
  const $reprs = [];
  Object.keys (constraints)
  .sort ()
  .forEach (k => {
    const f = inner (k);
    constraints[k].forEach (typeClass => {
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

//    typeVarNames :: Type -> StrMap Integer
const typeVarNames = t => {
  const names = {};
  if (t.type === 'VARIABLE') names[t.name] = t.arity;
  for (const v of Object.values (t.blah)) {
    Object.assign (names, typeVarNames (v.type));
  }
  return names;
};

//    showTypeWith :: Array Type -> Type -> String
const showTypeWith = types => {
  const names = Object.keys (Z.foldMap (Object, typeVarNames, types));
  return t => {
    let code = 'a'.charCodeAt (0);
    return when (t.type === 'FUNCTION')
                (parenthesize (I))
                ((show (t)).replace (/\bUnknown\b/g, () => {
                   let name;
                   // eslint-disable-next-line no-plusplus
                   do name = String.fromCharCode (code++);
                   while (names.indexOf (name) >= 0);
                   return name;
                 }));
  };
};

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
          return types[0].new
            (neueTypeVarMap => values => value => value)
            (opts.env)
            (typeInfo)
            (0)
            ({propPath: [],
              value: x})
            (name => { throw new Error ('XXX'); })
            (nil);
        }
      };
      const signature = typeSignature (typeInfo);
      wrapped[inspect] = wrapped.toString = () => signature;
      return wrapped;
    }

    return types
    .slice (0, -1)
    .reduceRight (
      (run, input, index) => neueTypeVarMap => values => f => {
        const wrapped = (_x, ...rest) => {
          if (rest.length > 0) {
            throw invalidArgumentsCount (typeInfo, index, 1, [_x, ...rest]);
          }
          if (Z.all (t => t._test (opts.env) (_x), ancestors (input))) {
            return input.new
              (neueTypeVarMap => values => value => run (neueTypeVarMap) (values) (f (value)))
              (opts.env)
              (typeInfo)
              (index)
              ({index,
                propPath: [],
                value: _x})
              (neueTypeVarMap)
              (values);
          } else {
            throw invalidValue (opts.env, typeInfo, index, [], _x);
          }
        };
        const signature = typeSignature (typeInfo);
        wrapped[inspect] = wrapped.toString = () => signature;
        return wrapped;
      },
      neueTypeVarMap => values => value => {
        const index = types.length - 1;
        if (Z.all (t => t._test (opts.env) (value), ancestors (types[index]))) {
          // Could we model a type variable map as a function that takes the name
          // of a type variable as input and returns an array of key-value pairs?
          return types[index].new
            (neueTypeVarMap => values => value => value)
            (opts.env)
            (typeInfo)
            (index)
            ({index,
              propPath: [],
              value})
            (neueTypeVarMap)
            (values);
        } else {
          throw invalidValue (opts.env, typeInfo, index, [], value);
        }
      }
    ) (name => (arity => Z.filter (t => t.arity >= arity, opts.env))
               ((Z.foldMap (Object, typeVarNames, types))[name]))
      (nil)
      (impl);
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

$.NullaryType = def ('NullaryType') ({}) ([$.String, $.String, $.Array ($.Type), $.Fn ($.Any) ($.Boolean), $.Type]) (NullaryType);

$.UnaryType =
def ('UnaryType')
    ({f: [Z.Foldable]})
    ([$.String,
      $.String,
      $.Array ($.Type),
      Unchecked ('(Any -> Boolean)'),
      Unchecked ('(t a -> f a)'),
      Unchecked ('Type -> Type')])
    (name => url => supertypes => test => _1 => (
       def (name) ({}) ([$.Type, $.Type]) (UnaryType (name) (url) (supertypes) (test) (_1))));

$.BinaryType =
def ('BinaryType')
    ({f: [Z.Foldable]})
    ([$.String,
      $.String,
      $.Array ($.Type),
      Unchecked ('(Any -> Boolean)'),
      Unchecked ('(t a b -> f a)'),
      Unchecked ('(t a b -> f b)'),
      Unchecked ('Type -> Type -> Type')])
    (name => url => supertypes => test => _1 => _2 => (
       def (name) ({}) ([$.Type, $.Type, $.Type]) (BinaryType (name) (url) (supertypes) (test) (_1) (_2))));
