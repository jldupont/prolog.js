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
var ParserL2 = pr.ParserL2;
var Token = pr.Token;
var Functor = pr.Functor;
var ParserL1 = pr.ParserL1;
//var OpNode = pr.OpNode;

var ErrorUnexpectedEnd = pr.ErrorUnexpectedEnd;


var preprocess_list = function(text, expected) {
	var tokens = setup_l1(text);
	
	var list = ParserL2.preprocess_list(tokens);
	
	var result = compare(list, expected);
	
	should.equal(result, true, "Got: " + util.inspect(list));
};

var process_list = function(text, expected) {
	var tokens = setup_l1(text);
	
	//var prelist = ParserL2.preprocess_list(tokens);
	
	var p2 = new ParserL2(tokens);
	
	var list = p2.process_list();

	var result = util.inspect(list);
	
	should.equal(result, expected, "Got: " + util.inspect(list));
};


var setup = function(text, options) {

	options = options || {};

	Functor.inspect_short_version = false;
	
	Functor.inspect_quoted = false;
	Token.inspect_quoted = false;
	
	var l = new Lexer(text);
	var tokens = l.process();

	var t = new ParserL1(tokens);
	var ttokens = t.process();
	
	if (options.show_parsedl1)
		console.log("Parsed L1: ", ttokens);
	
	var p, result;
	
	try {
		p = new ParserL2(ttokens);
		result = p.process();
	} catch(e) {
		
		if (options.parserl2_dump) {
			console.log(result);
			throw e;
		}
			
	}
	
	var exp0 = result.terms[0];
	
	//console.log(exp0);
	
	return exp0;
};

var setup_l1 = function(text, convert_fact) {

	Functor.inspect_short_version = false;
	
	Functor.inspect_quoted = false;
	Token.inspect_quoted = false;
	
	var l = new Lexer(text);
	var tokens = l.process();

	var t = new ParserL1(tokens, {convert_fact: convert_fact});
	var ttokens = t.process();
	
	return ttokens;
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
	}
	
	return true;
};

var process = function(text, expected, options) {
	
	options = options || {};
	
	var exp;
	
	try {
		exp = setup(text, options);
	} catch(e) {
		//console.error(e);
		throw e;
	}
	
	var result = compare(exp, expected);
	
	should.equal(result, true, "Got: " + util.inspect(exp));
	
};

/**
 *  We should only get the first token
 *   to be transformed to an 'atom' since
 *   we have not stepped the process further along
 */
it('ParserL2 - simple - no fact no rule', function(){
	
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
	
	//process(text, expected, {show_parsedl1: true, parserl2_dump: true});
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
	                 'Functor(true/0)' ];
	
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

it('ParserL2 - operator - 5', function(){

	var text = "f(X) :- X=0, X\\=1.";
	var expected = [ 
						  'Functor(f/1,Var(X))',
						  'OpNode(`:-`,1200)',
						  'Var(X)',
						  'OpNode(`=`,700)',
						  'Token(number,0)',
						  'OpNode(`,`,1000)',
						  'Var(X)',
						  'OpNode(`\\=`,700)',
						  'Token(number,1)'		
	                 ];
	
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

it('ParserL2 - list - 0', function(){

	var text = "[1]";
	var expected =  [ 
	                  'Functor(cons/2,Token(number,1),Token(nil,null))' 
	                  ];
	
	process(text, expected);
});


it('ParserL2 - list - 1', function(){

	var text = "[1,2,3]";
	var expected =  [ 
	                  'Functor(cons/2,Token(number,1),Functor(cons/2,Token(number,2),Functor(cons/2,Token(number,3),Token(nil,null))))' 
	                  ];
	
	process(text, expected);
});

it('ParserL2 - list - 2', function(){

	var text = "[A,B | T]";
	var expected = [ 
	'Functor(cons/2,Var(A),Functor(cons/2,Var(B),Var(T)))' 
	                 ];
	
	process(text, expected);
});

it('ParserL2 - list - 3', function(){

	var text = "[]";
	var expected = [ 'Token(nil,null)' ];
	
	process(text, expected);
});



// =====================




it('ParserL2 - list preproc - 1', function(){

	//console.log("\n~~~~~~~~~~~~ ParserL2 - list preproc -1 ");
	
	var text = "[1,2]";
	var expected = [
	                "Token(list:open,null)"
	                ,"Token(number,1)"
	                ,"Token(number,2)"
	                ,"Token(list:close,null)"
	                ]; 
	
	preprocess_list(text, expected);
});

it('ParserL2 - list preproc - 2', function(){

	//console.log("\n~~~~~~~~~~~~ ParserL2 - list preproc - 2 ");
	
	var text = "[]";
	var expected = [ "Token(nil,null)" ];
	
	preprocess_list(text, expected);
});

it('ParserL2 - list preproc - 3', function(){

	//console.log("\n~~~~~~~~~~~~ ParserL2 - list preproc - 3 ");
	
	var text = "[1,2,3]";
	var expected = [ 
	                "Token(list:open,null)"
	                , "Token(number,1)", "Token(number,2)", "Token(number,3)"
	                ,"Token(list:close,null)"
	                 ];
	
	preprocess_list(text, expected);
});

/*
 *   TODO It is not clear we want to support this
 */
it('ParserL2 - list preproc - 4', function(){

	//console.log("\n~~~~~~~~~~~~ ParserL2 - list preproc - 4 ");
	
	var text = "[1,,2,3]";
	var expected = [ 
        "Token(list:open,null)"
        , "Token(number,1)", "Token(number,2)", "Token(number,3)"
        ,"Token(list:close,null)"
        ];
	
	preprocess_list(text, expected);
});






it('ParserL2 - list proc - 1', function(){

	//console.log("\n~~~~~~~~~~~~ ParserL2 - list proc -1 ");
	
	Functor.inspect_compact_version = true;
	
	var text = "[66,77]";
	var expected = "cons(Token(number,66),cons(Token(number,77),Token(nil,null)))";
	
	process_list(text, expected);
});

it('ParserL2 - list proc - 2', function(){

	//console.log("\n~~~~~~~~~~~~ ParserL2 - list proc - 2 ");
	
	Functor.inspect_compact_version = true;
	
	var text = "[1]";
	var expected = "cons(Token(number,1),Token(nil,null))";
	
	process_list(text, expected);
});

it('ParserL2 - list proc - 3', function(){

	//console.log("\n~~~~~~~~~~~~ ParserL2 - list proc - 3 ");
	
	var text = "[]";
	var expected = "Token(nil,null)";
	
	process_list(text, expected);
});

it('ParserL2 - list proc - 4', function(){

	//console.log("\n~~~~~~~~~~~~ ParserL2 - list proc - 4 ");
	
	var text = "[1,2,3]";
	var expected = "cons(Token(number,1),cons(Token(number,2),cons(Token(number,3),Token(nil,null))))";
	
	process_list(text, expected);
});

it('ParserL2 - list proc - 5', function(){

	var text = "[1,2|3]";
	var expected = "cons(Token(number,1),cons(Token(number,2),Token(number,3)))";
	
	process_list(text, expected);
});

it('ParserL2 - list proc - 6', function(){

	var text = "[1|2]";
	var expected = "cons(Token(number,1),Token(number,2))";
	
	process_list(text, expected);
});

it('ParserL2 - list proc - 7', function(){

	var text = "[[1,2],3]";
	var expected = "cons(cons(Token(number,1),cons(Token(number,2),Token(nil,null))),cons(Token(number,3),Token(nil,null)))";
	
	process_list(text, expected);
});

/**
 *  Just process the list, nothing else
 */
it('ParserL2 - list proc - 8', function(){

	var text = "[[1,2],3](";
	var expected = "cons(cons(Token(number,1),cons(Token(number,2),Token(nil,null))),cons(Token(number,3),Token(nil,null)))";
	
	process_list(text, expected);
});


/**
 * TODO not clear we want support for this
 *      syntax error this way,
 */
it('ParserL2 - list proc - errors 1', function(){

	var text = "[";
	var expected = "Token(nil,null)";
	
	process_list(text, expected);
});

/**
 * TODO not clear we want support for this
 *      syntax error this way,
 */
it('ParserL2 - list proc - errors 2', function(){

	var text = "[1,";
	var expected = "cons(Token(number,1),Token(nil,null))";
	
	process_list(text, expected);
});


it('ParserL2 - list - complex - 1', function(){

	var text = "f([A,B]) :- list(A,B).";
	var expected = [ 
	'f(cons(Var(A),cons(Var(B),Token(nil,null))))'
	,'OpNode(`:-`,1200)'
	,'list(Var(A),Var(B))'
	                 ];
	
	process(text, expected);
});


it('ParserL2 - list - complex - 2', function(){

	var text = "test(X) :- X1 is X + 1, X1 > 0.";
	var expected = [
	                
'test(Var(X))',
'OpNode(`:-`,1200)',
'Var(X1)',
'OpNode(`is`,700)',
'Var(X)',
'OpNode(`+`,null)',
'Token(number,1)',
'OpNode(`,`,1000)',
'Var(X1)',
'OpNode(`>`,700)',
'Token(number,0)'
	                 ];
	
	process(text, expected);
});

it('ParserL2 - list - complex - 3', function(){

/*
	Var(HS), OpNode(`=`,700),
  		cons( Token(functor,f),
  				cons(Var(_),
  					cons(Token(term,a),
  						cons(Token(parens_close,null),
  							cons(Token(functor,g),
  								cons(Var(_),
  									cons(Token(parens_close,null),
  										Token(nil,null))))))))
*/
	var text = "HS = [f(_,a), g(_)].";
	var expected = [
					'Var(HS)'
  					,'OpNode(`=`,700)'
  					,'cons(f(Var(_),Token(term,a)),cons(g(Var(_)),Token(nil,null)))'
	                 ];
	
	//process(text, expected, {show_parsedl1: true, parserl2_dump: true});
	process(text, expected);
});

it('ParserL2 - error - 1', function(){

	var text = "[1,2.";
	var expected = [
	                 ];
	
	//process(text, expected, {show_parsedl1: true, parserl2_dump: true});
	should.throws(function() {
		process(text, expected);
	}
	,ErrorUnexpectedEnd);
});



it('ParserL2 - list complex - 1', function(){

	//Functor.inspect_compact_version = true;

	var text = "[1 | [2 | [3,4] ] ]";
	var expected = [ "cons(Token(number,1),cons(Token(number,2),cons(Token(number,3),cons(Token(number,4),Token(nil,null)))))" ];
	
	//process(text, expected, {show_parsedl1 : true, show_parsedl2: true});
	process(text, expected);
});
