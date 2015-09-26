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

function call_tracer(where, ctx, data) {
	
	var depth;
	var icount;
	
	if (ctx.ctx)
		icount = Utils.pad(""+ctx.ctx.step_counter, 5)+ " -- ";
	
	if (ctx.stack)
		depth = Utils.pad(""+ctx.stack.length, 5)+" -- ";
	
	if (where == 'before_inst') 
		if (data.opcode == 'setup') {
			console.log(icount, depth, "CALL: ", ctx.ctx.tse.vars['$x0']);
		};
	
	if (where == 'before_inst')
		if (data.opcode == 'deallocate') {
			if (ctx.ctx.cu)
				console.log(icount, depth, "EXIT: ", ctx.ctx.tse.vars['$x0']);
			else
				console.log(icount, depth, "REDO: ", ctx.ctx.tse.vars['$x0']);
		};
		
};

function basic_tracer(ctx, it_ctx, data) {

	if (ctx == 'backtracking') {
		console.log("<<<< BACKTRACKING: ", it_ctx.cse.cp.p);
	};
	
	if (ctx == 'restore') {
		//console.log("--- RESTORING: ", it_ctx);
	};

	if (ctx == 'save') {
		//console.log("--- SAVING: ", it_ctx);
	};
	
	if (ctx == 'before_inst') {
		console.log("BEFORE: inst(",data,")  CU: ", it_ctx.ctx.cu);
	};
	if (ctx == 'after_inst'){
		console.log("AFTER:  inst(",data,")  CU: ", it_ctx.ctx.cu);
		//if (data.opcode == 'unif_var')
		//	console.log(it_ctx.ctx.cse.vars);
		//if (it_ctx.tse) console.log("VARS: ", it_ctx.tse.vars);		
	};
		
	if (ctx == 'execute') {
		console.log("\n--> Executing: ",it_ctx.p.f+"/"+it_ctx.p.a, ":"+it_ctx.p.ci, "@ "+it_ctx.p.l);
		//if (it_ctx.tse) console.log("VARS: ", it_ctx.tse.vars);
	};
		
};

function format_instruction_pointer( p ) {
	return p.f+"/"+p.a+":"+p.ci+" @ "+p.l+":"+(p.i-1);
};

function advanced_tracer(where, it_ctx, data) {
	
	var line = ""; 
	var maybe_value, maybe_var;

	
	if (where == 'execute') {
		//console.log("\n--> Executing: ",it_ctx.p.f+"/"+it_ctx.p.a, ":"+it_ctx.p.ci, "@ "+it_ctx.p.l);
		//if (it_ctx.tse) console.log("\n---- TSE VARS: ", it_ctx.tse.vars);
		//if (it_ctx.cse) console.log("\n++++ CSE VARS: ", it_ctx.cse.vars);
	};
	
	
	if (where == 'before_inst') {
		
		line = Utils.pad(""+it_ctx.ctx.step_counter, 8) + " -- ";
		
		maybe_var = data.get_parameter_name();
		if (maybe_var)
			maybe_value = it_ctx.ctx.cse.vars[maybe_var];

		if (!maybe_value)
			if (it_ctx.ctx.tse)
				maybe_value = it_ctx.ctx.tse.vars[maybe_var];
		
		
		line += Utils.pad(format_instruction_pointer(it_ctx.ctx.p), 30)
		+ " -- " + util.inspect(data)
		+ " -- " + Utils.pad(""+it_ctx.ctx.cu, 10)
		+ " mode("+it_ctx.ctx.csm+") -- "
		+ " -- " + Utils.pad("", 5)
		;
		
		if (maybe_var)
			line += util.inspect(maybe_value);
		
		console.log(line);
		//console.log(">> STACK DEPTH: ", it_ctx.stack.length);
		//console.log("!!!!! NUMBER OF VARS: ", Var.counter);
		
	};
	
	if (where == 'after_inst') {

		line = "**** ";
		
		maybe_var = data.get_parameter_name();
		if (maybe_var)
			maybe_value = it_ctx.ctx.cse.vars[maybe_var];

		if (!maybe_value)
			if (it_ctx.ctx.tse)
				maybe_value = it_ctx.ctx.tse.vars[maybe_var];

		if (maybe_var) {
			line += util.inspect(maybe_value);
			console.log(line);
		}
			
		
	};
	
};//advanced_tracer


var parser = function(text) {

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


var prepare = function(rules_and_facts, query, tracer) {
	
	var crules = compile_rules_and_facts(rules_and_facts);
	var cquery = compile_query(query);
	
	//console.log(cquery);

	var db = new Database(DbAccess);
	var builtins = {};
	
	db.batch_insert_code(crules);
	
	var it = new Interpreter(db, builtins);
	
	if (tracer)
		it.set_tracer(tracer);
	
	it.set_question(cquery);
	
	return it;
};


var compile_rules_and_facts = function(input_texts) {
	
	var parsed = [];
	
	for (var ti in input_texts) {
		var t = input_texts[ti];
		parsed.push(parser(t)[0]);
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



var compile_query = function(input_text) {

	var expressions = parser(input_text);
	
	//console.log("Expressions: ", expressions);
	
	var c = new Compiler();
	
	var result = c.process_query(expressions[0][0]);
		
	return result;
	
};

var test = function(rules, query, expected, options) {
	
	options = options || {};
	var tracer = options.tracer;
	
	//console.log("Tracing: ", tracer);
	
	var dumpdb_enable = options.dump_db == true;
	
	var it = prepare(rules, query, tracer);

	for (var index in expected) {
		
		try {
			run(it);	
		} catch(e) {
			if (dumpdb_enable)
				dump_db(it.db.db);
			throw e;
		};
		
		
		var vars = it.get_query_vars();
				
		var expect = expected[index];
		
		for (var vindex in expect) {
			
			var e = expect[vindex];
			var a = vars[vindex];
			
			if (!a) {
				console.log("*** VARS: ", vars);
				if (dumpdb_enable)
					console.log("DB: ", it.db.db)
				throw new Error("Missing expect value @ index:"+vindex);
			};
			
			var av, ev;
			
			try {
				
				if (a instanceof Var)
					av = a.get_value();
				else
					av = a;
				
			} catch(err) {
				console.log("STACK : ", it.stack);
				console.log("\n*** VARS: ", vars);
				//dump_var(it.ctx.cse.vars);
				//dump_var(it.ctx.tse.vars);
				if (dumpdb_enable)
					dump_db(it.db.db);
				throw err;
			};

			if (!(typeof av == 'string'))
				av = util.inspect(av);
			
			try {
				should.equal(av, e, "got: "+av+" expecting: "+e);	
			}catch(e) {
				console.log("*** VARS: ", vars);
				if (dumpdb_enable)
					dump_db(it.db.db);
				throw e;
			};
			
		};
		
		it.backtrack();
	};
	
};

var dump_db = function(db){
	
	for (key in db) {
		console.log("\n\n", key, " code ==> ", db[key]);
	};
	
};

var dump_var = function(vars) {
	
	for (key in vars)
		console.log("\n\n", key, " = ", vars[key]);
};

var run = function(it) {

	var result;
	do {
		try {
			result = it.step();	
		} catch(e) {
			console.log("\n\n !!!!! CTX: ", it);
			throw e;
		};
		
		
	} while (!result);
};

// ======================================================================== BASIC


it('Interpreter - batch2 - simple - 1', function(){
	
	//console.log("\n ~~~~~~~~~~ 'Interpreter - batch2 - simple - 1'");
	
	var rules = [
	             "f(666)."
	             ];
	
	/*
	 
	 */
	
	var query = "f(A).";
	
	var expected = [
	                {"A": 666}
	                ];
	
	test(rules, query, expected);
});



it('Interpreter - batch2 - simple - 2', function(){
	
	//console.log("\n ~~~~~~~~~~ 'Interpreter - batch2 - simple - 2' ");
	
	var rules = [
	             "f(A, A)."
	             ];
	
	var query = "f(666, 666).";
	
	var expected = [
	                // expecting no return variables
	                ];
	
	test(rules, query, expected);
});


it('Interpreter - batch2 - complex - 1', function(){
	
	var rules = [
	             "f(666)."
	             ,"f(abc)."
	             ];
	
	var query = "f(A).";
	
	var expected = [
	                 {"A": 666   }
	                ,{"A": "abc" }
	                ];
	
	test(rules, query, expected);
});

it('Interpreter - batch2 - complex - 2', function(){
	
	//console.log("\n\n\n ~~~~~~~~~~~~~~~ Interpreter - batch2 - complex - 2");
	
	Functor.inspect_compact_version = true;
	Var.inspect_extended = false;
	
	/*
		 exists/2  code ==>  [ { head: 
	     [ 
	     	get_struct   ( exists/2, x(0) ),
	       get_var      ( p("A") ),
	       get_var      ( x(1) ),
	       get_struct   ( list/5, x(1) ),
	       unif_value   ( p("A") ),
	       unif_void   ,
	       unif_void   ,
	       unif_void   ,
	       unif_void   ,
	       proceed      
	      ],
	    f: 'exists',
	    a: 2 } ]

		puzzle/1  code ==>  [ { g0: 
		     [ allocate    ,
		       put_struct   ( house/5, x(1) ),
		       put_term     ( p("red") ),
		       put_term     ( p("english") ),
		       put_void    ,
		       put_void    ,
		       put_void    ,
		       put_struct   ( exists/2, x(0) ),
		       put_value    ( x(1) ),
		       put_var      ( p("Houses") ),
		       setup       ,
		       call        ,
		       maybe_retry ,
		       deallocate  ,
		       proceed      ],
		    head: 
		     [ get_struct   ( puzzle/1, x(0) ),
		       get_var      ( p("Houses") ),
		       jump         ( p("g0") ) ],
		    f: 'puzzle',
		    a: 1 } ]
		
		
		 .q./0  code ==>  [ { g0: 
		     [ allocate    ,
		       put_struct   ( puzzle/1, x(0) ),
		       put_var      ( p("Houses") ),
		       setup       ,
		       call        ,
		       maybe_retry ,
		       deallocate  ,
		       end          ] } ]
       
	 */
	var rules = [
	             "exists(A, list(A, _, _, _, _))."
	             ,"puzzle(Houses) :-  exists(house(red, english, _, _, _), Houses)."
	             ];
	
	
	var query = "puzzle(Houses).";
	
	var expected = [
{"Houses": 'list(house("red","english",Var(_),Var(_),Var(_)),Var(_),Var(_),Var(_),Var(_))'  }
	                ];
	
	test(rules, query, expected);
	//test(rules, query, expected, {dump_db: true});
	//test(rules, query, expected, {tracer: advanced_tracer});
});


it('Interpreter - batch2 - program - 1', function(){
	
	//console.log("\n\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Interpreter - batch2 - program 1");
	
	var rules = [
					 "exists(A, list(A, _, _, _, _))."
					,"exists(A, list(_, A, _, _, _))."
					,"exists(A, list(_, _, A, _, _))."
					,"exists(A, list(_, _, _, A, _))."
					,"exists(A, list(_, _, _, _, A))."
					
					,"rightOf(R, L, list(L, R, _, _, _))."
					,"rightOf(R, L, list(_, L, R, _, _))."
					,"rightOf(R, L, list(_, _, L, R, _))."
					,"rightOf(R, L, list(_, _, _, L, R))."
					
					,"middle(X, list(_, _, X, _, _))."
					,"first(Y, list(Y, _, _, _, _))."
					
					,"nextTo(A, B, list(B, A, _, _, _))."
					,"nextTo(A, B, list(_, B, A, _, _))."
					,"nextTo(A, B, list(_, _, B, A, _))."
					,"nextTo(A, B, list(_, _, _, B, A))."
					,"nextTo(A, B, list(A, B, _, _, _))."
					,"nextTo(A, B, list(_, A, B, _, _))."
					,"nextTo(A, B, list(_, _, A, B, _))."
					,"nextTo(A, B, list(_, _, _, A, B))."
					
					,"puzzle(Houses) :-  exists(house(red, english, _, _, _), Houses), "
					                   +"exists(house(_, spaniard, _, _, dog), Houses),"
					                   +"exists(house(green, _, coffee, _, _), Houses),"
					                   +"exists(house(_, ukrainian, tea, _, _), Houses),"
					                   +"rightOf(house(green, _, _, _, _), house(ivory, _, _, _, _), Houses),"
					                   +"exists(house(_, _, _, oldgold, snails), Houses),"
					                   +"exists(house(yellow, _, _, kools, _), Houses),"
					                   +"middle(house(_, _, milk, _, _), Houses),"
					                   +"first(house(_, norwegian, _, _, _), Houses),"
					                   +"nextTo(house(_, _, _, chesterfield, _), house(_, _, _, _, fox), Houses),"
					                   +"nextTo(house(_, _, _, kools, _),house(_, _, _, _, horse), Houses),"
					                   +"exists(house(_, _, orangejuice, luckystike, _), Houses),"
					                   +"exists(house(_, japanese, _, parliament, _), Houses),"
					                   +"nextTo(house(_, norwegian, _, _, _), house(blue, _, _, _, _), Houses)."

						,"puzzle1(Houses) :-  exists(house(red, english, _, _, _), Houses), "
						                   +"exists(house(_, spaniard, _, _, dog), Houses),"
						                   +"exists(house(green, _, coffee, _, _), Houses),"
						                   +"exists(house(_, ukrainian, tea, _, _), Houses)."
						                   
						,"puzzle2(Houses) :-  exists(house(red, english, _, _, _), Houses), "
		                   +"exists(house(_, spaniard, _, _, dog), Houses),"
		                   +"exists(house(green, _, coffee, _, _), Houses),"
		                   +"exists(house(_, ukrainian, tea, _, _), Houses),"					                   
		                   +"rightOf(house(green, _, _, _, _), house(ivory, _, _, _, _), Houses),"
		                   +"exists(house(_, _, _, oldgold, snails), Houses),"
		                   +"exists(house(yellow, _, _, kools, _), Houses)."
						                   
						,"puzzle3(Houses) :-  exists(house(red, english, _, _, _), Houses), "
			                   +"exists(house(_, spaniard, _, _, dog), Houses),"
			                   +"exists(house(green, _, coffee, _, _), Houses),"
			                   +"exists(house(_, ukrainian, tea, _, _), Houses),"
			                   +"rightOf(house(green, _, _, _, _), house(ivory, _, _, _, _), Houses),"
			                   +"exists(house(_, _, _, oldgold, snails), Houses),"
			                   +"exists(house(yellow, _, _, kools, _), Houses),"
			                   +"middle(house(_, _, milk, _, _), Houses),"
			                   +"first(house(_, norwegian, _, _, _), Houses)."
			                   
			                   
						,"puzzle4(Houses) :-  exists(house(red, english, _, _, _), Houses), "
		                   +"exists(house(_, spaniard, _, _, dog), Houses),"
		                   +"exists(house(green, _, coffee, _, _), Houses),"
		                   +"exists(house(_, ukrainian, tea, _, _), Houses),"
		                   +"rightOf(house(green, _, _, _, _), house(ivory, _, _, _, _), Houses),"
		                   +"exists(house(_, _, _, oldgold, snails), Houses),"
		                   +"exists(house(yellow, _, _, kools, _), Houses),"
		                   +"middle(house(_, _, milk, _, _), Houses)."			                   
						                   
	                /*
	                 *   
					 ,"solution(WaterDrinker, ZebraOwner) :- puzzle(Houses),"
					 										+"exists(house(_, _, water, _, _), Houses),"
					                                        +"exists(house(_, _, _, _, zebra), Houses)."
	                 */
	             ];
	
	var query = "puzzle(Houses).";
	
	/*
	 * puzzle1 solution:  GOOD!
	 * =================
	 * 
	 	Functor(list/5,
	 		Functor(house/5,"red","english",Var(_),Var(_),Var(_)),
	 		Var(_, Functor(house/5,Var(_, green),"spaniard",Var(_, coffee),Var(_, Var(_)),"dog")),
	 		Var(_, Functor(house/5,Var(_),"ukrainian","tea",Var(_),Var(_))),
	 		Var(_),
	 		Var(_))
	 */
	
	/*
	 * puzzle2 solution, 1st:  GOOD!
		Functor(list/5,
		Functor(house/5,"red","english",Var(_, Var(_)),Var(_, oldgold),Var(_, snails)),
		Var(_, Functor(house/5,Var(_, green),"spaniard",Var(_, coffee),Var(_, Var(_)),"dog")),
		Var(_, Functor(house/5,Var(_, ivory),"ukrainian","tea",Var(_, Var(_)),Var(_, Var(_)))),
		Var(_, Functor(house/5,"green",Var(_),Var(_),Var(_),Var(_))),
		Var(_, Functor(house/5,"yellow",Var(_),Var(_),"kools",Var(_))))
	 */
	
	/*  puzzle3  :)
	 *  =======
		list(
			house("yellow",norwegian,_,"kools",_),
			house("red","english",?CYCLE?,oldgold,snails),
			house("ivory",_,milk,_,_),
			house(green,"spaniard",coffee,?CYCLE?,"dog"),
			house(yellow,"ukrainian","tea",kools,_))	 
	*/
	
	/* Puzzle4  :)
	 * 
	 * list(
	 * house("red","english",_,oldgold,snails),
	 * house(green,"spaniard",coffee,oldgold,"dog"),
	 * house("ivory",_,milk,_,_),
	 * house(green,"ukrainian","tea",_,_),
	 * house("yellow",_,_,"kools",_))
	 * 
	 */
	
	/* complete puzzle:  OK :)
	 
	 list(	house(yellow,norwegian,_,kools,fox),
	 		house(blue,ukrainian,tea,chesterfield,horse),
	 		house(red,english,milk,oldgold,snails),
	 		house(ivory,spaniard,orangejuice,luckystike,dog),
	 		house(green,japanese,coffee,parliament,_)
	 		)
	 */
	
	
	var expected = [
	{
		Houses: 'list(house("yellow",norwegian,_,"kools",fox),house(blue,"ukrainian","tea",chesterfield,horse),house("red","english",milk,oldgold,snails),house(ivory,"spaniard",orangejuice,luckystike,"dog"),house("green",japanese,"coffee",parliament,_))'
	}
	                ];
	
	Functor.inspect_compact_version = true;
	Var.inspect_extended = false;
	Var.inspect_compact = true;
	
	//test(rules, query, expected, { tracer: call_tracer });
	//test(rules, query, expected, { tracer: advanced_tracer });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	test(rules, query, expected);
	
});
