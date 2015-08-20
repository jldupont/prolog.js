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

var process = function(input_text, expected) {
	
	var expression = setup(input_text)[0][0];

	var i = new Interpreter();
	
	i.set_expression(expression);
	
	var ri = i.get_stack();
	
	var result = compare(ri, expected);
	
	should.equal(result, true, "Got: " + util.inspect(ri));
};

var compare = function(input, expected) {
	
	for (var index=0;index<input.length;index++) {
		
		var i = input[index];
		var re = expected[index];
		
		var ri = util.inspect(i, {depth: null});
		if (ri!=re)
			return false;
	};
	
	return true;
};

it('Interpreter - simple 1', function(){
	
	var text = "f1(A) , f2(B).";
	var expected = [ 'Functor(call/3,"f1","?var0",Token(var,A))',
	                 'Functor(call/3,"f2","?var1",Token(var,B))',
	                 'Functor(call/4,"conj","?result",Token(var,?var0),Token(var,?var1))' 
	                 ];
	process(text, expected);
});

it('Interpreter - simple 2', function(){
	
	var text = "f1(A) ; f2(B).";
	var expected = [ 'Functor(call/3,"f1","?var0",Token(var,A))',
	                 'Functor(call/3,"f2","?var1",Token(var,B))',
	                 'Functor(call/4,"disj","?result",Token(var,?var0),Token(var,?var1))' 
	                 ];
	process(text, expected);
});


it('Interpreter - complex - 1 ', function(){
	
	var text = "f1(A) , f2(B), f3(C).";
	var expected = [ 'Functor(call/3,"f1","?var0",Token(var,A))',
	                 'Functor(call/3,"f2","?var1",Token(var,B))',
	                 'Functor(call/4,"conj","?var2",Token(var,?var0),Token(var,?var1))',
	                 'Functor(call/3,"f3","?var3",Token(var,C))',
	                 'Functor(call/4,"conj","?result",Token(var,?var2),Token(var,?var3))' ];
	
	process(text, expected);
});

it('Interpreter - complex - 2 ', function(){
	
	var text = "f1(A) , f2(B), f3(f4(C)).";
	var expected = [ 'Functor(call/3,"f1","?var0",Token(var,A))',
	                 'Functor(call/3,"f2","?var1",Token(var,B))',
	                 'Functor(call/4,"conj","?var2",Token(var,?var0),Token(var,?var1))',
	                 'Functor(call/3,"f4","?var3",Token(var,C))',
	                 'Functor(call/3,"f3","?var4",Token(var,?var3))',
	                 'Functor(call/4,"conj","?result",Token(var,?var2),Token(var,?var4))' ];
	
	process(text, expected);
});
