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
		this.db['.q.'] = [question_code];
	else
		this.db['.q.'] = question_code;
	
	/*
	 *  Interpreter Context
	 */
	this.ctx = {

		// The current instruction pointer
		//
		p: { 
			f: ".q.",  // which functor in the database 
			l: 'g0',  // which label
			i: 0      // and finally which index in the label entry
			}
	
		// The current code inside functor:label pointed to by 'p'
		//
		,cc: null

		/*  Related to `HEAD` Processing
		 * 
		 *   csx:  The current index of the argument 
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
		 *   csv:  The current variable being used in "w" mode.
		 */
		,cs:  null
		,csx: null   
		,csi: 0     
		,csm: 'r'   
		
		/*
		 *  Current unification status
		 */
		,cu: null
		
		/*  Top of stack environment
		 *   i.e. the latest 'allocated'
		 */
		,tse: null
		
		/*  Current Environment
		 * 
		 */
		,cse: null

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

		/*  Choice Point list
		 */
		,choices: []
		
		/*  Continuation Environment
		 *    Used to return from a 'call'
		 */
		,ce: null
		
		/*  Continuation Point
		 *    Used to return from a 'call' 
		 *    
		 *    Uses the same format as 'p'
		 */
		,cp: null
		
		/*  Trail
		 */
		,tr: []
		
		/* Clause Index
		 *   Which clause is being tried
		 */
		,ci: 0
		
		// Total number of clauses for the current functor
		,ct: 0

		// TRY_ELSE continuation
		,te: null
		
		/*  Related to building a structure for a CALL instruction
		 */
		,cv: null  // the name of variable where to find the structure being built
		
		/* The index of this environment on the stack
		 */
		,si: 0
		
	};//
	
	// The question's environment
	//
	this.stack.push(qenv);
	
	this.ctx.tse = qenv;
	this.ctx.cse = qenv;
	
	try {
		this.ctx.cc = this.db['.q.'][0];	
	} catch (e){
		throw new ErrorExpectingGoal("Expecting at least 1 goal in question: "+e);
	};

};



/**
 * Take 1 processing step
 * 
 * @return true | false | null where `null` signifies `not done yet`
 * 
 * @raise ErrorNoMoreInstruction
 * @raise ErrorInvalidInstruction
 */
Interpreter.prototype.step = function() {

	//console.log("step: BEGIN");
	
	var inst = this.fetch_next_instruction();
	
	var fnc_name = "inst_" + inst.opcode;
	
	//console.log("step: inst: ", inst);
	
	var fnc = this[fnc_name];
	if (!fnc)
		throw new ErrorInvalidInstruction(inst.opcode);
	
	// Execute the instruction
	this[fnc_name].apply(this, [inst]);	

	//console.log("step: END");
	
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
	
	// Just try fetching next instruction from env.cc
	var inst = this._fetch();
	
	if (inst)
		return inst;
	
	// Are we at the end of `head` ?
	
	if (this.ctx.p.l == 'head') {
		
		// update pointer to 1st goal then
		this.ctx.p.l = 'g0';
		this.ctx.p.i = 0;
		this._fetch_code();
		return this._fetch();
	}
	
		
	// If we are inside a goal, try the next one.
	// In the current implementation, this should not
	//  happen directly: some branching would have occurred.
	throw new ErrorNoMoreInstruction();
	
};

Interpreter.prototype._fetch = function(){
	
	// Just try fetching next instruction
	//
	var inst = this.ctx.cc[this.ctx.p.l][this.ctx.p.i];
	
	this.ctx.p.i++;
	
	return inst || null;
};

Interpreter.prototype._fetch_code = function(){
	
	var cc = this.db[this.ctx.p.f];
	this.ctx.p.i = 0;
	this.ctx.cc = cc;
};


Interpreter.prototype.get_current_ctx_var = function(evar) {
	return this.ctx[evar];
};


//
//
// ================================================================================= INSTRUCTIONS
//
//

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
	
	if (this.tracer) {
		this.tracer('call', inst);
	};
	
	//console.log("Instruction: 'call'");
	
	// I know it's pessimistic
	this.ctx.cu = false
	
	// Get functor name & arity from the 
	//  environment variable x0
	var x0 = this.ctx.tse.vars['x0'];
	
	var fname = x0.name;
	var arity = x0.args.length;
	
	// Clause Index
	var ci = this.ctx.tse.ci || 0;
	
	// Consult the database
	var code_clauses = this.db.get_code(fname, arity);
	
	//console.log("Code for clauses: ", code_clauses);
	
	if (!code_clauses)
		throw new ErrorFunctorNotFound("Functor: "+fname+"/"+arity, [fname, arity]);
	
	
	// Helper for the 'maybe_retry' instruction
	//
	this.ctx.tse.ct = code_clauses.length;
	
	
	var code_for_clause = code_clauses[ci];
	
	// Reached end of clause list ?
	if (!code_for_clause) {
		
		// 'maybe_retry' and 'maybe_fail' instructions will
		//   handle cleanup and backtracking
		return;
	};
	
	//console.log("Code clause: ", code_for_clause);
	
	// Get ready for `head` related instructions
	this.ctx.cs = null;
	this.ctx.csx = 0;
	
	
	// Save continuation
	this.ctx.tse.cp = {
		 f: this.ctx.p.f
		,l: this.ctx.p.l
		,i: this.ctx.p.i // + 0  the fetch will have had already incremented this
	};
	
	// ... and the environment
	this.ctx.tse.ce = this.ctx.cse;
	
	// Also the Choice Point
	//
	//  The assumption is that the structure built
	//   for the following call will be left intact
	//   in the current environment so it can be reused
	//   by a possible subsequent choice point selection
	//   through a backtrack process.
	//
	this.ctx.cse.choices.push({
		 f: this.ctx.p.f
		,l: this.ctx.p.l
		,i: this.ctx.p.i - 1 // Point to the CALL instruction
	});
	
	var l = code_for_clause.head ? 'head': 'g0';
	
	// Make the jump
	//
	this.ctx.p = {
		 f: fname
		,l: l
		,i: 0
	};
	
	this.ctx.cc = code_for_clause;
	
	//console.log(this.ctx);
	
}; // CALL



/**
 *   Instruction "allocate"
 *   
 *   Denotes beginning of a "choice point" code block
 *   
 *   Create an environment for this choice point and
 *    and push a link in the current environment.
 */
Interpreter.prototype.inst_allocate = function() {
	
	//console.log("Instruction: 'allocate'");
	
	var env = { vars: {}, cp: {}, choices: [] };
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
 *   - Choice Point fails & no other clause : deallocate environment
 */
Interpreter.prototype.inst_deallocate = function() {
	
	//console.log("Instruction: 'deallocate'");
	var choices = this.ctx.tse.choices || [];
	
	if (choices.length == 0) {
		this.stack.pop();
	};
	
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
	
	var vname = "g" + inst.get("p");
	this.ctx.cse.te = vname;
	
	console.log("Instruction: 'try_else' @ "+vname);
};

/**
 *   Instruction "try_finally"
 * 
 *   Last goal of a disjunction   
 */
Interpreter.prototype.inst_try_finally = function( ) {
	
	this.ctx.cse.te = null;
	
	console.log("Instruction: 'try_finally'");
};

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
	
	console.log("Instruction: 'maybe_retry'");
	
	// A 'noop' if there isn't a failure reported
	//
	if (this.ctx.cu)
		return;
	
	this.ctx.tse.ci ++;
	
	if (this.ctx.tse.ci < this.ctx.tse.ct) {
		
		// We can try the next clause
		//  The fetch function will have incremented the
		//   instruction pointer past this instruction
		//   so we need to substract 2 to get it pointing
		//   back to the 'CALL' instruction.
		//
		this.ctx.cse.p.i -= 2; 
	};

	// NOOP when we reach end of clause list
	// The failure flag will still be set.
	
};

/**
 *   Instruction  "jump"
 * 
 *   Used to jump between labels within a clause
 * 
 */
Interpreter.prototype.inst_jump = function( inst ) {
	
	var vname = "g" + inst.get("p");
	
	console.log("Instruction: 'jump' @ "+ vname);
	
	// Within same functor (i.e. clause)
	this.ctx.cse.p.l = vname;
	this.ctx.cse.p.i = 0;
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
	
	console.log("Instruction: 'maybe_fail'");
	
	// NOOP if we are not faced with a failure
	if (!this.ctx.cu)
		return;
	
	/*
	 *  JUMP to continuation point
	 */
	this.ctx.cse = this.ctx.cse.ce;
	
	this.ctx.p.f = this.ctx.cse.cp.f;
	this.ctx.p.l = this.ctx.cse.cp.l;
	this.ctx.p.i = this.ctx.cse.cp.i;
	
	// TODO  what happens to ctx.tse ????
};


//=========================================================================== CALL



/**
 *   Instruction "put_struct $f $a $x"
 * 
 *   Used to construct a structure $f or arity $a in the 
 *   target choice point environment.  Starts building the structure in the
 *    choice point environment at variable $x.
 * 
 *   The target variable $x is retain the current environment
 *    as to help with the remainder of the construction.
 * 
 */
Interpreter.prototype.inst_put_struct = function(inst) {
	
	var f = new Functor(inst.get('f'));
	var a = inst.get('a');
	f.arity = a;
	
	var x = "x" + inst.get('p');
	
	this.ctx.cv = x;
	this.ctx.tse.vars[x] = f;

	// TODO manage trail
	
	//console.log("Instruction: 'put_struct': "+inst.get('f')+"/"+a+", "+x);
	//console.log("Env: ", this.env);

};

/**
 *   Instruction "put_term"
 * 
 *   Inserts a 'term' in the structure being built.
 */
Interpreter.prototype.inst_put_term = function(inst) {
	
	var term = inst.get("p");
	
	//console.log("Instruction: 'put_term':", term);

	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];
	
	struct.push_arg(term);
	
	// TODO manage trail
};

/**
 *   Instruction "put_number"
 * 
 *   Inserts a 'number' in the structure being built.
 */
Interpreter.prototype.inst_put_number = function(inst) {
	
	var num = inst.get("p");
	
	//console.log("Instruction: 'put_number': ", num);
	
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];
	
	struct.push_arg(num);
	
	// TODO manage trail
};


/**
 *   Instruction "put_var"
 * 
 *   Inserts a 'var' in the structure being built.
 */
Interpreter.prototype.inst_put_var = function(inst) {
	
	var vname = inst.get("p");
	
	//console.log("Instruction: 'put_var'");

	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];
	
	struct.push_arg(new Var(vname));

	// TODO manage trail
};

/**
 *   Instruction "put_value"
 * 
 *   Inserts a 'value' in the structure being built.
 *   
 *   The 'value' is obtained through dereferencing
 *    the variable.
 */
Interpreter.prototype.inst_put_value = function(inst) {
	
	var vname = "x" + inst.get("p");
	
	var value = this.ctx.tse.vars[vname];
	
	//console.log("Instruction: 'put_value': ", value);
	
	// The current structure being worked on
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];

	struct.push_arg(value);
	
	// TODO manage trail
};


//=========================================================================== HEAD




/**
 *   Instruction "unif_var" $x
 *   
 *   Unify the value at the current variable
 *    being matched in the environment.
 *   
 * 
 */
Interpreter.prototype.inst_unif_var = function(inst) {
	
	console.log("Instruction: 'unif_var'");
	
	var p = inst.get('p');
	
	var value_or_var = this.ctx.cs.get_arg( this.ctx.csi++ );
	
	// TODO 
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
	
	//console.log("Instruction: 'get_struct'");
	var x      = "x" + inst.get('p');
	
	// Are we switching argument in the `head` functor?
	//
	//  If this is the case, we need to reset the 'mode'
	//   and associated variable used to construct a 
	//   structure in `write` mode.
	//
	if (x != this.ctx.csx) {
		this.ctx.csm = 'r';
		this.ctx.csv = null;
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
	this.ctx.cs = null;
	this.ctx.cu = false;

	
	// Fetch the value from the target input variable
	var input_node = this.ctx.tse.vars[x];
	
	/*
	 *   We have the following cases:
	 *   ----------------------------
	 *   
	 *   1) There is actually a structure present
	 *   2) There is a variable
	 *      a) The variable is bound   ==> "read" mode
	 *         1) The variable dereferences to a struct
	 *         2) The variable dereferences to something else than a struct
	 *         
	 *      b) The variable is unbound ==> "write" mode 
	 * 
	 */

	var nvar = null; 
		
	var value;

	// First, we need to check if are dealing with a Var
	//
	if (input_node instanceof Var) {
		
		nvar = input_node.deref();
		
		try {
			value = nvar.get_value();
		} catch( e ) {
			value = null;
		};
		
	} else {
		value = input_node;
	};
	
	// Cases (1) and (2a1)
	
	if (value instanceof Functor) {
		
		
		if (value.get_name() != fname) {
			return; // fail	
		};

		if (value.get_arity() != +farity ) {
			return; // fail
		};
		
		this.ctx.cs = value;
		this.ctx.csi = 0;
		this.ctx.cu = true;
		this.ctx.csm = 'r';
		return;
	};
	
	// Case  (2a2)
	//
	if (value != null) {
		return; //fail
	};
	
	// CASE (2b)
	//
	if (nvar) {
		this.ctx.cvm = "w";
		
		var struct = new Functor(fname);
		this.ctx.cs = struct;
		
		// Also update the current environment
		this.ctx.tse.vars[x] = struct;

		// And don't forget to actually perform
		//  the 'write'!
		nvar.bind( struct );
		
		// We are successful
		this.ctx.cu = true;
		return;
	};
	
	throw new ErrorInternal("get_struct: got unexpected node: "+JSON.stringify(maybe_struct));
	
	//console.log("Instruction: 'get_struct': ", this.ctx);
};

/**
 *   Instruction "get_number" $p
 *   
 *   Expects a 'number' $p at the current variable being
 *    matched in the environment.
 * 
 */
Interpreter.prototype.inst_get_number = function(inst) {

	return this._get_x(inst, 'number');
};



/**
 *   Instruction "get_term" $p
 *   
 *   Expects a 'term' $p at the current variable being
 *    matched in the environment.
 * 
 */
Interpreter.prototype.inst_get_term = function(inst) {

	return this._get_x(inst, 'term');
};



Interpreter.prototype._get_x = function(inst, type) {
	
	var p = inst.get('p');

	this.ctx.cu = false;
	
	if (this.ctx.csm == 'w') {
		this.ctx.cs.push_arg( p );
		this.ctx.cu = true;
		return;
	};
	
	var value_or_var = this.ctx.cs.get_arg( this.ctx.csi++ );
	
	//console.log(value_or_var);

	/*  Cases:
	 *  a) unbound variable ==> bind to expected number
	 *  b) bound variable   ==> unification
	 *  c) token(number) 
	 */

	
	// CASE (C)
	//
	if (value_or_var instanceof Token) {
		if (value_or_var.name == type) {
			this.ctx.cu = ( value_or_var.value == p);
			return;
		};
	};
	
	if ((!value_or_var instanceof Var)) {
		return; // fail
	}

	var variable = value_or_var;
		
	var dvar = variable.deref();
	
	// Case (B)
	//
	if (dvar.is_bound()) {
		this.ctx.cu = (dvar.get_value() == p);
		return;
	};
	
	// Case (A)
	//
	dvar.bind(p);
	this.ctx.cu = true;
	
	//console.log("Instruction: 'get_number': ",p, dvar);
	
};




if (typeof module != 'undefined') {
	module.exports.Interpreter = Interpreter;
};

