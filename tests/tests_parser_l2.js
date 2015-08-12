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

var setup = function(text, convert_fact) {

	var l = new Lexer(text);
	var tokens = l.get_token_list();

	var t = new ParserL1(tokens, {convert_fact: convert_fact});
	var ttokens = t.get_token_list();
	
	return ttokens;
};


/**
 *  We should only get the first token
 *   to be transformed to an 'atom' since
 *   we have not stepped the process further along
 */
it('ParserL2 - simple - no fact to rule', function(){
	
	
	var text = "love(charlot).\n";

	var tokens = setup(text, false);
	
	//console.log(tokens);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	
	var exp0 = result.terms[0];
	
	// We should have:
	//  [
	//    [
	//      Term(c) with child [Token(), Token('parens_close') ]
	//      ,Token('period')
	//    ] exp0
	//  ] expressions
	
	
	should.equal(exp0[0] instanceof Functor, true);
	should.equal(exp0.length, 1);
	
	// We should only have 1 expression
	should.equal(result.terms.length, 1);
	
});

it('ParserL2 - simple - with fact to rule', function(){
	
	
	var text = "love(charlot).\n";

	var tokens = setup(text, true);
	
	//console.log(tokens);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	
	var exp0 = result.terms[0];

	should.equal(exp0[0] instanceof Functor, true);
	should.equal(exp0[1].name, 'op:rule'); // :-
	should.equal(exp0[2].name, 'term');
	should.equal(exp0[2].value, 'true');
	
	should.equal(exp0.length, 3);
	
	// We should only have 1 expression
	should.equal(result.terms.length, 1);
	
});

it('ParserL2 - functor in functor - 1', function(){
	
	
	var text = "love(happy(charlot)).\n";

	var tokens = setup(text, true);
	
	//console.log(tokens);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	
	var exp0 = result.terms[0];

	should.equal(exp0[0] instanceof Functor, true, 'expecting Functor 0');
	
	var love_functor = exp0[0];
	var love_functor_arg1 = love_functor.args[0];
	var love_functor_arg2 = love_functor.args[1];
	
	should.equal(love_functor_arg1 instanceof Functor, true, "expecting Functor 'happy'");
	should.equal(love_functor_arg1.name, 'happy', "expecting Functor 'happy'");
	should.equal(love_functor_arg2.name, 'parens_close');
	
	var happy_functor = love_functor_arg1;
	var happy_functor_arg1 = happy_functor.args[0];
	var happy_functor_arg2 = happy_functor.args[1];
	
	should.equal(happy_functor_arg1.name, 'term');
	should.equal(happy_functor_arg1.value, 'charlot');
	
	should.equal(happy_functor_arg2.name, 'parens_close');
	
});

it('ParserL2 - remove comments', function(){

	var text = "% whatever\n% whatever 2\n";
	
	var tokens = setup(text, true);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	var terms = result.terms;

	should.equal(terms.length, 0);
	
});
