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


it('ParserL3 - simple ', function(){
	
	var text = "A+B+C.";
	
	/*
	 [ 
	 	Functor(plus/2,
	 		Functor(plus/2,
	 			Token(var,A),Token(var,B)),
	 		Token(var,C)) 
	 ]
	 */
	var expressions = setup(text);
	
	var p = new ParserL3(expressions, Op.ordered_list_by_precedence);
	
	var r = p.process();
	
	var exp0 = r[0];
	
	should.equal(exp0[0] instanceof Functor, true);
	should.equal(exp0[0].name, 'plus');
	
	should.equal(exp0[0].args[0] instanceof Functor, true);
	should.equal(exp0[0].args[0].args[0] instanceof Token, true);
	should.equal(exp0[0].args[0].args[0].value, 'A');
	
	should.equal(exp0[0].args[0].args[1] instanceof Token, true);
	should.equal(exp0[0].args[0].args[1].value, 'B');
	
	should.equal(exp0[0].args[1] instanceof Token, true);
	should.equal(exp0[0].args[1].value, 'C');
});

it('ParserL3 - simple - 2', function(){
	
	var input = "A+B*C.";
	var expected = "[ [ Functor(plus/2,Token(var,A),Functor(mult/2,Token(var,B),Token(var,C))) ] ]";
	
	var expressions = setup(input);
	
	var p = new ParserL3(expressions, Op.ordered_list_by_precedence);
	
	var r = p.process();
	
	var i = util.inspect(r);
	
	should.equal(i, expected);
});

it('ParserL3 - simple - 3', function(){
	
	var input = "A = B*C.";
	var expected = "[ [ Functor(unif/2,Token(var,A),Functor(mult/2,Token(var,B),Token(var,C))) ] ]";
	
	var expressions = setup(input);
	
	var p = new ParserL3(expressions, Op.ordered_list_by_precedence);
	
	var r = p.process();
	
	var i = util.inspect(r);
	
	should.equal(i, expected);
});

it('ParserL3 - simple - 4', function(){
	
	var input = "A + B = C*D.";
	var expected = "[ [ Functor(unif/2,Functor(plus/2,Token(var,A),Token(var,B)),Functor(mult/2,Token(var,C),Token(var,D))) ] ]";
	
	var expressions = setup(input);
	
	var p = new ParserL3(expressions, Op.ordered_list_by_precedence);
	
	var r = p.process();
	
	var i = util.inspect(r);
	
	should.equal(i, expected);
});

it('ParserL3 - complex - 1', function(){
	
	var input = "f1( A* B ).";
	var expected = "[ [ Functor(f1/1,Functor(mult/2,Token(var,A),Token(var,B))) ] ]";
	
	var expressions = setup(input);
	
	var p = new ParserL3(expressions, Op.ordered_list_by_precedence);
	
	var r = p.process();
	
	var i = util.inspect(r);
	
	should.equal(i, expected, 'got: ', util.inspect(r));
});

it('ParserL3 - complex - 2', function(){
	
	var input = "f1( A* -B ).";
	var expected = "[ [ Functor(f1/1,Functor(mult/2,Token(var,A),Functor(uminus/1,Token(var,B)))) ] ]";
	
	var expressions = setup(input);
	
	var p = new ParserL3(expressions, Op.ordered_list_by_precedence);
	
	var r = p.process();
	
	var i = util.inspect(r);
	
	should.equal(i, expected, 'got: ', util.inspect(r));
});

it('ParserL3 - complex - 3', function(){
	
	var input = "f1( f2( A - -B )).";
	var expected = "[ [ Functor(f1/1,Functor(f2/1,Functor(plus/2,Token(var,A),Token(var,B)))) ] ]";
	
	var expressions = setup(input);
	
	var p = new ParserL3(expressions, Op.ordered_list_by_precedence);
	
	var r = p.process();
	
	var i = util.inspect(r);
	
	should.equal(i, expected, 'got: ', util.inspect(r));
});

var compare = function(a,b) {
	
};

it('ParserL3 - complex - 4', function(){
	
	var input = "f1( f2( A - -B )).f3(a,b).";
	var expected = "[ [ Functor(f1/1,Functor(f2/1,Functor(plus/2,Token(var,A),Token(var,B)))) ],\n"+
				   "  [ Functor(f3/3,Token(term,a),Token(sep,,),Token(term,b)) ] ]";
	
	var expressions = setup(input);
	
	var p = new ParserL3(expressions, Op.ordered_list_by_precedence);
	
	var r = p.process();
	
	var i = util.inspect(r, {depth: null});
	
	//console.log(i);
	
	should.equal(i, expected, 'got: ', util.inspect(r));
});
