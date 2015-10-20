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
var Token = pr.Token;
//var OpNode = pr.OpNode;
var Functor = pr.Functor;
var Op = pr.Op;
var Utils = pr.Utils;
var Var = pr.Var;

var ParserL1 = pr.ParserL1;
var ParserL2 = pr.ParserL2;
var ParserL3 = pr.ParserL3;
var Visitor2 = pr.Visitor2;
var Visitor3 = pr.Visitor3;

Functor.inspect_short_version = true;
Token.inspect_quoted = true;

var setup = function(text) {

	Functor.inspect_short_version = true;
	//Functor.inspect_quoted = true;
	
	//Token.inspect_quoted = true;
	
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

var process = function(input_text, expecteds, options) {
	
	options = options || {};
	
	var visit = options.visitor || Visitor3;
	
	Functor.inspect_compact_version = false;
	Var.inspect_extended = false;
	Var.inspect_compact = false;
	
	
	var expressions = setup(input_text);
	
	if (options.show_parsed)
		console.log("Parsed: ", expressions);
	
	var results = [];
	
	//console.log(expressions);
	
	var result = true;
	
	for (var index = 0; index<expressions.length; index++) {
		
		var expression = expressions[index];
		
		if (!expression)
			result = false;
		
		var cb = function(jctx, lctx, rctx){
			results.push([jctx, lctx, rctx]);
		};
		
		//console.log("Expression: ", expression[0]);
		
		var i = new visit(expression[0]);
		
		i.process(cb);
	}
	
	if (options.show_results)
		console.log("Results: ", results);
	
	for (var index=0; index < results.length; index++) {
		
		var ri = results[index];
		var expected = expecteds[index];
		
		var result = Utils.compare_objects(expected, ri);
		should.equal(result, true, "expected: " + util.inspect(results));
	};


};


it('Visitor - basic - 1', function(){
	
	var text = "f1(a,f2(f3( f4(b,c) ,d), e),666).";
	var expected = [
[ { type: 'root', vc: 0 }, { n: 'Functor(f1/3)' }, null ]
	               ];
	

	process(text, expected);
});


it('Visitor - basic - 2', function(){
	
	var text = "f1(a), f2(b).";
	var expected = [
	[ { type: 'conj', vc: 0, root: true },
	    { vc: 1, n: 'Functor(f1/1)' },
	    { vc: 2, n: 'Functor(f2/1)' } ]
];
	

	process(text, expected);
});

it('Visitor - basic - 3', function(){
	
	var text = "f1(a), f2(b) ; f3(c)";
	var expected = [

		[ { type: 'conj', vc: 1, root: false },
		  { vc: 2, n: 'Functor(f1/1)' },
		  { vc: 3, n: 'Functor(f2/1)' } ],
		[ { type: 'disj', vc: 0, root: true },
		  { vc: 1 },
		  { vc: 4, n: 'Functor(f3/1)' } ]	                

	];
	

	process(text, expected);
});

it('Visitor - basic - 4', function(){
	
	var text = "f1(a), f2(b) ; f3(c), f4(d)";
	var expected = [

		[ { type: 'conj', vc: 1, root: false },
		  { vc: 2, n: 'Functor(f1/1)' },
		  { vc: 3, n: 'Functor(f2/1)' } ],
		[ { type: 'conj', vc: 4, root: false },
		  { vc: 5, n: 'Functor(f3/1)' },
		  { vc: 6, n: 'Functor(f4/1)' } ],
		[ { type: 'disj', vc: 0, root: true }, { vc: 1 }, { vc: 4 } ]

	];

	process(text, expected);
});


it('Visitor - basic - 5', function(){
	
	var text = "f1(a) ; f3(c), f4(d)";
	var expected = [

		[ { type: 'conj', vc: 2, root: false },
		  { vc: 3, n: 'Functor(f3/1)' },
		  { vc: 4, n: 'Functor(f4/1)' } ],
		[ { type: 'disj', vc: 0, root: true },
		  { vc: 1, n: 'Functor(f1/1)' },
		  { vc: 2 } ]	                

		];

	process(text, expected);
});


/*
it('Visitor - expression - 1', function(){
	
	var text = "X is Y+1";
	var expected = [

 		[ { type: 'root', vc: 0 }, { n: 'Functor(is/2)' }, null 
 		] 

		];

	//process(text, expected, {show_parsed: true, show_results: true});
	process(text, expected, { visitor: Visitor2 });
});
*/