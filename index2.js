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

//    reduce :: Foldable f => (b -> a -> b) -> b -> f a -> b
const reduce = f => b => foldable => (
  Z.reduce ((b, a) => f (b) (a), b, foldable)
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
  return formatType3 (t) (propPath) (format (t) (_) (k => (
    K (_underline (innerType (k) (t),
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
    const f = B (cataDefault (I) ({Function: types => parenthesize (_)}) (t))
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
  return Z.reduce ((t, prop) => innerType (prop) (t), t, propPath);
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

//    see2 :: (String, String, Nullable String) -> String
const see2 = (label, name, url) => (
  url == null || url === '' ?
  '' :
  '\nSee ' + url + ' for information about the ' + name + ' ' + label + '.\n'
);

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
          const selector = JSON.stringify (indexedPropPath);
          if (!(hasOwnProperty.call (valuesByPath, selector))) return s;
          if (!(isEmpty (valuesByPath[selector]))) return f (s);
        }
        return _ (s);
      };
    }
  );
};

//    always :: a -> Type -> Cases a
const always = x => ({
  NoArguments:                                                                      x,
  Unchecked:          s =>                                                          x,
  Inconsistent:                                                                     x,
  NullaryType:        name => url => supertypes => test2 =>                         x,
  EnumType:           name => url => members =>                                     x,
  UnaryType:          name => url => supertypes => test2 => _1 =>       $1 =>       x,
  BinaryType:         name => url => supertypes => test2 => _1 => _2 => $1 => $2 => x,
  Function:                                                             types =>    x,
  RecordType:                                      fields =>                        x,
  NamedRecordType:    name => url => supertypes => fields =>                        x,
  TypeVariable:       name =>                                                       x,
  UnaryTypeVariable:  name =>                                           $1 =>       x,
  BinaryTypeVariable: name =>                                           $1 => $2 => x,
  Unknown:                                                                          x,
});

const cata = cases => type => type.cata (cases);

const cataDefault = x => cases => cata (Z.concat (always (x), cases));

//    innerType :: String -> Type -> Type
const innerType = prop => cata ({
  UnaryType: name => url => supertypes => test2 => _1 => $1 => prop === '$1' ? $1 : TK,
  BinaryType: name => url => supertypes => test2 => _1 => _2 => $1 => $2 => prop === '$1' ? $1 : prop === '$2' ? $2 : TK,
  UnaryTypeVariable: name => $1 => prop === '$1' ? $1 : TK,
  BinaryTypeVariable: name => $1 => $2 => prop === '$1' ? $1 : prop === '$2' ? $2 : TK,
  RecordType: fields => fields[prop],
  NamedRecordType: _ => _ => _ => fields => fields[prop],
  Function: types => prop === '$1' ? types[0] : prop === '$2' ? types[1] : prop === '$3' ? types[2] : TK,
});

//  expandUnknown
//  :: Array Type
//  -> Array Object
//  -> Any
//  -> (a -> Array b)
//  -> Type
//  -> Array Type
const expandUnknown = env => typeInfo => index => path => mappings => proxy => seen => value => extractor => cata ({
  NoArguments: [$.NoArguments],
  Unchecked: [$.Unchecked],
  Inconsistent: [$.Inconsistent],
  NullaryType: name => url => supertypes => test2 => [NullaryType (name) (url) (supertypes) (test2)],
  EnumType: name => url => members => [EnumType (name) (url) (members)],
  UnaryType: name => url => supertypes => test2 => _1 => $1 => [UnaryType (name) (url) (supertypes) (test2) (_1) ($1)],
  BinaryType: name => url => supertypes => test2 => _1 => _2 => $1 => $2 => [BinaryType (name) (url) (supertypes) (test2) (_1) (_2) ($1) ($2)],
  Function: types => [Function_ (types)],
  RecordType: fields => [RecordType (fields)],
  NamedRecordType: name => url => supertypes => fields => [NamedRecordType (name) (url) (supertypes) (fields)],
  TypeVariable: name => [TypeVariable (name)],
  UnaryTypeVariable: name => $1 => [UnaryTypeVariable (name) ($1)],
  BinaryTypeVariable: name => $1 => $2 => [BinaryTypeVariable (name) ($1) ($2)],
  Unknown: _determineActualTypes (env, typeInfo, index, path, mappings, proxy, seen, extractor (value)),
});

//    _determineActualTypes :: ... -> Array Type
const _determineActualTypes = (
  env,            // :: Array Type
  typeInfo,
  index,
  path,
  mappings,
  proxy,
  seen,           // :: Array Object
  values          // :: Array Any
) => {
  const expandUnknown4 = expandUnknown (env) (typeInfo) (index) (path) (mappings) (proxy);

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
      validate (env) (typeInfo) (index) (path) (mappings) (proxy) (value) (t) != null ? [] : cata ({
        NoArguments: [$.NoArguments],
        Unchecked: [$.Unchecked],
        Inconsistent: [$.Inconsistent],
        NullaryType: name => url => supertypes => test2 => [NullaryType (name) (url) (supertypes) (test2)],
        EnumType: name => url => members => [EnumType (name) (url) (members)],
        UnaryType: name => url => supertypes => test2 => _1 => $1 => (
          Z.map (
            UnaryType (name) (url) (supertypes) (test2) (_1),
            expandUnknown2 (_1) ($1)
          )
        ),
        BinaryType: name => url => supertypes => test2 => _1 => _2 => $1 => $2 => (
          Z.lift2 (
            BinaryType (name) (url) (supertypes) (test2) (_1) (_2),
            expandUnknown2 (_1) ($1),
            expandUnknown2 (_2) ($2)
          )
        ),
        Function: types => [Function_ (types)],
        RecordType: fields => [RecordType (fields)],
        NamedRecordType: name => url => supertypes => fields => [NamedRecordType (name) (url) (supertypes) (fields)],
        TypeVariable: name => [TypeVariable (name)],
        UnaryTypeVariable: name => $1 => [UnaryTypeVariable (name) ($1)],
        BinaryTypeVariable: name => $1 => $2 => [BinaryTypeVariable (name) ($1) ($2)],
        Unknown: [$.Unknown],
      }) (t)
    ), types);
  }

  return isEmpty (values) ?
    [$.Unknown] :
    or (Z.reduce (refine, env, values), [$.Inconsistent]);
};

//    isConsistent :: Type -> Boolean
const isConsistent = cataDefault (true) ({
  UnaryType: _ => _ => _ => _ => _ => $1 => (
    isConsistent ($1)
  ),
  BinaryType: _ => _ => _ => _ => _ => _ => $1 => $2 => (
    isConsistent ($1) && isConsistent ($2)
  ),
  Inconsistent: false,
});

//    determineActualTypesStrict :: (Array Type, Array Any) -> Array Type
const determineActualTypesStrict = (env, typeInfo, index, path, mappings, proxy, values) => (
  Z.filter (isConsistent,
            _determineActualTypes (env, typeInfo, index, path, mappings, proxy, [], values))
);

//    determineActualTypesLoose :: (Array Type, Array Any) -> Array Type
const determineActualTypesLoose = (env, typeInfo, index, path, mappings, proxy, values) => (
  Z.reject (cataDefault (false) ({Inconsistent: true}),
            _determineActualTypes (env, typeInfo, index, path, mappings, proxy, [], values))
);

// eslint-disable-next-line no-sequences
const toArray = foldable => Z.reduce ((xs, x) => (xs.push (x), xs), [], foldable);

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
  mappings,
  proxy,
  values          // :: Array Any
) => {
  const recur = satisfactoryTypes;

  for (let idx = 0; idx < values.length; idx += 1) {
    const result = validate (env) (typeInfo) (index) (propPath) (mappings) (proxy) (values[idx]) (expType);
    if (result != null) {
      return Left (null);
    }
  }

  return cataDefault (Right ({typeVarMap: typeVarMap, types: [expType]})) ({
    UnaryType: name => url => supertypes => test2 => _1 => $1 => (
      Z.map (
        result => ({
          typeVarMap: result.typeVarMap,
          types: Z.map (UnaryType (name) (url) (supertypes) (test2) (_1),
                        or (result.types, [$1])),
        }),
        recur (env,
               typeInfo,
               typeVarMap,
               $1,
               index,
               Z.concat (propPath, ['$1']),
               mappings,
               proxy,
               Z.chain (B (toArray) (_1), values))
      )
    ),
    BinaryType: name => url => supertypes => test2 => _1 => _2 => $1 => $2 => (
      Z.chain (
        result => {
          const $1s = result.types;
          return Z.map (
            result => {
              const $2s = result.types;
              return {
                typeVarMap: result.typeVarMap,
                types: Z.lift2 (BinaryType (name) (url) (supertypes) (test2) (_1) (_2),
                                or ($1s, [$1]),
                                or ($2s, [$2])),
              };
            },
            recur (env,
                   typeInfo,
                   result.typeVarMap,
                   $2,
                   index,
                   Z.concat (propPath, ['$2']),
                   mappings,
                   proxy,
                   Z.chain (B (toArray) (_2), values))
          );
        },
        recur (env,
               typeInfo,
               typeVarMap,
               $1,
               index,
               Z.concat (propPath, ['$1']),
               mappings,
               proxy,
               Z.chain (B (toArray) (_1), values))
      )
    ),
    RecordType: fields => (
      Z.reduce ((e, k) => (
        Z.chain (r => (
          recur (env,
                 typeInfo,
                 r.typeVarMap,
                 fields[k],
                 index,
                 Z.concat (propPath, [k]),
                 mappings,
                 proxy,
                 Z.chain (extract (k) (expType), values))
        ), e)
      ), Right ({typeVarMap: typeVarMap, types: [expType]}), Object.keys (fields))
    ),
    NamedRecordType: _ => _ => _ => fields => (
      Z.reduce ((e, k) => (
        Z.chain (r => (
          recur (env,
                 typeInfo,
                 r.typeVarMap,
                 fields[k],
                 index,
                 Z.concat (propPath, [k]),
                 mappings,
                 proxy,
                 Z.chain (extract (k) (expType), values))
        ), e)
      ), Right ({typeVarMap: typeVarMap, types: [expType]}), Object.keys (fields))
    ),
  }) (expType);
};

const Type$prototype = {
  '@@type': 'sanctuary-def/Type@1',
  '@@show': function() {
    return format (this) (I) (K (I));
  },
  'fantasy-land/equals': function(other) {
    return cata ({
      NoArguments: cataDefault (false) ({
        NoArguments: true,
      }),
      Unchecked: cataDefault (false) ({
        Unchecked: true,
      }),
      Inconsistent: cataDefault (false) ({
        Inconsistent: true,
      }),
      NullaryType: name1 => url1 => supertypes1 => test21 => cataDefault (false) ({
        NullaryType: name2 => url2 => supertypes2 => test22 => name1 === name2 && url1 === url2 && Z.equals (supertypes1, supertypes2),
      }),
      EnumType: name1 => url1 => members1 => cataDefault (false) ({
        EnumType: name2 => url2 => members2 => name1 === name2 && url1 === url2 && Z.equals (members1, members2),
      }),
      UnaryType: name1 => url1 => supertypes1 => test21 => _11 => $11 => cataDefault (false) ({
        UnaryType: name2 => url2 => supertypes2 => test22 => _12 => $12 => name1 === name2 && url1 === url2 && Z.equals (supertypes1, supertypes2) && Z.equals ($11, $12),
      }),
      BinaryType: name1 => url1 => supertypes1 => test21 => _11 => _21 => $11 => $21 => cataDefault (false) ({
        BinaryType: name2 => url2 => supertypes2 => test22 => _12 => _22 => $12 => $22 => name1 === name2 && url1 === url2 && Z.equals (supertypes1, supertypes2) && Z.equals ($11, $12) && Z.equals ($21, $22),
      }),
      Function: types1 => cataDefault (false) ({
        Function: types2 => Z.equals (types1, types2),
      }),
      RecordType: fields1 => cataDefault (false) ({
        RecordType: fields2 => Z.equals (fields1, fields2),
      }),
      NamedRecordType: name1 => url1 => supertypes1 => fields1 => cataDefault (false) ({
        NamedRecordType: name2 => url2 => supertypes2 => fields2 => name1 === name2 && url1 === url2 && Z.equals (supertypes1, supertypes2) && Z.equals (fields1, fields2),
      }),
      TypeVariable: name1 => cataDefault (false) ({
        TypeVariable: name2 => name1 === name2,
      }),
      UnaryTypeVariable: name1 => $11 => cataDefault (false) ({
        UnaryTypeVariable: name2 => $12 => name1 === name2 && Z.equals ($11, $12),
      }),
      BinaryTypeVariable: name => $1 => $2 => cataDefault (false) ({
        BinaryTypeVariable: name => $1 => $2 => name1 === name2 && Z.equals ($11, $12) && Z.equals ($21, $22),
      }),
      Unknown: cataDefault (false) ({
        Unknown: true,
      }),
    }) (this) (other);
  },
};

//    ancestors :: Type -> Array Type
const ancestors = type => (
  Z.concat (Z.chain (ancestors, supertypes (type)), supertypes (type))
);

//    extract :: String -> Type -> Any -> Array Any
const extract = key => cataDefault (value => []) ({
  UnaryType: _ => _ => _ => _ => _1 => _ => value => key === '$1' ? toArray (_1 (value)) : TK,
  BinaryType: _ => _ => _ => _ => _1 => _2 => _ => _ => value => key === '$1' ? toArray (_1 (value)) : key === '$2' ? toArray (_2 (value)) : TK,
  RecordType: _ => value => [value[key]],
  NamedRecordType: _ => _ => _ => _ => value => [value[key]],
});

const validate = env => typeInfo => index => path => mappings => proxy => value => type => {
  if (
    Z.any (
      type => (
        neue
          (error => true)
          (value => mappings => proxy => false)
          (env)
          (typeInfo)
          (index)
          (path)
          (type)
          (value)
          (mappings)
          (proxy)
      ),
      ancestors (type)
    )
  ) return {value, propPath: []};

  if (
    neue
      (error => true)
      (value => mappings => proxy => false)
      (env)
      (typeInfo)
      (index)
      (path)
      (type)
      (value)
      (mappings)
      (proxy)
  ) return {value, propPath: []};

  return cataDefault (null) ({
    UnaryType: name => url => supertypes => test2 => _1 => $1 => {
      for (const x of toArray (_1 (value))) {
        const result = validate (env) (typeInfo) (index) (path) (mappings) (proxy) (x) ($1);
        if (result != null) {
          return {value: result.value, propPath: Z.prepend ('$1', result.propPath)};
        }
      }
      return null;
    },
    BinaryType: name => url => supertypes => test2 => _1 => _2 => $1 => $2 => {
      for (const x of toArray (_1 (value))) {
        const result = validate (env) (typeInfo) (index) (path) (mappings) (proxy) (x) ($1);
        if (result != null) {
          return {value: result.value, propPath: Z.prepend ('$1', result.propPath)};
        }
      }
      for (const x of toArray (_2 (value))) {
        const result = validate (env) (typeInfo) (index) (path) (mappings) (proxy) (x) ($2);
        if (result != null) {
          return {value: result.value, propPath: Z.prepend ('$2', result.propPath)};
        }
      }
      return null;
    },
  }) (type);
};

const Constructor = cata => Object.assign (Object.create (Type$prototype), {cata});

$.Unknown = Constructor (cases => cases.Unknown);

const Unchecked = s => Constructor (cases => cases.Unchecked (s));

$.Inconsistent = Constructor (cases => cases.Inconsistent);

$.NoArguments = Constructor (cases => cases.NoArguments);

//    arity :: Type -> Integer
const arity = cataDefault (0) ({
  UnaryType: _ => _ => _ => _ => _ => _ => 1,
  BinaryType: _ => _ => _ => _ => _ => _ => _ => _ => 2,
  UnaryTypeVariable: _ => _ => 1,
  BinaryTypeVariable: _ => _ => _ => 2,
  Function: types => types.length,
});

//    name :: Type -> String
const name = cataDefault ('') ({
  NullaryType: name => _ => _ => _ => name,
  EnumType: name => _ => _ => name,
  UnaryType: name => _ => _ => _ => _ => _ => name,
  BinaryType: name => _ => _ => _ => _ => _ => _ => _ => name,
  NamedRecordType: name => _ => _ => _ => name,
  TypeVariable: name => name,
  UnaryTypeVariable: name => _ => name,
  BinaryTypeVariable: name => _ => _ => name,
});

//    url :: Type -> String
const url = cataDefault ('') ({
  NullaryType: _ => url => _ => _ => url,
  EnumType: _ => url => _ => url,
  UnaryType: _ => url => _ => _ => _ => _ => url,
  BinaryType: _ => url => _ => _ => _ => _ => _ => _ => url,
  NamedRecordType: _ => url => _ => _ => url,
});

//    supertypes :: Type -> Array Type
const supertypes = cataDefault ([]) ({
  NullaryType: _ => _ => supertypes => _ => supertypes,
  UnaryType: _ => _ => supertypes => _ => _ => _ => supertypes,
  BinaryType: _ => _ => supertypes => _ => _ => _ => _ => _ => supertypes,
  Function: _ => [$.AnyFunction],
  NamedRecordType: _ => _ => supertypes => _ => supertypes,
});

//    format :: Type -> String
const format = cata ({
  NoArguments: outer => inner => outer ('()'),
  Unchecked: s => outer => inner => outer (s),
  Inconsistent: outer => inner => outer ('???'),
  NullaryType: name => _ => _ => _ => outer => inner => outer (name),
  EnumType: name => _ => _ => outer => inner => outer (name),
  UnaryType: name => url => supertypes => test2 => _1 => $1 => outer => inner => (
    outer (name) +
    outer (' ') +
    when (arity ($1) > 0)
         (parenthesize (outer))
         (inner ('$1') (show ($1)))
  ),
  BinaryType: name => url => supertypes => test2 => _1 => _2 => $1 => $2 => outer => inner => (
    outer (name) +
    outer (' ') +
    when (arity ($1) > 0)
         (parenthesize (outer))
         (inner ('$1') (show ($1))) +
    outer (' ') +
    when (arity ($2) > 0)
         (parenthesize (outer))
         (inner ('$2') (show ($2)))
  ),
  Function: types => outer => inner => (
    when (types.length !== 2)
         (parenthesize (outer))
         (types
          .slice (0, -1)
          .map ((t, idx) => cataDefault (I) ({Function: _ => parenthesize (outer)}) (t) (inner (`$${idx + 1}`) (show (t))))
          .join (outer (', '))) +
    outer (' -> ') +
    inner (`$${types.length}`) (show (types[types.length - 1]))
  ),
  RecordType: fields => outer => inner => {
    const keys = (Object.keys (fields)).sort ();
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
  NamedRecordType: name => _ => _ => _ => outer => inner => outer (name),
  TypeVariable: name => outer => inner => outer (name),
  UnaryTypeVariable: name => $1 => outer => inner => (
    outer (name) +
    outer (' ') +
    when (arity ($1) > 0)
         (parenthesize (outer))
         (inner ('$1') (show ($1)))
  ),
  BinaryTypeVariable: name => $1 => $2 => outer => inner => (
    outer (name) +
    outer (' ') +
    when (arity ($1) > 0)
         (parenthesize (outer))
         (inner ('$1') (show ($1))) +
    outer (' ') +
    when (arity ($2) > 0)
         (parenthesize (outer))
         (inner ('$2') (show ($2)))
  ),
  Unknown: outer => inner => outer ('Unknown'),
});

const InvalidValue = env => typeInfo => index => path => mappings => proxy => value => cases => cases.InvalidValue (env) (typeInfo) (index) (path) (mappings) (proxy) (value);

const TypeClassConstraintViolation = env => typeInfo => typeClass => index => path => mappings => proxy => value => cases => cases.TypeClassConstraintViolation (env) (typeInfo) (typeClass) (index) (path) (mappings) (proxy) (value);

const TypeVarConstraintViolation = env => typeInfo => index => path => mappings => proxy => values => cases => cases.TypeVarConstraintViolation (env) (typeInfo) (index) (path) (mappings) (proxy) (values);

const UnrecognizedValue = env => typeInfo => index => path => mappings => proxy => value => cases => cases.UnrecognizedValue (env) (typeInfo) (index) (path) (mappings) (proxy) (value);

//    toError :: $Error -> Error
const toError = error => error ({

  InvalidValue: env => typeInfo => index => propPath => mappings => proxy => value => {
    const t = resolvePropPath (typeInfo.types[index], propPath);

    const underlinedTypeVars =
    underline (typeInfo,
               K (K (_)),
               formatType6 (Z.concat ([index], propPath)));

    return new TypeError (trimTrailingSpaces (
      'Invalid value\n\n' +
      underlinedTypeVars + '\n' +
      showValuesAndTypes (env, typeInfo, index, propPath, mappings, proxy, [value], 1) + '\n\n' +
      'The value at position 1 is not a member of ' +
      q (show (t)) + '.\n' +
      see2 (arity (t) >= 1 ? 'type constructor' : 'type', name (t), url (t))
    ));
  },

  TypeClassConstraintViolation: env => typeInfo => typeClass => index => propPath => mappings => proxy => value => {
    const expType = resolvePropPath (typeInfo.types[index], propPath);
    return new TypeError (trimTrailingSpaces (
      'Type-class constraint violation\n\n' +
      underline (typeInfo,
                 tvn => tc => (
                   tvn === name (expType) && tc.name === typeClass.name ? r ('^') : _
                 ),
                 formatType6 (Z.concat ([index], propPath))) +
      '\n' +
      showValuesAndTypes (env, typeInfo, index, propPath, mappings, proxy, [value], 1) + '\n\n' +
      q (typeInfo.name) + ' requires ' +
      q (name (expType)) + ' to satisfy the ' +
      stripNamespace (typeClass) + ' type-class constraint; ' +
      'the value at position 1 does not.\n' +
      see ('type class', typeClass)
    ));
  },

  TypeVarConstraintViolation: env => typeInfo => index => propPath => mappings => proxy => valuesAtPath => {
    //  If we apply an ‘a -> a -> a -> a’ function to Left ('x'), Right (1),
    //  and Right (null) we'd like to avoid underlining the first argument
    //  position, since Left ('x') is compatible with the other ‘a’ values.
    const selector = JSON.stringify (Z.concat ([index], propPath));
    const values = Z.chain (r => r.selector === selector ? [r.value] : [], valuesAtPath);

    const name1 = name (propPath.reduce ((t, prop) => innerType (prop) (t), typeInfo.types[index]));

    const valuesByPath = reduce
      (acc => r => {
         const [index, ...propPath] = JSON.parse (r.selector);
         const name2 = name (propPath.reduce ((t, prop) => innerType (prop) (t), typeInfo.types[index]));
         if (name2 === name1) {
           if (!(r.selector in acc)) {
             acc[r.selector] = [];
           }
           acc[r.selector].push (r.value);
         }
         return acc;
       })
      (Object.create (null))
      (valuesAtPath);

    //  Note: Sorting these keys lexicographically is not "correct", but it
    //  does the right thing for indexes less than 10.
    const keys = Z.filter (k => {
      const values_ = Z.chain (r => r.selector === k ? [r.value] : [], valuesAtPath);
      return (
        //  Keep X, the position at which the violation was observed.
        k === selector ||
        //  Keep positions whose values are incompatible with the values at X.
        isEmpty (determineActualTypesStrict (env, typeInfo, index, propPath, mappings, proxy, Z.concat (values, values_)))
      );
    }, (Object.keys (valuesByPath)).sort ());

    const underlinedTypeVars =
    underlineTypeVars (typeInfo,
                       reduce ($valuesByPath => k => { $valuesByPath[k] = valuesByPath[k]; return $valuesByPath; })
                              ({})
                              (keys));

    return new TypeError (trimTrailingSpaces (
      'Type-variable constraint violation\n\n' +
      underlinedTypeVars + '\n' +
      (Z.reduce ((st, k) => {
        const values = valuesByPath[k];
        return isEmpty (values) ? st : {
          idx: st.idx + 1,
          s: st.s +
             showValuesAndTypes (env, typeInfo, index, propPath, mappings, proxy, values, st.idx + 1) +
             '\n\n',
        };
      }, {idx: 0, s: ''}, keys)).s +
      'Since there is no type of which all the above values are ' +
      'members, the type-variable constraint has been violated.\n'
    ));
  },

  UnrecognizedValue: env => typeInfo => index => propPath => mappings => proxy => value => {
    const underlinedTypeVars =
    underline (typeInfo,
               K (K (_)),
               formatType6 (Z.concat ([index], propPath)));

    return new TypeError (trimTrailingSpaces (
      'Unrecognized value\n\n' +
      underlinedTypeVars + '\n' +
      showValuesAndTypes (env, typeInfo, index, propPath, mappings, proxy, [value], 1) + '\n\n' +
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
  },

});

const neue = reject => resolve => env => typeInfo => index => path => cata ({
  NoArguments: resolve,
  Unchecked: s => resolve,
  Inconsistent: resolve,
  NullaryType: name => url => supertypes => test2 => value => mappings => proxy => (
    reduce
      (cont => supertype => value => mappings => proxy =>
         neue
           (reject)
           (cont)
           (env)
           (typeInfo)
           (index)
           (path)
           (supertype)
           (value)
           (mappings)
           (proxy))
      (value => mappings => proxy =>
         test2 (value)
         ? resolve (value) (mappings) (proxy)
         : reject (InvalidValue (env) (typeInfo) (index) (path) (mappings) (proxy) (value)))
      (supertypes)
      (value)
      (mappings)
      (proxy)
  ),
  EnumType: name => url => members => value => mappings => proxy => (
    memberOf (members) (value)
    ? resolve (value) (mappings) (proxy)
    : reject (InvalidValue (env) (typeInfo) (index) (path) (mappings) (proxy) (value))
  ),
  UnaryType: name => url => supertypes => test2 => _1 => $1 => value => mappings => proxy => (
    reduce
      (cont => supertype => value => mappings => proxy =>
         neue
           (reject)
           (cont)
           (env)
           (typeInfo)
           (index)
           (path)
           (supertype)
           (value)
           (mappings)
           (proxy))
      (value => mappings => proxy =>
         test2 (value)
         ? reduceRight
             (resolve => value => mappings => proxy => (
                neue
                  (reject)
                  (value => resolve)
                  (env)
                  (typeInfo)
                  (index)
                  ([...path, '$1'])
                  ($1)
                  (value)
                  (mappings)
                  (proxy)
              ))
             (resolve (value))
             (_1 (value))
             (mappings)
             (proxy)
         : reject (InvalidValue (env) (typeInfo) (index) (path) (mappings) (proxy) (value)))
      (supertypes)
      (value)
      (mappings)
      (proxy)
  ),
  BinaryType: name => url => supertypes => test2 => _1 => _2 => $1 => $2 => value => mappings => proxy => (
    reduce
      (cont => supertype => value => mappings => proxy =>
         neue
           (reject)
           (cont)
           (env)
           (typeInfo)
           (index)
           (path)
           (supertype)
           (value)
           (mappings)
           (proxy))
      (value => mappings => proxy =>
         test2 (value)
         ? reduceRight
             (cont => value => mappings => proxy => (
                neue
                  (reject)
                  (value => cont)
                  (env)
                  (typeInfo)
                  (index)
                  ([...path, '$1'])
                  ($1)
                  (value)
                  (mappings)
                  (proxy)
              ))
             (reduceRight
                (cont => value => mappings => proxy => (
                   neue
                     (reject)
                     (value => cont)
                     (env)
                     (typeInfo)
                     (index)
                     ([...path, '$2'])
                     ($2)
                     (value)
                     (mappings)
                     (proxy)
                 ))
                (resolve (value))
                (_2 (value)))
             (_1 (value))
             (mappings)
             (proxy)
         : reject (InvalidValue (env) (typeInfo) (index) (path) (mappings) (proxy) (value)))
      (supertypes)
      (value)
      (mappings)
      (proxy)
  ),
  Function: types => value => mappings => proxy => {
    let mappings2 = mappings;
    return neue
      (reject)
      (value => mappings => proxy =>
         resolve ((...args) => {
                    const n = types.length - 1;
                    if (args.length !== n) {
                      throw invalidArgumentsLength (typeInfo, index, n, args);
                    }
                    args.forEach ((arg, idx) => {
                      neue
                        (reject)
                        (value => mappings => proxy => { mappings2 = mappings; })
                        (env)
                        (typeInfo)
                        (index)
                        ([...path, `$${idx + 1}`])
                        (types[idx])
                        (arg)
                        (mappings2)
                        (proxy)
                    });
                    return neue
                      (reject)
                      (value => mappings => values => { mappings2 = mappings; return value; })
                      (env)
                      (typeInfo)
                      (index)
                      ([...path, `$${types.length}`])
                      (types[n])
                      (value (...args))
                      (mappings2)
                      (proxy);
                  })
                 (mappings2)
                 (proxy))
      (env)
      (typeInfo)
      (index)
      (path)
      ($.AnyFunction)
      (value)
      (mappings)
      (proxy);
  },
  RecordType: fields => value => mappings => proxy => {
    const keys = (Object.keys (fields)).sort ();
    if (value == null) {
      return reject (InvalidValue (env) (typeInfo) (index) (path) (mappings) (proxy) (value));
    } else {
      const missing = {};
      keys.forEach (k => { missing[k] = k; });
      for (const k in value) delete missing[k];
      if (Z.size (missing) > 0) {
        return reject (InvalidValue (env) (typeInfo) (index) (path) (mappings) (proxy) (value));
      } else {
        return reduceRight
                 (cont => key => mappings => proxy => (
                    neue
                      (reject)
                      (value => cont)
                      (env)
                      (typeInfo)
                      (index)
                      ([...path, key])
                      (fields[key])
                      (value[key])
                      (mappings)
                      (proxy)
                  ))
                 (resolve (value))
                 (keys)
                 (mappings)
                 (proxy);
      }
    }
  },
  NamedRecordType: name => url => supertypes => fields => value => mappings => proxy => {
    const keys = (Object.keys (fields)).sort ();
    if (value == null) {
      return reject (InvalidValue (env) (typeInfo) (index) (path) (mappings) (proxy) (value));
    } else {
      const missing = {};
      keys.forEach (k => { missing[k] = k; });
      for (const k in value) delete missing[k];
      if (Z.size (missing) > 0) {
        return reject (InvalidValue (env) (typeInfo) (index) (path) (mappings) (proxy) (value));
      } else {
        return reduceRight
                 (cont => key => mappings => proxy => (
                    neue
                      (error => reject (error ({InvalidValue: env => typeInfo => index => path => mappings => proxy => _value => InvalidValue (env) (typeInfo) (index) (path) (mappings) (proxy) (value),
                                                TypeClassConstraintViolation: env => typeInfo => typeClass => index => path => mappings => proxy => _value => TypeClassConstraintViolation (env) (typeInfo) (typeClass) (index) (path) (mappings) (proxy) (value),
                                                TypeVarConstraintViolation: env => typeInfo => index => path => mappings => proxy => values => TypeVarConstraintViolation (env) (typeInfo) (index) (path) (mappings) (proxy) ([value]),
                                                UnrecognizedValue: env => typeInfo => index => path => mappings => proxy => _value => UnrecognizedValue (env) (typeInfo) (index) (path) (mappings) (proxy) (value)})))
                      (value => cont)
                      (env)
                      (typeInfo)
                      (index)
                      (path)
                      (fields[key])
                      (value[key])
                      (mappings)
                      (proxy)
                  ))
                 (resolve (value))
                 (keys)
                 (mappings)
                 (proxy);
      }
    }
  },
  TypeVariable: name => value => mappings => proxy => {
    proxy.values =
      cons ({selector: JSON.stringify ([index, ...path]), value})
           (proxy.values);

    if (Object.prototype.hasOwnProperty.call (typeInfo.constraints, name)) {
      for (let idx = 0; idx < typeInfo.constraints[name].length; idx += 1) {
        const typeClass = typeInfo.constraints[name][idx];
        if (!(typeClass.test (value))) {
          return reject (TypeClassConstraintViolation (env) (typeInfo) (typeClass) (index) (path) (mappings) (proxy) (value));
        }
      }
    }

    const mappings2 = {
      types: name_ => (
        name_ === name
        ? Z.chain (
            cata ({
              NoArguments: [$.NoArguments],
              Unchecked: s => [$.Unchecked (s)],
              Inconsistent: [$.Inconsistent],
              NullaryType: name => url => supertypes => test2 => [NullaryType (name) (url) (supertypes) (test2)],
              EnumType: name => url => members => [EnumType (name) (url) (members)],
              UnaryType: name => url => supertypes => test2 => _1 => $1 => (
                Z.map (
                  UnaryType (name) (url) (supertypes) (test2) (_1),
                  Z.filter (
                    isConsistent,
                    expandUnknown (env) (typeInfo) (index) (path) (mappings2) (proxy) ([]) (value) (_1) ($1)
                  )
                )
              ),
              BinaryType: name => url => supertypes => test2 => _1 => _2 => $1 => $2 => (
                Z.lift2 (
                  BinaryType (name) (url) (supertypes) (test2) (_1) (_2),
                  Z.filter (
                    isConsistent,
                    expandUnknown (env) (typeInfo) (index) (path) (mappings2) (proxy) ([]) (value) (_1) ($1)
                  ),
                  Z.filter (
                    isConsistent,
                    expandUnknown (env) (typeInfo) (index) (path) (mappings2) (proxy) ([]) (value) (_2) ($2)
                  )
                )
              ),
              Function: types => [Function_ (types)],
              RecordType: fields => [RecordType (fields)],
              NamedRecordType: name => url => supertypes => fields => [NamedRecordType (name) (url) (supertypes) (fields)],
              TypeVariable: name => [TypeVariable (name)],
              UnaryTypeVariable: name => $1 => [UnaryTypeVariable (name) ($1)],
              BinaryTypeVariable: name => $1 => $2 => [BinaryTypeVariable (name) ($1) ($2)],
              Unknown: [$.Unknown],
            }),
            Z.filter (t => (satisfactoryTypes (env, {name: 'name', constraints: {}, types: [t]}, {}, t, 0, [], mappings, proxy, [value])).isRight, mappings.types (name))
          )
        : mappings.types (name_)
      ),
    };

    if ((mappings2.types (name)).length > 0) {
      return resolve (value) (mappings2) (proxy);
    } else if (Z.any (t => (satisfactoryTypes (env, {name: 'name', constraints: {}, types: [t]}, {}, t, 0, [], mappings2, proxy, [value])).isRight, env)) {
      const values = [];
      let p = proxy;
      //  Find rightmost proxy to avoid having to look in both directions.
      while (p.right != null) p = p.right;
      //  Enumerate proxies from rightmost to leftmost.
      while (p != null) {
        for (let list = p.values; list.tail != null; list = list.tail) {
          values.push (list.head);
        }
        p = p.left;
      }
      return reject (TypeVarConstraintViolation (env) (typeInfo) (index) (path) (mappings2) (proxy) (Z.reverse (values)));
    } else {
      return reject (UnrecognizedValue (env) (typeInfo) (index) (path) (mappings2) (proxy) (value));
    }
  },
  UnaryTypeVariable: name => $1 => value => mappings => proxy => {
    const mappings2 = {
      types: name_ => {
        const types = mappings.types (name_);
        return name_ === name
               ? Z.chain (
                   type => (
                     satisfactoryTypes (env, {name: 'name', constraints: {}, types: [type]}, {}, type, 0, [], mappings, proxy, [value]).isRight ?
                     cata ({
                       NoArguments: [],
                       Unchecked: _ => [],
                       Inconsistent: [],
                       NullaryType: _ => _ => _ => _ => [],
                       EnumType: _ => _ => _ => [],
                       UnaryType: name => url => supertypes => test2 => _1 => _ => (
                         [UnaryType (name) (url) (supertypes) (test2) (_1) ($1)]
                       ),
                       BinaryType: name => url => supertypes => test2 => _1 => _2 => $1_ => _ => (
                         [BinaryType (name) (url) (supertypes) (test2) (_1) (_2) ($1_) ($1)]
                       ),
                       Function: types => [Function_ (types)],
                       RecordType: _ => [],
                       NamedRecordType: _ => _ => _ => _ => [],
                       TypeVariable: _ => [],
                       UnaryTypeVariable: name => $1 => [],
                       BinaryTypeVariable: name => $1 => $2 => [],
                       Unknown: [],
                     }) (type) :
                     []
                   ),
                   types
                 )
               : types;
      },
    };

    console.log ('mappings2.types ("a"):', show (mappings2.types ('a')));
    console.log ('mappings2.types ("f"):', show (mappings2.types ('f')));

    proxy.values =
      cons ({selector: JSON.stringify ([index, ...path]), value})
           (proxy.values);

    const types = mappings2.types (name);
    console.log ('types:', show (types));
    if (types.length === 0) {
      return reject (InvalidValue (env) (typeInfo) (index) (path) (mappings2) (proxy) (value));
    }

    if (Object.prototype.hasOwnProperty.call (typeInfo.constraints, name)) {
      for (let idx = 0; idx < typeInfo.constraints[name].length; idx += 1) {
        const typeClass = typeInfo.constraints[name][idx];
        if (!typeClass.test (value)) {
          return reject (TypeClassConstraintViolation (env) (typeInfo) (typeClass) (index) (path) (mappings2) (proxy) (value));
        }
      }
    }

    return resolve (value)
                   (mappings2)
                   (reduce
                      (proxy => type => (
                         reduce
                           (values => value => (
                              neue
                                (reject)
                                (value => mappings => proxy => proxy)
                                (env)
                                (typeInfo)
                                (index)
                                ([...path, `$${arity (type)}`])
                                ($1)
                                (value)
                                (mappings2)
                                (proxy)
                            ))
                           (proxy)
                           (extract (`$${arity (type)}`) (type) (value))
                       ))
                      (proxy)
                      (types));
  },
  BinaryTypeVariable: name => $1 => $2 => value => mappings => proxy => {
    const mappings2 = {
      types: name_ => {
        const types = mappings.types (name_);
        return name_ === name ? Z.filter (type => (satisfactoryTypes (env, {name: 'name', constraints: {}, types: [type]}, {}, type, 0, [], mappings, proxy, [value])).isRight, types) : types;
      },
    };

    proxy.values =
      cons ({selector: JSON.stringify ([index, ...path]), value})
           (proxy.values);

    const types = mappings2.types (name);
    if (types.length === 0) {
      return reject (InvalidValue (env) (typeInfo) (index) (path) (mappings2) (proxy) (value));
    }

    return resolve (value)
                   (mappings2)
                   (reduce
                      (proxy => (
                         cataDefault (proxy) ({
                           BinaryType: name => url => supertypes => test2 => _1 => _2 => _ => _ => (
                             reduce (proxy => value => (
                                       neue
                                         (reject)
                                         (value => mappings => proxy => proxy)
                                         (env)
                                         (typeInfo)
                                         (index)
                                         ([...path, '$2'])
                                         ($2)
                                         (value)
                                         (mappings2)
                                         (proxy)
                                     ))
                                    (reduce (proxy => value => (
                                               neue
                                                 (reject)
                                                 (value => mappings => proxy => proxy)
                                                 (env)
                                                 (typeInfo)
                                                 (index)
                                                 ([...path, '$1'])
                                                 ($1)
                                                 (value)
                                                 (mappings2)
                                                 (proxy)
                                             ))
                                            (proxy)
                                            (_1 (value)))
                                    (_2 (value))
                           ),
                         })
                       ))
                      (proxy)
                      (types));
  },
  Unknown: resolve,
});

const NullaryType = name => url => supertypes => test2 => Constructor (cases => cases.NullaryType (name) (url) (supertypes) (test2));

const UnaryType = name => url => supertypes => test2 => _1 => $1 => Constructor (cases => cases.UnaryType (name) (url) (supertypes) (test2) (_1) ($1));

const BinaryType = name => url => supertypes => test2 => _1 => _2 => $1 => $2 => Constructor (cases => cases.BinaryType (name) (url) (supertypes) (test2) (_1) (_2) ($1) ($2));

const EnumType = name => url => members => Constructor (cases => cases.EnumType (name) (url) (members));

const TypeVariable = name => Constructor (cases => cases.TypeVariable (name));

const UnaryTypeVariable = name => $1 => Constructor (cases => cases.UnaryTypeVariable (name) ($1));

const BinaryTypeVariable = name => $1 => $2 => Constructor (cases => cases.BinaryTypeVariable (name) ($1) ($2));

const Function_ = types => Constructor (cases => cases.Function (types));

const RecordType = fields => Constructor (cases => cases.RecordType (fields));

const NamedRecordType = name => url => supertypes => fields => Constructor (cases => cases.NamedRecordType (name) (url) (supertypes) (fields));

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

const Fn = $1 => $2 => Function_ ([$1, $2]);

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
        index_ === index ? format (t) (_) (k => k === '$1' ? f : _) : _ (s)
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
const typeVarNames = cata ({
  NoArguments: {},
  Unchecked: _ => ({}),
  Inconsistent: {},
  NullaryType: _ => _ => _ => _ => ({}),
  EnumType: _ => _ => _ => ({}),
  UnaryType: _ => _ => _ => _ => _ => $1 => typeVarNames ($1),
  BinaryType: _ => _ => _ => _ => _ => _ => $1 => $2 => Z.concat (typeVarNames ($1), typeVarNames ($2)),
  Function: types => Z.foldMap (Object, typeVarNames, types),
  RecordType: fields => Z.foldMap (Object, typeVarNames, fields),
  NamedRecordType: _ => _ => _ => fields => Z.foldMap (Object, typeVarNames, fields),
  TypeVariable: name => ({[name]: 0}),
  UnaryTypeVariable: name => $1 => Z.concat ({[name]: 1}, typeVarNames ($1)),
  BinaryTypeVariable: name => $1 => $2 => Z.concat ({[name]: 2}, Z.concat (typeVarNames ($1), typeVarNames ($2))),
  Unknown: {},
});

//    showTypeWith :: Array Type -> Type -> String
const showTypeWith = types => {
  const names = Object.keys (Z.foldMap (Object, typeVarNames, types));
  return t => {
    let code = 'a'.charCodeAt (0);
    return cataDefault (I)
                       ({Function: _ => parenthesize (I)})
                       (t)
                       (show (t)
                        .replace (/\bUnknown\b/g, () => {
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
  index,
  path,
  mappings,
  proxy,
  values,         // :: Array Any
  pos             // :: Integer
) => {
  const showType = showTypeWith (typeInfo.types);
  return show (pos) + ')  ' + joinWith ('\n    ', Z.map (x => (
    show (x) +
    ' :: ' +
    joinWith (', ',
              or (Z.map (showType,
                         determineActualTypesLoose (env, typeInfo, index, path, mappings, proxy, [x])),
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

        return neue
          (error => { throw toError (error); })
          (value => mappings => proxy => value)
          (opts.env)
          (typeInfo)
          (0)
          ([])
          (types[0])
          (impl ())
          ({types: name => { throw new Error ('XXX'); }})
          (nil);
      };
      const signature = typeSignature (typeInfo);
      wrapped[inspect] = wrapped.toString = () => signature;
      return wrapped;
    }

    return types
    .slice (0, -1)
    .reduceRight
      ((cont, input, index) => mappings => proxy => f => {
         const wrapped = (_x, ...rest) => {
           if (rest.length > 0) {
             throw invalidArgumentsCount (typeInfo, index, 1, [_x, ...rest]);
           }
           return neue
             (error => { throw toError (error); })
             (value => mappings => proxy => cont (mappings) (proxy) (f (value)))
             (opts.env)
             (typeInfo)
             (index)
             ([])
             (input)
             (_x)
             (mappings)
             (proxy.right = {values: nil, left: proxy, right: null});
         };
         const signature = typeSignature (typeInfo);
         wrapped[inspect] = wrapped.toString = () => signature;
         return wrapped;
       },
       mappings => proxy => value => {
         const index = types.length - 1;
         return neue
           (error => { throw toError (error); })
           (value => mappings => proxy => value)
           (opts.env)
           (typeInfo)
           (index)
           ([])
           (types[index])
           (value)
           (mappings)
           ({values: nil, left: proxy, right: null});
       })
      ({types: name => (arity_ => Z.filter (t => arity (t) >= arity_, opts.env))
                       ((Z.foldMap (Object, typeVarNames, types))[name])})
      ({values: nil, left: null, right: null})
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

$.test = def ('test') ({}) ([$.Array ($.Type), $.Type, $.Any, $.Boolean]) (env => t => x => {
  const typeInfo = {name: 'name', constraints: {}, types: [t]};
  const mappings = {
    types: name => (arity_ => Z.filter (t => arity (t) >= arity_, env))
                   ((Z.foldMap (Object, typeVarNames, typeInfo.types))[name]),
  };
  const proxy = {values: nil, left: null, right: null};
  return (satisfactoryTypes (env, typeInfo, {}, t, 0, [], mappings, proxy, [x])).isRight;
});

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
    (name => url => supertypes => test2 => _1 => (
       def (name) ({}) ([$.Type, $.Type]) (UnaryType (name) (url) (supertypes) (test2) (_1))));

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
    (name => url => supertypes => test2 => _1 => _2 => (
       def (name) ({}) ([$.Type, $.Type, $.Type]) (BinaryType (name) (url) (supertypes) (test2) (_1) (_2))));
