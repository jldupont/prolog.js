/*
 * prolog.js test cases
 * 
 * @author: jldupont
 */

var should = require('should');
var assert = require('assert');
var util   = require('util');

var pr = require("../prolog.js");

var Lexer = pr.Lexer;
var Token = pr.Token;
var OpNode = pr.OpNode;
var Functor = pr.Functor;
var Op = pr.Op;
var Utils = pr.Utils;

var ParserL1 = pr.ParserL1;
var ParserL2 = pr.ParserL2;
var ParserL3 = pr.ParserL3;

var Prolog = pr.Prolog;
var ParseSummary = pr.ParseSummary;

var ErrorUnexpectedEnd = pr.ErrorUnexpectedEnd;


var setup = function(text) {

	//Functor.inspect_compact_version = false;
	Functor.inspect_short_version = false;

	var result = Prolog.parse_per_sentence(text);
	
	return result;
};

var dump_result = function(result) {
	for (var index=0; index<result.length; index++)
		console.log( util.inspect( result[index] ) );
};

function _test(text, expected, options) {

	options = options || {};

	var parsed_result = setup(text);

	if (options.show_parsed)
		console.log("-- Parsed: ", parsed_result);

	if (parsed_result.length != expected.length)
		return false;

	for (var index=0; index<expected.length; index++) {
		
		var expect = expected[index];
		var res    = parsed_result[index];

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
			
				
			return res.maybe_error.classname == expect.maybe_error.classname;
		}
		
		if (!Utils.compare_objects(res.maybe_token_list, expect))
			return false;
			
	}	
	return true;
};

function test(text, expected, options) {
	
	should.ok( _test(text, expected, options) );
};

it('Main - simple - 1', function() {
	
	//console.log("\n---- Main - simple - 1\n\n");
	
	var text = 'f(1). f(2).';

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
