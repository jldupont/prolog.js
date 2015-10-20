/*
 * prolog.js test cases
 * 
 * @author: jldupont
 */

var should = require('should');
//var assert = require('assert');
var util   = require('util');

var pr = require("../prolog.js");

var Lexer = pr.Lexer;
//var Token = pr.Token;
//var OpNode = pr.OpNode;
var Functor = pr.Functor;
var Op = pr.Op;

var ParserL1 = pr.ParserL1;
var ParserL2 = pr.ParserL2;
var ParserL3 = pr.ParserL3;

var ErrorSyntax =pr.ErrorSyntax;


var setup = function(text) {
	var p, r;
	
	var l = new Lexer(text);
	var tokens = l.process();

	var t = new ParserL1(tokens);
	var ttokens = t.process();
	
	try {
		p = new ParserL2(ttokens);
		
	} catch(e) {
		console.log("Parser Error: ", e);
		console.log("Parser L1 tokens: ", ttokens);
		throw e;
	}
	
	var result = p.process();
	var terms = result.terms;

	//console.log("Terms: ", terms);
	
	try {
		p = new ParserL3(terms, Op.ordered_list_by_precedence);
		r = p.process();
	} catch(e) {
		//console.log("Parser Error: ", e, "\n");
		//console.log("Parser L2 tokens: ", terms, "\n");
		throw e;
	}
	
	

	return r;
};

var compare = function(inputs, expecteds) {
	
	//console.log("Compare: input length: ", input.length);
	//console.log("Compare: input= ", input);

	for (var iindex = 0; iindex<inputs.length; iindex++) {

		var input = inputs[iindex];
		var expected = expecteds[iindex];
		
		if (!input || !expected)
			return false;
		
		if (input.length != expected.length)
			return false;
		
		for (var index=0;index<expected.length;index++) {
			
			var i = input[index];
			var re = expected[index];
			
			var ri = util.inspect(i, {depth: null});
			if (ri!=re)
				return false;
		};
		
	};
	
	
	return true;
};

var process = function(text, expected) {
	var exp = setup(text);
	
	var result = compare(exp, expected);
	
	should.equal(result, true, "Got: " + util.inspect(exp));
	
};

it('ParserL3 - basic - 0 ', function(){

	Functor.inspect_compact_version = true;
	
	var text = "f(A,B) :- list(A,B).";
	var exp = [
	           [ 'rule(f(Var(A),Var(B)),list(Var(A),Var(B)))' 
	             ]
	          ];

	process(text, exp);
	
});



it('ParserL3 - simple ', function(){

	Functor.inspect_compact_version = false;
	
	var text = "A+B+C.";
	var exp = [
	           [ 'Functor(plus/2,Functor(plus/2,Var(A),Var(B)),Var(C))' 
	             ]
	          ];

	process(text, exp);
});

it('ParserL3 - simple - 2', function(){
	
	var text = "A+B*C.";
	var exp = [[ 'Functor(plus/2,Var(A),Functor(mult/2,Var(B),Var(C)))' ]];

	process(text, exp);
});

it('ParserL3 - simple - 3', function(){
	
	var text = "A = B*C.";
	var exp = [[ 'Functor(unif/2,Var(A),Functor(mult/2,Var(B),Var(C)))' ]];

	process(text, exp);
});

it('ParserL3 - simple - 4', function(){
	
	var text = "A + B = C*D.";
	var exp = [[ 'Functor(unif/2,Functor(plus/2,Var(A),Var(B)),Functor(mult/2,Var(C),Var(D)))' ]];

	process(text, exp);
});

it('ParserL3 - complex - 1', function(){
	
	var text = "f1( A* B ).";
	var exp = [[ 'Functor(f1/1,Functor(mult/2,Var(A),Var(B)))' ]];

	process(text, exp);
});

it('ParserL3 - complex - 2', function(){
	
	var text = "f1( A* -B ).";
	var exp = [[ 'Functor(f1/1,Functor(mult/2,Var(A),Functor(uminus/1,Var(B))))' ]];

	process(text, exp);
});

it('ParserL3 - complex - 3', function(){
	
	var text = "f1( f2( A - -B )).";
	var exp = [['Functor(f1/1,Functor(f2/1,Functor(plus/2,Var(A),Var(B))))']];

	process(text, exp);
});

it('ParserL3 - complex - 4', function(){
	
	var text = "f1( f2( A - -B )).";
	var expected = [['Functor(f1/1,Functor(f2/1,Functor(plus/2,Var(A),Var(B))))']];
	
	process(text, expected);
});

it('ParserL3 - complex - 5', function(){
	
	var text = "parent_child(X, Y) :- father_child(X, Y).";
	var expected = [['Functor(rule/2,Functor(parent_child/2,Var(X),Var(Y)),Functor(father_child/2,Var(X),Var(Y)))']];
	
	process(text, expected);});

it('ParserL3 - complex - 6', function(){
	
	var text = "sibling(X, Y) :- parent_child(Z, X), parent_child(Z, Y).";
	var expected = [['Functor(rule/2,Functor(sibling/2,Var(X),Var(Y)),Functor(conj/2,Functor(parent_child/2,Var(Z),Var(X)),Functor(parent_child/2,Var(Z),Var(Y))))']];
	
	process(text, expected);}
);

it('ParserL3 - complex - 7', function(){
	
	var text = "f1(a) ;f2(b) ; f3(c) ; f4(d).";
	var expected = [[
'Functor(disj/2,Functor(disj/2,Functor(disj/2,Functor(f1/1,Token(term,a)),Functor(f2/1,Token(term,b))),Functor(f3/1,Token(term,c))),Functor(f4/1,Token(term,d)))'	                 
	                 ]];
	
	process(text, expected);}
);


it('ParserL3 - expression - 1', function(){
	
	var text = "goal1(X, Y), goal2(A,B), goal3(C,D).";
	var expected = [['Functor(conj/2,Functor(conj/2,Functor(goal1/2,Var(X),Var(Y)),Functor(goal2/2,Var(A),Var(B))),Functor(goal3/2,Var(C),Var(D)))']];
	
	process(text, expected);});

it('ParserL3 - expression - 2', function(){
	
	var text = "goal1(X, Y), goal2(A,B) ; goal3(C,D).";
	var expected = [['Functor(disj/2,Functor(conj/2,Functor(goal1/2,Var(X),Var(Y)),Functor(goal2/2,Var(A),Var(B))),Functor(goal3/2,Var(C),Var(D)))']];
	
	process(text, expected);
});

it('ParserL3 - expression - 3', function(){
	
	Functor.inspect_compact_version = true;
	
	var text = "append([H|T],L2,[H|L3])  :-  append(T,L2,L3).";
	var expected = [[
   //rule(append(cons(Token(var,H),cons(Token(var,T),Token(nil,null))),Var(L2),cons(Token(var,H),cons(Token(var,L3),Token(nil,null)))),
   //       append(Var(T),Var(L2),Var(L3)))
	                 'rule(append(cons(Var(H),Var(T)),Var(L2),cons(Var(H),Var(L3))),append(Var(T),Var(L2),Var(L3)))'	                
	                 ]];
	
	process(text, expected);
	
	Functor.inspect_compact_version = false;
});

it('ParserL3 - expression - 4 ', function(){
	
	var text = "max(X,Y,Z) :- X=< Y, !, Y=Z.";
	
	var expected = [[
	                	'Functor(rule/2,'+
	                	  'Functor(max/3,Var(X),Var(Y),Var(Z)),'+
	                	  'Functor(conj/2,'+
	                	  		'Functor(conj/2,'+
	                	  			'Functor(em/2,Var(X),Var(Y)),'+
	                	  			'Functor(cut/0)),'+
	                	  		'Functor(unif/2,Var(Y),Var(Z))))'	                
	                ]];
	
	process(text, expected);
});

it('ParserL3 - expression - 5 ', function(){
	
	var text = "f1(a), f2(a), f3(a), f4(a).";
	
	var expected =  [ [ 
	                    'Functor(conj/2,'+
	                    	'Functor(conj/2,'+
	                    		'Functor(conj/2,'+
	                    			'Functor(f1/1,Token(term,a)),Functor(f2/1,Token(term,a))),' +
	                    		'Functor(f3/1,Token(term,a))),Functor(f4/1,Token(term,a)))' 
	                    ] ];
	
	process(text, expected);
});

it('ParserL3 - expression - 6 ', function(){
	
	var text = "f1(a) ; f2(a) ; f3(a) ; f4(a).";
	
	var expected =  [ [ 
	                    'Functor(disj/2,'+
	                    		'Functor(disj/2,'+
	                    				'Functor(disj/2,Functor(f1/1,Token(term,a)),Functor(f2/1,Token(term,a))),'+
	                    				'Functor(f3/1,Token(term,a))),'+
	                    		'Functor(f4/1,Token(term,a)))' ] ];
	
	process(text, expected);
});


it('ParserL3 - expression - 7 ', function(){
	
	var text = "f1(f2(f3(a,b))).";
	
	var expected =  [ [ 
	                    'Functor(f1/1,Functor(f2/1,Functor(f3/2,Token(term,a),Token(term,b))))' 
	                    ] ];
	
	process(text, expected);
});

it('ParserL3 - expression - 8 ', function(){
	
	var text = "X is A+B.";
	
	var expected =  [ [ 
	                    'Functor(is/2,Var(X),Functor(plus/2,Var(A),Var(B)))' 
	                    ] ];
	
	process(text, expected);
});

it('ParserL3 - expression - 9 ', function(){
	
	var text = "f(X) :- X = 1, X \\= 0.";
	
	var expected =  [ [ 
	                    'Functor(rule/2,Functor(f/1,Var(X)),Functor(conj/2,Functor(unif/2,Var(X),Token(number,1)),Functor(notunif/2,Var(X),Token(number,0))))' 
	                    ] ];
	
	process(text, expected);
});


it('ParserL3 - multi-expression - 1', function(){
	
	Functor.inspect_compact_version = false;
	
	var text = "f1(a,b,c). \n f2(d,e,f). \n f3(x,y,z).\n";
	var expected = [ 
	                 [ 'Functor(f1/3,Token(term,a),Token(term,b),Token(term,c))' ],
	                 [ 'Functor(f2/3,Token(term,d),Token(term,e),Token(term,f))' ],
	                 [ 'Functor(f3/3,Token(term,x),Token(term,y),Token(term,z))' ] 
					];
	
	process(text, expected);
});

/*
it('ParserL3 - multi-expression - 2', function(){
	
	Functor.inspect_compact_version = false;
	
	var text = "select(X, [X|Tail], Tail)\n select(Elem, [Head|Tail], [Head|Rest]) :- select(Elem, Tail, Rest).\n";
	var expected = [ 
	                 [ 'Functor(f2/3,Token(term,d),Token(term,e),Token(term,f))' ],
	                 [ 'Functor(f3/3,Token(term,x),Token(term,y),Token(term,z))' ] 
					];
	
	process(text, expected);
});
*/


it('ParserL3 - list - 1', function(){
	
	Functor.inspect_compact_version = true;
	
	var text = "[A,B | T ].";
	var expected = [[
	                 'cons(Var(A),cons(Var(B),Var(T)))'
	                 ]];
	
	process(text, expected);
});

it('ParserL3 - list - 2', function(){
	
	Functor.inspect_compact_version = true;
	
	var text = "f([A,B]).";
	var expected = [[
	                 'f(cons(Var(A),cons(Var(B),Token(nil,null))))'
	                 ]];
	
	process(text, expected);
});

it('ParserL3 - list - 3', function(){

	//console.log("\n~~~~~~~~~~~ ParserL3 - list - 3");
	
	/* Parser L2 production:
	 * 
	 *    f(cons(Var(A),cons(Var(B)),  OpNode(`:-`,1200),  list(Var(A),Var(B))))
	 * 
	 */
	
	/* ISSUE ...
	 *   f(cons(Var(A),rule(cons(Var(B)),list(Var(A),Var(B)))))
	 * 
	 */
	
	Functor.inspect_compact_version = true;
	
	var text = "f([A,B]) :- list(A,B).";
	var expected = [[
	                 'rule(f(cons(Var(A),cons(Var(B),Token(nil,null)))),list(Var(A),Var(B)))'
	                 ]];
	
	process(text, expected);
});


it('ParserL3 - sub-expr - 1', function(){
	
	Functor.inspect_compact_version = true;
	
	var text = "(X+2)*3.";
	
	// mult(expr(plus(Var(X),Token(number,2))),Token(number,3))
	
	var expected = [[
	                 'mult(plus(Var(X),Token(number,2)),Token(number,3))'
	                 ]];
	
	process(text, expected);
});

it('ParserL3 - sub-expr - 2', function(){
	
	Functor.inspect_compact_version = true;
	
	var text = "(X+2)*(3+Y).";
	
	// mult(expr(plus(Var(X),Token(number,2))),Token(number,3))
	
	var expected = [[
	                 'mult(plus(Var(X),Token(number,2)),plus(Token(number,3),Var(Y)))'
	               ]];
	
	process(text, expected);
});

it('ParserL3 - rule + comment - 1', function(){
	
	Functor.inspect_compact_version = true;
	
	var text = "f(X) :-  %some comment\n"
				+" g(X).\n";
	
	var expected = [[
	                 'rule(f(Var(X)),g(Var(X)))'
	               ]];
	
	process(text, expected);
});

it('ParserL3 - invalid - 1', function(){
	
	Functor.inspect_compact_version = true;
	
	var text = "f(1) f(2)";
	
	var expected = [[
	               ]];
	
	should.throws(function(){
		process(text, expected);	
	}, ErrorSyntax);
	
});


it('ParserL3 - query - 1', function(){
	
	Functor.inspect_compact_version = true;
	
	var text = "?- f(X).";

	var expected = [[
	                 'query(f(Var(X)))'
	               ]];
	
	process(text, expected);
});

/*
it('ParserL3 - query - 2', function(){
	
	Functor.inspect_compact_version = true;
	
	var text = "?- f(X) :- X = 0.";

	var expected = [[
	                 'query(f(Var(X)))'
	               ]];
	
	process(text, expected);
});
*/