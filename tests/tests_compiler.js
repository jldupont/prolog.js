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
var Visitor = pr.Visitor;
var Compiler = pr.Compiler;
var Instruction = pr.Instruction;
var Utils = pr.Utils;

var ErrorInvalidHead = pr.ErrorInvalidHead;


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

var process_head = function(input_text, expecteds) {
	
	var expressions = setup(input_text);
	
	var results = [];
	
	//console.log(expressions);
	
	for (var index = 0; index<expressions.length; index++) {
		
		var expression = expressions[index][0];
		
		if (!expression)
			return false;

		var c = new Compiler();
		
		//console.log("Expression: ", expression);

		var result = c.process_head(expression);
		
		results.push(result);
	};
	
	//console.log(results);
	
	//if (expecteds.length!=results.length)
	//	throw new Error();
	
	for (var index=0; index < results.length; index++) {
		
		var ri = results[index];
		var expected = expecteds[index];
		
		var result = Utils.compare_objects(expected, ri, true);
		should.equal(result, true, "expected: " + util.inspect(results));
	};


};

var process_goal = function(input_text, expecteds) {
	
	var expressions = setup(input_text);
	
	var results = [];
	
	//console.log(expressions);
	
	for (var index = 0; index<expressions.length; index++) {
		
		var expression = expressions[index][0];
		
		if (!expression)
			break;

		var c = new Compiler();
		
		//console.log("Expression: ", expression);

		var result = c.process_goal(expression);
		
		results.push(result);
	};
	
	//console.log(results);
	
	//if (expecteds.length!=results.length)
	//	throw new Error();
	
	for (var index=0; index < results.length; index++) {
		
		var ri = results[index];
		var expected = expecteds[index];

		//console.log("Input:  ", ri);
		//console.log("Expect: ", expected);
		
		var result = Utils.compare_objects(expected, ri);
		
		should.equal(result, true, "input: " + util.inspect(ri));
	};


};


var process_body = function(input_text, expecteds) {
	
	var expressions = setup(input_text);
	
	var results = [];
	
	//console.log(expressions);
	
	for (var index = 0; index<expressions.length; index++) {
		
		var expression = expressions[index][0];
		
		if (!expression)
			break;

		var c = new Compiler();
		
		//console.log("Expression: ", expression);

		var result = c.process_body(expression);
		
		results.push(result);
	};
	
	//console.log(results);
	
	//if (expecteds.length!=results.length)
	//	throw new Error();
	
	for (var index=0; index < results.length; index++) {
		
		var ri = results[index];
		var expected = expecteds[index];
		
		var result = Utils.compare_objects(expected, ri, true);
		should.equal(result, true, "input: " + util.inspect(ri));
	};


};

var process_rule = function(input_text, expecteds) {
	
	var expressions = setup(input_text);
	
	var results = [];
	
	//console.log(expressions);
	
	for (var index = 0; index<expressions.length; index++) {
		
		var expression = expressions[index][0];
		
		if (!expression)
			break;

		var c = new Compiler();
		
		//console.log("Expression: ", expression);

		var result = c.process_rule(expression);
		
		results.push(result);
	};
	
	//console.log(results);
	
	//if (expecteds.length!=results.length)
	//	throw new Error();
	
	for (var index=0; index < results.length; index++) {
		
		var ri = results[index];
		var expected = expecteds[index];
		
		var result = Utils.compare_objects(expected, ri);
		should.equal(result, true, "input: " + util.inspect(ri));
	};


};

var process = function(input_text, expecteds) {
	
	var expressions = setup(input_text);
	
	var results = [];
	
	//console.log(expressions);
	
	for (var index = 0; index<expressions.length; index++) {
		
		var expression = expressions[index][0];
		
		if (!expression)
			break;

		var c = new Compiler();
		
		//console.log("Expression: ", expression);

		var result = c.process_rule_or_fact(expression);
		
		results.push(result);
	};
	
	//console.log(results);
	
	//if (expecteds.length!=results.length)
	//	throw new Error();
	
	for (var index=0; index < results.length; index++) {
		
		var ri = results[index];
		var expected = expecteds[index];
		
		var result = Utils.compare_objects(expected, ri);
		should.equal(result, true, "input: " + util.inspect(ri));
	};


};

// ==================================================== HEAD
//
it('Compiler - check - 1', function(){
	
	var text = "f1(a), f2(b).";
	var expected = [
	                {}
	                 ];
	
	should.throws(function(){
		process_head(text, expected);	
	}, ErrorInvalidHead);
	
});


it('Compiler - basic - 0', function(){
	
	var text = "h1(666).";
	var expected = [[ 
	'get_struct   ( h1/1, x(0) )', 
	'get_number   ( p(666) )'	               
	]];
	
	process_head(text, expected);
});


it('Compiler - basic - 1', function(){
	
	var text = "f(A).";
	var expected = [[ 
	'get_struct   ( f/1, x(0) )', 
	'unif_var     ( x("A") )'               
	]];
	
	process_head(text, expected);
});


it('Compiler - basic - 2', function(){
	
	var text = "h1(a, h2( h3a(h3a), h3b(h3b), h3c(h3c)) ,666).";
	var expected = [[ 
  'get_struct   ( h1/3, x(0) )',
  'get_term     ( p("a") )',
  'unif_var     ( x(1) )',
  'get_number   ( p(666) )',
  'get_struct   ( h2/3, x(1) )',
  'unif_var     ( x(2) )',
  'unif_var     ( x(3) )',
  'unif_var     ( x(4) )',
  'get_struct   ( h3a/1, x(2) )',
  'get_term     ( p("h3a") )',
  'get_struct   ( h3b/1, x(3) )',
  'get_term     ( p("h3b") )',
  'get_struct   ( h3c/1, x(4) )',
  'get_term     ( p("h3c") )' 
  ]];
	
	process_head(text, expected);
});

//==================================================== GOAL
//


it('Compiler - goal - basic - 1', function(){
	
	var text = "h1(a, h2(b, h3(c))).";
	var expected = [[
	'allocate',
	'put_struct   ( h3/1, x(1) )',
	'put_term     ( p("c") )',
	'put_struct   ( h2/2, x(2) )',
	'put_term     ( p("b") )',
	'put_value    ( x(1) )',
	'put_struct   ( h1/2, x(0) )',
	'put_term     ( p("a") )',
	'put_value    ( x(2) )',
	'call',
	'deallocate'
	]];
	
	process_goal(text, expected);
});

it('Compiler - goal - basic - 2', function(){
	
	var text = "h1(A).";
	var expected = [[
	             'allocate',
                 'put_struct   ( h1/1, x(0) )',
                 'put_var      ( x("A") )',
                 'call',
                 'deallocate'
	]];
	
	process_goal(text, expected);
});


//==================================================== BODY
//


it('Compiler - body - basic - 1', function(){
	
	var text = "h1(a).";
	var expected = [
	      { g0: [ 
	             'allocate',
	              'put_struct   ( h1/1, x(0) )', 
	              'put_term     ( p("a") )',
	              'call'
	              ,'deallocate'
	              ] 
	      }        
	];
	
	process_body(text, expected);
});


it('Compiler - body - basic - 2', function(){
	
	var text = "f1(a), f2(b).";
	var expected = [
	       
		{ g0: 
		    [ 
		      'allocate',
		      'put_struct   ( f1/1, x(0) )',
		      'put_term     ( p("a") )',
		      'call',
		      'deallocate',
		      'allocate',
		      'put_struct   ( f2/1, x(0) )',
		      'put_term     ( p("b") )',
		      'call',
		      'deallocate'
		      ] }

	];
	
	process_body(text, expected);
});

it('Compiler - body - basic - 3', function(){
	
	var text = "f1(a), f2(f3(b)).";
	var expected = [
	       
		{ g0: 
		   [ 
		     'allocate',
		     'put_struct   ( f1/1, x(0) )',
		     'put_term     ( p("a") )',
		     'call',
		     'deallocate',
		     'allocate',
		     'put_struct   ( f3/1, x(1) )',
		     'put_term     ( p("b") )',
		     'put_struct   ( f2/1, x(0) )',
		     'put_value    ( x(1) )',
		     'call',
		     'deallocate'
		     ] }

	];
	
	process_body(text, expected);
});



it('Compiler - body - complex - 1', function(){
	
	var text = "f1(a), f2(b) ; f3(c).";
	var expected = [

		{ 
		 g4:   [ 
		        'allocate',
		        'put_struct   ( f3/1, x(0) )', 
		        'put_term     ( p("c") )',
		        'call',
		        'deallocate'
		        ],
		  g0:  [ 
		         'try_else     ( p("g4") )',
		         'allocate',
			     'put_struct   ( f1/1, x(0) )',
			     'put_term     ( p("a") )',
			     'call',
			     'deallocate',
			     'allocate',
			     'put_struct   ( f2/1, x(0) )',
			     'put_term     ( p("b") )',
			     'call',
			     'deallocate'
		     ] 
		}	                
	                
	];
	
	process_body(text, expected);
});

//==================================================== RULE
//

it('Compiler - rule - basic - 1', function(){
	
	var text = "f1(A) :- f2(A).";
	var expected = [

		{ 
			g0: 
			   [ 'allocate',
			     'put_struct   ( f2/1, x(0) )',
			     'put_var      ( x("A") )',
			     'call',
			     'deallocate'],
		  head: [ 
		           'get_struct   ( f1/1, x(0) )'
		          ,'unif_var     ( x("A") )'
		          ] 
		}	                
	                
	];
	
	process_rule(text, expected);
});


//==================================================== RULE OR FACT
//


it('Compiler - rule/fact - basic - 0', function(){
	
	var text = "likes(jld, chocolat).";
	var expected = [

		[ 
		  'get_struct   ( likes/2, x(0) )',
		  'get_term     ( p("jld") )',
		  'get_term     ( p("chocolat") )' 
		  ]	                
	];
	
	process(text, expected);
});

it('Compiler - rule/fact - basic - 1', function(){
	
	var text = "f1(A) :- f2(A), f3(A).";
	var expected = [

		{ 
			g0: 
			   [ 'allocate',
			     'put_struct   ( f2/1, x(0) )',
			     'put_var      ( x("A") )',
			     'call',
			     'deallocate',
			     'allocate',
			     'put_struct   ( f3/1, x(0) )',
			     'put_var      ( x("A") )',
			     'call',
			     'deallocate'			     
			     ],
		  head: [ 
		           'get_struct   ( f1/1, x(0) )'
		          ,'unif_var     ( x("A") )'
		          ] 
		}	                
	                
	];
	
	process_rule(text, expected);
});
