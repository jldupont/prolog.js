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
var Database = pr.Database;
var DbAccess = pr.DbAccess;

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

var compile_fact = function(input_text) {
	
	var expressions = setup(input_text);
	
	var results = [];
	
	//console.log(expressions);
	
	for (var index = 0; index<expressions.length; index++) {
		
		var expression = expressions[index][0];
		
		var c = new Compiler();
		
		var result = c.process_head(expression);
		
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

var compile_rule_or_fact = function(input_text) {
	
	var expressions = setup(input_text);
	
	//console.log("Expressions: ", expressions);
	
	var c = new Compiler();
	
	var result = c.process_rule_or_fact(expressions[0][0]);
		
	return result;
	
};

// ======================================================================== BASIC

/*
it('Interpreter - basic - 0', function(){
	
	var qtext = "q(A).";
	var qcode = compile_query(qtext);
	
	//console.log("Qcode: ", qcode);
	
	//*
	// * { g0: 
	//	   [ allocate    ,
	//	     put_struct   ( q/1, x(0) ),
	//	     put_var      ( x("A") ),
	//	     call        ,
	//	     deallocate   ] }
	//
	
	var db = new Database(DbAccess);
	var builtins = {};
	
	var it = new Interpreter(db, builtins);
	
	it.set_question(qcode);
	
	//console.log(it.db);
	
	var inst = it.fetch_next_instruction();
	
	//console.log("Inst: ", JSON.stringify(inst));
	//it.step();
	
	var result = Utils.compare_objects(new Instruction('allocate'), inst);
	
	should.equal(result, true, "input: " + util.inspect(inst));
	
	//it.step();
});
*/

/*
it('Interpreter - basic - 1', function(){
	
	var qtext = "q(666, a).";
	
	var expected = { vars: { x0: 'Functor(q/2,666,"a")' } };
	
	var qcode = compile_query(qtext);
	
	var db = {};
	var builtins = {};
	
	var it = new Interpreter(db, builtins);
	
	it.set_question(qcode);
	
	it.step(); // allocate
	it.step(); // put_struct
	it.step(); // put_number
	it.step(); // put_term
	it.step(); // setup
	
	var tse_vars = it.get_current_ctx_var("tse");
	
	//console.log( it.get_env_var("ce") );
	
	var result = Utils.compare_objects(expected, tse_vars);
	should.equal(result, true, "ce vars: " + util.inspect(tse_vars));
});
*/
/*
it('Interpreter - basic - 2', function(){
	
	var qtext = "q(A).";
	
	var expected = { vars: { x0: 'Functor(q/1,Var(A))' } };
	
	var qcode = compile_query(qtext);
	
	var db = {};
	var builtins = {};
	
	var it = new Interpreter(db, builtins);
	
	it.set_question(qcode);
	
	it.step(); // allocate
	it.step(); // put_struct
	it.step(); // put_var
	
	var tse_vars = it.get_current_ctx_var("tse");
	
	//console.log( it.get_env_var("ce") );
	
	var result = Utils.compare_objects(expected, tse_vars);
	should.equal(result, true, "ce vars: " + util.inspect(tse_vars));
});
*/

/*
it('Interpreter - basic - 3', function(){
	
	var qtext = "q1(q2(666)).";
	
	var expected = { vars: { x1: 'Functor(q2/1,666)', x0: 'Functor(q1/1,Functor(q2/1,666))' } };
	
	var qcode = compile_query(qtext);
	
	//console.log(qcode);
	
	//*
	//	{ g0: 
	//	   [ allocate    ,
	//	     put_struct   ( q2/1, p(1) ),
	//	     put_number   ( p(666) ),
	//	     put_struct   ( q1/1, p(0) ),
	//	     put_value    ( p(1) ),
	//	     call        ,
	//	     deallocate   ] }
	 //
	
	var db = new Database(DbAccess);
	var builtins = {};
	
	var it = new Interpreter(db, builtins);
	
	it.set_question(qcode);
	
	it.step(); // allocate
	it.step(); // put_struct
	it.step(); // put_number
	it.step(); // put_struct
	it.step(); // put_value
	
	
	var tse_vars = it.get_current_ctx_var("tse");
	
	//console.log( it.get_env_var("ce") );
	
	var result = Utils.compare_objects(expected, tse_vars);
	should.equal(result, true, "ce vars: " + util.inspect(tse_vars));
});
*/

it('Interpreter - complex - 1', function(){
	
	var db = new Database(DbAccess);
	
	// SETUP
	var fact = "f1(666).";
	
	/*
	 head: { [
	 	get_struct   ( f1/1, p(0) ), 
	 	get_number   ( p(666) )
	 	proceed
	 	]}
	 */
	
	var fcode = compile_rule_or_fact(fact);
	
	//console.log("F1 code:", fcode);
	
	db.insert_code("f1", 1, fcode);
	
	// QUERY
	
	var qtext = "f1(A).";
	
	var qcode = compile_query(qtext);
	
	//console.log("qcode: ", qcode);
	
	/*
		{ g0: 
		   [ allocate    ,
		     put_struct   ( f1/1, p(0) ),
		     put_var      ( p("A") ),
		     setup
		     call        ,
		     maybe_retry
		     deallocate
		     proceed
		     ] }
	 */
	
	function tracer(ctx, inst, before_or_after) {
		if (before_or_after == 'before') {
			console.log(inst);
		} else {
			console.log("  CU: ", ctx.ctx.cu);
		};
			
	};
	
	var builtins = {};
	
	var it = new Interpreter(db, builtins);
	
	//it.set_tracer(tracer);
	
	it.set_question(qcode);
	
	it.step(); // allocate
	it.step(); // put_struct
	it.step(); // put_var
	it.step(); // setup
	it.step(); // call
	
	// In f1 fact
	it.step(); //  get_struct
	it.step(); //  get_number
	it.step(); //  proceed
	
	// Return to .q./0
	it.step();  // maybe_retry
	it.step();  // DEALLOCATE 
	var is_end = it.step();  // end
	
	var vars = it.get_query_vars();
	//console.log("Vars: ", vars);
	//console.log("it ctx: ", it.ctx);
	
	//var tse_vars = it.get_current_ctx_var("tse");
	
	//console.log( tse_vars );
	
	//var result = Utils.compare_objects(expected, ce_vars);
	should.equal(is_end, true);
	
	var vara = vars['A'];
	should.equal(vara.get_value(), 666);
});


it('Interpreter - complex - 2', function(){
	
	var db = new Database(DbAccess);
	
	// SETUP
	var fact = "f1(777).";
	
	/*
	 head: { [
	 	get_struct   ( f1/1, p(0) ), 
	 	get_number   ( p(666) )
	 	proceed
	 	]}
	 */
	
	var fcode = compile_rule_or_fact(fact);
	
	//console.log("F1 code:", fcode);
	
	db.insert_code("f1", 1, fcode);
	
	fact = "f1(888)."
	fcode = compile_rule_or_fact(fact);
	db.insert_code("f1", 1, fcode);
	
	//console.log(db.db);
	
	// QUERY
	
	var qtext = "f1(A).";
	
	var qcode = compile_query(qtext);
	
	//console.log("qcode: ", qcode);
	
	/*
		{ g0: 
		   [ allocate    ,
		     put_struct   ( f1/1, p(0) ),
		     put_var      ( p("A") ),
		     setup
		     call        ,
		     maybe_retry
		     deallocate
		     proceed
		     ] }
	 */
	
	function tracer(ctx, inst, before_or_after) {
		if (before_or_after == 'before') {
			//console.log(inst);
		} else {
			console.log("inst(",inst,")  CU: ", ctx.ctx.cu);
		};
			
	};
	
	var builtins = {};
	
	var it = new Interpreter(db, builtins);
	
	it.set_tracer(tracer);
	
	it.set_question(qcode);
	
	it.step(); // allocate
	it.step(); // put_struct
	it.step(); // put_var
	it.step(); // setup
	it.step(); // call
	
	// In f1 fact
	it.step(); //  get_struct
	it.step(); //  get_number
	it.step(); //  proceed
	
	// Return to .q./0
	it.step();  // maybe_retry
	it.step();  // DEALLOCATE 
	var is_end = it.step();  // end
	
	var vars = it.get_query_vars();
	//console.log("Vars: ", vars);
	//console.log("it ctx: ", it.ctx);
	
	//var tse_vars = it.get_current_ctx_var("tse");
	
	//console.log( tse_vars );
	
	//var result = Utils.compare_objects(expected, ce_vars);
	should.equal(is_end, true);
	
	var vara = vars['A'];
	should.equal(vara.get_value(), 777);
	
	it.set_tracer(tracer);
	
	it.backtrack();
		
	it.step(); //  maybe_retry
	it.step(); //  call
	
	// In f1 fact
	//   clause #2
	
	it.step(); //  get_struct
	it.step(); //  get_number
	it.step(); //  proceed
	
	// Return to .q./0
	it.step();  // maybe_retry
	it.step();  // DEALLOCATE 
	is_end = it.step();  // end

	should.equal(is_end, true);
});
