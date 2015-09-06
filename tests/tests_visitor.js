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
var Visitor3 = pr.Visitor3;

Functor.inspect_short_version = true;
Token.inspect_quoted = true;

var setup = function(text) {

	Functor.inspect_short_version = true;
	Functor.inspect_quoted = true;
	
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

var process = function(input_text, expecteds, left_to_right) {
	
	var expressions = setup(input_text);
	
	var results = [];
	
	//console.log(expressions);
	
	for (var index = 0; index<expressions.length; index++) {
		
		var expression = expressions[index];
		
		if (!expression)
			return false;
		
		var cb = function(type, vc, lctx, rctx){
			results.push([type, vc, lctx, rctx]);
		};
		
		//console.log("Expression: ", expression[0]);
		
		var i = new Visitor3(expression[0]);
		
		i.process(cb);
	};
	
	//console.log(results);
	
	for (var index=0; index < results.length; index++) {
		
		var ri = results[index];
		var expected = expecteds[index];
		
		var result = compare(ri, expected);
		should.equal(result, true, "expected: " + util.inspect(results));
	};


};

var compare = function(input, expected) {

	var ri = util.inspect(input, {depth: null});
	var re = util.inspect(expected, {depth: null});
	
	//console.log("Compare: input: ",   ri);
	//console.log("Compare: expected: ",re);

	return ri == re;
};


it('Visitor - basic - 1', function(){
	
	var text = "f1(a,f2(f3( f4(b,c) ,d), e),666).";
	var expected = [
	                [ 'root', 0, { n: 'Functor(f1/3)' }, null ]
	               ];
	

	process(text, expected);
});


it('Visitor - basic - 2', function(){
	
	var text = "f1(a), f2(b).";
	var expected = [
[ 'conj',
  0,
  { vc:1, n: 'Functor(f1/1)' },
  { vc:2, n: 'Functor(f2/1)' } ]
];
	

	process(text, expected);
});

it('Visitor - basic - 3', function(){
	
	var text = "f1(a), f2(b) ; f3(c)";
	var expected = [
	                
[ 'conj',
    1,
    { vc: 2, n: 'Functor(f1/1)' },
    { vc: 3, n: 'Functor(f2/1)' } ],
    
  [ 'disj',
    0,
    { vc: 1 }, // points to conj node id 2
    { vc: 4, n: 'Functor(f3/1)' } ]

];
	

	process(text, expected);
});

it('Visitor - basic - 4', function(){
	
	var text = "f1(a), f2(b) ; f3(c), f4(d)";
	var expected = [

	// left side conj
	[ 'conj',
	    1,
	    { vc:2, n: 'Functor(f1/1)' },
	    { vc:3, n: 'Functor(f2/1)' } ],
	    
	// right side conj
	  [ 'conj',
	    4,
	    { vc:5, n: 'Functor(f3/1)' },
	    { vc:6, n: 'Functor(f4/1)' } ],
	    
	// root disjunction
	  [ 'disj',
	    0,
	    { vc: 1 },
	    { vc: 4 } ]

];

	process(text, expected);
});


it('Visitor - basic - 5', function(){
	
	var text = "f1(a) ; f3(c), f4(d)";
	var expected = [

			[ 'conj', 2,
			  { vc: 3, n: 'Functor(f3/1)' },
			  { vc: 4, n: 'Functor(f4/1)' } ],
			[ 'disj', 0, { vc: 1, n: 'Functor(f1/1)' }, { vc: 2 } ]

		];

	process(text, expected);
});
