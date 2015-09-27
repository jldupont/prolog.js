/**
 * interpreter.js
 * 
 * 
 * 
 * 
 * @author jldupont
 **/

/**
 * Interpreter
 * @constructor
 * 
 * @param db    : Database
 * @param env   : Environment
 * @param stack : the processing stack i.e. where instructions are pushed and popped
 */
function Interpreter(db, builtins, optional_stack) {

	this.db  = db;
	this.builtins = builtins;
	this.stack = optional_stack || [];
	
	this.tracer = null;
	this.reached_end_question = false;
	
};

Interpreter.prototype.get_stack = function(){
	return this.stack;
};

Interpreter.prototype.set_tracer = function(tracer) {
	this.tracer = tracer;
};


/**
 * Set the `question` to get an answer to
 * 
 * The `question` must be an expression (not a rule)
 *  organized as a single root node.
 * 
 * @param question
 * 
 * @raise ErrorExpectingFunctor
 */
Interpreter.prototype.set_question = function(question_code){
	
	//if (!(question instanceof Functor))
	//	throw new ErrorExpectingFunctor("Expecting functor, got: "+JSON.stringify(question));

	// Enter the `question` in the database
	//  as to only have 1 location to work on from
	if (!(question_code instanceof Array))
		this.db.insert_code(".q.", 0, question_code);
	else
		this.db.insert_code(".q.", 0, question_code[0]);
	
	/*
	 *  Interpreter Context
	 */
	this.ctx = {

		step_counter: 0
			
		// The current instruction pointer
		//
		,p: { 
			f:  ".q.",  // which functor in the database
			a:  0,      // arity
			ci: 0,      // clause index
			ct: 1,      // Total number of clause
			l:  'g0',   // which label
			i:  0       // and finally which index in the label entry
			}
	
		// The current code inside functor:label pointed to by 'p'
		//
		,cc: null

		/*
		 *   Related to `CALL` setup
		 * 
		 *   cv: the structure being built with
		 *       `put_struct`, `put_var`, `put_term`, `put_number` and `put_value`
		 * 
		 */
		,cv: null
		
		/*  Related to `HEAD` Processing
		 * 
		 *   csx:  The current local variable being used to deconstruct
		 *          in the `head` functor.
		 * 
		 *   cs:   The current structure being worked on
		 *         This is retrieved through the "get_struct" instruction.
		 *       
		 *   csi:  The current index in the arguments of `cs`.
		 *         We need this index pointer because we can't be
		 *         destructively `popping` the arguments from the structure.
		 *         This should not be confused with the parent's `head functor` arguments.
		 *         
		 *   csm:  The current mode, either "r" or "w".
		 *   
		 */
		,cs:  null
		,csx: null   
		,csi: 0     
		,csm: 'r'   
		
		/*
		 *  Current unification status
		 */
		,cu: true
		
		/*  Top of stack environment
		 *   i.e. the latest 'allocated'
		 */
		,tse: {}
		
		/*  Current Environment
		 * 
		 */
		,cse: {}

		/*
		 *  `end` instruction encountered
		 */
		,end: false
	};
	
	this.stack = [];
	
	/*   Initialize top of stack
	 *    to point to question in the database
	 *    
	 *   The definitions contained herein
	 *    apply to all environment stack frames.
	 */
	qenv = {

		qenv: true

		/*  Continuation Point
		 *    Used to return from a 'call' 
		 *    
		 *    Uses the same format as 'p'
		 *    but also 'ce' added (continuation environment) 
		 */
		,cp: {}
		
		,vars: {}
	
		/*  Trail
		 */
		,trail: []


		,ci: 0 // Clause Index
		
		// Total number of clauses for the current functor
		,ct: 0

		// TRY_ELSE continuation
		,te: null
		
		/*  Related to building a structure for a CALL instruction
		 */
		,cv: null  // the name of variable where to find the structure being built
		
	};//
	
	// The question's environment
	//
	this.stack.push(qenv);
	this.ctx.cse = qenv;

	// No `call` construction is in progress of course!
	this.ctx.tse = null;
	
	// Prime the whole thing
	this._execute();
};

/**
 *  Backtrack
 *  
 *  @return true  : can backtrack
 *  @return false : can not backtrack (e.g. end of choice points) 
 */
Interpreter.prototype.backtrack = function() {
	
	if (this.tracer)
		this.tracer("backtracking", this.ctx);
	
	
	// Pretend we've got a failure
	//  but in most cases this will anyhow be the case...
	this.ctx.cu = false;
	this.ctx.end = false;
	
	// We are at the top of the stack
	if (this.ctx.tse.qenv)
		return false;
	
	this._restore_continuation( this.ctx.tse.cp );
	this._execute();
	
	return true;
};


/**
 * Take 1 processing step
 * 
 * @return true | false : where 'true' means 'end'
 * 
 * @raise ErrorNoMoreInstruction
 * @raise ErrorInvalidInstruction
 */
Interpreter.prototype.step = function() {

	if (this.ctx.end)
		return true;
	
	this.ctx.step_counter++;
	
	var inst = this.fetch_next_instruction();
	
	var fnc_name = "inst_" + inst.opcode;
	
	var fnc = this[fnc_name];
	if (!fnc)
		throw new ErrorInvalidInstruction(inst.opcode);

	if (this.tracer) {
		this.tracer('before_inst', this, inst);
		this[fnc_name].apply(this, [inst]);
		this.tracer('after_inst', this, inst);
	} else {
		// Execute the instruction
		this[fnc_name].apply(this, [inst]);	
	};
	
	return this.ctx.end;
	
};// step

/**
 *  Cases:
 *  
 *  a)  null --> *p     i.e. at initialization  (already taken care of)
 *  b)  HEAD --> G0     i.e. when executing a functor
 *  c)  Gx   --> Gx'    i.e. when executing inside a functor
 * 
 * @return Instruction | null
 * 
 */
Interpreter.prototype.fetch_next_instruction = function(){
	
	//console.log("fetch: ", this.ctx.p.f+"/"+this.ctx.p.a, this.ctx.p.l, this.ctx.p.i);
	
	// Just try fetching next instruction from env.cc
	var inst = this.ctx.cc[this.ctx.p.l][this.ctx.p.i];
	
	this.ctx.p.i++;
	
	if (inst)
		return inst;
	
	// A jump should have occurred in the code anyways
	//
	throw new ErrorNoMoreInstruction("No More Instruction");
};

/**
 *  Get Functor code
 * 
 * @param ctx.f  : functor_name
 * @param ctx.a  : arity
 * @param ctx.ci : clause_index
 * 
 * @raise ErrorFunctorNotFound
 * @raise ErrorFunctorClauseNotFound
 * 
 * @return ctx with additionally { cc: code, ct: clauses_count }
 */
Interpreter.prototype._get_code = function(functor_name, arity, clause_index) {
	
	//console.log(">>> GET CODE: ", functor_name+"/"+arity, clause_index, " clause: ",clause_index);
	
	var result = {};
	
	var clauses;
	var clauses_count;
	
	try {
		clauses = this.db.get_code(functor_name, arity);
		result.ct = clauses.length;
	} catch(e) {
		throw new ErrorFunctorNotFound("Functor not found: "+functor_name+"/"+arity);
	};
	
	if (clause_index >= result.ct) {
		throw new ErrorFunctorClauseNotFound("Functor clause not found: "+functor_name+"/"+arity);
	};
	
	result.cc = clauses[clause_index];
	
	if (!result.cc)
		return ErrorFunctorCodeNotFound("Functor clause code not found: "+functor_name+"/"+arity);
	
	//console.log(">>> GOT CODE: ", functor_name+"/"+arity, clause_index, " clause: ",clause_index, " CODE: ", result);
	//console.log(">>> GOT CODE: ", functor_name+"/"+arity, clause_index, " clause: ",clause_index);
	
	return result;
	
};//_get_code


Interpreter.prototype._goto = function( label ){
	
	this.ctx.p.l = label;
	this.ctx.p.i = 0;
	
};

/**
 *  Jump to a specific code instruction in the database
 * 
 * @param ctx.f  : functor name
 * @param ctx.a  : functor arity
 * @param ctx.ci : clause index
 * @param ctx.l  : clause label
 * @param ctx.i  : clause label instruction index
 * 
 * @raise ErrorFunctorNotFound, ErrorFunctorCodeNotFound, ErrorFunctorClauseNotFound
 */
Interpreter.prototype._execute = function( ctx ){

	var result = {};
	
	if (ctx) {
		/*
		 *  If input `ctx` is specified,
		 *   it is in the case of a `call` instruction.
		 *   Thus, we are transferring the control flow
		 *   to the beginning of the `head` 
		 *   of the functor specified.
		 */
		
		result = this._get_code(ctx.f, ctx.a, ctx.ci);
		
		this.ctx.p.f  = ctx.f;
		this.ctx.p.a  = ctx.a;
		this.ctx.p.ci = ctx.ci
		this.ctx.p.i = 0;

		this.ctx.cc   = result.cc;
		this.ctx.p.ct = result.ct;
		
	}
	else {
		/*
		 *  In the following case, we are either 
		 *  -- `retrying`
		 *  -- `backtracking`
		 */
		
		result = this._get_code(this.ctx.p.f, this.ctx.p.a, this.ctx.p.ci);
		this.ctx.cc = result.cc;
	}

	// ctx.cc  now contains the code for the specified clause
	//          for the specified functor/arity
	
	/*
	 *  We either have a `fact` (head, no body)
	 *  or a `rule`  (head & body).
	 *  
	 *  Just having `g0` would mean a `query`.
	 */

	if (ctx) {
		this.ctx.p.l = ctx.l || 'head';	
	}
	
	if (this.tracer)
		this.tracer("execute", this.ctx);
	
	return result;
};

Interpreter.prototype._restore_continuation = function(from) {
	
	if (this.tracer)
		this.tracer("restore", from);
	
	this.ctx.cse  = from.ce;
	this.ctx.te   = from.te;
	this.ctx.p.f  = from.p.f;
	this.ctx.p.a  = from.p.a;
	this.ctx.p.ci = from.p.ci;
	this.ctx.p.ct = from.p.ct;
	this.ctx.p.l  = from.p.l;
	this.ctx.p.i  = from.p.i;

};



Interpreter.prototype._save_continuation = function(where, instruction_offset) {
	
	where.p = {};
	
	where.ce   = this.ctx.cse;
	where.te   = this.ctx.te;
	where.p.f  = this.ctx.p.f;
	where.p.a  = this.ctx.p.a;
	where.p.ci = this.ctx.p.ci;
	where.p.ct = this.ctx.p.ct;
	where.p.l  = this.ctx.p.l;
	where.p.i  = this.ctx.p.i + (instruction_offset || 0);
	
	if (this.tracer)
		this.tracer("save", where);
};

Interpreter.prototype._add_to_trail = function(which_trail, what_var) {
	
	var vtrail_name = what_var.name;
	which_trail[vtrail_name] = what_var;
};


Interpreter.prototype.maybe_add_to_trail = function(which_trail, what_var) {
	
	// We only add unbound variables of course
	var dvar = what_var.deref();
	if (dvar.is_bound())
		return;
	
	var vtrail_name = dvar.name
	which_trail[vtrail_name] = dvar;
	
	//console.log("| TRAILED: ", dvar.name, dvar.id);
};


/**
 *  Unwind Trail
 * 
 *  Note that we can't remove elements from the
 *   trail because this one is created during the
 *   `setup` phase yielding to the `call` and won't
 *   be revisited during the possible 
 *   subsequent `retry` phase(s).
 *   
 *   Thus, the trail must exist for as long as the
 *    choice point is kept.
 *    
 * 
 * @param which
 */
Interpreter.prototype._unwind_trail = function(which) {
	
	for (var v in which) {
		var trail_var = which[v];
		
		/*
		 *  We don't deref because the variable
		 *   could have been bound to another one
		 *   which is not bound itself (a chain).
		 */
		
		if (!trail_var.is_bound())
			continue;
		
		trail_var.unbind();
		
		//console.log("> TRAIL UNBOUND: ", trail_var.name);
	};
	
	// Next time around, we might have a different clause
	//  with different variables ... so do some cleanup!
	which = {};

};


Interpreter.prototype.get_query_vars = function() {
	return this.ctx.cse.vars;
};


//
//
// ================================================================================= INSTRUCTIONS
//
//

/**
 *  Instruction "end"
 * 
 * 
 *  Saves Continuation Point to point
 *   at the "maybe retry" following the `call` instruction
 * 
 */
Interpreter.prototype.inst_end = function() {
	this.ctx.end = true;
};

/**
 *  Instruction "setup"
 * 
 * 
 *  Saves Continuation Point to point
 *   at the "maybe retry" following the `call` instruction
 * 
 */
Interpreter.prototype.inst_setup = function() {
	
	// We only need an offset of 1 
	//  because the `fetch instruction` increments
	//  already by 1.
	//
	this._save_continuation(this.ctx.tse.cp, 1);
	
	// Initialize the clause index
	//
	this.ctx.tse.p.ci = this.ctx.tse.p.ci || 0;
	
};


/**
 *   Instruction "call"
 * 
 *   Executes the Functor pointed to by $x0
 *    in the target environment.
 *    
 *   The Continuation Point (CP) will be saved
 *    in the current environment.
 *   
 */
Interpreter.prototype.inst_call = function(inst) {
	
	/*
	 * Clean-up target variables
	 *  We used some variables to construct
	 *  the main structure at $x0 but we need
	 *  to get rid of these or else the target
	 *  functor might unify with values it shouldn't.
	 */
	var x0 = this.ctx.tse.vars['$x0'];
	this.ctx.tse.vars = {};
	this.ctx.tse.vars['$x0'] = x0;
	
	// I know it's pessimistic
	this.ctx.cu = false
	
	// Get ready for `head` related instructions
	this.ctx.cs = null;
	this.ctx.csx = null;
	this.ctx.csm = 'r';
	this.ctx.csi = 0;
	
	
	// Get functor name & arity from the 
	//  environment variable x0
	
	var fname = x0.name;
	var arity = x0.args.length;
	
	/*  Takes care of
	 *  - label `l` component
	 *  - current code `cc`
	 *  - instruction pointer `i` inside label
	 */  

	var result = this._execute({
		 f:  fname
		,a:  arity
		,ci: this.ctx.tse.p.ci
	});
	
	this.ctx.tse.p.ct = result.ct;
	
	//  Make the jump in the target environment
	//
	this.ctx.cse = this.ctx.tse;
	
	// We got this far... so everything is good
	this.ctx.cu = true;
	
}; // CALL


/**
 *   Instruction "maybe_retry"
 * 
 *   When used, this instruction **must** 
 *     always follow a 'CALL' instruction.
 * 
 *   Used to retry the preceding 'CALL' if a failure occurred.
 *   
 *   * Increment clause index
 *   * IF the clause index == # of clauses ==> failure
 *   * ELSE
 *   *   p--, p--
 * 
 */
Interpreter.prototype.inst_maybe_retry = function() {
	
	// A 'noop' if there isn't a failure reported
	//
	if (this.ctx.cu)
		return;

	/*  Whatever happens after, we anyways need
	 *   to unwind the trail before attempting anything else.
	 * 
	 */
	this._unwind_trail( this.ctx.tse.trail );
	
	this.ctx.tse.p.ci ++;

	/*
	 *  The Choice Point context is kept on the top of stack `tse`
	 */
	if (this.ctx.tse.p.ci < this.ctx.tse.p.ct) {
		
		/* We can try the next clause
		 * 
		    The fetch function will have incremented the
		    instruction pointer past this instruction
		    so we need to subtract 2 to get it pointing
		    back to the 'CALL' instruction.
		
			The `backtrack` step will have already
			loaded the code, we just have to cause a
			`jump` by manipulating `i` directly.
		*/
		this.ctx.p.i -= 2;
	};

	// ELSE:  the following `deallocate` will get rid of the
	//        environment from the stack
	
};


/**
 *   Instruction "allocate"
 *   
 *   Denotes beginning of a "choice point" code block
 *   
 *   Create an environment for this choice point and
 *    and push a link in the current environment.
 */
Interpreter.prototype.inst_allocate = function() {
	
	var env = { vars: {}, cp: {}, trail: {}, p:{} , spos: this.stack.length };
	this.ctx.tse = env;
	this.stack.push(env);
};

/**
 *   Instruction "deallocate"
 * 
 *   Deallocates, if possible, a "choice point" environment.
 * 
 *   Cases:
 *   - Choice Point succeeds : do not deallocate environment   
 *   - No Choice Point left
 */
Interpreter.prototype.inst_deallocate = function() {

	/*
	 * Cannot deallocate if we have had
	 *  a successful choice point
	 */
	if (this.ctx.cu)
		return;

	/*
	 *  We've got valuable information here!
	 * 
	 */
	this._unwind_trail( this.ctx.tse.trail );
	
	/*
	 *  The previous choice point list is exhausted.
	 *  There is no use keeping the context.
	 */
	this._deallocate();
};

Interpreter.prototype._deallocate = function(){
	
	this.stack.pop();
	
	// tse goes back to top of stack
	this.ctx.tse = this.stack[ this.stack.length-1 ];
};

/**
 *   Instruction "maybe_fail"
 *   
 *   Used to 'fail' the goal if the result
 *    of the preceding 'CALL' failed.
 *  
 *  
 *   IF a goal was loaded by a 'try_else' instruction,
 *     JUMP to this goal.
 *     
 *   ELSE jump to continuation point.
 *   
 */
Interpreter.prototype.inst_maybe_fail = function() {
	
	// NOOP if we are not faced with a failure
	if (this.ctx.cu)
		return;

	// A disjunction is available?
	//
	if (this.ctx.cse.te) {
		
		this._goto( this.ctx.cse.te );
		
		// just making sure
		this.ctx.cse.te = null;
		
		return;
	};
	
	this.backtrack();
};


/**
 *   Instruction "try_else $target"
 * 
 *   Denotes a disjunctive choice point
 * 
 *   Insert choice point to $target in the current environment.
 *   
 *   If the following choice point about to be tried fails,
 *    it will be removed from the choice point list and the
 *    one inserted to $target will be tried next.
 *   
 */
Interpreter.prototype.inst_try_else = function( inst ) {
	
	var vname = inst.get("p");
	this.ctx.cse.te = vname;
};

/**
 *   Instruction "try_finally"
 * 
 *   Last goal of a disjunction   
 */
Interpreter.prototype.inst_try_finally = function( ) {
	
	this.ctx.cse.te = null;
};


/**
 *   Instruction  "jump"
 * 
 *   Used to jump between labels within a clause
 * 
 */
Interpreter.prototype.inst_jump = function( inst ) {
	
	var vname = inst.get("p");
	
	// Within same functor (i.e. clause)
	this.ctx.p.l = vname;
	this.ctx.p.i = 0;
	
};



/**
 *   Instruction 'proceed'
 *   
 *   Look Continuation Point in `p`
 *   
 */
Interpreter.prototype.inst_proceed = function() {
		
	if (this.ctx.cu) {
		this._restore_continuation( this.ctx.cse.cp );
		this._execute();
		return;
	};
	
	// A disjunction is available?
	//
	if (this.ctx.cse.te) {
		
		this._goto( this.ctx.cse.te );
		
		// just making sure
		this.ctx.cse.te = null;
		
		return;
	};
	
	
	this.backtrack();
};


//=========================================================================== PRIMITIVES


/**
 *   Instruction `prepare`
 *   
 *   `x` contains the local register's index where
 *       to store the result      
 */
Interpreter.prototype.inst_prepare = function(_inst) {

	this.ctx.cse.vars["$x0"] = new Functor('$op');
	this.ctx.cu = true;
};

/**
 *   Instruction `op_unif`
 *
 *   $x0.arg[0]  ==> lvalue
 *   $x0.arg[1]  ==> rvalue
 *   
 */
Interpreter.prototype.inst_op_unif = function(_inst) {

	var x0 = this.ctx.cse.vars["$x0"];
	
	this.ctx.cu = Utils.unify(x0.args[0], x0.args[1]);
	
	return this._exit(); 
};

/**
 *   Exit procedure for all primitives
 *   
 */
Interpreter.prototype._exit = function() {

	if (this.ctx.cu)
		return;
	
	// A disjunction is available?
	//
	if (this.ctx.cse.te) {
		
		this._goto( this.ctx.cse.te );
		
		// just making sure
		this.ctx.cse.te = null;
		
		return;
	};
	
	this.backtrack();
};

/**
 *   Instruction `op_is`
 *   
 *     `Var is value`
 *   
 *   $x0.arg[0] ==> lvalue
 *   $x0.arg[1] ==> rvalue
 *   
 */
Interpreter.prototype.inst_op_is = function(_inst) {

	var x0 = this.ctx.cse.vars["$x0"];
	
	// Expecting a variable for lvalue
	var lvar = x0.args[0];
	var rval = x0.args[1];

	// lvar is not supposed to be bound yet!
	//
	lvar.bind(rval);
	
	this.ctx.cu = true;
};


//=========================================================================== CALL




/**
 *   Instruction "put_struct $f $a $x"
 * 
 *   Used to construct a structure $f or arity $a in the 
 *   target choice point environment.  Starts building the structure in the
 *    choice point environment at variable $x.
 * 
 *   The target variable $x is retained in the current environment
 *    as to help with the remainder of the construction.
 * 
 */
Interpreter.prototype.inst_put_struct = function(inst) {
	
	var f = new Functor(inst.get('f'));
	var a = inst.get('a');
	f.arity = a;
	
	var x = "$x" + inst.get('x');
	
	this.ctx.cv = x;
	this.ctx.tse.vars[x] = f;
};

/**
 *   Instruction "put_term"
 * 
 *   Inserts a 'term' in the structure being built.
 */
Interpreter.prototype.inst_put_term = function(inst) {
	
	var term = inst.get("p");
	
	// Structure being built on the top of stack
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];
	
	struct.push_arg(term);
};

/**
 *   Instruction "put_number"
 * 
 *   Inserts a 'number' in the structure being built.
 */
Interpreter.prototype.inst_put_number = function(inst) {
	
	var num = inst.get("p");
	
	// Structure being built on the top of stack
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];
	
	struct.push_arg(new Token('number', num));
};

Interpreter.prototype.inst_put_void = function() {

	// Structure being built on the top of stack
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];

	var vvar = new Var("_");
	
	//this._add_to_trail(this.ctx.tse.trail, vvar);
	
	struct.push_arg(vvar);
};

Interpreter.prototype.inst_put_nil = function() {

	// Structure being built on the top of stack
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];

	struct.push_arg( new Token('nil') );
};

/**
 *   Instruction "put_var"
 * 
 *   Inserts a 'var' in the structure being built.
 */
Interpreter.prototype.inst_put_var = function(inst) {
	
	var vname = inst.get("p");
	
	// Structure being built on the top of stack
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];

	// Do we have a local variable already setup?
	var local_var = this.ctx.cse.vars[vname];
	if (!local_var) {
		local_var = new Var(vname);
		this.ctx.cse.vars[local_var.name] = local_var;
	} 
	
	struct.push_arg(local_var);
};

/**
 *   Instruction "put_value"
 * 
 *   Inserts a 'value' in the structure being built.
 *
 *   We don't have to `trail` anything here: the `value`
 *    in question is really just a substructure of the
 *    target one being built in $x0.
 *    
 */
Interpreter.prototype.inst_put_value = function(inst) {
	
	var vname = inst.get("x", "$x");
	
	var value = this.ctx.tse.vars[vname];
	
	// The current structure being worked on
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];

	struct.push_arg(value);
};


//=========================================================================== HEAD

/**
 *   Instruction `unif_value`
 *   
 *   Used in the `head`, inside a structure, subsequent appearances of variable
 *    (i.e. not on first appearance of variable).
 *    
 *   In `read` mode   ==> unify
 *   In `write` mode  ==> just put value 
 *   
 */
Interpreter.prototype.inst_unif_value = function(inst) {
	
	var p = inst.get('p');
	var pv = this.ctx.cse.vars[p];
	
	/*
	 *  Cases:
	 *    What is locally at 'p'
	 *    1- a Var
	 *    2- a Functor (structure) or a Token
	 *    
	 *  In case of (1) :
	 *  ================
	 *     in 'w' mode ==> push
	 *     in 'r' mode ==> unify
	 *     
	 *  In case of (2) :
	 *  ================
	 *     in 'w' mode ==> push
	 *     in 'r' mode ==> unify
	 */

	// `write` mode ?
	//
	if (this.ctx.csm == 'w') {
		this.ctx.cs.push_arg( pv );
		this.ctx.cu = true;
		return;
	};
	
	
	var from_current_structure = this.ctx.cs.get_arg( this.ctx.csi++ );
	
	// IMPORTANT: the variable should already
	//            have been created in the local environment
	// =====================================================
	
	var that = this;
	this.ctx.cu = Utils.unify(from_current_structure, pv, function(t1) {
		
		// we are in the `head` and thus we accumulate the trail
		//  in the current environment context
		//
		that.maybe_add_to_trail(that.ctx.cse.trail, t1);
	});
	
	if (!this.ctx.cu)
		this.backtrack();
};

/**
 *   Skip a structure's argument
 */
Interpreter.prototype.inst_unif_void = function() {
	
	this.ctx.csi++;
	this.ctx.cu = true;
	
	if (this.ctx.csm == 'w') {
		var vvar = new Var("_");
		this._add_to_trail( this.ctx.cse.trail, vvar);
		this.ctx.cs.push_arg( vvar );
	};
	
};

/**
 *   Skip a structure's argument
 */
Interpreter.prototype.inst_unif_nil = function() {
	
	if (this.ctx.csm == 'w') {
		this.ctx.cs.push_arg( new Token('nil') );
		this.ctx.cu = true;
		return;
	};

	var cell = this.ctx.cs.get_arg( this.ctx.csi++ );
	this.ctx.cu = Utils.unify(cell, new Token('nil') );

	if (!this.ctx.cu)
		this.backtrack();	
};

/**
 *   Instruction "unif_var" $x
 *   
 *   Unify the value at the current variable
 *    being matched in the environment.
 *   
 *   - Token(term)
 *   - Token(number)
 *   - Functor, recursively
 * 
 *   Algorithm:
 *     http://www.dai.ed.ac.uk/groups/ssp/bookpages/quickprolog/node12.html
 * 
 *   NOTE:  Need to manage the trail.
 *   =====
 * 
 */
Interpreter.prototype.inst_unif_var = function(inst) {
	
	var v = inst.get('p');

	if (!v) {
		v = inst.get('x', "$x");
	};
	
	var pv = this.ctx.cse.vars[v];

	/*
	 *  Just a symbol, not even a Var assigned yet
	 */
	if (!pv) {
		pv = new Var(v);
		this.ctx.cse.vars[pv.name] = pv;
	};
	
	
	
	if (this.ctx.csm == 'w') {
		
		//console.log("unif_var (W): ", JSON.stringify(pv));
		
		// We don't accumulate on trail because
		//  there wasn't a binding yet
		this.ctx.cs.push_arg( pv );
		this.ctx.cu = true;
		return;
	};
	
	
	// Get from the structure being worked on
	//
	var value_or_var = this.ctx.cs.get_arg( this.ctx.csi++ );
	
	//console.log("unif_var: ", value_or_var);
	
	var that = this;
	this.ctx.cu = Utils.unify(pv, value_or_var, function(t1) {
		
		// In the `head`, accumulate in current environment
		//
		that._add_to_trail(that.ctx.cse.trail, t1);
	});
	
	if (!this.ctx.cu)
		this.backtrack();
	
};// unif_var

/**
 *  Instruction `get_var`
 *  
 *  Used in the `head` when a variable is first encountered.
 *  The variable is at the `root` of the `head` (and thus
 *   not inside a structure in the `head`).
 *  
 *  - Get the variable and place it in the local vars
 * 
 * @param inst
 */
Interpreter.prototype.inst_get_var = function(inst) {
	
	var local_var = inst.get('p') || inst.get('x', "$x");
	
	var value_or_var = this.ctx.cs.get_arg( this.ctx.csi++ );

	// We don't need to trail anything here :
	//  we are just using a reference and 
	//  all local variables will get flushed during a subsequent `call`.
	//
	this.ctx.cse.vars[local_var] = value_or_var;
	
	this.ctx.cu = true;
};

/**
 *  Instruction `get_value`
 *  
 *  Used in the `head` when a variable already appeared earlier
 *  
 * @param inst
 */
Interpreter.prototype.inst_get_value = function(inst) {
	
	var p = inst.get('p');
	var value_or_var = this.ctx.cs.get_arg( this.ctx.csi++ );

	var pv = this.ctx.cse.vars[p];
	
	var that = this;
	this.ctx.cu = Utils.unify(pv, value_or_var, function(t1) {
		that.maybe_add_to_trail(that.ctx.cse.trail, t1);
	});
	
};




/**
 *   Instruction "get_struct" $f, $a, $x
 *   
 *   Expects a structure of name $f and arity $a 
 *    at the current variable $x being
 *    matched in the environment.
 * 
 */
Interpreter.prototype.inst_get_struct = function(inst) {
	
	var x = inst.get('x', "$x");
	
	// Are we switching argument in the `head` functor?
	//
	//  If this is the case, we need to reset the 'mode'
	//   and associated variable used to construct a 
	//   structure in `write` mode.
	//
	if (x != this.ctx.csx) {
		
		this.ctx.csm = 'r';
		this.ctx.csx = x;
		
	} else {
		/*
		 *  If we are indeed trying to "get_struct"
		 *  on the same argument we were already processing,
		 *  this means something is terribly wrong,
		 *  probably a bug in the compiler.
		 */
		throw new ErrorInternal("Attempting to 'get_struct' again on same argument: " + x);
	};
	
	var fname  = inst.get('f');
	var farity = inst.get('a');
	
	
	// Assume this will fail to be on the safe side
	//
	this.ctx.cu = false;
	
	// Prepare
	this.ctx.cs = null;
	this.ctx.csi = 0;
	

	// Fetch the local value
	var input_node = this.ctx.cse.vars[x];


	var dvar;

	if (input_node instanceof Var) {
		
		dvar = input_node.deref();
		
		if ( !dvar.is_bound() ) {

			/*
			 * We have received a unbound variable ==> "w" mode + trail
			 */
			this._add_to_trail(this.ctx.cse.trail, input_node);
			
			this.ctx.csm = 'w';
			
			var struct = new Functor(fname);
			this.ctx.cs = struct;
			
			dvar.bind( struct );
			
			this.ctx.cu = true;
			return;
		}
		
		
	};
	
	// We can only be in 'r' mode pass this point
	//
	this.ctx.csm = 'r';
	
	var node = input_node; 
	
	if (dvar) {
		
		/*
		 *  We have a bound variable ==> "r" mode, unify
		 */
		node = dvar.get_value();
		
	};
	
	/*
	 *  We have a proper structure
	 *    passed on in the `head`
	 */
	if (node instanceof Functor) {
		
		if (node.get_name() != fname) {
			return this.backtrack();	
		};

		if (node.get_arity() != +farity ) {
			return this.backtrack();
		};
		
		this.ctx.cs = node;
		this.ctx.cu = true;
		return;
	};

	
	
	this.backtrack();
};

/**
 *   Instruction "get_number" $p
 *   
 *   Expects a 'number' $p at the current variable being
 *    matched in the environment.
 * 
 */
Interpreter.prototype.inst_get_number = function(inst) {

	this._get_x(inst, 'number');
	
	if (!this.ctx.cu)
		this.backtrack();
};



/**
 *   Instruction "get_term" $p
 *   
 *   Expects a 'term' $p at the current variable being
 *    matched in the environment.
 * 
 */
Interpreter.prototype.inst_get_term = function(inst) {

	this._get_x(inst, 'term');
	
	if (!this.ctx.cu)
		this.backtrack();
};



Interpreter.prototype._get_x = function(inst, type) {
	
	var p = inst.get('p');
	
	if (this.ctx.csm == 'w') {
		this.ctx.cs.push_arg( new Token(type, p) );
		this.ctx.cu = true;
		return;
	};
	
	var value_or_var = this.ctx.cs.get_arg( this.ctx.csi++ );
	
	/*  Cases:
	 *  A) unbound variable ==> bind to expected number / term
	 *  B) bound variable   ==> unification
	 *  C) token(number) 
	 */

	
	this.ctx.cu = false;
	
	
	// CASE (C)
	//
	if (value_or_var instanceof Token) {
		if (value_or_var.name == type) {
			this.ctx.cu = ( value_or_var.value == p );
			return;
		};
		
		// FAIL
		return;
	};
	
	//  Could this really be happening ???
	//
	if (value_or_var == p) {
		this.ctx.cu = true;
		return;
	};
	
	//  We can't have something like a Functor here!
	//
	if ((!value_or_var instanceof Var)) {
		return; // fail
	}
	
	var variable = value_or_var;
	
	var dvar = variable.deref();
	
	// Case (B)
	//
	if (dvar.is_bound()) {
		
		// Unify
		//
		this.ctx.cu = (dvar.get_value() == p);
		return;
	};
	
	// Case (A)
	//
	dvar.bind(p);
	this._add_to_trail( this.ctx.cse.trail, dvar );
	
	this.ctx.cu = true;	
};




if (typeof module != 'undefined') {
	module.exports.Interpreter = Interpreter;
};

