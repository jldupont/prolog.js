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
var Utils = pr.Utils;

var ParserL1 = pr.ParserL1;
var ParserL2 = pr.ParserL2;
var ParserL3 = pr.ParserL3;
var Compiler = pr.Compiler;
var Interpreter = pr.Interpreter;
var Instruction = pr.Instruction;


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

var compile_rule = function(input_text) {
	
	var expressions = setup(input_text);
	
	var results = [];
	
	//console.log(expressions);
	
	for (var index = 0; index<expressions.length; index++) {
		
		var expression = expressions[index][0];
		
		var c = new Compiler();
		
		var result = c.process_rule_or_fact(expression);
		
		results.push(result);
	};
	
	return results;
};

var compile_query = function(input_text) {

	var expressions = setup(input_text);
	
	//console.log("Expressions: ", expressions);
	
	var c = new Compiler();
	
	var result = c.process_query(expressions[0][0]);
		
	return result;
	
};

it('Interpreter - basic - 0', function(){
	
	var qtext = "q(A).";
	var qcode = compile_query(qtext);
	
	//console.log("Qcode: ", qcode);
	
	/*
	 * { g0: 
		   [ allocate    ,
		     put_struct   ( q/1, x(0) ),
		     put_var      ( x("A") ),
		     call        ,
		     deallocate   ] }
	 */
	
	var db = {};
	var builtins = {};
	
	var it = new Interpreter(db, builtins);
	
	it.set_question(qcode);
	
	//console.log(it.db);
	
	var inst = it.fetch_next_instruction();
	
	//console.log("Inst: ", JSON.stringify(inst));
	
	var result = Utils.compare_objects(new Instruction('allocate'), inst);
	
	should.equal(result, true, "input: " + util.inspect(inst));
	
	it.step();
});


it('Interpreter - basic - 0', function(){
	
});
