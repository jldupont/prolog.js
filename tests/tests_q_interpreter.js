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
var Var = pr.Var;

var Utils = pr.Utils;
var Database = pr.Database;
var DbAccess = pr.DbAccess;

var ParserL1 = pr.ParserL1;
var ParserL2 = pr.ParserL2;
var ParserL3 = pr.ParserL3;
var Compiler = pr.Compiler;
var Interpreter = pr.Interpreter;
var Instruction = pr.Instruction;

var ErrorNoMoreInstruction = pr.ErrorNoMoreInstruction;

function basic_tracer(ctx, it_ctx, data) {

	if (ctx == 'restore') {
		console.log("--- RESTORING: ", it_ctx);
	};

	if (ctx == 'save') {
		console.log("--- SAVING: ", it_ctx);
	};
	
	if (ctx == 'before_inst') {
		console.log("BEFORE: inst(",data,")  CU: ", it_ctx.ctx.cu);
	};
	if (ctx == 'after_inst'){
		console.log("AFTER:  inst(",data,")  CU: ", it_ctx.ctx.cu);
		
		//if (data.opcode == "end")
			console.log("++ VARS: ", it_ctx.ctx.cse.vars);
		
		//console.log(it_ctx);
	};
		
	if (ctx == 'execute')
		console.log("--> Executing: ",it_ctx.p.f+"/"+it_ctx.p.a, ":"+it_ctx.p.ci, "@ "+it_ctx.p.l);
};


var prepare = function(rules_and_facts, query, tracer) {
	
	var crules = compile_rules_and_facts(rules_and_facts);
	var cquery = compile_query(query);
	
	//console.log(cquery);

	var db = new Database(DbAccess);

	db.batch_insert_code(crules);
	
	var it = new Interpreter(db);
	
	if (tracer)
		it.set_tracer(tracer);
	
	it.set_question(cquery);
	
	return it;
};

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

var compile_rules_and_facts = function(input_texts) {
	
	var parsed = [];
	
	for (var ti in input_texts) {
		var t = input_texts[ti];
		parsed.push(setup(t)[0]);
	}
	
	var results = [];
	
	//console.log(parsed);
	
	for (var index = 0; index<parsed.length; index++) {
		
		var expression = parsed[index][0];
		
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
	
	var it = new Interpreter(db);
	
	//it.set_tracer(basic_tracer);
	
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
	
	//console.log(it.stack);
	
	var vars = it.get_query_vars();
	
	//console.log("Vars: ", vars);
	
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
	
	var it = new Interpreter(db);
	
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
	should.equal(vara.get_value(), 777);
	
	//it.set_tracer(tracer);
	
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
	
	vara = vars['A'];
	should.equal(vara.get_value(), 888);
	
});


it('Interpreter - complex - 3', function(){

	//console.log('\r');
	
	var rules = [
	                "r(1,A) :- f(1+A)."
	               ,"r(2,A) :- f(2+A)."
	               ,"f(X)."
	             ];

	var query = "r(1,2).";
	
	/*
		{ g0: 
		   [ allocate    ,
		     put_struct   ( r/2, p(0) ),
		     put_number   ( p(1) ),
		     put_number   ( p(2) ),
		     setup       ,
		     call        ,
		     maybe_retry ,
		     deallocate  ,
		     end          
		     ] 
		  }
	 */
	
	//var it = prepare(rules, query, basic_tracer);
	var it = prepare(rules, query);

	//console.log(it.db.db);
	
	it.step(); // allocate                      STACK DEPTH 2
	it.step(); // put_struct  r/2, x(0)
	it.step(); // put_number 1
	it.step(); // put_number 2
	it.step(); // setup
	it.step(); // call r/2
	
	// At r/2:0 `head`
	//
	it.step(); // get_struct  - head  r/2
	it.step(); // get_number  p(1)
	it.step(); // get_var p(A)

	it.step(); // jmp g0      - body  r/2:0
	
	it.step(); // allocate                       STACK DEPTH 3
	it.step(); // put_struct (plus/2 ...
	it.step(); // put_number
	it.step(); // put_var(A)
	it.step(); // put_struct f/1
	it.step(); // put_value 
	it.step(); // setup
	it.step(); // call f/1
	
	// At f/1:0 `head`
	//
	it.step(); // get_struct f/1 - head
	it.step(); // unif_var
	it.step(); // proceed
	
	// Back to r/2:0
	//
	it.step(); // return to r/2 -- maybe_retry
	it.step(); // deallocate                     CANNOT DEALLOCATE BECAUSE OF ADDITIONAL CHOICE POINT
	it.step(); // proceed
	
	// returning to .q./0
	it.step(); // maybe_retry
	it.step(); // deallocate
	it.step(); // end
	
	
	should.equal(it.ctx.cu, true);
	should.equal(it.stack.length, 3);
});


it('Interpreter - complex - 4 - anon', function(){

	//console.log("\n Interpreter - complex - 4 - anon -------------------------");
	
	var rules = [
	                "f(666)."
	               ,"f(777)"
	             ];

	/*
		[ { head: 
		     [ get_struct   ( f/1, p(0) ),
		       get_number   ( p(666) ),
		       proceed      ],
		    f: 'f',
		    a: 1 },
		  { head: 
		     [ get_struct   ( f/1, p(0) ),
		       get_number   ( p(777) ),
		       proceed      ],
		    f: 'f',
		    a: 1 } ]
	 */
	
	var query = "f(_).";
	
	/*
		{ g0: 
		     [ allocate    ,
		       put_struct   ( f/1, p(0) ),
		       put_var      ( p("_") ),
		       setup       ,
		       call        ,
		       maybe_retry ,
		       deallocate  ,
		       end          
		       ] }
	 */
	
	//var it = prepare(rules, query, basic_tracer);
	var it = prepare(rules, query);
	
	it.step(); // allocate           DEPTH 2
	it.step(); // put_struct f/1
	it.step(); // put_var _
	it.step(); // setup
	it.step(); // call
	
	// f/1:0
	//
	it.step(); // get_struct f/1
	it.step(); // get_number 666
	it.step(); // proceed
	
	it.step(); // maybe_retry
	it.step(); // deallocate
	it.step(); // end
	
	should.equal(it.ctx.cu, true, "Should find f(666).");
	
	// there is still 1 fact that could match...
	should.equal(it.stack.length, 2, "Still 1 more choice point should be available");
	
	it.backtrack();
	
	it.step(); // maybe_retry
	it.step(); // call f/1:1 @ head
	
	// f/1:1
	//
	it.step(); // get_struct f/1
	it.step(); // get_number 777
	it.step(); // proceed
	
	// Back to .q./1:0
	//
	it.step(); // maybe_retry
	
	it.step(); // deallocate
	it.step(); // end
	
	
	should.equal(it.ctx.cu, true, "f(777).");
	
	// this time around, no more match possible
	//
	should.equal(it.stack.length, 2, "No more choice point available BUT last choice succeeded");
});

it('Interpreter - complex - 5', function(){

	var rules = [
	                "f(666)."
	               ,"f(777)"
	             ];

	/*
		[ { head: 
		     [ get_struct   ( f/1, p(0) ),
		       get_number   ( p(666) ),
		       proceed      ],
		    f: 'f',
		    a: 1 },
		  { head: 
		     [ get_struct   ( f/1, p(0) ),
		       get_number   ( p(777) ),
		       proceed      ],
		    f: 'f',
		    a: 1 } ]
	 */
	
	var query = "f(A).";
	
	/*
		{ g0: 
		     [ allocate    ,
		       put_struct   ( f/1, p(0) ),
		       put_var      ( p("A") ),
		       setup       ,
		       call        ,
		       maybe_retry ,
		       deallocate  ,
		       end          
		       ] }
	 */
	
	//var it = prepare(rules, query, basic_tracer);
	var it = prepare(rules, query);
	
	it.step(); // allocate
	it.step(); // put_struct f/1
	it.step(); // put_var _
	it.step(); // setup
	it.step(); // call
	
	it.step(); // get_struct f/1
	it.step(); // get_number 666
	it.step(); // proceed
	
	it.step(); // maybe_retry
	it.step(); // deallocate
	it.step(); // end
	
	should.equal(it.ctx.cu, true);
	
	// there is still 1 fact that could match...
	should.equal(it.stack.length, 2, "1 choice point left on the stack");
	
	var vars = it.get_query_vars();
	var vara = vars["A"];
	
	should.equal(vara.get_value(), 666, "Getting number 666");
	
	it.backtrack();
	
	it.step(); // maybe_retry
	it.step(); // call f/1:1 @ head
	
	it.step(); // get_struct f/1
	it.step(); // get_number 777
	it.step(); // proceed
	
	it.step(); // maybe_retry
	it.step(); // deallocate
	it.step(); // end
	
	should.equal(it.ctx.cu, true);
	
	should.equal(it.stack.length, 2, "1 Choice point left on the stack");
	
	vars = it.get_query_vars();
	vara = vars["A"];
	should.equal(vara.get_value(), 777);
});


it('Interpreter - program - 1', function(){

	//console.log("\n~~~~~~~~~~~ Interpreter - program - 1");
	
	Var.inspect_extended = true;
	
	var rules = [
	                "father_child(jld, charlot)."
	               ,"father_child(jld, julianne)."
	               ,"mother_child(isa, charlot)."
	               ,"mother_child(isa, julianne)."
	               ,"parent_child(X, Y) :- father_child(X, Y)."
	               ,"parent_child(X, Y) :- mother_child(X, Y)."
	               
	             ];
	var query = "parent_child(X, Y).";
	
	/*
[ { g0: 
     [ allocate    ,
       put_struct   ( father_child/2, x(0) ),
       put_var      ( p("X") ),
       put_var      ( p("Y") ),
       setup       ,
       call        ,
       maybe_retry ,
       deallocate  ,
       proceed      ],
    head: 
     [ get_struct   ( parent_child/2, x(0) ),
       get_var      ( p("X") ),
       get_var      ( p("Y") ),
       jump         ( p("g0") ) ],
    f: 'parent_child',
    a: 2 },
  { g0: 
     [ allocate    ,
       put_struct   ( mother_child/2, x(0) ),
       put_var      ( p("X") ),
       put_var      ( p("Y") ),
       setup       ,
       call        ,
       maybe_retry ,
       deallocate  ,
       proceed      ],
    head: 
     [ get_struct   ( parent_child/2, x(0) ),
       get_var      ( p("X") ),
       get_var      ( p("Y") ),
       jump         ( p("g0") ) ],
    f: 'parent_child',
    a: 2 } ]
	 */
	
	var it = prepare(rules, query);
	//var it = prepare(rules, query, basic_tracer);

	//console.log(it.db.db['parent_child/2']);
	
	var vars;
	var result;
	
	do {
		result = it.step();
	} while (!result);
	
	vars = it.get_query_vars();

	should.equal(vars['X'].get_value(), 'jld');
	should.equal(vars['Y'].get_value(), 'charlot');
	
	it.backtrack();
	
	do {
		result = it.step();
	} while (!result);

	vars = it.get_query_vars();

	should.equal(vars['X'].get_value(), 'jld');
	should.equal(vars['Y'].get_value(), 'julianne');
	
	it.backtrack();
	
	//it.set_tracer(basic_tracer);
	
	do {
		result = it.step();
	} while (!result);
	
	vars = it.get_query_vars();

	should.equal(vars['X'].get_value(), 'isa');
	should.equal(vars['Y'].get_value(), 'charlot');
	
	it.backtrack();
	
	do {
		result = it.step();
	} while (!result);
	
	vars = it.get_query_vars();

	should.equal(vars['X'].get_value(), 'isa');
	should.equal(vars['Y'].get_value(), 'julianne');
	
	//it.set_tracer(basic_tracer);

	// should not blow
	it.backtrack();
	
	/*
	should.throws(function(){
		it.step();
	}, ErrorNoMoreInstruction);
	*/
});