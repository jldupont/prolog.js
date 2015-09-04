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
var Visitor = pr.Visitor;
var Compiler = pr.Compiler;

var ErrorInvalidHead = pr.ErrorInvalidHead;


Functor.inspect_short_version = true;
Token.inspect_quoted = true;

var setup = function(text) {

	Functor.inspect_short_version = true;
	//Functor.inspect_quoted = true;
	
	//Token.inspect_quoted = true;
	
	var l = new Lexer(text);
	var tokens = l.process();

	var t = new ParserL1(tokens);
	var ttokens = t.process();
	
	var p = new ParserL2(ttokens);
	
	var result = p.process();
	var terms = result.terms;
	
	var p3 = new ParserL3(terms, Op.ordered_list_by_precedence);
	var r3 = p3.process();
	
	return r3;
};

var process_head = function(input_text, expecteds) {
	
	var expressions = setup(input_text);
	
	var results = [];
	
	//console.log(expressions);
	
	for (var index = 0; index<expressions.length; index++) {
		
		var expression = expressions[index];
		
		if (!expression)
			return false;

		var c = new Compiler();
		
		//console.log("Expression: ", expression);

		var result = c.process_head(expression);
		
		results.push(result);
	};
	
	console.log(results);
	
	if (expecteds.length!=results.length)
		return false;
	
	for (var index=0; index < results.length; index++) {
		
		var ri = results[index];
		var expected = expecteds[index];
		
		var result = compare(ri, expected);
		should.equal(result, true, "expected: " + util.inspect(results));
	};


};

var compare = function(input, expected) {

	//var ri = util.inspect(input, {depth: null});
	
	//console.log("Compare: input: ", input);
	//console.log("Compare: expected: ",expected);

	return isEquivalent(input, expected);
	
};

function isEquivalent(input, expected) {
	
	for (var key in expected) {
		
		var ri = ""+util.inspect(input[key]);
		var e  = ""+expected[key];
		
		//console.log("Key: ", key);
		//console.log("input: ",ri);
		//console.log("expected: ",e);
		
		if (ri != e)
			return false;
	}
	
    return true;
}

it('Compiler - check - 1', function(){
	
	var text = "f1(a), f2(b).";
	var expected = [
	                {}
	                 ];
	
	should.throws(function(){
		process_head(text, expected);	
	}, ErrorInvalidHead);
	
});


it('Compiler - basic - 1', function(){
	
	var text = "h1(a, h2( h3a(h3a), h3b(h3b), h3c(h3c)) ,z).";
	var expected = [
	                
	                 ];
	
	process_head(text, expected);
});


