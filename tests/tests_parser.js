/*
 * prolog.js test cases
 * 
 * @author: jldupont
 */

var should = require('should');
var assert = require('assert');

var pr = require("../prolog.js");

var Lexer = pr.Lexer;
var Parser = pr.Parser;
var Token = pr.Token;
var Functor = pr.Functor;

/**
 *  We should only get the first token
 *   to be transformed to an 'atom' since
 *   we have not stepped the process further along
 */
it('Parser - simple', function(){
	
	
	var text = "love(charlot).\n";
	
	var l = new Lexer(text);
	var tokens = l.get_token_list();
	
	var p = new Parser();
	
});

/**
 *  An expression cannot start with a variable
 * 
 */
it('Parser - simple - start error', function(){
	
	
	var text = "X(charlot).\n";
	
	var l = new Lexer(text);
	var tokens = l.get_token_list();
	
	var p = new Parser();
	
});
