'use strict';

const $  = require ('.');
const eq = require ('./test/internal/eq.js');
const {Left, Right} = require ('sanctuary-either');


//    FooBar :: Type
const FooBar = $.NamedRecordType
  ('FooBar')
  ('')
  ([])
  ({foo: $.String,
    bar: $.Number});

eq ($.validate ($.Undefined) (undefined))
	 ([Right (undefined)]);

eq ($.validate (FooBar) (null))
	 // null is not a member of ‘FooBar’
   ([Left ({"error": "WrongValue", "name": "$_", "type": "FooBar", "value": null})]);

eq ($.validate (FooBar) (undefined))
	 // undefined is not a member of ‘FooBar’
   ([Left ({"error": "WrongValue", "name": "$_", "type": "FooBar", "value": undefined})]);

eq ($.validate (FooBar) ({}))
	 // '"bar" field is missing', '"foo" field is missing'
   ([
		 Left ({"error": "WrongValue", "name": "$_", "type": "FooBar", "value": {}}),
		 Left ({"error": "MissingValue", "name": "bar", "type": "Number", "value": undefined}),
		 Left ({"error": "MissingValue", "name": "foo", "type": "String", "value": undefined})
		]);

eq ($.validate (FooBar) ({foo: null}))
	 // "bar" field is missing
   ([
		 Left ({"error": "WrongValue", "name": "$_", "type": "FooBar", "value": {"foo": null}}),
		 Left ({"error": "MissingValue", "name": "bar", "type": "Number", "value": undefined}),
		 Left ({"error": "WrongValue", "name": "foo", "type": "String", "value": null})
	 ]);

eq ($.validate (FooBar) ({foo: null, bar: null}))
	 // Value of "bar" field, null, is not a member of ‘Number’
   ([
		 Left ({"error": "WrongValue", "name": "$_", "type": "FooBar", "value": {"bar": null, "foo": null}}),
		 Left ({"error": "WrongValue", "name": "bar", "type": "Number", "value": null}),
		 Left ({"error": "WrongValue", "name": "foo", "type": "String", "value": null})
	 ]);

eq ($.validate (FooBar) ({foo: null, bar: 42}))
	 // Value of "foo" field, null, is not a member of ‘String’
   ([
		 Left ({"error": "WrongValue", "name": "$_", "type": "FooBar", "value": {"bar": 42, "foo": null}}),
		 Left ({"error": "WrongValue", "name": "foo", "type": "String", "value": null})
	 ]);

eq ($.validate (FooBar) ({foo: 'blue', bar: 42}))
   ([Right ({foo: 'blue', bar: 42})]);
