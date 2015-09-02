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
var ParserL2 = pr.ParserL2;
var Token = pr.Token;
var Functor = pr.Functor;
var ParserL1 = pr.ParserL1;
var OpNode = pr.OpNode;





var setup = function(text, convert_fact) {

	Functor.inspect_short_version = false;
	Token.inspect_quoted = false;
	
	var l = new Lexer(text);
	var tokens = l.process();

	var t = new ParserL1(tokens, {convert_fact: convert_fact});
	var ttokens = t.process();
	
	var p = new ParserL2(ttokens);
	
	var result = p.process();
		
	var exp0 = result.terms[0];
	
	//console.log(exp0);
	
	return exp0;
};

var compare = function(input, expected) {
	
	//console.log("Compare: input length: ", input.length);
	//console.log("Compare: input= ", input);
	
	for (var index=0;index<expected.length;index++) {
		
		var i = input[index];
		var re = expected[index];
		
		var ri = util.inspect(i, {depth: null});
		if (ri!=re)
			return false;
	};
	
	return true;
};

var process = function(text, expected) {
	var exp = setup(text);
	
	var result = compare(exp, expected);
	
	should.equal(result, true, "Got: " + util.inspect(exp));
	
};

/**
 *  We should only get the first token
 *   to be transformed to an 'atom' since
 *   we have not stepped the process further along
 */
it('ParserL2 - simple - no fact to rule', function(){
	
	var text = "love(charlot).\n";
	var expected = [ 'Functor(love/1,Token(term,charlot))' ];
	
	process(text, expected);
	
});


it('ParserL2 - simple - with variable', function(){
	
	
	var text = "love(X).\n";
	var expected = [ 'Functor(love/1,Var(X))' ];
	
	process(text, expected);
	
});

it('ParserL2 - simple - with anon variable', function(){
	
	
	var text = "love(_).\n";

	var expected = [ 'Functor(love/1,Var(_))' ];
	
	process(text, expected);
});

it('ParserL2 - functor in functor - 1', function(){
	
	
	var text = "love(happy(charlot)).\n";
	var expected = [ 'Functor(love/1,Functor(happy/1,Token(term,charlot)))' ];
	
	process(text, expected);
	
});

/*
it('ParserL2 - remove comments', function(){

	var text = "% whatever\n% whatever 2\n";
	var expected = [];
	
	process(text, expected);
});
*/

it('ParserL2 - operator replacement - 1', function(){

	var text = "X +- Y";
	var expected = [ 'Var(X)', 'OpNode(`-`,500)', 'Var(Y)' ];
	
	process(text, expected);
});

it('ParserL2 - operator replacement - 2', function(){

	var text = "X -+ Y";
	var expected =  [ 'Var(X)', 'OpNode(`-`,500)', 'Var(Y)' ];
	
	process(text, expected);
});

it('ParserL2 - operator replacement - 3', function(){

	var text = "X - -Y";
	var expected = [ 'Var(X)', 'OpNode(`+`,500)', 'Var(Y)' ];
	
	process(text, expected);
});

it('ParserL2 - operator replacement - 4', function(){

	var text = "X * -Y";
	var expected = [ 'Var(X)', 'OpNode(`*`,400)', 'OpNode(`-`,null)', 'Var(Y)' ];
	
	process(text, expected);
});

it('ParserL2 - operator - 1', function(){

	var text = "love(mercedes) :- true";
	var expected = [ 'Functor(love/1,Token(term,mercedes))',
	                 'OpNode(`:-`,1200)',
	                 'Token(term,true)' ];
	
	process(text, expected);
});

it('ParserL2 - operator - 2', function(){

	var text = "love(julianne, charlot).";
	var expected = [ 'Functor(love/2,Token(term,julianne),Token(term,charlot))' ];
	
	process(text, expected);
});

it('ParserL2 - operator - 3', function(){

	var text = "X=Y, A=B.";
	var expected = [ 'Var(X)',
	                 'OpNode(`=`,700)',
	                 'Var(Y)',
	                 'OpNode(`,`,1000)',
	                 'Var(A)',
	                 'OpNode(`=`,700)',
	                 'Var(B)' ]
;
	
	process(text, expected);
	
});

it('ParserL2 - operator - 4', function(){

	var text = "X= 4 + 5.";
	var expected = [ 'Var(X)',
	                 'OpNode(`=`,700)',
	                 'Token(number,4)',
	                 'OpNode(`+`,null)',
	                 'Token(number,5)' ];
	
	process(text, expected);
});

it('ParserL2 - parens - 1', function(){

	var text = "X=(4 + 5).";
	var expected = [ 'Var(X)',
	                 'OpNode(`=`,700)',
	                 'Functor(expr/3,Token(number,4),OpNode(`+`,null),Token(number,5))' ];
	
	process(text, expected);
});


it('ParserL2 - parens - 2', function(){

	var text = "(4 + 5).";
	var expected = [ 'Functor(expr/3,Token(number,4),OpNode(`+`,null),Token(number,5))' ];
	
	process(text, expected);
});

it('ParserL2 - parens - 3', function(){

	var text = "((4 + 5)).";
	var expected = [ 'Functor(expr/1,Functor(expr/3,Token(number,4),OpNode(`+`,null),Token(number,5)))' ];
	
	process(text, expected);
});

it('ParserL2 - operator `is`', function(){

	var text = "X is 1.";
	var expected = [ 'Var(X)', 
	                 'OpNode(`is`,700)', 
	                 'Token(number,1)' ];
	
	process(text, expected);
});

it('ParserL2 - list - 1', function(){

	var text = "[1,2,3]";
	var expected =  [ 
	                  'Functor(cons/2,Token(number,1),Functor(cons/2,Token(number,2),Functor(cons/1,Token(number,3))))' 
	                  ];
	
	process(text, expected);
});

it('ParserL2 - list - 2', function(){

	var text = "[A,B | T]";
	var expected = [ 'Functor(cons/2,Var(A),Functor(cons/2,Var(B),Var(T)))' ];
	
	process(text, expected);
});
