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
	
	//console.log(expressions);
	
	for (var index = 0; index<expressions.length; index++) {
		
		var expression = expressions[index];
		
		if (!expression)
			return false;
		
		var cb = function(node, depth, index){
			results.push([node.name, depth, index]);
		};
		
		//console.log("Expression: ", expression[0]);
		
		var i = new Visitor(expression[0], cb);
		
		i.process();
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
	
	if (!expected)
		return false;
	
	if (input.length != expected.length)
		return false;
	
	for (var index=0;index<expected.length;index++) {
		
		var i = input[index];
		var re = expected[index];
		
		//console.log("i: ", i, " re: ", re);
		
		//var ri = util.inspect(i, {depth: null});
		if (i!=re)
			return false;
	};
	
	return true;
};


it('Visitor - basic', function(){
	
	var text = "f1(A).";
	var expected = [
	                 [ 'f1', 0, null ]
	                ,[ 'A',  0, 0]
	                 ];
	
	process(text, expected);
});

it('Visitor - basic - 2', function(){
	
	var text = "f1(f2(A,B)).";
	var expected = [
	                 [ 'f1',  0, null ]
	                ,[ 'f2',  0, 0 ]
	                ,[ 'f2',  1, null ]
	                 ,[ 'A', 1, 0 ]
	                 ,[ 'B', 1, 1 ]	                 
	                 ];
	
	process(text, expected);
});

it('Visitor - basic - 3', function(){
	
	var text = "f1(f2(A,B)), f3(C), f4(D).";
	//
	//  conj(conj(f1(f2), f3), f4)
	//
	var expected = [ [ 'conj', 0, null ],
	                 [ 'conj', 0, 0 ],
	                 [ 'conj', 1, null ],
	                 [ 'f1', 1, 0 ],
	                 [ 'f1', 2, null ],
	                 [ 'f2', 2, 0 ],
	                 [ 'f2', 3, null ],
	                 [ 'A', 3, 0 ],
	                 [ 'B', 3, 1 ],
	                 [ 'f3', 1, 1 ],
	                 [ 'f3', 2, null ],
	                 [ 'C', 2, 0 ],
	                 [ 'f4', 0, 1 ],
	                 [ 'f4', 1, null ],
	                 [ 'D', 1, 0 ] ];
	
	process(text, expected);
});
