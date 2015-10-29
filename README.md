# sanctuary-def

sanctuary-def is a single-purpose package for defining strict, curried
JavaScript functions.

Requiring the package provides access to a function which is conventionally
named `def`:

```javascript
const def = require('sanctuary-def');
```

`def` takes four arguments:

  - a name;
  - a mapping from type variable name to type class;
  - a list of [type representatives][1]; and
  - a function.

For example:

```javascript
//    add :: Number -> Number -> Number
const add = def('add', {}, [Number, Number], (a, b) => a + b);
```

`add(2, 2)` evaluates to `4` as expected.

### Currying

`def` returns a curried function. `add(2, 2)` and `add(2)(2)` both evaluate
to `4`. This enables other functions to be defined via partial application.
For example:

```javascript
//    inc :: Number -> Number
const inc = add(1);
```

`inc(42)` evaluates to `43`.

### Placeholders

[Ramda][2] and [Sanctuary][3] functions accept [placeholders][4] which enable
partial application even when parameters are in the "wrong" order. Functions
returned by `def` behave the same way. For example:

```javascript
//    concat :: String -> String -> String
const concat = def('concat', {}, [String, String], (a, b) => a + b);

//    exclaim :: String -> String
const exclaim = concat(R.__, '!');
```

`exclaim('land ahoy')` evaluates to `'land ahoy!'`.

### Strict arity

Functions returned by `def` throw when applied to too many arguments, rather
than silently ignoring the extra arguments. Function application works this
way in many dynamically typed languages, but not in JavaScript unfortunately.

### Type checking

```javascript
const f = def('f', typeclasses, types, _f);
```

`_f` will only be invoked if `f` receives the correct number of arguments of
the correct types (as specified by `types`, the list of type representatives).

The `add` function defined earlier will throw if applied to a non-Number.
For example:

```javascript
add('foo', 'bar');
// ! TypeError: ‘add’ requires a value of type Number as its first argument; received "foo"
```

Type checking is performed as arguments are provided (rather than once all
arguments have been provided), so type errors are reported early. For example:

```javascript
add('foo');
// ! TypeError: ‘add’ requires a value of type Number as its first argument; received "foo"
```

### Custom types

sanctuary-def does not use `instanceof` checks, as they are unacceptably
fragile (see [plaid/sanctuary#100][5]). It's thus necessary to provide some
mechanism other than constructor identity to determine whether a value is a
member of a custom type. This is achieved through the use of a `'@@type'`
property, which should use the form `'<package-name>/<type-name>'`, where
`<package-name>` is the name of the npm package in which the type is defined.
For example:

```javascript
function Gizmo(name) { this.name = name; }
Gizmo.prototype['@@type'] = 'gadgets/Gizmo';

//    gizmoName :: Gizmo -> String
const gizmoName = def('gizmoName', {}, [Gizmo], gizmo => gizmo.name);

gizmoName(new Gizmo('thingamajig'));  // => 'thingamajig'
```

`gizmoName` requires an argument of type `Gizmo`. `new Gizmo('thingamajig')`
is determined to be a member of this type due to this equivalence:

```javascript
new Gizmo('thingamajig')['@@type'] === Gizmo.prototype['@@type']
```

### Custom pseudotypes

A type is essentially a set of values. Sometimes one wishes to define a type
without creating a corresponding constructor function. These are referred to
as pseudotypes in the Sanctuary world. JavaScript does not provide an Integer
type, for example, but one could define an Integer pseudotype by defining the
subset of Number values which are integers within the precisely representable
range:

```javascript
//    Integer :: { name :: String, test :: a -> Boolean }
const Integer = {
  name: 'Integer',
  test: x => Object.prototype.toString.call(x) === '[object Number]' &&
             Math.floor(x) === Number(x) &&
             x >= Number.MIN_SAFE_INTEGER &&
             x <= Number.MAX_SAFE_INTEGER,
};

const even = def('even', {}, [Integer], x => x % 2 === 0);

even(100);  // => true
even(123);  // => false
even(0.5);  // ! TypeError: ‘even’ requires a value of type Integer as its first argument; received 0.5
```

A pseudotype definition is of type `{ name :: String, test :: a -> Boolean }`.

### Type variables

Polymorphism is powerful. It would be very limiting indeed to not be able to
define a function for all types: one couldn't even define `identity`!

One might want to define a `concat` function which concatenates two values of
any one type which provides a `concat` method. `concat([1, 2, 3], [4, 5, 6])`
should evaluate to `concat([1, 2, 3, 4, 5, 6])`; `concat('abc', 'def')` should
evaluate to `'abcdef'`. It's nonsensical, though, to concatenate values of
different types, so both arguments must be of the same type:

```javascript
const a = def.types.a;

//    concat :: a -> a -> a
const concat = def('concat', {}, [a, a], (x, y) => x.concat(y));
```

### Type classes

The type of the `concat` function defined above is misleading: it suggests
that it can operate on two values of *any* one type. In fact, the type must
provide a `concat` method. In [Fantasy Land][6] terms, the type must have a
[semigroup][7].

In Haskell one would use a type class to express this constraint:

```haskell
concat :: Semigroup a => a -> a -> a
```

One can express this constraint by first defining the Semigroup type class,
then specifying that `a` must satisfy the type class's `test` function (by
providing `{a: Semigroup}` as the second argument to `def`):

```javascript
//    Semigroup :: { name :: String, test :: a -> Boolean }
const Semigroup = {
  name: 'Semigroup',
  test: x => x != null && typeof x.concat === 'function',
};

//    concat :: Semigroup a => a -> a -> a
const concat = def('concat', {a: Semigroup}, [a, a], (x, y) => x.concat(y));
```


[1]: https://github.com/plaid/sanctuary#type-representatives
[2]: http://ramdajs.com/
[3]: https://github.com/plaid/sanctuary
[4]: http://ramdajs.com/docs/#__
[5]: https://github.com/plaid/sanctuary/issues/100
[6]: https://github.com/fantasyland/fantasy-land
[7]: https://github.com/fantasyland/fantasy-land#semigroup
