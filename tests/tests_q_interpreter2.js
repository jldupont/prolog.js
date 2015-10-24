/*
 * prolog.js test cases
 * 
 * @author: jldupont
 */

var should = require('should');
//var assert = require('assert');
var util   = require('util');

var pr = require("../prolog.js");

var Prolog = pr.Prolog;

var Lexer = pr.Lexer;
var Token = pr.Token;
//var OpNode = pr.OpNode;
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
//var Instruction = pr.Instruction;

//var ErrorNoMoreInstruction = pr.ErrorNoMoreInstruction;

function call_tracer(where, ctx, data) {
	
	var depth;
	var icount;
	
	if (ctx.ctx)
		icount = Utils.pad(""+ctx.ctx.step_counter, 5)+ " -- ";
	
	if (ctx.stack)
		depth = Utils.pad(""+ctx.stack.length, 5)+" -- ";
	
	if (where == 'backtracking') {
		console.log("---- BACKTRACKING\n");
		return;
	}
	
	if (where == 'after_inst') 
		if (data.opcode == 'setup') {
			var clause = ctx.ctx.p.ci;
			console.log(icount, depth, "CALL:",clause,"  ", ctx.ctx.tse.vars['$x0']);
		}
	
	if (where == 'before_inst')
		if (data.opcode == 'proceed' || data.opcode == 'maybe_fail') {
			
			var clause = ctx.ctx.p.ci;
			
			if (ctx.ctx.cu)
				console.log(icount, depth, "EXIT:",clause, " ", ctx.ctx.tse.vars['$x0']);
			else
				console.log(icount, depth, "FAIL: ", ctx.ctx.tse.vars['$x0']);
		}
		
}

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

function advanced_tracer(where, it_ctx, data, options) {
	
	options = options || {};
	
	var dump_vars = options.dump_vars;
	
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

		if (!dump_vars && maybe_var) {
			line += util.inspect(maybe_value);
			console.log(line);
		}
		
		var ci = it_ctx.ctx.csi ? it_ctx.ctx.csi - 1 : 0;
		var cs = it_ctx.ctx.cs ? it_ctx.ctx.cs.get_arg(ci) : "-";
		//console.log("**** CS STRUCT:  ", cs);
		//console.log("**** $x0 STRUCT: ", it_ctx.ctx.cse.vars.$x0);
		

		if (dump_vars) {
			console.log("CSE: ", it_ctx.ctx.cse.vars);
			
			if (it_ctx.ctx.cse.vars != it_ctx.ctx.tse.vars)
				console.log("TSE: ", it_ctx.ctx.tse.vars, "\n");
			console.log("\n");
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


var prepare = function(rules_and_facts, query, tracer, options) {
	
	options = options || {};
	
	var crules = compile_rules_and_facts(rules_and_facts);
	var cquery = compile_query(query);
	
	if (options.show_compiled) {
		console.log(cquery);
		console.log(crules);
	}

	var db = new Database(DbAccess);

	db.batch_insert_code(crules);
	
	var it = new Interpreter(db);
	
	var tr = function(where, it_ctx, data) {
		
		if (tracer)
			tracer(where, it_ctx, data, options);
	};
	
	if (tracer)
		it.set_tracer(tr);
	
	it.set_question(cquery);
	
	return it;
};


var compile_rules_and_facts = function(input_texts) {
	
	var parsed = Prolog.parse_per_sentence(input_texts);
	
	var results = Prolog.compile_per_sentence(parsed.sentences);
	
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
	
	var it = prepare(rules, query, tracer, options);

	for (var index in expected) {
		
		try {
			run(it);	
		} catch(e) {
			if (dumpdb_enable)
				dump_db(it.db.db);
			throw e;
		};

		var vars = it.get_query_vars();
		vars["$cu"] = it.ctx.cu;
				
		var expect = expected[index];
		
		for (var vindex in expect) {
			
			var e = expect[vindex];
			var a = vars[vindex];
			
			if (a === undefined) {
				console.log("*** VARS: ", vars);
				if (dumpdb_enable)
					dump_db(it.db.db)
				throw new Error("Missing expect value @ index:"+vindex);
			};
			
			var av;
			
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

			if (!(typeof e == 'string'))
				e = ""+e;
			
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
	
	for (var key in db) {
		console.log("\n\n", key, " code ==> ", db[key]);
	};
	
};

var dump_var = function(vars) {
	
	for (var key in vars)
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
	//test(rules, query, expected, {dump_db: true});
	//test(rules, query, expected, {tracer: advanced_tracer});
});

it('Interpreter - batch2 - complex - 2', function(){
	
	//console.log("\n\n\n ~~~~~~~~~~~~~~~ Interpreter - batch2 - complex - 2");
	
	Functor.inspect_compact_version = true;
	Var.inspect_compact = false;
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
{"Houses": 'list(house(red,english,Var(_),Var(_),Var(_)),Var(_),Var(_),Var(_),Var(_))'  }
	                ];
	
	test(rules, query, expected);
	//test(rules, query, expected, {dump_db: true});
	//test(rules, query, expected, {tracer: advanced_tracer});
});


it('Interpreter - batch2 - program - 1', function(){
	
	this.timeout(17000);
	
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
		Houses: 'list(house(yellow,norwegian,_,kools,fox),house(blue,ukrainian,tea,chesterfield,horse),house(red,english,milk,oldgold,snails),house(ivory,spaniard,orangejuice,luckystike,dog),house(green,japanese,coffee,parliament,_))'
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


/*
select(X, [X|Tail], Tail).
select(Elem, [Head|Tail], [Head|Rest]) :-
   select(Elem, Tail, Rest).
   
select([A|As],S):- select(A,S,S1),select(As,S1).
select([],_). 

left_of(A,B,C):- append(_,[A,B|_],C).  
next_to(A,B,C):- left_of(A,B,C) ; left_of(B,A,C).

zebra(Owns, HS):- 
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


it('Interpreter - batch2 - program - 2a', function(){
	
	this.timeout(17000);
	
	//console.log("\n\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Interpreter - batch2 - program 2a");
	
	var rules = [
		
		 'append([],X,X).\n'
		+'append([X|L1],L2,[X|L3]):- append(L1,L2,L3).\n'
		
		+'select(X, [X|Tail], Tail).\n'
		+'select(Elem, [Head|Tail], [Head|Rest]) :- select(Elem, Tail, Rest).\n'
		
		+'select([A|As],S):- select(A,S,S1),select(As,S1).\n'
		+'select([],_).\n'
		
		+'left_of(A,B,C):- append(_,[A,B|_],C).\n'
		+'next_to(A,B,C):- left_of(A,B,C) ; left_of(B,A,C).\n'
		
		+'zebra(Owns, HS):-\n' 
		+'  HS   = [ h(_,norwegian,_,_,_),    h(blue,_,_,_,_),   h(_,_,_,milk,_), _, _], \n'
		+'  select([ h(red,brit,_,_,_),       h(_,swede,dog,_,_),          \n' 
		+'           h(_,dane,_,tea,_),       h(_,german,_,_,prince)], HS),\n'
		+'  select([ h(_,_,birds,_,pallmall), h(yellow,_,_,_,dunhill),     \n'
		+'           h(_,_,_,beer,bluemaster)],                        HS).\n' 
		];
		
		/*
		+'  left_of( h(green,_,_,coffee,_),   h(white,_,_,_,_),        HS).\n'
		];
		
		+'  next_to( h(_,_,_,_,dunhill),      h(_,_,horse,_,_),        HS),\n'
		+'  next_to( h(_,_,_,_,blend),        h(_,_,cats, _,_),        HS),\n'
		+'  next_to( h(_,_,_,_,blend),        h(_,_,_,water,_),        HS),\n'
		+'  member(  h(_,Owns,zebra,_,_),                              HS).\n'
		
		
	];
	*/
	
	/*
	HS = [	h(_,norwegian,birds,_,pallmall),
			h(blue,swede,dog,beer,bluemaster),
			h(red,brit,_,milk,_),
			h(yellow,dane,_,tea,dunhill),
			h(_,german,_,_,prince)]
			
    GOT:
    		h(_,"norwegian",birds,_,pallmall),
    		h("blue",swede,dog,beer,bluemaster),
    		h(red,brit,_,"milk",_),
    		h(yellow,"dane",_,"tea",dunhill),
    		h(_,"german",_,_,"prince"),nil,
	*/
	
	/*
		with 'left_of'
		=============
	
		HS= [	h(yellow,norwegian,_,_,dunhill),
				h(blue,swede,dog,beer,bluemaster),
				h(red,brit,birds,milk,pallmall),
				h(green,german,_,coffee,prince),
				h(white,dane,_,tea,_)]
	
	*/
	
	/*  COMPLETE ANSWER:
	HS = [h(yellow,norwegian,cats,water,dunhill),h(blue,dane,horse,tea,blend),h(red,brit,birds,milk,pallmall),h(green,german,zebra,coffee,prince),h(white,swede,dog,beer,bluemaster)]
    Owner = german ? 
	*/
	
	var query = "zebra(Who,HS).";
	
	var expected = [
	{
		//Who: ''
		HS: '[h(_,norwegian,birds,_,pallmall),'
		    +'h(blue,swede,dog,beer,bluemaster),'
		    +'h(red,brit,_,milk,_),'
		    +'h(yellow,dane,_,tea,dunhill),'
		    +'h(_,german,_,_,prince),nil]'
	}
	                ];
	
	Functor.inspect_compact_version = true;
	Functor.inspect_cons = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	Token.inspect_compact = true;
	
	//test(rules, query, expected, { tracer: call_tracer });
	//test(rules, query, expected, { tracer: advanced_tracer });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	test(rules, query, expected);
});



it('Interpreter - batch2 - program - 2b', function(){
	
	this.timeout(17000);
	
	//console.log("\n\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Interpreter - batch2 - program 2b");
	
	var rules = [
		
		 'append([],X,X).\n'
		+'append([X|L1],L2,[X|L3]):- append(L1,L2,L3).\n'
		
		+'select3(X, [X|Tail], Tail).\n'
		+'select3(Elem, [Head|Tail], [Head|Rest]) :- select3(Elem, Tail, Rest).\n'
		
		+'select2([A|As],S):- select3(A,S,S1),select2(As,S1).\n'
		+'select2([],_).\n'
		
		+'left_of(A,B,C):- append(_,[A,B|_],C).\n'
		+'next_to(A,B,C):- left_of(A,B,C) ; left_of(B,A,C).\n'
		
		+'zebra(Owns, HS):-\n' 
		+'  HS   = [ h(_,norwegian,_,_,_),    h(blue,_,_,_,_),   h(_,_,_,milk,_), _, _], \n'
		+'  select2([ h(red,brit,_,_,_),       h(_,swede,dog,_,_),          \n' 
		+'           h(_,dane,_,tea,_),       h(_,german,_,_,prince)], HS),\n'
		+'  select2([ h(_,_,birds,_,pallmall), h(yellow,_,_,_,dunhill),     \n'
		+'           h(_,_,_,beer,bluemaster)],                        HS),\n' 
		+'  left_of( h(green,_,_,coffee,_),   h(white,_,_,_,_),        HS).\n'
		];
		
		/*
		+'  next_to( h(_,_,_,_,dunhill),      h(_,_,horse,_,_),        HS),\n'
		+'  next_to( h(_,_,_,_,blend),        h(_,_,cats, _,_),        HS),\n'
		+'  next_to( h(_,_,_,_,blend),        h(_,_,_,water,_),        HS),\n'
		+'  member(  h(_,Owns,zebra,_,_),                              HS).\n'
		
		
	];
	*/
	
	/*
		with 'left_of'
		=============
	
		HS= [	h(yellow,norwegian,_,_,dunhill),
				h(blue,swede,dog,beer,bluemaster),
				h(red,brit,birds,milk,pallmall),
				h(green,german,_,coffee,prince),
				h(white,dane,_,tea,_)]
	
	*/
	
	/*  COMPLETE ANSWER:
	HS = [h(yellow,norwegian,cats,water,dunhill),h(blue,dane,horse,tea,blend),h(red,brit,birds,milk,pallmall),h(green,german,zebra,coffee,prince),h(white,swede,dog,beer,bluemaster)]
    Owner = german ? 
	*/
	
	var query = "zebra(Who,HS).";
	
	var expected = [
	{
		//Who: ''
		HS: '[h(yellow,norwegian,_,_,dunhill),h(blue,swede,dog,beer,bluemaster),h(red,brit,birds,milk,pallmall),h(green,german,_,coffee,prince),h(white,dane,_,tea,_),Token(nil,null)]'
	}
	                ];
	
	Functor.inspect_compact_version = true;
	Functor.inspect_cons = true;
	Var.inspect_extended = false;
	Var.inspect_compact = true;
	Token.inspect_compact = false;
	Token.inspect_quoted = false;
	
	//test(rules, query, expected, { tracer: call_tracer });
	//test(rules, query, expected, { tracer: advanced_tracer });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	test(rules, query, expected);
	
});


it('Interpreter - batch2 - program - 2c', function(){
	
	this.timeout(17000);
	
	//console.log("\n\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Interpreter - batch2 - program 2c");
	
	var rules = [
		
		 'append([],X,X).\n'
		+'append([X|L1],L2,[X|L3]):- append(L1,L2,L3).\n'
		
		+'member(X, [Y|T]) :- X = Y; member(X, T).'
		
		+'select3(X, [X|Tail], Tail).\n'
		+'select3(Elem, [Head|Tail], [Head|Rest]) :- select3(Elem, Tail, Rest).\n'
		
		+'select2([A|As],S):- select3(A,S,S1),select2(As,S1).\n'
		+'select2([],_).\n'
		
		+'left_of(A,B,C):- append(_,[A,B|_],C).\n'
		+'next_to(A,B,C):- left_of(A,B,C) ; left_of(B,A,C).\n'
		
		+'zebra(Owns, HS):-\n' 
		+'  HS   = [ h(_,norwegian,_,_,_),    h(blue,_,_,_,_),   h(_,_,_,milk,_), _, _], \n'
		+'  select2([ h(red,brit,_,_,_),       h(_,swede,dog,_,_),          \n' 
		+'           h(_,dane,_,tea,_),       h(_,german,_,_,prince)], HS),\n'
		+'  select2([ h(_,_,birds,_,pallmall), h(yellow,_,_,_,dunhill),     \n'
		+'           h(_,_,_,beer,bluemaster)],                        HS),\n' 
		+'  left_of( h(green,_,_,coffee,_),   h(white,_,_,_,_),        HS),\n'
		
		+'  next_to( h(_,_,_,_,dunhill),      h(_,_,horse,_,_),        HS),\n'
		+'  next_to( h(_,_,_,_,blend),        h(_,_,cats, _,_),        HS),\n'
		+'  next_to( h(_,_,_,_,blend),        h(_,_,_,water,_),        HS),\n'
		+'  member(  h(_,Owns,zebra,_,_),                              HS).\n'
		
		
	];
	
	
	/*
		with 'left_of'
		=============
	
		HS= [	h(yellow,norwegian,_,_,dunhill),
				h(blue,swede,dog,beer,bluemaster),
				h(red,brit,birds,milk,pallmall),
				h(green,german,_,coffee,prince),
				h(white,dane,_,tea,_)]
	
	*/
	
	/*  COMPLETE ANSWER:
	HS = [h(yellow,norwegian,cats,water,dunhill),h(blue,dane,horse,tea,blend),h(red,brit,birds,milk,pallmall),h(green,german,zebra,coffee,prince),h(white,swede,dog,beer,bluemaster)]
    Owner = german ? 
	*/
	
	var query = "zebra(Who,HS).";
	
	var expected = [
	{
		Who: 'german'
		,HS: '[h(yellow,norwegian,cats,water,dunhill),h(blue,dane,horse,tea,blend),h(red,brit,birds,milk,pallmall),h(green,german,zebra,coffee,prince),h(white,swede,dog,beer,bluemaster),Token(nil,null)]'
	}
	                ];
	
	Functor.inspect_compact_version = true;
	Functor.inspect_cons = true;
	Var.inspect_extended = false;
	Var.inspect_compact = true;
	Token.inspect_compact = false;
	Token.inspect_quoted = false;
	
	//test(rules, query, expected, { tracer: call_tracer });
	//test(rules, query, expected, { tracer: advanced_tracer });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	test(rules, query, expected);
	
});



it('Interpreter - batch3 - program - 1', function(){

	//console.log("\n\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Interpreter - batch3 - program 1\n\n");

	/*
	 * append([],L,L).
		append([H|T],L,[H|LT]):-append(T,L,LT).
	 */
	
/*
append/3  code ==>  

[ { head: 
     [ get_struct  append/3, x(0),
       unif_nil    ,
       get_var     p("L"),
       get_value   p("L"),
       proceed     ,
       vars: [Object] ],
    f: 'append',
    a: 3 },

  { head: 
     [ get_struct  append/3, x(0),
       get_var     x(1),
       get_var     p("L"),
       get_var     x(2),
       get_struct  cons/2, x(1),
       get_var     p("H"),
       get_var     p("T"),
       
       get_struct  cons/2, x(2),
       unif_value  p("H"),
       get_var     p("LT"),
       jump        p("g0") ],
    g0: 
     [ allocate    ,
       put_struct  append/3, x(0),
       put_var     p("T"),
       put_var     p("L"),
       put_var     p("LT"),
       setup       ,
       call        ,
       maybe_retry ,
       deallocate  ,
       proceed      ],
    f: 'append',
    a: 3 } ]


 .q./0  code ==>  [ { g0: 
     [ allocate    ,
       put_struct   ( cons/2, x(1) ),
       put_number   ( p(2) ),
       put_struct   ( cons/2, x(2) ),
       put_number   ( p(1) ),
       put_value    ( x(1) ),
       put_struct   ( cons/2, x(3) ),
       put_number   ( p(4) ),
       put_struct   ( cons/2, x(4) ),
       put_number   ( p(3) ),
       put_value    ( x(3) ),
       put_struct   ( append/3, x(0) ),
       put_value    ( x(2) ),
       put_value    ( x(4) ),
       put_var      ( p("X") ),
       setup       ,
       call        ,
       maybe_retry ,
       deallocate  ,
       end          ] } ]

 */	
	var rules = [
				 "append([],L,L)."
				,"append([H|T],L,[H|LT]):-append(T,L,LT)."
				];
	

	//var query = "append([1,2], [3,4], [1,2,3,4]).";
	var query = "append([1,2], [3,4], X).";
	
	var expected = [
	                { "$cu": true, X: '[1,2,3,4,nil]' }
	                ];

	Functor.inspect_cons = true;
	Functor.inspect_compact_version = true;
	Token.inspect_compact = true;
	//Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: call_tracer });
});



it('Interpreter - batch3 - program - 2', function(){

	//console.log("\n\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Interpreter - batch3 - program 2\n\n");

	var rules = [
					'neigh(Left, Right, List) :-'
			        	+'List = [Left | [Right | _]] ;'
			        	+'List = [_ | [Left | Right]].'
			        	
					+'member(X, [Y|T]) :- X = Y; member(X, T).'
					
					+'zebraowner(Houses, ZebraOwner):-'
					       +'member([englishman, _, red], Houses),'
					        +'member([spanish, jaguar, _], Houses),'
					        +'neigh([_, snail, _], [japanese, _, _], Houses),'
					        +'neigh([_, snail, _], [_, _, blue], Houses),'
					        +'member([ZebraOwner, zebra, _], Houses),'
					        +'member([_, _, green], Houses).'
					        
					+'zebra(X) :- zebraowner([_, _, _], X).'	
				];
	

	var query = "zebra(X).";
	
	var expected = [
	                { "$cu": true, X: 'japanese' }
	                ];

	Functor.inspect_cons = true;
	Functor.inspect_compact_version = true;
	Token.inspect_compact = true;
	//Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: call_tracer });
});




it('Interpreter - Disj - 1', function(){

	var rules = [
	             "f1(666)."
	            ,"f2(777)." 
				,"test(X) :- f1(X) ; f2(X)."
				
				];
	

	//var query = "append([1,2], [3,4], [1,2,3,4]).";
	var query = "test(777).";
	
	var expected = [
	                { "$cu": true }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

// ============================================================================================= ==========
// ============================================================================================= PRIMITIVES
// ============================================================================================= ==========

it('Interpreter - primitive - 1', function(){

	/*
		p/1  code ==>  [ { head: 
		     [ get_struct  p/1, x(0),
		       get_var     p("X"),
		       jump        p("g0") ],
		    g0: 
		     [ allocate    ,
		       put_struct  unif/2, x(0),
		       put_var     p("X"),
		       put_number  p(1),
		       setup       ,
		       bcall       ,
		       deallocate  ,
		       proceed      ],
		    f: 'p',
		    a: 1 } ]
		
		
		 .q./0  code ==>  [ { g0: 
		     [ allocate    ,
		       put_struct  p/1, x(0),
		       put_number  p(1),
		       setup       ,
		       call        ,
		       maybe_retry ,
		       deallocate  ,
		       end          ] } ]
       */
	
	var rules = [
	             "p(X):- X = 1."
				
				];
	
	var query = "p(1).";
	
	var expected = [
	                { "$cu": true }
	                ];

	Token.inspect_compact = false;
	Var.inspect_extended = true;
	Var.inspect_compact = false;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - primitive - 2', function(){

	var rules = [
	             "p(X):- X = 1."
				
				];
	

	var query = "p(2).";
	
	var expected = [
	                { "$cu": false }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - primitive - 3', function(){

	//console.log("\n§§§§§§§§§§§§§ Interpreter - primitive - 3 \n");

	var rules = [
	             "p(X):- X1 is 1, X1 = X."
				
				];
	

	var query = "p(1).";
	
	var expected = [
	                { "$cu": true }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - primitive - 4', function(){

	var rules = [
	             "p(X):- X1 is 1, X1 = X."
				
				];
	

	var query = "p(2).";
	
	var expected = [
	                { "$cu": false }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - primitive - 5', function(){

	var rules = [
	             "p(X):- X1 is X+10, X1 > 15."
				
				];
	

	var query = "p(6).";
	
	var expected = [
	                { "$cu": true }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - primitive - 6', function(){

	var rules = [
	             "p(X):- X1 is X+10, X1 > 15."
				
				];
	

	var query = "p(5).";
	
	var expected = [
	                { "$cu": false }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - primitive - 7', function(){

	var rules = [
	             "p(X):- X1 is X+10, X1 >= 15."
				
				];
	

	var query = "p(5).";
	
	var expected = [
	                { "$cu": true }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - primitive - 8', function(){

	var rules = [
	             "p(X):- X1 is X+10, X1 =< 15."
				
				];
	

	var query = "p(5).";
	
	var expected = [
	                { "$cu": true }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - primitive - 9a', function(){

	var rules = [
	             "p(X):- X1 is X-1, X1 > 10."
				
				];
	

	var query = "p(11).";
	
	var expected = [
	                { "$cu": false }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - primitive - 9b', function(){

	var rules = [
	             "p(X):- X1 is X-1, X1 > 10."
				
				];
	

	var query = "p(12).";
	
	var expected = [
	                { "$cu": true }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - primitive - 9c', function(){

	var rules = [
	             "p(X):- X1 is X-1, X1 < 0."
				
				];
	

	var query = "p(0).";
	
	var expected = [
	                { "$cu": true }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - primitive - 10', function(){

	var rules = [
	             "p(X, X1):- X1 is X*10, X1 > 1."
				
				];
	

	var query = "p(10, X1).";
	
	var expected = [
	                { "$cu": true, X1: 100 }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - primitive - 11a (div)', function(){

	var rules = [
	             "p(X, X1):- X1 is X/2, X1 > 1."
				
				];
	

	var query = "p(10, X1).";
	
	var expected = [
	                { "$cu": true, X1: 5 }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - primitive - 11b (div)', function(){

	var rules = [
	             "p(X, X1):- X1 is X/2, X1 > 1."
				
				];
	

	var query = "p(9, X1).";
	
	var expected = [
	                { "$cu": true, X1: 4.5 }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - primitive - 12a', function(){

	var rules = [
	             "p(X, X1):- X1 is X*2+3, X1 > 1."
				
				];
	

	var query = "p(9, X1).";
	
	var expected = [
	                { "$cu": true, X1: 21 }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

/*
g0: 
     [ prepare     ,
       put_var     p("X"),
       put_number  p(2),
       op_mult     x(1),
       prepare     ,
       put_value   x(1),
       op_expr     ,                ??????????
       prepare     ,
       put_value   x(2),
       put_number  p(3),
       op_plus     x(3),
       prepare     ,
       put_var     p("X1"),
       put_value   x(3),
       op_is       ,
       prepare     ,
       put_var     p("X1"),
       put_number  p(1),
       op_gt       ,
       proceed      ],
 */

it('Interpreter - primitive - 12b', function(){

	var rules = [
	             "p(X, X1):- X1 is (X*2)+3, X1 > 1."
				
				];
	


	var query = "p(9, X1).";
	
	var expected = [
	                { "$cu": true, X1: 21 }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});


it('Interpreter - primitive - 13', function(){

	var rules = [
	             "f(HS) :- HS = [ h(_,norwegian,_,_,_),    h(blue,_,_,_,_),   h(_,_,_,milk,_), _, _]."
				];
	


	var query = "f(X).";
	
	var expected = [
	                { "$cu": true, X: '[h(_,norwegian,_,_,_),h(blue,_,_,_,_),h(_,_,_,milk,_),_,_,nil]' }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});


it('Interpreter - primitive - 14a', function(){

	var rules = [
	             "f(X) :- X = 1, X \\= 0."
				];
	


	var query = "f(X).";
	
	var expected = [
	                { "$cu": true, X: 1 }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - primitive - 14b', function(){

	var rules = [
	             "f(X) :- X = 1, X \\= 1."
				];
	


	var query = "f(X).";
	
	var expected = [
	                { "$cu": false }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});


it('Interpreter - operator - not 1', function(){

	var rules = [
	             "f(a)."
				];
	


	var query = "not f(b).";
	
	var expected = [
	                { "$cu": true }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});


it('Interpreter - operator - not 2', function(){

	var rules = [
	             "f(a)."
				];
	


	var query = "not( f(b) ).";
	
	var expected = [
	                { "$cu": true }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});


// =================================================================================================== CUT





it('Interpreter - cut - 1', function(){

	var rules = [
	             	"membercheck(X, [X|Xs]):- !."
	               ,"membercheck(X, [Y|Xs]):- membercheck(X, Xs)."
				];
	
	/*
	membercheck/2  code ==>  [ 
	{ head: 
	     [ get_struct  membercheck/2, x(0),
	       get_var     p("X"),
	       get_var     x(1),
	       get_struct  cons/2, x(1),
	       unif_value  p("X"),
	       unif_var    p("Xs"),
	       jump        p("g0") ],
	g0: [ 
			cut          
		],
	    f: 'membercheck',
	    a: 2 },
	  { head: 
	     [ get_struct  membercheck/2, x(0),
	       get_var     p("X"),
	       get_var     x(1),
	       get_struct  cons/2, x(1),
	       unif_var    p("Y"),
	       unif_var    p("Xs"),
	       jump        p("g0") ],
	    g0: 
	     [ allocate    ,
	       put_struct  membercheck/2, x(0),
	       put_var     p("X"),
	       put_var     p("Xs"),
	       setup       ,
	       call        ,
	       maybe_retry ,
	       deallocate  ,
	       proceed      ],
	    f: 'membercheck',
	    a: 2 } ]
	
	 */

	var query = "membercheck(4, [4,3,2,1]).";
	
	var expected = [
	                { "$cu": true }
	                ,{ "$cu": false }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - cut - 2', function(){

	//console.log("\n~~~~~~~~~~~~~ Interpreter - cut - 2\n");
	
	var rules = [
	             	"max(X, Y, Z):- X > Y, !, X = Z."
	             	,"max(X, Y, Y)."
				];
	

	var query = "max(1,2,2).";
	
	var expected = [
	                { "$cu": true }
	                ,{ "$cu": false }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});



it('Interpreter - boolean - 1a', function(){

	var rules = [
	             "f(a, X) :- X is true."
				];
	


	var query = "f(a, Y).";
	
	var expected = [
	                { "$cu": true, Y: true }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true, show_compiled: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});


it('Interpreter - boolean - 1b', function(){

	var rules = [
	             "f(a, X) :- X is false."
				];
	


	var query = "f(a, Y).";
	
	var expected = [
	                { "$cu": true, Y: false }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true, show_compiled: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - boolean - 2', function(){

	var rules = [
	             "f(a, X) :- X = not true."
				];
	


	var query = "f(a, Y).";
	
	var expected = [
	                { "$cu": true, Y: 'not(true())' }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true, show_compiled: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - arithmetic - equal', function(){

	var rules = [
	             "f(A, B) :- X is A, Y is B, X =:= Y."
				];
	


	var query = "f(1, 1).";
	
	var expected = [
	                { "$cu": true }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true, show_compiled: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});

it('Interpreter - arithmetic - equalnot', function(){

	var rules = [
	             "f(A, B) :- X is A, Y is B, X =\\= Y."
				];
	


	var query = "f(1, 2).";
	
	var expected = [
	                { "$cu": true }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true, show_compiled: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});


// =================================================================================================== FAIL


it('Interpreter - control - fail', function(){

	var rules = [
	             "f(X) :- X>10 , fail."
				];
	


	var query = "f(11).";
	
	var expected = [
	                { "$cu": false }
	                ];

	Token.inspect_compact = true;
	Var.inspect_extended = true;
	Var.inspect_compact = true;
	
	test(rules, query, expected);
	//test(rules, query, expected, { tracer: advanced_tracer, dump_db: true, show_compiled: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true });
	//test(rules, query, expected, { tracer: advanced_tracer, dump_vars: true, dump_db: true });
	//test(rules, query, expected, { tracer: call_tracer });
});
