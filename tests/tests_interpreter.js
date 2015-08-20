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

var Interpreter = pr.Interpreter;


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


it('Interpreter - simple ', function(){
	
	var text = "f1(A) , f2(B).";
	var expected = "";
	/*
	 * [ Functor(conj/2,
	 * 		Functor(f1/1, Token(var,A)),
	 * 		Functor(f2/1,Token(var,B))) 
	 * ]
	 */
	
	var expression = setup(text)[0][0];

	//console.log(expression);
	
	var i = new Interpreter();
	
	i.set_expression(expression);
	
	var result = i.get_stack();
	
	var r = util.inspect(result, {depth: null});
	
	should.equal(r, expected, 'got: ', util.inspect(r));
	
	//console.log(i.get_stack());
	
});

/*
it('Interpreter - complex - 1 ', function(){
	
	var text = "f1(A) , f2(B), f3(C).";
	var expected = "";
	
	var expression = setup(text)[0][0];

	console.log(expression);
	
	*
	 * Functor(conj/2,
	 * 		Functor(conj/2,
	 * 			Functor(f1/1,Token(var,A)),
	 * 			Functor(f2/1,Token(var,B))),
	 * 		Functor(f3/1,Token(var,C)))
	 *
	
	
	
	var i = new Interpreter();
	
	i.set_expression(expression);
	
	var result = i.get_stack();
	
	console.log("***Result:", result);
	
	
	//var r = util.inspect(result, {depth: null});
	
	//should.equal(r, expected, 'got: ', util.inspect(r));
	
	
	
});
*/