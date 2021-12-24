'use strict';

const $ = require ('.');
const show = require ('sanctuary-show')

//    $DateIso :: NullaryType
const $DateIso = (
  $.NullaryType ('DateIso')
                ('https://www.w3.org/QA/Tips/iso-date')
                ([$.String])
                (x => /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[1-2]\d|3[0-1])$/.test (x))
);

const model = $.RecordType ({
  date: $.NonEmpty ($DateIso)
});

const log = console.debug;

const valid   = $.validate ([]) (model) ({date:'2020-04-10'});
const invalid = $.validate ([]) (model) ({date:'2020-04-100'});

log (
	valid
	// expType.validate :: a -> Right a
	// expType.validate (env) ('2020-04-10') -> Right ('2020-04-10')
	//
	// Right ({ types: Array (expType.validate) })
);

log (
	invalid.value
	//
);

// testLogModel ();
// testLogDateIso ();


function testLogModel () {
	log (
		$.test ([]) (model) ({date:'2020-04-10'})
	);
	log (
		$.test ([]) (model) ({date:'2020-04-100'})
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