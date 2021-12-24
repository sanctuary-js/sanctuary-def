'use strict';

// process.env.NODE_ENV === 'production';

const $ = require ('.');

//    $DateIso :: NullaryType
const $DateIso = (
  $.NullaryType ('DateIso')
                ('https://www.w3.org/QA/Tips/iso-date')
                ([$.String])
                (x => /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[1-2]\d|3[0-1])$/.test (x))
);

const model1 = $.RecordType ({
  date: $DateIso
});

const model2 = $.RecordType ({
  date: $.NonEmpty ($DateIso),
  bool: $.Boolean,
});

const log = x => console.debug (x);

// const valid   = $.validate ($.Undefined) (undefined);
// const invalid = $.validate ($.Undefined) (1);

// const valid   = $.validate (model1) ({date:'2020-04-10'});
// const invalid = $.validate (model1) ({date:'2020-04-100'});

const valid   = $.validate (model2) ({date:'2020-04-10', bool: false});
// const invalid = $.validate (model2) ({date:'2020-04-100', bool: 'false'});
const invalid = $.validate (model2) ({date:'2020-04-10', bool: 'foobar'});

// expType.validate :: a -> Right a
// expType.validate (env) ('2020-04-10') -> Right ('2020-04-10')
//
// Array (Right ({ types: Array (expType.validate) }))
valid.forEach (log);
invalid.forEach (log);

// Array (Left Error)
// invalid.map (either => either.value)
// 			 .forEach (log);


// testLogModel ();
// testLogDateIso ();

function testLogModel () {
	log (
		$.test ([]) (model1) ({date:'2020-04-10'})
	);
	log (
		$.test ([]) (model1) ({date:'2020-04-100'})
	);
}

function testLogDateIso () {
	log (
		$.test ([]) ($DateIso) ('2020-04-10')
	);
	log (
		$.test ([]) ($DateIso) ('2020-04-100')
	);
	log (
		$.test ([]) ($DateIso) (2020)
	);
	log (
		$.test ([]) ($DateIso) (new Date ('2020-04-10').toLocaleDateString('se'))
	);
	log (
		$.test ([]) ($DateIso) (new Date ('2020-04-10'))
	);
}