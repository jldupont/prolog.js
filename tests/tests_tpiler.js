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
var Tpiler = pr.Tpiler;
var Eos = pr.Eos;
var Nothing = pr.Nothing;

/**
 * 
 */
it('Tpiler - simple', function(){

	var text = "love(mercedes).\n";
	
	var l = new Lexer(text);
	var result = l.get_token_list();
	
	var t = new Tpiler(result);
	
	var tresult = t.get_token_list();
	
	var expected_list = [
	                     new Token('parens_open', null, 4),
	                     new Token('term', 'love', 0),
	                     new Token('term', 'mercedes', 5),
	                     new Token('parens_close', null, 13),
	                     new Token('op:rule', null, 0),
	                     new Token('term', 'true', 0),
	                     new Token('period', null, 14),
	                     new Token('newline', null, 15)
	                     ];
	
	var check = Token.check_for_match(tresult, expected_list);
	
	should.equal(check, true);
});

it('Tpiler - simple - no convert fact', function(){

	var text = "love(mercedes).\n";
	
	var l = new Lexer(text);
	var result = l.get_token_list();
	
	var t = new Tpiler(result, {convert_fact: false});
	
	var tresult = t.get_token_list();
	
	var expected_list = [
	                     new Token('parens_open', null, 4),
	                     new Token('term', 'love', 0),
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


it('Tpiler - remove whitespaces', function(){

	var text = " 	love(mercedes).	\n";
	
	var l = new Lexer(text);
	var result = l.get_token_list();
	
	var t = new Tpiler(result, {convert_fact: false});
	
	var tresult = t.get_token_list();
	
	var expected_list = [
	                     new Token('parens_open', null, 4),
	                     new Token('term', 'love', 0),
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

