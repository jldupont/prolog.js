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

var process = function(input_text, expecteds, left_to_right) {
	
	var expressions = setup(input_text);
	
	var results = [];
	
	for (var index = 0; index<expressions.length; index++) {
		
		var expression = expressions[index];
		
		if (!expression)
			return false;
		
		var i = new ParserL4(expression[0]);
		
		i.dir_left_to_right = left_to_right || false;
		
		var r = i.process();
		
		results.push( r );
	};
	
	for (var index=0; index < results.length; index++) {
		
		var ri = results[index];
		var expected = expecteds[index];
		
		var result = compare(ri, expected);
		should.equal(result, true, "Got: " + util.inspect(ri));
	};

	
};

var compare = function(input, expected) {
	
	if (!expected)
		return false;
	
	if (input.length != expected.length)
		return false;
	
	for (var index=0;index<expected.length;index++) {
		
		var i = input[index];
		var re = expected[index];
		
		if (!re)
			return false;
		
		var ri = util.inspect(i, {depth: null});
		if (ri!=re)
			return false;
	};
	
	return true;
};

it('ParserL4 - basic', function(){
	
	var text = "f1(A).";
	var expected = [[ 'Functor(call/3,"?result","f1",[Var(A)])' ]];
	process(text, expected);
});


it('ParserL4 - simple 1', function(){
	
	var text = "f1(A) , f2(B).";
	var expected = [[ 
						'Functor(call/3,"?result","conj",[Var(?var0),Var(?var1)])',
						'Functor(call/3,"?var1","f2",[Var(B)])',
						'Functor(call/3,"?var0","f1",[Var(A)])'
	                 ]];
	process(text, expected);
});

it('ParserL4 - simple 2', function(){
	
	var text = "f1(A) ; f2(B).";
	var expected = [[ 
						'Functor(call/3,"?result","disj",[Var(?var0),Var(?var1)])',
						'Functor(call/3,"?var1","f2",[Var(B)])',
						'Functor(call/3,"?var0","f1",[Var(A)])'
					]];
	process(text, expected);
});


it('ParserL4 - complex - 1 ', function(){
	
	var text = "f1(A) , f2(B), f3(C).";
	var expected = [[
						'Functor(call/3,"?result","conj",[Var(?var2),Var(?var3)])',
						'Functor(call/3,"?var3","f3",[Var(C)])',
						'Functor(call/3,"?var2","conj",[Var(?var0),Var(?var1)])',
						'Functor(call/3,"?var1","f2",[Var(B)])',
						'Functor(call/3,"?var0","f1",[Var(A)])'	                
	                ]];
	
	process(text, expected);
});

it('ParserL4 - complex - 2 ', function(){
	
	var text = "f1(A) , f2(B), f3(f4(C)).";
	var expected = [[
						'Functor(call/3,"?result","conj",[Var(?var2),Var(?var4)])',
						'Functor(call/3,"?var4","f3",[Var(?var3)])',
						'Functor(call/3,"?var3","f4",[Var(C)])',
						'Functor(call/3,"?var2","conj",[Var(?var0),Var(?var1)])',
						'Functor(call/3,"?var1","f2",[Var(B)])',
						'Functor(call/3,"?var0","f1",[Var(A)])'	                
						]];
	
	process(text, expected);
});

it('ParserL4 - complex - 3 ', function(){
	
	var text = "f1(A) , B is A, f2(B), f3(f4(C)).";
	var expected = [[
						'Functor(call/3,"?result","conj",[Var(?var4),Var(?var6)])',
						'Functor(call/3,"?var6","f3",[Var(?var5)])',
						'Functor(call/3,"?var5","f4",[Var(C)])',
						'Functor(call/3,"?var4","conj",[Var(?var2),Var(?var3)])',
						'Functor(call/3,"?var3","f2",[Var(B)])',
						'Functor(call/3,"?var2","conj",[Var(?var0),Var(?var1)])',
						'Functor(call/3,"?var1","is",[Var(B),Var(A)])',
						'Functor(call/3,"?var0","f1",[Var(A)])'	                
	                 ]];
	
	process(text, expected);
});

it('ParserL4 - complex - 4 ', function(){
	
	var text = "sibling(X, Y) :- parent_child(Z, X), parent_child(Z, Y).";
	var expected = [[
						'Functor(call/3,"?result","rule",[Var(?var0),Var(?var3)])',
						'Functor(call/3,"?var3","conj",[Var(?var1),Var(?var2)])',
						'Functor(call/3,"?var2","parent_child",[Var(Z),Var(Y)])',
						'Functor(call/3,"?var1","parent_child",[Var(Z),Var(X)])',
						'Functor(call/3,"?var0","sibling",[Var(X),Var(Y)])'  
	                 ]];
	
	process(text, expected);
});

it('ParserL4 - complex - 5a', function(){
	
	var text = "append([H|T],L2,[H|L3])  :-  append(T,L2,L3).";
	
	var expected = [[
						'Functor(call/3,"?result","rule",[Var(?var2),Var(?var3)])',
						'Functor(call/3,"?var3","append",[Var(T),Var(L2),Var(L3)])',
						'Functor(call/3,"?var2","append",[Var(?var0),Var(L2),Var(?var1)])',
						'Functor(call/3,"?var1","cons",[Var(H),Token(list:tail,|),Var(L3)])',
						'Functor(call/3,"?var0","cons",[Var(H),Token(list:tail,|),Var(T)])'	                
	                ]];
	
	process(text, expected);
});

it('ParserL4 - complex - 5b', function(){
	
	var text = "append([H|T],L2,[H|L3])  :-  append(T,L2,L3).";
	
	var expected = [ [ 
	                   'Functor(call/3,"?var0","cons",[Var(H),Token(list:tail,|),Var(T)])',
	                   'Functor(call/3,"?var1","cons",[Var(H),Token(list:tail,|),Var(L3)])',
	                   'Functor(call/3,"?var2","append",[Var(?var0),Var(L2),Var(?var1)])',
	                   'Functor(call/3,"?var3","append",[Var(T),Var(L2),Var(L3)])',
	                   'Functor(call/3,"?result","rule",[Var(?var2),Var(?var3)])' 
	                   ]];
	
	process(text, expected, true);
});


it('ParserL4 - complex - 6a ', function(){
	
	var text = "max(X,Y,Z) :- X=< Y, !, Y=Z.";
	
	var expected = [[
						'Functor(call/3,"?result","rule",[Var(?var0),Var(?var4)])',
						'Functor(call/3,"?var4","conj",[Var(?var2),Var(?var3)])',
						'Functor(call/3,"?var3","unif",[Var(Y),Var(Z)])',
						'Functor(call/3,"?var2","conj",[Var(?var1),Token(term,!)])',
						'Functor(call/3,"?var1","em",[Var(X),Var(Y)])',
						'Functor(call/3,"?var0","max",[Var(X),Var(Y),Var(Z)])' 
	                ]];
	
	process(text, expected);
});

it('ParserL4 - complex - 6b ', function(){
	
	var text = "X =< Y, !, Y=Z";
	
	var expected = [[
						'Functor(call/3,"?result","conj",[Var(?var1),Var(?var2)])',
						'Functor(call/3,"?var2","unif",[Var(Y),Var(Z)])',
						'Functor(call/3,"?var1","conj",[Var(?var0),Token(term,!)])',
						'Functor(call/3,"?var0","em",[Var(X),Var(Y)])'
	                ]];
	
	process(text, expected);
});

it('ParserL4 - complex - 6 - LTR', function(){
	
	var text = "max(X,Y,Z) :- X =< Y, !, Y=Z.";
	
	var expected = [[
						'Functor(call/3,"?var0","max",[Var(X),Var(Y),Var(Z)])',
						'Functor(call/3,"?var1","em",[Var(X),Var(Y)])',
						'Functor(call/3,"?var2","conj",[Var(?var1),Token(term,!)])',
						'Functor(call/3,"?var3","unif",[Var(Y),Var(Z)])',
						'Functor(call/3,"?var4","conj",[Var(?var2),Var(?var3)])',
						'Functor(call/3,"?result","rule",[Var(?var0),Var(?var4)])'	                
	                ]];
	
	process(text, expected, true);
});

it('ParserL4 - multi-expression - 1', function(){
	
	var text = "f1(a,b,c). \n f2(d,e,f). \n f3(x,y,z).\n";
	var expected = [ 
	                 [ 'Functor(call/3,"?result","f1",[Token(term,a),Token(term,b),Token(term,c)])' ]
	                ,[ 'Functor(call/3,"?result","f2",[Token(term,d),Token(term,e),Token(term,f)])' ]
	                ,[ 'Functor(call/3,"?result","f3",[Token(term,x),Token(term,y),Token(term,z)])' ]
					];
	
	process(text, expected);
});


it('ParserL4 - question - 1 ', function(){
	
	var text = "max(1,2,X)";
	
	var expected = [
	                	['Functor(call/3,"?result","max",[Token(number,1),Token(number,2),Var(X)])']	                
	                ];
	
	process(text, expected);
});


it('ParserL4 - question - 2 ', function(){
	
	var text = "append([a,b], [c,d], X).";
	
	var expected = [[
						'Functor(call/3,"?result","append",[Var(?var0),Var(?var1),Var(X)])',
						'Functor(call/3,"?var1","cons",[Token(term,c),Token(term,d)])',
						'Functor(call/3,"?var0","cons",[Token(term,a),Token(term,b)])'	                
	                ]];
	
	process(text, expected);
});

/*
 *  TODO: support for empty list ... 
 *
it('ParserL4 - question - 3 ', function(){
	
	var text = "concat([], L, L).";
	
	var expected = [[
	                ]];
	
	process(text, expected);
});
*/