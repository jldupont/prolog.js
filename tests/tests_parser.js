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
var Tpiler = pr.Tpiler;

var setup = function(text, convert_fact) {

	var l = new Lexer(text);
	var tokens = l.get_token_list();

	var t = new Tpiler(tokens, {convert_fact: convert_fact});
	var ttokens = t.get_token_list();
	
	return ttokens;
};


/**
 *  We should only get the first token
 *   to be transformed to an 'atom' since
 *   we have not stepped the process further along
 */
it('Parser - simple - no fact to rule transpiling', function(){
	
	
	var text = "love(charlot).\n";

	var tokens = setup(text, false);
	
	//console.log(tokens);
	
	var p = new Parser(tokens, 0);
	
	var result = p.process();
	
	var exp0 = result.terms[0];
	
	// We should have:
	//  [
	//    [
	//      Term(c) with child [Token(), Token('parens_close') ]
	//      ,Token('period')
	//    ] exp0
	//  ] expressions
	
	
	
	should.equal(exp0[0].name, 'c');
	should.equal(exp0.length, 1);
	
	// We should only have 1 expression
	should.equal(result.terms.length, 1);
	
});

it('Parser - simple - with fact to rule transpiling', function(){
	
	
	var text = "love(charlot).\n";

	var tokens = setup(text, true);
	
	//console.log(tokens);
	
	var p = new Parser(tokens, 0);
	
	var result = p.process();
	
	var exp0 = result.terms[0];

	should.equal(exp0[0].name, 'c');       // the compound term "functor"
	should.equal(exp0[1].name, 'op:rule'); // :-
	should.equal(exp0[2].name, 'term');
	should.equal(exp0[2].value, 'true');
	
	should.equal(exp0.length, 3);
	
	// We should only have 1 expression
	should.equal(result.terms.length, 1);
	
});

it('Parser - functor in functor - 1', function(){
	
	
	var text = "love(happy(charlot)).\n";

	var tokens = setup(text, true);
	
	//console.log(tokens);
	
	var p = new Parser(tokens, 0);
	
	var result = p.process();
	
	var exp0 = result.terms[0];

	//console.log(JSON.stringify(exp0));
	
	should.equal(exp0[0].name, 'c');       // the compound term "functor"
	should.equal(exp0[1].name, 'op:rule'); // :-
	should.equal(exp0[2].name, 'term');
	should.equal(exp0[2].value, 'true');
	
	should.equal(exp0.length, 3);
	
	// Let's look into the 1st compound term
	var c1 = exp0[0];
	var exp0_1c = c1.child;
	
	should.equal(exp0_1c[0].name, 'functor');
	should.equal(exp0_1c[1].name, 'c');

	var exp0_1c_2c = exp0_1c[1].child;
		
	//console.log(exp0_1c_2c);
	should.equal(exp0_1c_2c[0].name, 'functor');
	should.equal(exp0_1c_2c[1].name, 'term');
	should.equal(exp0_1c_2c[2].name, 'parens_close');
		
	// We should only have 1 expression
	should.equal(result.terms.length, 1);
	
});
