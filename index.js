/* global define, self */

;(function(f) {

  'use strict';

  /* istanbul ignore else */
  if (typeof module !== 'undefined') {
    module.exports = f(require('ramda'));
  } else if (typeof define === 'function' && define.amd != null) {
    define(['ramda'], f);
  } else {
    self.def = f(self.R);
  }

}(function(R) {

  'use strict';

  var _ = R.__;

  //  placeholder :: a -> Boolean
  var placeholder = function(x) {
    return x != null && x['@@functional/placeholder'] === true;
  };

  var cardinals = [
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
    'ten'
  ];

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
    'ninth',
    'tenth'
  ];

  //  functionName :: Function -> String
  var functionName = R.compose(R.nth(1), R.match(/^function (\w*)/), String);

  //  typeName :: TypeRep a -> String
  var typeName = function(type) {
    return R.type(type.name) === 'String' ? type.name : functionName(type);
  };

  var formatters = {
    '{}': R.identity,
    '{#args}': function(n) {
      return (n <= 10 ? cardinals[n] : String(n)) + ' ' +
             (n === 1 ? 'argument' : 'arguments');
    },
    '{a/an}': function(s) {
      return (R.test(/^[aeiou]/i, s) ? 'an' : 'a') + ' ' + s;
    },
    '{ord}': R.nth(_, ordinals),
    '{quote}': function(s) { return '\u2018' + s + '\u2019'; },
    '{repr}': R.toString,
    '{type}': typeName
  };

  //  format :: String -> [*] -> String
  var format = R.curry(function(template, values) {
    var idx = -1;
    return template.replace(/[{].*?[}]/g, function(match) {
      return formatters[match](values[idx += 1]);
    });
  });

  //  _type :: a -> String
  var _type = function(x) {
    return x != null && R.type(x['@@type']) === 'String' ? x['@@type']
                                                         : R.type(x);
  };

  //  is :: (TypeRep a, b) -> Boolean
  var is = function(type, x) {
    return (
      x == null ?
        false :
      R.type(type.test) === 'Function' ?
        type.test(x) :
      R.type(type.prototype['@@type']) === 'String' ?
        x['@@type'] === type.prototype['@@type'] :
      // else
        R.type(x) === functionName(type)
    );
  };

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
      n === 9 ?
        function($1, $2, $3, $4, $5, $6, $7, $8, $9) {
          return f.apply(this, arguments);
        } :
      // else
        function($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) {
          return f.apply(this, arguments);
        }
    );
  };

  //  curry :: (String, {TypeClass}, [TypeRep *], [*], Function) -> Function
  var curry = function(name, typeclasses, types, _values, f) {
    return arity(R.filter(placeholder, _values).length, function() {
      var values = _values;  // Locally scoped variable to update.

      //  The indexes of the parameters yet to be provided. For example,
      //  ternary(R.__, 'bar') awaits its first and third parameters, so
      //  paramIndexes would be [0, 2] in this case.
      var paramIndexes = [];
      for (var idx = 0; idx < values.length; idx += 1) {
        if (placeholder(values[idx])) {
          paramIndexes.push(idx);
        }
      }

      if (arguments.length > paramIndexes.length) {
        throw new TypeError(format(
          '{quote} requires {#args}; received {#args}',
          [name,
           values.length,
           values.length + arguments.length - paramIndexes.length]
        ));
      }

      for (var argIndex = 0; argIndex < arguments.length; argIndex += 1) {
        var argument = arguments[argIndex];
        var paramIndex = paramIndexes[argIndex];
        var type = types[paramIndex];
        var _typeName = typeName(type);

        if (placeholder(argument)) {
          continue;
        } else if (R.test(/^[a-z]$/, _typeName)) {
          if (R.has(_typeName, typeclasses) &&
              !typeclasses[_typeName].test(argument)) {
            throw new TypeError(format(
              '{quote} requires {a/an} as its {ord} argument; received {repr}',
              [name, typeclasses[_typeName].name, paramIndex, argument]
            ));
          }
          for (idx = 0; idx < values.length; idx += 1) {
            var val = values[idx];
            if (types[idx] === type && !placeholder(val) &&
                _type(val) !== _type(argument)) {
              throw new TypeError(format(
                '{quote} requires its {ord} and {ord} arguments ' +
                'to be of the same type; {repr} and {repr} are not',
                paramIndex > idx ? [name, idx, paramIndex, val, argument]
                                 : [name, paramIndex, idx, argument, val]
              ));
            }
          }
        } else if (!is(type, argument)) {
          throw new TypeError(
            R.type(type.format) === 'Function' ?
              type.format({argument: argument,
                           name: name,
                           position: ordinals[paramIndex],
                           type: type}) :
              format('{quote} requires a value of type {type} ' +
                     'as its {ord} argument; received {repr}',
                     [name, type, paramIndex, argument])
          );
        }
        values = R.update(paramIndex, argument, values);
      }

      var args = R.reject(placeholder, values);
      return args.length === values.length ?
        f.apply(this, args) :
        curry(name, typeclasses, types, values, f);
    });
  };

  var _def = function(name, typeclasses, types, f) {
    if (types.length > 10) {
      throw new RangeError(format(
        '{quote} cannot define a function with arity greater than ten',
        ['def']
      ));
    }
    var placeholders = R.map(function() { return _; }, types);
    return curry(name, typeclasses, types, placeholders, f);
  };

  var def = _def('def', {}, [String, Object, Array, Function], _def);

  def.is = is;

  def.types = R.pipe(
    R.map(R.invoker(0, 'charCodeAt')),
    R.adjust(R.inc, 1),
    R.apply(R.range),
    R.map(String.fromCharCode),
    R.map(R.lift(R.pair)(R.identity, R.objOf('name'))),
    R.fromPairs
  )(['a', 'z']);

  return def;

}));
