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
	var tokens = l.process();

	var t = new ParserL1(tokens);
	var ttokens = t.process();
	
	var p = new ParserL2(ttokens);
	
	var result = p.process();
	var terms = result.terms;

	
	var p = new ParserL3(terms, Op.ordered_list_by_precedence);
	
	var r = p.process();
	
	var exp0 = r[0];
	
	return exp0;
};

var compare = function(input, expected) {
	
	//console.log("Compare: input length: ", input.length);
	//console.log("Compare: input= ", input);

	if (input.length != expected.length)
		return false;
	
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


it('ParserL3 - simple ', function(){
	
	var text = "A+B+C.";
	var exp = [ 'Functor(plus/2,Functor(plus/2,Var(A),Var(B)),Var(C))' ];

	process(text, exp);
});

it('ParserL3 - simple - 2', function(){
	
	var text = "A+B*C.";
	var exp = [ 'Functor(plus/2,Var(A),Functor(mult/2,Var(B),Var(C)))' ];

	process(text, exp);
});

it('ParserL3 - simple - 3', function(){
	
	var text = "A = B*C.";
	var exp = [ 'Functor(unif/2,Var(A),Functor(mult/2,Var(B),Var(C)))' ];

	process(text, exp);
});

it('ParserL3 - simple - 4', function(){
	
	var text = "A + B = C*D.";
	var exp = [ 'Functor(unif/2,Functor(plus/2,Var(A),Var(B)),Functor(mult/2,Var(C),Var(D)))' ];

	process(text, exp);
});

it('ParserL3 - complex - 1', function(){
	
	var text = "f1( A* B ).";
	var exp = [ 'Functor(f1/1,Functor(mult/2,Var(A),Var(B)))' ];

	process(text, exp);
});

it('ParserL3 - complex - 2', function(){
	
	var text = "f1( A* -B ).";
	var exp = [ 'Functor(f1/1,Functor(mult/2,Var(A),Functor(uminus/1,Var(B))))' ];

	process(text, exp);
});

it('ParserL3 - complex - 3', function(){
	
	var text = "f1( f2( A - -B )).";
	var exp = ['Functor(f1/1,Functor(f2/1,Functor(plus/2,Var(A),Var(B))))'];

	process(text, exp);
});

it('ParserL3 - complex - 4', function(){
	
	var text = "f1( f2( A - -B )).f3(a,b).";
	var expected = ['Functor(f1/1,Functor(f2/1,Functor(plus/2,Var(A),Var(B))))'];
	
	process(text, expected);
});

it('ParserL3 - complex - 5', function(){
	
	var text = "parent_child(X, Y) :- father_child(X, Y).";
	var expected = ['Functor(rule/2,Functor(parent_child/2,Var(X),Var(Y)),Functor(father_child/2,Var(X),Var(Y)))'];
	
	process(text, expected);});

it('ParserL3 - complex - 6', function(){
	
	var text = "sibling(X, Y) :- parent_child(Z, X), parent_child(Z, Y).";
	var expected = ['Functor(rule/2,Functor(sibling/2,Var(X),Var(Y)),Functor(conj/2,Functor(parent_child/2,Var(Z),Var(X)),Functor(parent_child/2,Var(Z),Var(Y))))'];
	
	process(text, expected);});

it('ParserL3 - expression - 1', function(){
	
	var text = "goal1(X, Y), goal2(A,B), goal3(C,D).";
	var expected = ['Functor(conj/2,Functor(conj/2,Functor(goal1/2,Var(X),Var(Y)),Functor(goal2/2,Var(A),Var(B))),Functor(goal3/2,Var(C),Var(D)))'];
	
	process(text, expected);});

it('ParserL3 - expression - 2', function(){
	
	var text = "goal1(X, Y), goal2(A,B) ; goal3(C,D).";
	var expected = ['Functor(disj/2,Functor(conj/2,Functor(goal1/2,Var(X),Var(Y)),Functor(goal2/2,Var(A),Var(B))),Functor(goal3/2,Var(C),Var(D)))'];
	
	process(text, expected);
});

it('ParserL3 - expression - 3', function(){
	
	var text = "append([H|T],L2,[H|L3])  :-  append(T,L2,L3).";
	var expected = [
	                	'Functor(rule/2,Functor(append/3,Functor(list/3,Var(H),Token(list:tail,|),Var(T)),Var(L2),'+
	                	'Functor(list/3,Var(H),Token(list:tail,|),Var(L3))),'+
	                	'Functor(append/3,Var(T),Var(L2),Var(L3)))'
	                ];
	
	process(text, expected);
});

it('ParserL3 - expression - 4 ', function(){
	
	var text = "max(X,Y,Z) :- X=< Y, !, Y=Z.";
	
	var expected = [
	                	'Functor(rule/2,'+
	                	  'Functor(max/3,Var(X),Var(Y),Var(Z)),'+
	                	  'Functor(conj/2,'+
	                	  		'Functor(conj/2,'+
	                	  			'Functor(em/2,Var(X),Var(Y)),'+
	                	  			'Token(term,!)),'+
	                	  		'Functor(unif/2,Var(Y),Var(Z))))'	                
	                ];
	
	process(text, expected);
});


it('ParserL3 - list - 1', function(){
	
	var text = "[A,B | T ].";
	var expected = ['Functor(list/4,Var(A),Var(B),Token(list:tail,|),Var(T))'];
	
	process(text, expected);
});

