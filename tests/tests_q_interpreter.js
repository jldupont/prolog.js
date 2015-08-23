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
var ParserL4 = pr.ParserL4;


var setup = function(text) {

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

var process = function(input_text, expected, left_to_right) {
	
	var expression = setup(input_text)[0][0];

	var i = new ParserL4(expression);
	
	i.dir_left_to_right = left_to_right || false;
	
	var ri = i.process();
	
	var result = compare(ri, expected);
	
	should.equal(result, true, "Got: " + util.inspect(ri));
};

var compare = function(input, expected) {
	
	if (input.length != expected.length)
		return false;
	
	for (var index=0;index<expected.length;index++) {
		
		var i = input[index];
		var re = expected[index];
		
		var ri = util.inspect(i, {depth: null});
		if (ri!=re)
			return false;
	};
	
	return true;
};

