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
var ParserL1 = pr.ParserL1;
var Eos = pr.Eos;
var Nothing = pr.Nothing;

/**
 * 
 */
it('ParserL1 - simple', function(){

	var text = "love(mercedes).\n";
	
	var l = new Lexer(text);
	var result = l.get_token_list();
	
	var t = new ParserL1(result);
	
	var tresult = t.get_token_list();
	
	var expected_list = [
	                     //new Token('parens_open', null, 4),
	                     new Token('functor', 'love', 0),
	                     new Token('term', 'mercedes', 5),
	                     new Token('parens_close', null, 13),
	                     //new Token('op:rule', null, 0),
	                     //new Token('term', 'true', 0),
	                     new Token('period', null, 14),
	                     new Token('newline', null, 15)
	                     ];
	
	var check = Token.check_for_match(tresult, expected_list);
	
	should.equal(check, true);
});

it('ParserL1 - simple - no convert fact', function(){

	var text = "love(mercedes).\n";
	
	var l = new Lexer(text);
	var result = l.get_token_list();
	
	var t = new ParserL1(result, {convert_fact: false});
	
	var tresult = t.get_token_list();
	
	var expected_list = [
	                     //new Token('parens_open', null, 4),
	                     new Token('functor', 'love', 0),
	                     new Token('term', 'mercedes', 5),
	                     new Token('parens_close', null, 13),
	                     //new Token('op:rule', null, 0),
	                     //new Token('term', 'true', 0),
	                     new Token('period', null, 14),
	                     new Token('newline', null, 15)
	                     ];
	
	var check = Token.check_for_match(tresult, expected_list);
	
	should.equal(check, true);
});


it('ParserL1 - remove whitespaces', function(){

	var text = " 	love(mercedes).	\n";
	
	var l = new Lexer(text);
	var result = l.get_token_list();
	
	var t = new ParserL1(result, {convert_fact: false});
	
	var tresult = t.get_token_list();
	
	var expected_list = [
	                     //new Token('parens_open', null, 4),
	                     new Token('functor', 'love', 0),
	                     new Token('term', 'mercedes', 5),
	                     new Token('parens_close', null, 13),
	                     //new Token('op:rule', null, 0),
	                     //new Token('term', 'true', 0),
	                     new Token('period', null, 14),
	                     new Token('newline', null, 15)
	                     ];
	
	var check = Token.check_for_match(tresult, expected_list);
	
	should.equal(check, true);
});


it('ParserL1 - var - 1', function(){

	var text = "X=Y.\n";

	var expected_list = [
	                     //new Token('parens_open', null, 4),
	                     new Token('var',     'X'),
	                     new Token('op:unif', '='),
	                     new Token('var',     'Y'),
	                     new Token('period',   null),
	                     new Token('newline',  null)
	                     ];
	
	var l = new Lexer(text);
	var list = l.get_token_list();

	var t = new ParserL1(list, {convert_fact: false});
	var tresult = t.get_token_list();
	
	var check = Token.check_for_match(tresult, expected_list);
	
	//console.log(tresult);
	should.equal(check, true);
});
