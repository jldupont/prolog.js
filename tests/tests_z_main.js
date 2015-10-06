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

var ParserL1 = pr.ParserL1;
var ParserL2 = pr.ParserL2;
var ParserL3 = pr.ParserL3;

var Prolog = pr.Prolog;


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

it('Main - simple - 1', function() {
	
	console.log("\n---- Main - simple - 1\n\n");
	
	var text = 'f(1). f(2).';
	
	var result = setup(text);
	
	dump_result(result);
	
	should.ok(true, false);
});

it('Main - error - 1', function() {
	
	console.log("\n---- Main - error - 1\n\n");
	
	var text = 'f(1. [1,2.';
	
	var result = setup(text);
	
	dump_result(result);
	
	should.ok(true, false);
});
