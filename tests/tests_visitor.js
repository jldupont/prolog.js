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

Functor.inspect_short_version = true;
Token.inspect_quoted = true;

var setup = function(text) {

	Functor.inspect_short_version = true;
	Functor.inspect_quoted = true;
	
	Token.inspect_quoted = true;
	
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

var process = function(input_text, expecteds, left_to_right) {
	
	var expressions = setup(input_text);
	
	var results = [];
	
	//console.log(expressions);
	
	for (var index = 0; index<expressions.length; index++) {
		
		var expression = expressions[index];
		
		if (!expression)
			return false;
		
		var cb = function(ctx){
			results.push(ctx);
		};
		
		//console.log("Expression: ", expression[0]);
		
		var i = new Visitor(expression[0], cb);
		
		i.process();
	};
	
	//console.log(results);
	
	for (var index=0; index < results.length; index++) {
		
		var ri = results[index];
		var expected = expecteds[index];
		
		var result = compare(ri, expected);
		should.equal(result, true, "expected: " + util.inspect(results));
	};


};

var compare = function(input, expected) {
	
	if (!expected)
		return false;
	
	if (input.length != expected.length)
		return false;
	
	for (var index=0;index<expected.length;index++) {
		
		var i = input[index];
		var re = expected[index];
		
		//console.log("i: ", i, " re: ", re);
		
		//var ri = util.inspect(i, {depth: null});
		if (i!=re)
			return false;
	};
	
	return true;
};


it('Visitor - basic - 1', function(){
	
	var text = "f1(a,f2(f3( f4(b,c) ,d), e),f).";
	var expected = [
{ vc: 0, n: 'Functor(f1/3)', d: 0, is_struct: true },
{ vc: 0, n: 'Token(term,a)', d: 0, i: 0, is_arg: true },
{ vc: 1, n: 'Functor(f2/2)', d: 0, i: 1, is_arg: true },
{ vc: 2, n: 'Functor(f2/2)', d: 1, is_struct: true },
{ vc: 2, n: 'Functor(f3/2)', d: 1, i: 0, is_arg: true },
{ vc: 3, n: 'Functor(f3/2)', d: 2, is_struct: true },
{ vc: 3, n: 'Functor(f4/2)', d: 2, i: 0, is_arg: true },
{ vc: 4, n: 'Functor(f4/2)', d: 3, is_struct: true },
{ vc: 4, n: 'Token(term,b)', d: 3, i: 0, is_arg: true },
{ vc: 5, n: 'Token(term,c)', d: 3, i: 1, is_arg: true },
{ vc: 6, n: 'Token(term,d)', d: 2, i: 1, is_arg: true },
{ vc: 7, n: 'Token(term,e)', d: 1, i: 1, is_arg: true },
{ vc: 8, n: 'Token(term,f)', d: 0, i: 2, is_arg: true }	                
	                 ];
	
	process(text, expected);
});


