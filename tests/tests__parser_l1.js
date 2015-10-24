/*
 * prolog.js test cases
 * 
 * @author: jldupont
 */

var should = require('should');
var assert = require('assert');

var pr = require("../prolog.js");

var Lexer = pr.Lexer;
var Token = pr.Token;
var ParserL1 = pr.ParserL1;
var Eos = pr.Eos;
var Nothing = pr.Nothing;


var process = function(text, expected_list, options){
	
	options = options || {};
	
	var l = new Lexer(text);
	var list = l.process();

	var t = new ParserL1(list, {convert_fact: false});
	var tresult = t.process();
	
	if (options.show_parsed)
		console.log("Parsed: ", tresult);
	
	var check = Token.check_for_match(tresult, expected_list);
	
	should.equal(check, true);	
};

/**
 * 
 */
it('ParserL1 - simple', function(){

	var text = "love(mercedes).\n";
	
	var expected_list = [
	                     new Token('functor', 'love', 0),
	                     new Token('term', 'mercedes', 5),
	                     new Token('parens_close', null, 13),
	                     new Token('period', null, 14),
	                     new Token('newline', null, 15)
	                     ];
	
	process(text, expected_list);
});

it('ParserL1 - simple - no convert fact', function(){

	var text = "love(mercedes).\n";
	
	var expected_list = [
	                     new Token('functor', 'love', 0),
	                     new Token('term', 'mercedes', 5),
	                     new Token('parens_close', null, 13),
	                     new Token('period', null, 14),
	                     new Token('newline', null, 15)
	                     ];
	
	process(text, expected_list);
});


it('ParserL1 - remove whitespaces', function(){

	var text = " 	love(mercedes).	\n";
	
	var expected_list = [
	                     new Token('functor', 'love', 0),
	                     new Token('term', 'mercedes', 5),
	                     new Token('parens_close', null, 13),
	                     new Token('period', null, 14),
	                     new Token('newline', null, 15)
	                     ];
	
	process(text, expected_list);
});


it('ParserL1 - var - 1', function(){

	var text = "X=Y.\n";

	var expected_list = [
	                     new Token('var',     'X'),
	                     new Token('op:unif', '='),
	                     new Token('var',     'Y'),
	                     new Token('period',   null),
	                     new Token('newline',  null)
	                     ];
	
	process(text, expected_list);
});

it('ParserL1 - var - 2', function(){

	var text = "X+-Y";

	var expected_list = [
	                     new Token('var',  'X'),
	                     new Token('term', '+-'),
	                     new Token('var',  'Y'),
	                     ];
	
	process(text, expected_list);
});

it('ParserL1 - parens - 1', function(){

	var text = "(X,Y).\n";

	var expected_list = [
	                     new Token('parens_open', null),
	                     new Token('var',     'X'),
	                     new Token('op:conj', ','),
	                     new Token('var',     'Y'),
	                     new Token('parens_close', null),
	                     new Token('period',   null),
	                     new Token('newline',  null)
	                     ];
	
	process(text, expected_list);
});

it('ParserL1 - list - nil', function(){

	var text = "[].\n";

	var expected_list = [
	                     new Token('nil', null),
	                     new Token('period',   null),
	                     new Token('newline',  null)
	                     ];
	
	process(text, expected_list);
});

it('ParserL1 - expression - 1', function(){

	var text = "test(X) :- X1 is X + 1, X1 > 0.";

	var expected_list = [
		new Token('functor','test'),
		new Token('var','X'),
		new Token('parens_close',null),
		new Token('op:rule',':-'),
		new Token('var','X1'),
		new Token('op:is','is'),
		new Token('var','X'),
		new Token('op:plus','+'),
		new Token('number',1),
		new Token('op:conj',','),
		new Token('var','X1'),
		new Token('op:gt','>'),
		new Token('number',0),
		new Token('period',null)	                     
		];
	
	//process(text, expected_list, {show_parsed: true});
	process(text, expected_list);
});

it('ParserL1 - string - 1', function(){

	var text = "test(X) :- print('Test: ', X).";

	var expected_list = [
		new Token('functor','test'),
		new Token('var','X'),
		new Token('parens_close',null),
		new Token('op:rule',':-'),
		new Token('functor','print'),
		new Token('string','Test: '),
		new Token('op:conj',','),
		new Token('var','X'),
		new Token('parens_close', null),
		new Token('period',null)	                     
		];
	
	//process(text, expected_list, {show_parsed: true});
	process(text, expected_list);
});



/*  THIS DOES NOT BLOW UP AT THIS POINT - IT IS NORMAL
it('ParserL1 - error - 1', function(){

	var text = "[1,2.";

	var expected_list = [
	                     ];
	
	process(text, expected_list, {show_parsed: true});
});
*/