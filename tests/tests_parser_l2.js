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
var OpNode = pr.OpNode;

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
	
	//console.log(exp0);
	
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


it('ParserL2 - simple - with variable', function(){
	
	
	var text = "love(X).\n";

	var tokens = setup(text, true);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	
	var exp0 = result.terms[0];

	
	var functor = exp0[0];
	var functor_arg0 = functor.args[0];
	
	should.equal(exp0[0] instanceof Functor, true);
	
	should.equal(functor_arg0.name,  'var');
	should.equal(functor_arg0.value, 'X');
	
	//should.equal(exp0[1].name, 'op:rule'); // :-
	//should.equal(exp0[2].name, 'term');
	//should.equal(exp0[2].value, 'true');
	
	should.equal(exp0.length, 1);
	
	// We should only have 1 expression
	should.equal(result.terms.length, 1);
	
});

it('ParserL2 - simple - with anon variable', function(){
	
	
	var text = "love(_).\n";

	var tokens = setup(text, true);
	
	//console.log(tokens);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	
	var exp0 = result.terms[0];

	var functor = exp0[0];
	var functor_arg0 = functor.args[0];
	
	should.equal(exp0[0] instanceof Functor, true);
	
	should.equal(functor_arg0.name,  'var_anon');
	should.equal(functor_arg0.value, null);
	
	//should.equal(exp0[1].name, 'op:rule'); // :-
	//should.equal(exp0[2].name, 'term');
	//should.equal(exp0[2].value, 'true');
	
	should.equal(exp0.length, 1);
	
	// We should only have 1 expression
	should.equal(result.terms.length, 1);
	
});

it('ParserL2 - functor in functor - 1', function(){
	
	
	var text = "love(happy(charlot)).\n";

	var tokens = setup(text, true);
	
	//console.log(tokens);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	
	//console.log(JSON.stringify(result.terms));
	//console.log(result.terms);
	
	var exp0 = result.terms[0];

	should.equal(exp0[0] instanceof Functor, true, 'expecting Functor 0');
	
	var love_functor = exp0[0];
	var love_functor_arg1 = love_functor.args[0];
	var love_functor_arg2 = love_functor.args[1];
	
	should.equal(love_functor_arg1 instanceof Functor, true, "expecting Functor 'happy'");
	should.equal(love_functor_arg1.name, 'happy', "expecting Functor 'happy'");
	//should.equal(love_functor_arg2.name, 'parens_close');
	
	var happy_functor = love_functor_arg1;
	var happy_functor_arg1 = happy_functor.args[0];
	var happy_functor_arg2 = happy_functor.args[1];
	
	should.equal(happy_functor_arg1.name, 'term');
	should.equal(happy_functor_arg1.value, 'charlot');
	
	//should.equal(happy_functor_arg2.name, 'parens_close');
	
});

it('ParserL2 - remove comments', function(){

	var text = "% whatever\n% whatever 2\n";
	
	var tokens = setup(text, true);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	var terms = result.terms;

	should.equal(terms.length, 0);
	
});

it('ParserL2 - operator replacement - 1', function(){

	var text = "X +- Y";
	
	var tokens = setup(text, true);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	var terms = result.terms;
	var exp0 = terms[0];

	var tokenX = exp0[0];
	var token_ = exp0[1];

	//console.log(terms);
	
	should.equal(tokenX.value, 'X');
	should.equal(token_ instanceof OpNode, true);
	should.equal(token_.symbol, '-');
	
});

it('ParserL2 - operator replacement - 2', function(){

	var text = "X -+ Y";
	
	var tokens = setup(text, true);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	var terms = result.terms;
	var exp0 = terms[0];

	var tokenX = exp0[0];
	var token_ = exp0[1];

	//console.log(terms);
	
	should.equal(tokenX.value, 'X');
	should.equal(token_ instanceof OpNode, true);
	should.equal(token_.symbol, '-');
	
});

it('ParserL2 - operator replacement - 3', function(){

	var text = "X - -Y";
	
	var tokens = setup(text, true);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	var terms = result.terms;
	var exp0 = terms[0];

	var tokenX = exp0[0];
	var tokenP = exp0[1];

	//console.log(exp0);
	
	should.equal(tokenX.value, 'X');
	should.equal(tokenP instanceof OpNode, true);
	should.equal(tokenP.symbol, '+');
	
});

it('ParserL2 - operator replacement - 4', function(){

	var text = "X * -Y";
	
	var tokens = setup(text, true);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	var terms = result.terms;
	var exp0 = terms[0];

	var tokenX = exp0[0];
	var tokenP = exp0[1];
	var tokenM = exp0[2];
	var tokenY = exp0[3];

	//console.log(exp0);
	
	should.equal(tokenX.value, 'X');
	should.equal(tokenP instanceof OpNode, true);
	should.equal(tokenP.symbol, '*');
	
	should.equal(tokenM instanceof OpNode, true);
	should.equal(tokenM.prec, null);  // the precedence is ambigous at this stage
	
	should.equal(tokenY.value, 'Y');
	
});

it('ParserL2 - operator - 1', function(){

	var text = "love(mercedes) :- true";
	
	var tokens = setup(text, true);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	var terms = result.terms;

	var exp0  = terms[0];
	var node2 = exp0[1];
	
	should.equal(node2 instanceof OpNode, true);
	should.equal(node2.symbol, ':-');
	
});

it('ParserL2 - operator - 2', function(){

	var text = "love(julianne, charlot).";
	
	/*
	  [ 
	    [ Functor(love/3,Token(term,julianne),OpNode(,),Token(term,charlot)),
          Token(op:rule,null),
          Token(term,true) 
         ] 
       ]
	 */
	
	var tokens = setup(text, true);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	var terms = result.terms;

	//console.log(terms);
	
	var exp0 = terms[0];
	var functor = exp0[0];
	var functor_arg0 = functor.args[0];
	var functor_arg1 = functor.args[1];
	var functor_arg2 = functor.args[2];
	
	should.equal(functor instanceof Functor, true);
	should.equal(functor_arg0 instanceof Token, true);
	should.equal(functor_arg0.value, 'julianne');
	
	should.equal(functor_arg1 instanceof Token, true);
	should.equal(functor_arg1.value, ',');
	
	should.equal(functor_arg2 instanceof Token, true);
	should.equal(functor_arg2.value, 'charlot');
	
	var rule = exp0[1];
	var term_true = exp0[2];
	
	//should.equal(rule instanceof Token, true);
	//should.equal(term_true instanceof Token, true);
});

it('ParserL2 - operator - 3', function(){

	var text = "X=Y, A=B.";
	
	/*
	 * [ 
	 * [ Token(var,X),
    		OpNode(=),
    		Token(var,Y),
    	OpNode(,),
    		Token(var,A),
    		OpNode(=),
    		Token(var,B),
    		Token(op:rule,null),
    		Token(term,true) ] ]

	 */
	
	var tokens = setup(text, true);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	var terms = result.terms;
	
	var exp0 = terms[0];

	//console.log(exp0);
	
	should.equal(exp0[0] instanceof Token, true);
	should.equal(exp0[1] instanceof OpNode, true);
	should.equal(exp0[2] instanceof Token, true);
	should.equal(exp0[3] instanceof OpNode, true);
	
	should.equal(exp0[3].symbol, ',');
	
	should.equal(exp0[4] instanceof Token, true);
	should.equal(exp0[5] instanceof OpNode, true);
	should.equal(exp0[6] instanceof Token, true);
	
});

it('ParserL2 - operator - 4', function(){

	var text = "X= 4 + 5.";
	
	/*
		[ Token(var,X),
		  OpNode(`=`,700),
		  Token(number,4),
		  OpNode(`+`,null),
		  Token(number,5) 
		 ]
	 */
	
	var tokens = setup(text, true);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	var terms = result.terms;
	
	var exp0 = terms[0];

	//console.log(exp0);
	
	should.equal(exp0[0] instanceof Token, true);
	should.equal(exp0[1] instanceof OpNode, true);
	should.equal(exp0[2] instanceof Token, true);
	should.equal(exp0[3] instanceof OpNode, true);
	should.equal(exp0[3].prec, null);
	should.equal(exp0[4] instanceof Token, true);
	
});

it('ParserL2 - parens - 1', function(){

	var text = "X=(4 + 5).";
	
	/*
	 [ Token(var,X),
  		OpNode(`=`,700),
  		Functor(expr/3,
  			Token(number,4),
  			OpNode(`+`,null),
  			Token(number,5)) 
  		]
	 */
	
	var tokens = setup(text, true);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	var terms = result.terms;
	
	var exp0 = terms[0];

	//console.log(exp0);
	
	should.equal(exp0[0] instanceof Token, true);
	should.equal(exp0[1] instanceof OpNode, true);
	should.equal(exp0[2] instanceof Functor, true);
	should.equal(exp0[2].name, 'expr');
	should.equal(exp0[2].args[0] instanceof Token, true);
	should.equal(exp0[2].args[1] instanceof OpNode, true);
	should.equal(exp0[2].args[2] instanceof Token, true);
	
});


it('ParserL2 - parens - 2', function(){

	var text = "(4 + 5).";
	
	/*
	 [ 
	 	Functor(expr/3,
	 		Token(number,4),
	 		OpNode(`+`,null),
	 		Token(number,5)) 
	 ]
	 */
	
	var tokens = setup(text, true);
	
	//console.log(tokens);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	var terms = result.terms;
	
	var exp0 = terms[0];

	//console.log(exp0);
	
	should.equal(exp0[0] instanceof Functor, true);
	should.equal(exp0[0].name, 'expr');
	should.equal(exp0[0].args[0] instanceof Token, true);
	should.equal(exp0[0].args[1] instanceof OpNode, true);
	should.equal(exp0[0].args[2] instanceof Token, true);
	
});

it('ParserL2 - parens - 3', function(){

	var text = "((4 + 5)).";
	
	/*
	 	[ 
	 		Functor(expr/1,
	 			Functor(expr/3,
	 				Token(number,4),
	 				OpNode(`+`,null),
	 				Token(number,5))) 
	 	]
	 */
	
	var tokens = setup(text, true);
	
	//console.log(tokens);
	
	var p = new ParserL2(tokens, 0);
	
	var result = p.process();
	var terms = result.terms;
	
	var exp0 = terms[0];

	//console.log(exp0);
	
	should.equal(exp0[0] instanceof Functor, true);
	should.equal(exp0[0].name, 'expr');
	
	should.equal(exp0[0].args[0] instanceof Functor, true);
	should.equal(exp0[0].args[0].name, 'expr');
	
	should.equal(exp0[0].args[0].args[0] instanceof Token, true);
	should.equal(exp0[0].args[0].args[1] instanceof OpNode, true);
	should.equal(exp0[0].args[0].args[2] instanceof Token, true);
	
});
