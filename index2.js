'use strict';

const assert = require ('assert');

const {Left, Right} = require ('sanctuary-either');
const show = require ('sanctuary-show');
const Z = require ('sanctuary-type-classes');


const $ = {};

const I = x => x;

const K = x => y => x;

const log = (...args) => {
  console.log (...args);
};

//    reduce :: (b -> a -> b) -> b -> Array a -> b
const reduce = f => y => xs => xs.reduce ((y, x) => f (y) (x), y);

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

$.Unknown = {
  type: 'UNKNOWN',
  name: '',
  url: '',
  supertypes: [],
  arity: 0,
  types: {},
  _test: K (K (true)),
  format: (outer, inner) => 'Unknown',
};

$.NullaryType = name => url => supertypes => test => ({
  type: 'NULLARY',
  name: name,
  url: url,
  supertypes: supertypes,
  arity: 0,
  types: {},
  _test: K (test),
  format: (outer, inner) => outer (name),
});

$.UnaryType = name => url => supertypes => test => _1 => $1 => ({
  type: 'UNARY',
  name: name,
  url: url,
  supertypes: supertypes,
  arity: 1,
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

$.BinaryType = name => url => supertypes => test => _1 => _2 => $1 => $2 => ({
  type: 'BINARY',
  name: name,
  url: url,
  supertypes: supertypes,
  arity: 2,
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

$.TypeVariable = name => ({
  type: 'VARIABLE',
  name: name,
  url: '',
  supertypes: [],
  arity: 0,
  types: {},
  _test: K (K (true)),
  format: (outer, inner) => name,
  new: env => x => {
    const these = types_ (x);
    if (name in env) {
      const ts = env[name].filter (t => these.includes (t));
      if (ts.length === 0) throw new TypeError (`Incompatible ${show (name)} types`);
      env[name] = ts;
    } else {
      env[name] = these;
    }
    return x;
  },
});

$.UnaryTypeVariable = name => $1 => ({
  type: 'VARIABLE',
  name: name,
  url: '',
  supertypes: [],
  arity: 1,
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

$.BinaryTypeVariable = name => $1 => $2 => ({
  type: 'VARIABLE',
  name: name,
  url: '',
  supertypes: [],
  arity: 2,
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

$.Function = types => ({
  type: 'FUNCTION',
  name: '',
  url: '',
  supertypes: [],
  arity: types.length,
  types: {$1: types[0], $2: types[1]},
  _test: K (K (true)),
  format: (outer, inner) => (
    when (types.length !== 2)
         (parenthesize (outer))
         ('TK') +
    outer (' -> ') +
    inner ('TK')
  ),
});

const a = $.TypeVariable ('a');
const b = $.TypeVariable ('b');

$.Number = Object.assign (
  $.NullaryType ('Number') ('url') ([]) (x => typeof x === 'number'),
  {
    new: env => x => {
      if (typeof x !== 'number') throw new TypeError (`Not a number: ${JSON.stringify (x)}`);
      return x;
    },
  }
);

$.String = Object.assign (
  $.NullaryType ('String') ('url') ([]) (x => typeof x === 'string'),
  {
    new: env => x => {
      if (typeof x !== 'string') throw new TypeError (`Not a string: ${JSON.stringify (x)}`);
      return x;
    },
  }
);

$.Array = $1 => (
  Object.assign (
    $.UnaryType ('Array') ('url') ([]) (Array.isArray) (I) ($1),
    {
      new: env => x => {
        if (!(Array.isArray (x))) throw new TypeError ('Not an array');

        x.forEach (x => { $1.new (env) (x); });

        return x;
      },
    }
  )
);

$.Fn = $1 => $2 => (
  Object.assign (
    $.Function ([$1, $2]),
    {
      new: env => f => {
        if (typeof f !== 'function') throw new TypeError ('Not a function');
        return x => {
          const i = $1.new (env) (x);
          log ('updateEnv 3', showEnv (env));
          const o = $2.new (env) (f (x));
          log ('updateEnv 4', showEnv (env));
          return o;
        };
      },
    }
  )
);

const def = name => constraints => types => {
  const [output, ...inputs] = Z.reverse (types.map (t => t.new));

  return reduce (run => input => _env => f => _x => {
                   const env = Object.assign (Object.create (_env), {_ts: nextInt ()});
                   const x = input (env) (_x);
                   log ('updateEnv 1', showEnv (env));
                   return run (env) (f (x));
                 })
                (env => _x => {
                   log ('updateEnv 2', showEnv (env));
                   return output (env) (_x);
                 })
                (inputs)
                (Object.assign (Object.create (null), {_ts: nextInt ()}));
};

/*****************************************************************************/

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
