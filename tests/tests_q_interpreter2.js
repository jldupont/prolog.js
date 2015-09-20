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
		//console.log("BEFORE: inst(",data,")  CU: ", it_ctx.ctx.cu);
	};
	if (ctx == 'after_inst'){
		console.log("AFTER:  inst(",data,")  CU: ", it_ctx.ctx.cu);
		if (data.opcode == 'unif_var')
			console.log(it_ctx.ctx.cse.vars);
	};
		
	if (ctx == 'execute')
		console.log("\n--> Executing: ",it_ctx.p.f+"/"+it_ctx.p.a, ":"+it_ctx.p.ci, "@ "+it_ctx.p.l);
};

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

var test = function(rules, query, expected, tracer_enable) {
	
	var tracer = tracer_enable ? basic_tracer : undefined;
	
	var it = prepare(rules, query, tracer);

	for (var index in expected) {
		
		run(it);
		
		var vars = it.get_query_vars();
				
		var expect = expected[index];
		
		for (var vindex in expect) {
			
			var e = expect[vindex];
			var a = vars[vindex];
			
			if (!a) {
				console.log("*** VARS: ", vars);
				console.log("DB: ", it.db.db)
				throw new Error("Missing expect value @ index:"+vindex);
			};
			
			var av, ev;
			
			try {
				av = a.get_value();
			} catch(err) {
				console.log("*** VARS: ", vars);
				//console.log("DB: ", it.db.db["puzzle/1"])
				throw err;
			};

			if (!(typeof av == 'string'))
				av = util.inspect(av);
			
			should.equal(av, e, "got: "+av+" expecting: "+e);
		};
		
		it.backtrack();
	};
	
};

var run = function(it) {

	var result;
	do {
		try {
			result = it.step();	
		} catch(e) {
			console.log("\n\n !!!!! CTX: ", it);
			console.log("\n\n !!!!! DB: ", it.db.db)
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
	
	Var.inspect_extended = false;
	
	var rules = [
	             "exists(A, list(A, _, _, _, _))."
	             ,"puzzle(Houses) :-  exists(house(red, english, _, _, _), Houses)."
	             ];
	
	/*
	  [ { head: 
     		[ get_struct   ( exists/2, x(0) ),
		       unif_var     ( p("A") ),
		       unif_var     ( x(1) ),
		       get_struct   ( list/5, x(1) ),
		       unif_var     ( p("A") ),
		       unif_var     ( p("_") ),
		       unif_var     ( p("_") ),
		       unif_var     ( p("_") ),
		       unif_var     ( p("_") ),
		       proceed      ],
	    f: 'exists',
	    a: 2 } ]
	 */
	
	/*
		 [ { g0: 
		     [ allocate    ,
		       put_struct   ( house/5, x(1) ),
		       put_term     ( p("red") ),
		       put_term     ( p("english") ),
		       put_var      ( p("_") ),
		       put_var      ( p("_") ),
		       put_var      ( p("_") ),
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
		       unif_var     ( p("Houses") ),
		       jump         ( p("g0") ) ],
		    f: 'puzzle',
		    a: 1 } ]
	 */
	
	var query = "puzzle(Houses).";
	
	var expected = [
{"Houses": 'Functor(list/5,Var(A, Functor(house/5,"red","english",Var(_),Var(_),Var(_))),Var(_),Var(_),Var(_),Var(_))'  }
	                ];
	
	
	
	test(rules, query, expected);
});


it('Interpreter - batch2 - program - 1', function(){
	
	console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Interpreter - batch2 - program 1");
	
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
					
					,"middle(A, list(_, _, A, _, _))."
					,"first(A, list(A, _, _, _, _))."
					
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
	                  
					 ,"solution(WaterDrinker, ZebraOwner) :- puzzle(Houses),"
					 										+"exists(house(_, _, water, _, _), Houses),"
					                                        +"exists(house(_, _, _, _, zebra), Houses)."
	
	             ];
	
	var query = "puzzle(Houses).";
	
	var expected = [
	                 {"Houses": 666}
	                ];
	
	//test(rules, query, expected, true);
});
