/*
 * prolog.js test cases
 * 
 * @author: jldupont
 */

var should = require('should');
var assert = require('assert');

var pr = require("../prolog.js");

var Lexer = pr.Lexer;
var Token = pr.Token;
var OpNode = pr.OpNode;
var Functor = pr.Functor;
var Op = pr.Op;

var ParserL1 = pr.ParserL1;
var ParserL2 = pr.ParserL2;
var ParserL3 = pr.ParserL3;


var setup = function(text) {

	var l = new Lexer(text);
	var tokens = l.get_token_list();

	var t = new ParserL1(tokens);
	var ttokens = t.get_token_list();
	
	var p = new ParserL2(ttokens, 0);
	
	var result = p.process();
	var terms = result.terms;
	
	return terms;
};


/**
 */
it('ParserL3 - simple ', function(){
	
	var text = "A+B+C.";
	
	var expressions = setup(text);
	
	var p = new ParserL3(expressions, Op.ordered_list_by_precedence);
	
	var r = p.process();
	
	console.log(r);
});

