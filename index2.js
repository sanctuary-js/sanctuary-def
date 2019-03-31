'use strict';

const assert = require ('assert');

const {Left, Right} = require ('sanctuary-either');
const show = require ('sanctuary-show');
const Z = require ('sanctuary-type-classes');


const $ = {};

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

$.TypeVariable = name => ({
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

const a = $.TypeVariable ('a');
const b = $.TypeVariable ('b');

$.Number = {
  new: env => x => {
    if (typeof x !== 'number') throw new TypeError (`Not a number: ${JSON.stringify (x)}`);
    return x;
  },
};

$.String = {
  new: env => x => {
    if (typeof x !== 'string') throw new TypeError (`Not a string: ${JSON.stringify (x)}`);
    return x;
  },
};

$.Array = $1 => ({
  new: env => x => {
    if (!(Array.isArray (x))) throw new TypeError ('Not an array');

    x.forEach (x => { $1.new (env) (x); });

    return x;
  },
});

$.Fn = $1 => $2 => ({
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
});

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
