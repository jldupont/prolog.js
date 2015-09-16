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

		var result = c.process_body(expression, show_results);
		
		results.push(result);
	};
	
	if (show_results)
		console.log(results);
	
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
	'get_struct   ( h1/1, p(0) )', 
	'get_number   ( p(666) )',
	'proceed'
	]];
	
	process_head(text, expected);
});


it('Compiler - basic - 1', function(){
	
	var text = "f(A).";
	var expected = [[ 
	'get_struct   ( f/1, p(0) )', 
	'unif_var     ( p("A") )',
	'proceed'
	]];
	
	process_head(text, expected);
});


it('Compiler - basic - 2', function(){
	
	var text = "h1(a, h2( h3a(h3a), h3b(h3b), h3c(h3c)) ,666).";
	var expected = [[ 
  'get_struct   ( h1/3, p(0) )',
  'get_term     ( p("a") )',
  'unif_var     ( p(1) )',
  'get_number   ( p(666) )',
  'get_struct   ( h2/3, p(1) )',
  'unif_var     ( p(2) )',
  'unif_var     ( p(3) )',
  'unif_var     ( p(4) )',
  'get_struct   ( h3a/1, p(2) )',
  'get_term     ( p("h3a") )',
  'get_struct   ( h3b/1, p(3) )',
  'get_term     ( p("h3b") )',
  'get_struct   ( h3c/1, p(4) )',
  'get_term     ( p("h3c") )',
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
	'put_struct   ( h3/1, p(1) )',
	'put_term     ( p("c") )',
	'put_struct   ( h2/2, p(2) )',
	'put_term     ( p("b") )',
	'put_value    ( p(1) )',
	'put_struct   ( h1/2, p(0) )',
	'put_term     ( p("a") )',
	'put_value    ( p(2) )',
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
                 'put_struct   ( h1/1, p(0) )',
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
			     'put_struct   ( f2/1, p(0) )',
			     'put_var      ( p("A") )',
			     'setup',
			     'call',
			     'maybe_retry',
			     'deallocate'
			     ,'proceed'
			     ],
		  head: [ 
		           'get_struct   ( f1/1, p(0) )'
		          ,'unif_var     ( p("A") )'
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
		 
		  'get_struct   ( likes/2, p(0) )',
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
			     'put_struct   ( f2/1, p(0) )',
			     'put_var      ( p("A") )',
			     'setup',
			     'call',
			     'maybe_retry',
			     'deallocate',
			     'maybe_fail',
			     'allocate',
			     'put_struct   ( f3/1, p(0) )',
			     'put_var      ( p("A") )',
			     'setup',
			     'call',
			     'maybe_retry',
			     'deallocate'
			     ,'proceed'
			     ],
		  head: [ 
		           'get_struct   ( f1/1, p(0) )'
		          ,'unif_var     ( p("A") )'
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
			       'put_struct   ( f4/1, p(1) )',
			       'put_var      ( p("A") )',
			       'put_struct   ( f3/1, p(2) )',
			       'put_value    ( p(1) )',
			       'put_struct   ( f2/1, p(0) )',
			       'put_value    ( p(2) )',
			       'setup',
			       'call'        ,
			       'maybe_retry',
			       'deallocate' 
			       ,'proceed'
			     ],
		  head: [ 
		           'get_struct   ( f1/1, p(0) )'
		          ,'unif_var     ( p("A") )'
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
			   [ 	'allocate'    ,
			       'put_struct   ( f4/1, p(1) )',
			       'put_var      ( p("A") )',
			       'put_struct   ( f3/1, p(2) )',
			       'put_value    ( p(1) )',
			       'put_struct   ( f2/1, p(0) )',
			       'put_value    ( p(2) )',
			       'setup',
			       'call'        ,
			       'maybe_retry',
			       'deallocate' 
			       ,'proceed'
			     ],
		  head: [
					'get_struct   ( f1/1, p(0) )',
					'unif_var     ( p(1) )',
					'get_struct   ( g1/1, p(1) )',
					'unif_var     ( p("A") )'
					,'jump         ( p("g0") )'
		          ] 
		}	                
	                
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
	              'put_struct   ( h1/1, p(0) )', 
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
		      'put_struct   ( f1/1, p(0) )',
		      'put_term     ( p("a") )',
		      'setup',
		      'call',
		      'maybe_retry',
		      'deallocate',
		      'maybe_fail',
		      'allocate',
		      'put_struct   ( f2/1, p(0) )',
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
		     'put_struct   ( f1/1, p(0) )',
		     'put_term     ( p("a") )',
		     'setup',
		     'call',
		     'maybe_retry',
		     'deallocate',
		     'maybe_fail',
		     'allocate',
		     'put_struct   ( f3/1, p(1) )',
		     'put_term     ( p("b") )',
		     'put_struct   ( f2/1, p(0) )',
		     'put_value    ( p(1) )',
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
		        'put_struct   ( f3/1, p(0) )', 
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
			     'put_struct   ( f1/1, p(0) )',
			     'put_term     ( p("a") )',
			     'setup',
			     'call',
			     'maybe_retry',
			     'deallocate',
			     'maybe_fail',
			     'allocate',
			     'put_struct   ( f2/1, p(0) )',
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
		        'put_struct   ( f3/1, p(0) )', 
		        'put_term     ( p("c") )',
		        'setup',
		        'call',
		        'maybe_retry',
		        'deallocate',
		        'maybe_fail',
		        'allocate',
		        'put_struct   ( f4/1, p(0) )',
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
			     'put_struct   ( f1/1, p(0) )',
			     'put_term     ( p("a") )',
			     'setup',
			     'call',
			     'maybe_retry',
			     'deallocate',
			     'maybe_fail',
			     'allocate',
			     'put_struct   ( f2/1, p(0) )',
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
			     'put_struct   ( f2/1, p(0) )',
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
			     'put_struct   ( f3/1, p(0) )',
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
			     'put_struct   ( f4/1, p(0) )',
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
			     'put_struct   ( f1/1, p(0) )',
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
			     'put_struct   ( f2/1, p(0) )',
			     'put_term     ( p("b") )',
			     'setup',
			     'call'        ,
			     'maybe_retry' ,
			     'deallocate'  ,
			     'maybe_fail',
			     'allocate'    ,
			     'put_struct   ( f3/1, p(0) )',
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
			     'put_struct   ( f4/1, p(0) )',
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
			     'put_struct   ( f1/1, p(0) )',
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
			     'put_struct   ( f2/1, p(0) )',
			     'put_term     ( p("b") )',
			     'setup',
			     'call'        ,
			     'maybe_retry' ,
			     'deallocate'  ,
			     'maybe_fail'  ,
			     'allocate'    ,
			     'put_struct   ( f3/1, p(0) )',
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
			     'put_struct   ( f4/1, p(0) )',
			     'put_term     ( p("d") )',
			     'setup',
			     'call'        ,
			     'maybe_retry' ,
			     'deallocate'  ,
			     'maybe_fail'  ,
			     'allocate'    ,
			     'put_struct   ( f5/1, p(0) )',
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
			     'put_struct   ( f1/1, p(0) )',
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
		      'put_struct   ( f3/1, p(0) )',
		      'put_term     ( p("b") )',
		      'setup',
		      'call        ',
		      'maybe_retry ',
		      'deallocate  ',
		      'maybe_fail  ',
		      'allocate    ',
		      'put_struct   ( f4/1, p(0) )',
		      'put_term     ( p("c") )',
		      'setup',
		      'call        ',
		      'maybe_retry ',
		      'deallocate  ',
		      'maybe_fail  ',
		      'allocate    ',
		      'put_struct   ( f5/1, p(0) )',
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
		      'put_struct   ( f6/1, p(0) )',
		      'put_term     ( p("d") )',
		      'setup',
		      'call        ',
		      'maybe_retry ',
		      'deallocate  ',
		      'maybe_fail  ',
		      'allocate    ',
		      'put_struct   ( f7/1, p(0) )',
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
		      'put_struct   ( f1/1, p(0) )',
		      'put_term     ( p("a") )',
		      'setup',
		      'call        ',
		      'maybe_retry ',
		      'deallocate  ',
		      'maybe_fail  ',
		      'allocate    ',
		      'put_struct   ( f2/1, p(0) )',
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

