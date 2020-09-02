'use strict';

const assert = require ('assert');

const {Left, Right} = require ('sanctuary-either');
const show = require ('sanctuary-show');
const Z = require ('sanctuary-type-classes');


const $ = module.exports = {};

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
      if (ts.length === 0) return Left (`Incompatible ${show (name)} types`);
      env[name] = ts;
    } else {
      env[name] = these;
    }
    return Right (x);
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

$.Object = Object.assign (
  $.NullaryType ('Object')
                ('https://github.com/sanctuary-js/sanctuary-def/tree/v0.22.0#Object')
                ([])
                (x => Object.prototype.toString.call (x) === '[object Object]'),
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

$.Fn = $1 => $2 => (
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

const def = name => constraints => types => {
  const [output, ...inputs] = Z.reverse (types);

  return reduce (run => input => _env => f => _x => {
                   const env = Object.assign (Object.create (_env), {_ts: nextInt ()});
                   const x = input.new (env) (_x);
                   if (x.isLeft) throw new TypeError (x.value);
                   log ('updateEnv 1', showEnv (env));
                   return run (env) (f (x.value));
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
