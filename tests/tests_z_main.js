/*
 * prolog.js test cases
 * 
 * @author: jldupont
 */

var should = require('should');
//var util   = require('util');

var pr = require("../prolog.js");

var Functor = pr.Functor;
var Utils = pr.Utils;
var Var = pr.Var;
var Token = pr.Token;

var Prolog = pr.Prolog;
var ParseSummary = pr.ParseSummary;

var ErrorUnexpectedEnd = pr.ErrorUnexpectedEnd;
var ErrorSyntax = pr.ErrorSyntax;
var ErrorInvalidFact = pr.ErrorInvalidFact;

var setup = function(text) {

	//Functor.inspect_compact_version = false;
	Functor.inspect_short_version = false;

	return Prolog.parse_per_sentence(text);
};

/*
var dump_result = function(result) {
	for (var index=0; index<result.length; index++)
		console.log( util.inspect( result[index] ) );
};
*/

function _test(text, expected, options) {

	options = options || {};

	var parsed_result = setup(text);

	if (options.show_parsed)
		console.log("-- Parsed: ", parsed_result);

	if (parsed_result.sentences.length != expected.length)
		return false;

	for (var index=0; index<expected.length; index++) {
		
		var expect = expected[index];
		var res    = parsed_result.sentences[index];

		//console.log("Res  ", res);
		//console.log("Expect ",expect);
		
		if (res.maybe_error == null)
			if (expect.maybe_error != null) {
				return false;
			} else
				continue;
		
		
		if (res.maybe_error != null) {
			if (expect.maybe_error == null)
				return false;
		
		//console.log(res.maybe_error.classname, expect.maybe_error.classname);	
			
			//console.log(JSON.stringify(res.maybe_error));
			return res.maybe_error.classname == expect.maybe_error.classname;
		}
		
		if (!Utils.compare_objects(res.maybe_token_list, expect))
			return false;
			
	}	
	return true;
}

function test(text, expected, options) {
	
	should.ok( _test(text, expected, options) );
}

function test_compile(text, expected, options) {
	
	options = options || {};

	var parsed_result = setup(text);

	if (options.show_parsed)
		console.log("-- Parsed: ", parsed_result);
	
	var result = Prolog.compile_per_sentence(parsed_result);
	
	//console.log(result);
}

// --------------------------------------------------------------- TESTS

it('Main - simple - 1', function() {
	
	//console.log("\n---- Main - simple - 1\n\n");
	
	var text = 'f(1). f(2).';

	test(text, [
		 new ParseSummary(null, new Functor('f', 1))
		,new ParseSummary(null, new Functor('f', 2))
	], {show_parsed : false });	
});

it('Main - simple - 2', function() {
	
	//console.log("\n---- Main - simple - 2\n\n");
	
	var text =  '"""comment"""\n'
				+'f(1). f(2).';

	test(text, [
		 new ParseSummary(null, new Functor('f', 1))
		,new ParseSummary(null, new Functor('f', 2))
	], {show_parsed : false });	
});


it('Main - error - 1', function() {
	
	//console.log("\n---- Main - error - 1\n\n");
	
	var text = 'f(1. [1,2.';
	
	test(text, [
		 new ParseSummary(new ErrorUnexpectedEnd())
		,new ParseSummary(new ErrorUnexpectedEnd())
	], {show_parsed: false});	
});

it('Main - error - 2', function() {
	
	//console.log("\n---- Main - error - 3\n\n");
	
	var text = 'f(1) (f2).';
	
	test(text, [
		 new ParseSummary(new ErrorSyntax())
	], {show_parsed: false});	
});

it('Main - error - 3', function() {
	
	//console.log("\n---- Main - error - 3\n\n");
	
	var text =  'f(a).\n'
				+'f(b).\n'
				+'[1,2] [3,4]';
	
	test(text, [
		 new ParseSummary(null, new Functor('f', 'a'))
		,new ParseSummary(null, new Functor('f', 'b'))
		,new ParseSummary(new ErrorSyntax())
	], {show_parsed: false});	
});

it('Main - error - 4', function() {
	
	//console.log("\n---- Main - error - 4\n\n");
	
	var text =  'f(a), f(b).\n';
	
	test(text, [
		new ParseSummary(new ErrorInvalidFact())
	], {show_parsed: false});	
});


it('Main - error - 5', function() {
	
	//console.log("\n---- Main - error - 5\n\n");
	
	var text =  'x is 2.';
	
	test_compile(text, [
		new ParseSummary(new ErrorInvalidFact())
	], {show_parsed: false});	
});

it('Main - query - 1', function() {
	
	var text =  '?- f(X).';
	
	test(text, [
		new ParseSummary(null, new Functor("query", new Functor("f", new Var("X"))))
	], {show_parsed: false});	
	
});


it('Main - other operators - not', function() {
	
	//console.log("\n---- Main - other operators - not\n\n");
	
	var text =  'not true.';
	
	test_compile(text, [
		new ParseSummary(null, new Functor('not', new Token('boolean')))
	], {show_parsed: false});	
});

