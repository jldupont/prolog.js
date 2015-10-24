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
var Var = pr.Var;

var ParserL1 = pr.ParserL1;
var ParserL2 = pr.ParserL2;
var ParserL3 = pr.ParserL3;
//var Visitor = pr.Visitor;
var Compiler = pr.Compiler;
var Instruction = pr.Instruction;
var Utils = pr.Utils;

var ErrorInvalidHead = pr.ErrorInvalidHead;
var ErrorRuleInQuestion = pr.ErrorRuleInQuestion;

var process_rule = function(input_text, expecteds, options) {
	
	Var.inspect_compact = true;
	
	options = options || {};
	
	var expressions = setup(input_text);
	
	var results = [];
	
	if (options.show_parsed)
		console.log("Parsed:", expressions);
	
	for (var index = 0; index<expressions.length; index++) {
		
		var expression = expressions[index][0];
		
		if (!expression)
			break;

		var result;
		var c = new Compiler();
		
		//console.log("Expression: ", expression);

		try {
			result = c.process_rule_or_fact(expression);
		} catch(e) {
			console.error("Compilation Error: ", e);	
			throw e;
		}
	
		//console.log("result= ", result);
		
		results.push(result);
	}
	
	Var.inspect_compact = true;
	
	if (options.show_compiled)
		console.log("Code: ", results);
	
	//if (expecteds.length!=results.length)
	//	throw new Error();
	
	for (var index=0; index < results.length; index++) {
		
		var ri = results[index];
		var expected = expecteds[index];
		
		//console.log("Comparing: ", expected, "-->", ri);
		
		result = Utils.compare_objects(expected, ri);
		should.equal(result, true, "input: " + util.inspect(ri));
	}


};


var setup = function(text) {

	var l = new Lexer(text);
	var tokens = l.process();

	var t = new ParserL1(tokens);
	var ttokens = t.process();
	
	//console.log(ttokens);
	
	var p = new ParserL2(ttokens);
	
	var result, terms;
	
	try {
		result = p.process();
		terms = result.terms;
	} catch (e) {
		console.error(e);
		console.log(e.classname);
		throw e;
	}
	
	//console.log(terms);
	
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
	}
	
	//console.log(results);
	
	//if (expecteds.length!=results.length)
	//	throw new Error();
	
	for (var index=0; index < results.length; index++) {
		
		var ri = results[index];
		var expected = expecteds[index];
		
		result = Utils.compare_objects(expected, ri, true);
		should.equal(result, true, "expected: " + util.inspect(results));
	}


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
	}
	
	//console.log(results);
	
	//if (expecteds.length!=results.length)
	//	throw new Error();
	
	for (var index=0; index < results.length; index++) {
		
		var ri = results[index];
		var expected = expecteds[index];

		//console.log("Input:  ", ri);
		//console.log("Expect: ", expected);
		
		result = Utils.compare_objects(expected, ri);
		
		should.equal(result, true, "input: " + util.inspect(ri));
	}


};


var process_body = function(input_text, expecteds, show_results) {
	
	Functor.inspect_short_version = false;
	
	var expressions = setup(input_text);
	
	var results = [];
	
	if (show_results) {
		console.log(expressions[0][0]);
		console.log("\n");
	}
		
	
	for (var index = 0; index<expressions.length; index++) {
		
		var expression = expressions[index][0];
		
		if (!expression)
			break;

		var c = new Compiler();
		
		//console.log("Expression: ", expression);

		var result = c.process_body(expression);
		
		results.push(result);
	}
	
	if (show_results)
		console.log(results);
	
	//if (expecteds.length!=results.length)
	//	throw new Error();
	
	for (var index=0; index < results.length; index++) {
		
		var ri = results[index];
		var expected = expecteds[index];
		
		result = Utils.compare_objects(expected, ri, true);
		should.equal(result, true, "input: " + util.inspect(ri));
	}


};


var process = function(input_text, expecteds, options) {
	
	options = options || {};
	
	Var.inspect_compact = true;
	
	var expressions = setup(input_text);
	
	var results = [];
	
	if (options.show_parsed)
		console.log(expressions);
	
	for (var index = 0; index<expressions.length; index++) {
		
		var expression = expressions[index][0];
		
		if (!expression)
			break;

		var c = new Compiler();
		
		//console.log("Expression: ", expression);

		var result = c.process_query_or_rule_or_fact(expression);
		
		results.push(result);
	}
	
	if (options.show_compiled)
		console.log(results);
	
	//if (expecteds.length!=results.length)
	//	throw new Error();
	
	for (var index=0; index < results.length; index++) {
		
		var ri = results[index];
		var expected = expecteds[index];
		
		result = Utils.compare_objects(expected, ri);
		should.equal(result, true, "input: " + util.inspect(ri));
	}


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
	'get_number   ( p(666) )',
	'proceed'
	]];
	
	process_head(text, expected);
});


it('Compiler - basic - 1', function(){
	
	var text = "f(A).";
	var expected = [[ 
	'get_struct   ( f/1, x(0) )', 
	'get_var      ( p("A") )',
	'proceed'
	]];
	
	process_head(text, expected);
});


it('Compiler - basic - 2', function(){
	
	var text = "h1(a, h2( h3a(h3a), h3b(h3b), h3c(h3c)) ,666).";
	var expected = [[ 
  'get_struct   ( h1/3, x(0) )',
  'get_term     ( p("a") )',
  'get_var      ( x(1) )',
  'get_number   ( p(666) )',
  'get_struct   ( h2/3, x(1) )',
  'get_var      ( x(2) )',
  'get_var      ( x(3) )',
  'get_var      ( x(4) )',
  'get_struct   ( h3a/1, x(2) )',
  'unify_term   ( p("h3a") )',
  'get_struct   ( h3b/1, x(3) )',
  'unify_term   ( p("h3b") )',
  'get_struct   ( h3c/1, x(4) )',
  'unify_term   ( p("h3c") )',
  'proceed'
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
	'setup',
	'call',
	'maybe_retry',
	'deallocate'
	,'proceed'
	]];
	
	process_goal(text, expected);
});

it('Compiler - goal - basic - 2', function(){
	
	var text = "h1(A).";
	var expected = [[
	             'allocate',
                 'put_struct   ( h1/1, x(0) )',
                 'put_var      ( p("A") )',
                 'setup',
                 'call',
                 'maybe_retry',
                 'deallocate'
                 ,'proceed'
	]];
	
	process_goal(text, expected);
});

//==================================================== RULE OR FACT
//

it('Compiler - rule/fact - basic - 0', function(){
	
	var text = "f1(A) :- f2(A).";
	var expected = [

		{ 
			g0: 
			   [ 'allocate',
			     'put_struct   ( f2/1, x(0) )',
			     'put_var      ( p("A") )',
			     'setup',
			     'call',
			     'maybe_retry',
			     'deallocate'
			     ,'proceed'
			     ],
		  head: [ 
		           'get_struct   ( f1/1, x(0) )'
		          ,'get_var      ( p("A") )'
		          ,'jump         ( p("g0") )'
		          ] 
		}	                
	                
	];
	
	process_rule(text, expected);
});



it('Compiler - rule/fact - basic - 1', function(){
	
	var text = "likes(jld, chocolat).";
	var expected = [

		{head: [ 
		 
		  'get_struct   ( likes/2, x(0) )',
		  'get_term     ( p("jld") )',
		  'get_term     ( p("chocolat") )'
		  ,'proceed'
		  ]}             
	];
	
	process(text, expected);
});

it('Compiler - rule/fact - basic - 2', function(){
	
	var text = "f1(A) :- f2(A), f3(A).";
	var expected = [

		{ 
			g0: 
			   [ 'allocate',
			     'put_struct   ( f2/1, x(0) )',
			     'put_var      ( p("A") )',
			     'setup',
			     'call',
			     'maybe_retry',
			     'deallocate',
			     'maybe_fail',
			     'allocate',
			     'put_struct   ( f3/1, x(0) )',
			     'put_var      ( p("A") )',
			     'setup',
			     'call',
			     'maybe_retry',
			     'deallocate'
			     ,'proceed'
			     ],
		  head: [ 
		           'get_struct   ( f1/1, x(0) )'
		          ,'get_var      ( p("A") )'
		          ,'jump         ( p("g0") )'
		          ] 
		}	                
	                
	];
	
	process_rule(text, expected);
});

it('Compiler - rule/fact - complex - 1', function(){
	
	var text = "f1(A) :- f2(f3(f4(A))).";
	var expected = [

		{ 
			g0: 
			   [ 	'allocate'    ,
			       'put_struct   ( f4/1, x(1) )',
			       'put_var      ( p("A") )',
			       'put_struct   ( f3/1, x(2) )',
			       'put_value    ( x(1) )',
			       'put_struct   ( f2/1, x(0) )',
			       'put_value    ( x(2) )',
			       'setup',
			       'call'        ,
			       'maybe_retry',
			       'deallocate' 
			       ,'proceed'
			     ],
		  head: [ 
		           'get_struct   ( f1/1, x(0) )'
		          ,'get_var      ( p("A") )'
		          ,'jump         ( p("g0") )'
		          ] 
		}	                
	                
	];
	
	process_rule(text, expected);
});


it('Compiler - rule/fact - complex - 2', function(){
	
	var text = "f1(g1(A)) :- f2(f3(f4(A))).";
	var expected = [

		{ 
			g0: 
			   [   'allocate'    ,
			       'put_struct   ( f4/1, x(1) )',
			       'put_var      ( p("A") )',
			       'put_struct   ( f3/1, x(2) )',
			       'put_value    ( x(1) )',
			       'put_struct   ( f2/1, x(0) )',
			       'put_value    ( x(2) )',
			       'setup',
			       'call'        ,
			       'maybe_retry',
			       'deallocate' 
			       ,'proceed'
			     ],
		  head: [
					'get_struct   ( f1/1, x(0) )',
					'get_var      ( x(1) )',
					'get_struct   ( g1/1, x(1) )',
					'unif_var     ( p("A") )',
					'jump         ( p("g0") )'
		          ] 
		}	                
	                
	];
	
	process_rule(text, expected);
});


it('Compiler - rule/fact - most complex - 1', function(){
	
	var text = "f1(A,A) :- f2(A).";
	var expected = [
		{ g0: 
			   [ 'allocate'    ,
			     'put_struct   ( f2/1, x(0) )',
			     'put_var      ( p("A") )',
			     'setup'       ,
			     'call'        ,
			     'maybe_retry' ,
			     'deallocate'  ,
			     'proceed'
			     ],
			  head: 
			   [ 
			     'get_struct   ( f1/2, x(0) )',
			     'get_var      ( p("A") )',
			     'get_value    ( p("A") )',
			     'jump         ( p("g0") )' 
			     ],
			  f: 'f1',
			  a: 2 }

	];
	
	process_rule(text, expected);
});

//==================================================== BODY
//


it('Compiler - body - basic - 1', function(){
	
	/*
		jctx:  { type: 'root', vc: 0 }
		lctx:  { n: Functor(h1/1,'Token(term,a)') }
		rctx:  null 
	 */
	
	var text = "h1(a).";
	var expected = [
	      { g0: [ 
	              'allocate',
	              'put_struct   ( h1/1, x(0) )', 
	              'put_term     ( p("a") )',
	              'setup',
	              'call',
	              'maybe_retry',
	              'deallocate'
	              ,'proceed'
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
		      'setup',
		      'call',
		      'maybe_retry',
		      'deallocate',
		      'maybe_fail',
		      'allocate',
		      'put_struct   ( f2/1, x(0) )',
		      'put_term     ( p("b") )',
		      'setup',
		      'call',
		      'maybe_retry',
		      'deallocate'
		      ,'proceed'
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
		     'setup',
		     'call',
		     'maybe_retry',
		     'deallocate',
		     'maybe_fail',
		     'allocate',
		     'put_struct   ( f3/1, x(1) )',
		     'put_term     ( p("b") )',
		     'put_struct   ( f2/1, x(0) )',
		     'put_value    ( x(1) )',
		     'setup',
		     'call',
		     'maybe_retry',
		     'deallocate'
		     ,'proceed'
		     ] }

	];
	
	process_body(text, expected);
});

// ================================================================== COMPLEX

it('Compiler - body - complex - 1', function(){
	
	var text = "f1(a), f2(b) ; f3(c).";
	var expected = [

		{ 
		 g4:   [ 
		        'try_finally',
		        'allocate',
		        'put_struct   ( f3/1, x(0) )', 
		        'put_term     ( p("c") )',
		        'setup',
		        'call',
		        'maybe_retry',
		        'deallocate'
		        ,'proceed'
		        ],
		  g0:  [ 
		        'try_else     ( p("g4") )',
		         'allocate',
			     'put_struct   ( f1/1, x(0) )',
			     'put_term     ( p("a") )',
			     'setup',
			     'call',
			     'maybe_retry',
			     'deallocate',
			     'maybe_fail',
			     'allocate',
			     'put_struct   ( f2/1, x(0) )',
			     'put_term     ( p("b") )',
			     'setup',
			     'call',
			     'maybe_retry',
			     'deallocate'
			     ,'proceed'
		         			     
		     ] 
		}	                
	                
	];
	
	process_body(text, expected);
});


it('Compiler - body - complex - 2', function(){
	
	//console.log("\n****body - complex 2***\n");
	
	var text = "f1(a), f2(b) ; f3(c), f4(d).";
	var expected = [

		{ 
		 g4:   [ 
		        'try_finally',
		        'allocate',
		        'put_struct   ( f3/1, x(0) )', 
		        'put_term     ( p("c") )',
		        'setup',
		        'call',
		        'maybe_retry',
		        'deallocate',
		        'maybe_fail',
		        'allocate',
		        'put_struct   ( f4/1, x(0) )',
		        'put_term     ( p("d") )',
		        'setup',
		        'call',		  
		        'maybe_retry',
		        'deallocate'
		        ,'proceed'
		        ],
		  g0:  [ 
		        'try_else     ( p("g4") )',
		         'allocate',
			     'put_struct   ( f1/1, x(0) )',
			     'put_term     ( p("a") )',
			     'setup',
			     'call',
			     'maybe_retry',
			     'deallocate',
			     'maybe_fail',
			     'allocate',
			     'put_struct   ( f2/1, x(0) )',
			     'put_term     ( p("b") )',
			     'setup',
			     'call',
			     'maybe_retry',
			     'deallocate'
			     ,'proceed'
			     
		     ] 
		}	                
	                
	];
	
	process_body(text, expected);
});



it('Compiler - body - complex - 3', function(){
	
	//console.log("\n***complex 3***\n");
	
	var text = "f1(a) ; f2(b) ; f3(c) ; f4(d).";
	
	//
	//	Functor(disj/2,
	//		Functor(disj/2,
	//			Functor(disj/2,Functor(f1/1,'Token(term,a)'),Functor(f2/1,'Token(term,b)')),
	//			Functor(f3/1,'Token(term,c)')),
	//		Functor(f4/1,'Token(term,d)'))
	
	
	var expected = [

		{   g4: 
			   [ 
			     'try_else     ( p("g5") )',
			     'allocate',
			     'put_struct   ( f2/1, x(0) )',
			     'put_term     ( p("b") )',
			     'setup',
			     'call'        ,
			     'maybe_retry',
			     'deallocate'
			     ,'proceed'
			     
			     ],
            g5: 
			   [ 
			     'try_else     ( p("g6") )',
			     'allocate'    ,
			     'put_struct   ( f3/1, x(0) )',
			     'put_term     ( p("c") )',
			     'setup',
			     'call'        ,
			     'maybe_retry',
			     'deallocate'
			     ,'proceed'
			     ],
            g6:
			   [ 
			    'try_finally',
			     'allocate'    ,
			     'put_struct   ( f4/1, x(0) )',
			     'put_term     ( p("d") )',
			     'setup',
			     'call'        ,
			     'maybe_retry',
			     'deallocate'   
			     ,'proceed'
			     ],
			g0: 
			   [ 
			     'try_else     ( p("g4") )',
			     'allocate'    ,
			     'put_struct   ( f1/1, x(0) )',
			     'put_term     ( p("a") )',
			     'setup',
			     'call'        ,
			     'maybe_retry',
			     'deallocate'
			     ,'proceed'
			     
			     ] 
		}	                
	                
	];
	
	process_body(text, expected);
});


it('Compiler - body - complex - 4', function(){
	
	//console.log("\n***complex 4***\n");
	
	var text = "f1(a) ; f2(b) , f3(c) ; f4(d).";
	
	/*
		Functor(disj/2,
			Functor(disj/2,
				Functor(f1/1,'Token(term,a)'),
				Functor(conj/2,
					Functor(f2/1,'Token(term,b)'),
					Functor(f3/1,'Token(term,c)'))),
			Functor(f4/1,'Token(term,d)'))
	 */
	
	var expected = [

		{ g3: 
			   [ 
			     'try_else     ( p("g4") )',
			     'allocate'    ,
			     'put_struct   ( f2/1, x(0) )',
			     'put_term     ( p("b") )',
			     'setup',
			     'call'        ,
			     'maybe_retry' ,
			     'deallocate'  ,
			     'maybe_fail',
			     'allocate'    ,
			     'put_struct   ( f3/1, x(0) )',
			     'put_term     ( p("c") )',
			     'setup',
			     'call'        ,
			     'maybe_retry' ,
			     'deallocate'
			     ,'proceed'
			      
			     ],
			  g4: 
			   [ 
			     'try_finally',
			     'allocate'    ,
			     'put_struct   ( f4/1, x(0) )',
			     'put_term     ( p("d") )',
			     'setup',
			     'call'        ,
			     'maybe_retry' ,
			     'deallocate'
			     ,'proceed'
			     ],
			  g0: 
			   [ 
			     'try_else     ( p("g3") )',
			     'allocate'    ,
			     'put_struct   ( f1/1, x(0) )',
			     'put_term     ( p("a") )',
			     'setup',
			     'call'        ,
			     'maybe_retry' ,
			     'deallocate'  
			     ,'proceed'
			     
			     ] 
		}

	];
	
	process_body(text, expected);
});

it('Compiler - body - complex - 5', function(){
	
	//console.log("\n***complex 5***\n");
	
	var text = "f1(a) ; f2(b) , f3(c) ; f4(d), f5(e).";
	
	/*
		Functor(disj/2,
			Functor(disj/2,
				Functor(f1/1,'Token(term,a)'),
				Functor(conj/2,
					Functor(f2/1,'Token(term,b)'),
					Functor(f3/1,'Token(term,c)'))),
			Functor(conj/2,
				Functor(f4/1,'Token(term,d)'),
				Functor(f5/1,'Token(term,e)')))
	 */
	/*
		jctx:  { type: 'conj', vc: 3, root: false }
		lctx:  { vc: 4, n: Functor(f2/1,'Token(term,b)') }
		rctx:  { vc: 5, n: Functor(f3/1,'Token(term,c)') } 
		
		jctx:  { type: 'disj', vc: 1, root: false }
		lctx:  { vc: 2, n: Functor(f1/1,'Token(term,a)') }
		rctx:  { vc: 3 } 
		
		jctx:  { type: 'conj', vc: 4, root: false }
		lctx:  { vc: 5, n: Functor(f4/1,'Token(term,d)') }
		rctx:  { vc: 6, n: Functor(f5/1,'Token(term,e)') } 
		
		jctx:  { type: 'disj', vc: 0, root: true }
		lctx:  { vc: 1 }
		rctx:  { vc: 4 } 
	 */
	var expected = [

		{ g3: 
			   [ 
			     'try_else     ( p("g4") )',
			     'allocate'    ,
			     'put_struct   ( f2/1, x(0) )',
			     'put_term     ( p("b") )',
			     'setup',
			     'call'        ,
			     'maybe_retry' ,
			     'deallocate'  ,
			     'maybe_fail'  ,
			     'allocate'    ,
			     'put_struct   ( f3/1, x(0) )',
			     'put_term     ( p("c") )',
			     'setup',
			     'call'        ,
			     'maybe_retry' ,
			     'deallocate'   
			     ,'proceed'
			     ],
			  g4: 
			   [ 
			     'try_finally',
			     'allocate'    ,
			     'put_struct   ( f4/1, x(0) )',
			     'put_term     ( p("d") )',
			     'setup',
			     'call'        ,
			     'maybe_retry' ,
			     'deallocate'  ,
			     'maybe_fail'  ,
			     'allocate'    ,
			     'put_struct   ( f5/1, x(0) )',
			     'put_term     ( p("e") )',
			     'setup',
			     'call'        ,
			     'maybe_retry' ,
			     'deallocate'   
			     ,'proceed'
			     ],
			  g0: 
			   [ 
			     'try_else     ( p("g3") )',
			     'allocate'    ,
			     'put_struct   ( f1/1, x(0) )',
			     'put_term     ( p("a") )',
			     'setup',
			     'call'        ,
			     'maybe_retry' ,
			     'deallocate'  
			     ,'proceed'
			     ] 
		}

	];
	
	process_body(text, expected);
});



it('Compiler - body - complex - 6', function(){
	
	//console.log("\n***complex 6***\n");
	
	var text = "f1(a), f2(b); f3(b) , f4(c), f5(d) ; f6(d), f7(e).";
	
	/*
		jctx:  { type: 'conj', vc: 2, root: false }
		lctx:  { vc: 3, n: Functor(f1/1,'Token(term,a)') }
		rctx:  { vc: 4, n: Functor(f2/1,'Token(term,b)') } 
		
		jctx:  { type: 'conj', vc: 6, root: false }
		lctx:  { vc: 7, n: Functor(f3/1,'Token(term,b)') }
		rctx:  { vc: 8, n: Functor(f4/1,'Token(term,c)') } 
		
		jctx:  { type: 'conj', vc: 5, root: false }
		lctx:  { vc: 6 }
		rctx:  { vc: 9, n: Functor(f5/1,'Token(term,d)') } 
		
		jctx:  { type: 'disj', vc: 1, root: false }
		lctx:  { vc: 2 }
		rctx:  { vc: 5 } 
		
		jctx:  { type: 'conj', vc: 6, root: false }
		lctx:  { vc: 7, n: Functor(f6/1,'Token(term,d)') }
		rctx:  { vc: 8, n: Functor(f7/1,'Token(term,e)') } 
		
		jctx:  { type: 'disj', vc: 0, root: true }
		lctx:  { vc: 1 }
		rctx:  { vc: 6 } 
	 */
	
	var expected = [

		{ g5: 
		    [ 'try_else     ( p("g6") )',
		      'allocate'    ,
		      'put_struct   ( f3/1, x(0) )',
		      'put_term     ( p("b") )',
		      'setup',
		      'call        ',
		      'maybe_retry ',
		      'deallocate  ',
		      'maybe_fail  ',
		      'allocate    ',
		      'put_struct   ( f4/1, x(0) )',
		      'put_term     ( p("c") )',
		      'setup',
		      'call        ',
		      'maybe_retry ',
		      'deallocate  ',
		      'maybe_fail  ',
		      'allocate    ',
		      'put_struct   ( f5/1, x(0) )',
		      'put_term     ( p("d") )',
		      'setup',
		      'call        ',
		      'maybe_retry' ,
		      'deallocate'
		      ,'proceed'
		      ],
		   g6: 
		    [ 'try_finally ',
		      'allocate    ',
		      'put_struct   ( f6/1, x(0) )',
		      'put_term     ( p("d") )',
		      'setup',
		      'call        ',
		      'maybe_retry ',
		      'deallocate  ',
		      'maybe_fail  ',
		      'allocate    ',
		      'put_struct   ( f7/1, x(0) )',
		      'put_term     ( p("e") )',
		      'setup',
		      'call        ',
		      'maybe_retry' ,
		      'deallocate'   
		      ,'proceed'
		      ],
		   g0: 
		    [ 
		      'try_else     ( p("g5") )',
		      'allocate    ',
		      'put_struct   ( f1/1, x(0) )',
		      'put_term     ( p("a") )',
		      'setup',
		      'call        ',
		      'maybe_retry ',
		      'deallocate  ',
		      'maybe_fail  ',
		      'allocate    ',
		      'put_struct   ( f2/1, x(0) )',
		      'put_term     ( p("b") )',
		      'setup',
		      'call        ',
		      'maybe_retry' ,
		      'deallocate'   
		      ,'proceed'
		      ] 
		}
	];
	
	process_body(text, expected);
});


it('Compiler - list - 1', function(){
	
	//console.log("\n***Compiler - list - 1\n");
	
	var text = "f([A,B]) :- list(A,B).";
	
	/*
	   Functor(rule/2,
	   	Functor(f/1,Functor(cons/2,Var(A),Functor(cons/2,Var(B),'Token(nil,null)'))),
	   	Functor(list/2,Var(A),Var(B)))
	 */
	
	
	var expected = [
	     { g0: 
			   [ 
			     'allocate'    ,
			     'put_struct   ( list/2, x(0) )',
			     'put_var      ( p("A") )',
			     'put_var      ( p("B") )',
			     'setup'       ,
			     'call'        ,
			     'maybe_retry' ,
			     'deallocate'  ,
			     'proceed'      
			     ],
			  head: 
			   [ 
			     'get_struct   ( f/1, x(0) )',
			     'get_var      ( x(1) )',
			     'get_struct   ( cons/2, x(1) )',
			     'get_var      ( p("A") )',
			     'get_var      ( x(2) )',
			     'get_struct   ( cons/2, x(2) )',
			     'get_var      ( p("B") )',
			     'get_nil',
			     'jump         ( p("g0") )' 
			     ],
		  f: 'f',
		  a: 1 }
	];
	
	//process_rule(text, expected, {show_parsed: true, show_compiled: true});
	process_rule(text, expected);
});




it('Compiler - expression - 1', function(){
	
	//console.log("\n***Compiler - expression - 1\n");
	
	Instruction.inspect_compact = true;
	
	var text = "test(X) :- X1 is X + 1, X1 > 0.";
	
	/*
	 Functor(rule/2,
	 	Functor(test/1,Var(X)),Functor(conj/2,Functor(is/2,Var(X1),Functor(plus/2,Var(X),'Token(number,1)')),
	 	Functor(gt/2,Var(X1),'Token(number,null)')))
	 */
	
	
	var expected = [
	{ head: 
		   [ 'get_struct  test/1, x(0)',
		     'get_var     p("X")',
		     'jump        p("g0")' 
		     ],
		  g0: 
		   [ 
		     'prepare'     ,
		     'push_var    p("X")',
		     'push_number p(1)',
		     'op_plus     y(1)',
		     'prepare'     ,
		     'push_var    p("X1")',
		     'push_value  y(1)',
		     'op_is',
		     'prepare'     ,
		     'push_var    p("X1")',
		     'push_number p(0)',
		     'op_gt'       ,
		     'proceed'
		     ],
		  f: 'test',
		  a: 1 }	                
	];
	
	//process_rule(text, expected, {show_parsed: true, show_compiled: true, show_parsed: true});
	process_rule(text, expected);
});

it('Compiler - expression - 2', function(){
	
	//console.log("\n***Compiler - expression - 1\n");
	
	Instruction.inspect_compact = true;
	
	var text = "test(X) :- X1 is X + 1 , X1 > 0 ; X = 666.";
	
	/*
	 Functor(rule/2,
	 	Functor(test/1,Var(X)),Functor(conj/2,Functor(is/2,Var(X1),Functor(plus/2,Var(X),'Token(number,1)')),
	 	Functor(gt/2,Var(X1),'Token(number,null)')))
	 */
	
	
	var expected = [
	                
		{ head: 
			   [ 
			     'get_struct  test/1, x(0)',
			     'get_var     p("X")',
			     'jump        p("g0")' 
			     ],
			  g4: 
			   [ 
			     'try_finally' ,
			     'allocate'    ,
     			'put_struct  unif/2, x(0)',
			     'put_var     p("X")',
			     'put_number  p(666)',
			     'setup',
			     'bcall'       ,
			     'maybe_retry',
			     'deallocate'  ,
			     'proceed'      
			     ],
			  g0: 
			   [ 
			     'try_else    p("g4")',
			     'prepare'     ,
			     'push_var    p("X")',
			     'push_number p(1)',
			     'op_plus     y(1)',
			     'prepare'     ,
			     'push_var    p("X1")',
			     'push_value  y(1)',
			     'op_is',
			     'prepare'     ,
			     'push_var    p("X1")',
			     'push_number p(0)',
			     'op_gt'       ,
			     'proceed'      
			     ],
			  f: 'test',
			  a: 1 }
		
	];
	
	//process_rule(text, expected, {show_parsed: true, show_compiled: true, show_parsed: true});
	process_rule(text, expected);
});

it('Compiler - sub-expression - 1', function(){
	
	//console.log("\n***Compiler - expression - 1\n");
	
	Instruction.inspect_compact = true;
	
	var text = "test(X, X1) :- X1 is (X+2)*3.";
	
	/*
		Functor(rule/2,
			Functor(test/1,Var(X)),
			Functor(is/2,Var(X1),
				Functor(mult/2,Functor(plus/2,Var(X),'Token(number,2)'),
				'Token(number,3)')))	 
		*/
	
	
	var expected = [
	  {
		head: 
		    [ 
		      'get_struct  test/2, x(0)',
		      'get_var     p("X")',
		      'get_var     p("X1")',
		      'jump        p("g0")' 
		      ],
		   g0: 
		    [ 
		      'prepare'     ,
		      'push_var    p("X")',
		      'push_number p(2)',
		      'op_plus     y(1)',
		      'prepare'     ,
		      'push_value  y(1)',
		      'push_number p(3)',
		      'op_mult     y(2)',
		      'prepare'     ,
		      'push_var    p("X1")',
		      'push_value  y(2)',
		      'op_is'       ,
		      'proceed'      
		      ],
		   f: 'test',
		   a: 2 }
	];
	
	//process_rule(text, expected, {show_parsed: true, show_compiled: true, show_parsed: true});
	process_rule(text, expected);
});


/*
"""Einstein's Puzzle
"""
select([A|As],S):- select(A,S,S1),select(As,S1).
select([],_). 

left_of(A,B,C):- append(_,[A,B|_],C).  
next_to(A,B,C):- left_of(A,B,C) ; left_of(B,A,C).


zebra(Owns, HS):- %// house: color,nation,pet,drink,smokes)
  HS   = [ h(_,norwegian,_,_,_),    h(blue,_,_,_,_),   h(_,_,_,milk,_), _, _], 
  select([ h(red,brit,_,_,_),       h(_,swede,dog,_,_), 
           h(_,dane,_,tea,_),       h(_,german,_,_,prince)], HS),
  select([ h(_,_,birds,_,pallmall), h(yellow,_,_,_,dunhill),
           h(_,_,_,beer,bluemaster)],                        HS), 
  left_of( h(green,_,_,coffee,_),   h(white,_,_,_,_),        HS),
  next_to( h(_,_,_,_,dunhill),      h(_,_,horse,_,_),        HS),
  next_to( h(_,_,_,_,blend),        h(_,_,cats, _,_),        HS),
  next_to( h(_,_,_,_,blend),        h(_,_,_,water,_),        HS),
  member(  h(_,Owns,zebra,_,_),                              HS).
*/


it('Compiler - complex - 10', function(){
	
	Instruction.inspect_compact = true;
	Var.inspect_compact = true;
	
	var text = '"""Einstein Puzzle\n'
	            +'HS = [h(yellow,norwegian,cats,water,dunhill),h(blue,dane,horse,tea,blend),h(red,brit,birds,milk,pallmall),h(green,german,zebra,coffee,prince),h(white,swede,dog,beer,bluemaster)]\n'
				+'Who = german\n'
				+'"""\n'
				+'select([A|As],S):- select(A,S,S1),select(As,S1).'
				+'select([],_).';

	
	// [ [ Functor(rule/2,Functor(select/2,Functor(cons/2,Var(A),Var(As)),Var(S)),Functor(conj/2,Functor(select/3,Var(A),Var(S),Var(S1)),Functor(select/2,Var(As),Var(S1)))) ]
    //   ,[ Functor(select/2,'Token(nil,null)',Var(_)) ]
    // ]
	
	
	
	var expected = [
		{ 
			head: 
     [ 'get_struct  select/2, x(0)',
       'get_var     x(1)',
       'get_var     p("S")',
       'get_struct  cons/2, x(1)',
       'get_var     p("A")',
       'get_var     p("As")',
       'jump        p("g0")' 
       ],
    g0: 
     [ 'allocate'    ,
       'put_struct  select/3, x(0)',
       'put_var     p("A")',
       'put_var     p("S")',
       'put_var     p("S1")',
       'setup'       ,
       'call'        ,
       'maybe_retry' ,
       'deallocate'  ,
       'maybe_fail'  ,
       'allocate'    ,
       'put_struct  select/2, x(0)',
       'put_var     p("As")',
       'put_var     p("S1")',
       'setup'       ,
       'call'        ,
       'maybe_retry' ,
       'deallocate'  ,
       'proceed'      
       ],
    f: 'select',
    a: 2 },
  { head: 
     [ 'get_struct  select/2, x(0)',
       'get_nil'    ,
       'get_var     p(_)',
       'proceed'
        ],
    f: 'select',
    a: 2 }
	];
	
	//process_rule(text, expected, {show_parsed: true, show_compiled: true, show_db: true});
	process_rule(text, expected);
});

it('Compiler - complex - 11', function(){
	
	Instruction.inspect_compact = true;
	
	var text = '"""Einstein Puzzle\n'
	            +'HS = [h(yellow,norwegian,cats,water,dunhill),h(blue,dane,horse,tea,blend),h(red,brit,birds,milk,pallmall),h(green,german,zebra,coffee,prince),h(white,swede,dog,beer,bluemaster)]\n'
				+'Who = german\n'
				+'"""\n'
				+'f(HS) :- HS  = [ h(_,norwegian,_,_,_),    h(blue,_,_,_,_),   h(_,_,_,milk,_), _, _].'
				+'\n';
	
	
	/*
	[ [ rule( f(_),
			  unif(_,cons( h(_,Token(term,norwegian),_,_,_),
			  				cons( h(Token(term,blue),_,_,_,_),
			  					cons( h(_,_,_,Token(term,milk),_),
			  						cons(_, 
			  							cons(_, Token(nil,null)))))))) ] ]
	*/

	
	
	var expected = [
		{ 
	head: 
	   [ 
	   	'get_struct  f/1, x(0)',
	     'get_var     p("HS")',
	     'jump        p("g0")'
	     ],
	  g0: 
	   [ 
	   	'allocate    ',
	     'put_struct  h/5, x(1)',
	     'put_void    ',
	     'put_term    p("norwegian")',
	     'put_void    ',
	     'put_void    ',
	     'put_void    ',
	     'put_struct  h/5, x(2)',
	     'put_term    p("blue")',
	     'put_void    ',
	     'put_void    ',
	     'put_void    ',
	     'put_void    ',
	     'put_struct  h/5, x(3)',
	     'put_void    ',
	     'put_void    ',
	     'put_void    ',
	     'put_term    p("milk")',
	     'put_void    ',
	     'put_struct  cons/2, x(4)',
	     'put_void    ',
	     'put_nil     ',
	     'put_struct  cons/2, x(5)',
	     'put_void    ',
	     'put_value   x(4)',
	     'put_struct  cons/2, x(6)',
	     'put_value   x(3)',
	     'put_value   x(5)',
	     'put_struct  cons/2, x(7)',
	     'put_value   x(2)',
	     'put_value   x(6)',
	     'put_struct  cons/2, x(8)',
	     'put_value   x(1)',
	     'put_value   x(7)',
	     'put_struct  unif/2, x(0)',
	     'put_var     p("HS")',
	     'put_value   x(8)',
	     'setup',
	     'bcall       ',
	     'maybe_retry',
	     'deallocate'  ,
	     'proceed'
	     ]
		}
	];
	
	//process_rule(text, expected, {show_parsed: true, show_compiled: true, show_db: true});
	process_rule(text, expected);
});





it('Compiler - struct - 1', function(){
	
	//console.log("\n***Compiler - struct - 1\n");
	
	Instruction.inspect_compact = true;
	
	var text = "test(X) :- (X + 1).";
	

	var expected = [
		{ head: 
		   [ 'get_struct  test/1, x(0)',
		     'get_var     p("X")',
		     'jump        p("g0")'
		     ],
		  g0: 
		   [ 'allocate'    ,
		     'put_struct  plus/2, x(0)',
		     'put_var     p("X")',
		     'put_number  p(1)',
		     'setup'       ,
		     'call'        ,
		     'maybe_retry' ,
		     'deallocate'  ,
		     'proceed'
		     ],
		  f: 'test',
		  a: 1 }		
	];
	
	//process_rule(text, expected, {show_parsed: true, show_compiled: true, show_parsed: true});
	process_rule(text, expected);
});


it('Compiler - struct - 2', function(){
	
	//console.log("\n***Compiler - struct - 2\n");
	
	Instruction.inspect_compact = true;
	
	var text = "test(X) :- f(X + 1).";

	var expected = [
		{ head: 
		   [ 'get_struct  test/1, x(0)',
		     'get_var     p("X")',
		     'jump        p("g0")'
		     ],
		  g0: 
		   [ 'allocate'    ,
		     'put_struct  plus/2, x(1)',
		     'put_var     p("X")',
		     'put_number  p(1)',
		     'put_struct  f/1, x(0)',
     		 'put_value   x(1)',
		     'setup'       ,
		     'call'        ,
		     'maybe_retry' ,
		     'deallocate'  ,
		     'proceed'
		     ],
		  f: 'test',
		  a: 1 }		
	];
	
	//process_rule(text, expected, {show_parsed: true, show_compiled: true, show_parsed: true});
	process_rule(text, expected);
});


it('Compiler - query - 1', function(){
	
	//console.log("\n***Compiler - query - 1\n");
	
	Instruction.inspect_compact = true;
	
	var text = "?- f(X).";

	var expected = [
		{ is_query: true,
		  g0: 
		   [ 'allocate'    ,
		     'put_struct  f/1, x(0)',
		     'put_var     p("X")',
		     'setup'       ,
		     'call'        ,
		     'maybe_retry' ,
		     'deallocate'  ,
		     'end'
		     ] 
			
		}		
	];
	
	//process(text, expected, {show_parsed: true, show_compiled: true, show_parsed: true});
	process(text, expected);
});

it('Compiler - query - 2', function(){
	
	//console.log("\n***Compiler - query - 2\n");
	
	Instruction.inspect_compact = true;
	
	var text = "?- f(X) :- f2(X).";

	var expected = [
		{ is_query: true,
		  g0: 
		   [ 'allocate'    ,
		     'put_struct  f/1, x(0)',
		     'put_var     p("X")',
		     'setup'       ,
		     'call'        ,
		     'maybe_retry' ,
		     'deallocate'  ,
		     'end'
		     ] 
			
		}		
	];

	var result = false;
	
	try {
		//process(text, expected, {show_parsed: true, show_compiled: true, show_parsed: true});
		process(text, expected);
	} catch(e) {
		result = e instanceof ErrorRuleInQuestion;
	}
	
	should.ok(result);
	
	//process(text, expected);
});


it('Compiler - other operators - not', function(){
	
	Instruction.inspect_compact = true;
	
	var text = "not f(X).";

	var expected = [
		[
		 'allocate'    ,
		  'put_struct  f/1, x(0)',
		  'put_var     p("X")',
		  'setup'       ,
		  'call'    ,
		  'maybe_retryn' ,
		  'deallocate'  ,
		  'proceed'
  		]
	];

	//process_goal(text, expected, {show_parsed: true, show_compiled: true, show_parsed: true});
	process_goal(text, expected);

});

it('Compiler - other operators - fail', function(){
	
	Instruction.inspect_compact = true;
	
	var text = "f(X) :- X>0 ; fail.";

	var expected = [
		{ head: 
		   [ 'get_struct  f/1, x(0)',
		     'get_var     p("X")',
		     'jump        p("g0")'
		     ],
		  is_query: false,
		  g2: [ 'try_finally' , 'fail'         ],
		  g0: 
		   [ 'try_else    p("g2")',
		     'prepare'     ,
		     'push_var    p("X")',
		     'push_number p(0)',
		     'op_gt'       ,
		     'proceed'
		     ],
		  f: 'f',
		  a: 1 }
	];

	//process_rule(text, expected, {show_parsed: true, show_compiled: true, show_parsed: true});
	process_rule(text, expected);

});
