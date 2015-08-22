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
var ParserL4 = pr.ParserL4;


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

	var i = new ParserL4(expression);
	
	var ri = i.process();
	
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

it('ParserL4 - basic', function(){
	
	var text = "f1(A).";
	var expected = [ 'Functor(call/3,"?result","f1",Var(A))' ];
	process(text, expected);
});


it('ParserL4 - simple 1', function(){
	
	var text = "f1(A) , f2(B).";
	var expected = [ 'Functor(call/3,"?var0","f1",Var(A))',
	                 'Functor(call/3,"?var1","f2",Var(B))',
	                 'Functor(call/4,"?result","conj",Var(?var0),Var(?var1))' 
	                 ];
	process(text, expected);
});

it('ParserL4 - simple 2', function(){
	
	var text = "f1(A) ; f2(B).";
	var expected = [ 'Functor(call/3,"?var0","f1",Var(A))',
	                 'Functor(call/3,"?var1","f2",Var(B))',
	                 'Functor(call/4,"?result","disj",Var(?var0),Var(?var1))' 
	                 ];
	process(text, expected);
});


it('ParserL4 - complex - 1 ', function(){
	
	var text = "f1(A) , f2(B), f3(C).";
	var expected = [ 'Functor(call/3,"?var0","f1",Var(A))',
	                 'Functor(call/3,"?var1","f2",Var(B))',
	                 'Functor(call/4,"?var2","conj",Var(?var0),Var(?var1))',
	                 'Functor(call/3,"?var3","f3",Var(C))',
	                 'Functor(call/4,"?result","conj",Var(?var2),Var(?var3))' ];
	
	process(text, expected);
});

it('ParserL4 - complex - 2 ', function(){
	
	var text = "f1(A) , f2(B), f3(f4(C)).";
	var expected = [ 'Functor(call/3,"?var0","f1",Var(A))',
	                 'Functor(call/3,"?var1","f2",Var(B))',
	                 'Functor(call/4,"?var2","conj",Var(?var0),Var(?var1))',
	                 'Functor(call/3,"?var3","f4",Var(C))',
	                 'Functor(call/3,"?var4","f3",Var(?var3))',
	                 'Functor(call/4,"?result","conj",Var(?var2),Var(?var4))' ];
	
	process(text, expected);
});

it('ParserL4 - complex - 3 ', function(){
	
	var text = "f1(A) , B is A, f2(B), f3(f4(C)).";
	var expected = [ 'Functor(call/3,"?var0","f1",Var(A))',
	                 'Functor(call/4,"?var1","is",Var(B),Var(A))',
	                 'Functor(call/4,"?var2","conj",Var(?var0),Var(?var1))',
	                 'Functor(call/3,"?var3","f2",Var(B))',
	                 'Functor(call/4,"?var4","conj",Var(?var2),Var(?var3))',
	                 'Functor(call/3,"?var5","f4",Var(C))',
	                 'Functor(call/3,"?var6","f3",Var(?var5))',
	                 'Functor(call/4,"?result","conj",Var(?var4),Var(?var6))' 
	                 ];
	
	process(text, expected);
});
