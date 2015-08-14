/*
 * prolog.js test cases
 * 
 * @author: jldupont
 */

var should = require('should');
var assert = require('assert');

var pr = require("../prolog.js");

var Lexer = pr.Lexer;
var ParserL2 = pr.ParserL2;
var Token = pr.Token;
var Functor = pr.Functor;
var ParserL1 = pr.ParserL1;
var ParserL2 = pr.ParserL2;
var OpNode = pr.OpNode;

var setup = function(text, convert_fact) {

	var l = new Lexer(text);
	var tokens = l.get_token_list();

	var t = new ParserL1(tokens, {convert_fact: convert_fact});
	var ttokens = t.get_token_list();
	
	var p = new ParserL2(ttokens, 0);
	
	var result = p.process();
	var terms = result.terms;
	
	return terms;
};


/**
 */
it('ParserL3 - simple ', function(){
	
	
	
});

