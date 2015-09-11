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
	
	this.env = {};	
	this.reached_end_question = false;
};

Interpreter.prototype.get_stack = function(){
	return this.stack;
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

		/*
		 *  Variable used in the current structure 
		 */
		,cv: null
		,cvi: 0
		
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
		
		// The current variable in the target choice point
		//
		// Used to track the construction of a structure in the
		//  target choice point.
		//
		,cpv: null
		
		
		/*  Continuation Point
		 * 
		 */
		,cp: null
		
		
		/* Clause Index
		 * 
		 * Which clause is being tried
		 */
		,ci: 0
		
	};//
	
	// The question's environment
	//
	this.stack.push(qenv);
	
	this.ctx.tse = qenv;
	this.ctx.cse = qenv;
	
	try {
		this.ctx.cc = this.db['.q.'][0]['g0'];	
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

	var inst = this.fetch_next_instruction();
	
	var fnc_name = "inst_" + inst.opcode;
	
	var fnc = this[fnc_name];
	if (!fnc)
		throw new ErrorInvalidInstruction(inst.opcode);
	
	// Execute the instruction
	this[fnc_name].apply(this, [inst]);	

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
	
	if (this.ctx.p.f == 'head') {
		
		// update pointer to 1st goal then
		this.ctx.p.f = 'g0';
		this.ctx.p.i = 0;
		this._fetch_code();
		
	} else {
		
		// If we are inside a goal, try the next one.
		// In the current implementation, this should not
		//  happen directly: some branching would have occurred.
		throw new ErrorNoMoreInstruction();
	};
	
	return this._fetch();
};

Interpreter.prototype._fetch = function(){
	
	// Just try fetching next instruction
	var inst = this.ctx.cc[this.ctx.p.i];
	
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
// ======================================================================== INSTRUCTIONS
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
	
	console.log("Instruction: 'call'");
	
	// I know it's pessimistic
	this.ctx.cu = false
	
	// Get functor name & arity from the 
	//  environment variable x0
	var x0 = this.ctx.tse.vars['x0'];
	
	var fname = x0.name;
	var arity = x0.args.length;
	
	// Clause Index
	var ci = this.ctx.tse.ci || 0;
	
	//console.log(fname, arity);
	
	// Consult the database
	var code_clauses = this.db.get_code(fname, arity);
	
	var code_for_clause = code_clauses[ci];
	
	// Reached end of clause list ?
	//  No more choice point + fail
	if (!code_for_clause) {
		
		return;
	};
	
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
	
	var env = { vars: {} };
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
	
};

/**
 *   Instruction "put_struct $f $a $x"
 * 
 *   Used to construct a structure $f or arity $a in the 
 *   target choice point environment.  Starts building the structure in the
 *    choice point environment at variable $x.
 * 
 *   The target variable $x is retain the current environment
 *    as to help with the remainder of the construction  (cpv).
 * 
 */
Interpreter.prototype.inst_put_struct = function(inst) {
	
	var f = new Functor(inst.get('f'));
	var a = inst.get('a');
	f.arity = a;
	
	var x = "x" + inst.get('p');
	
	this.ctx.cv = x;
	this.ctx.tse.vars[x] = f;

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
Interpreter.prototype.inst_try_else = function() {
	
	console.log("Instruction: 'try_else'");
	
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
	
	var fname  = inst.get('f');
	var farity = inst.get('a');
	var x      = "x" + inst.get('p');
	
	// The current value
	//
	// Assume this will fail to be on the safe side
	//
	this.ctx.cv = null;
	this.ctx.cu = false;
	
	// Fetch the value from the target input variable
	var maybe_struct = this.ctx.tse.vars[x];
	
	if (!(maybe_struct instanceof Functor)) {
		// Not a structure ...
		return;
	};
	
	if (maybe_struct.get_name() != fname) {
		return;	
	};

	if (maybe_struct.get_arity() != +farity ) {
		return;
	};
	
	// Everything checks out
	this.ctx.cvi = 0;
	this.ctx.cv = maybe_struct;
	this.ctx.cu = true;
	
};


/**
 *   Instruction "get_term" $p
 *   
 *   Expects a 'term' $p at the current variable being
 *    matched in the environment.
 * 
 */
Interpreter.prototype.inst_get_term = function(inst) {
	
	var p = inst.get('p');
	
	//console.log("Instruction: 'get_term': ", p);
	
	var value = this.ctx.cv.get_arg( this.ctx.cvi++ );	
	
	this.ctx.cu = ( p == value );
};


/**
 *   Instruction "get_number" $p
 *   
 *   Expects a 'number' $p at the current variable being
 *    matched in the environment.
 * 
 */
Interpreter.prototype.inst_get_number = function() {
	
	console.log("Instruction: 'get_number'");
	
};


/**
 *   Instruction "unif_var" $x
 *   
 *   Unify the value at the current variable
 *    being matched in the environment.
 *   
 * 
 */
Interpreter.prototype.inst_unif_var = function() {
	
	console.log("Instruction: 'unif_var'");
	
};


if (typeof module != 'undefined') {
	module.exports.Interpreter = Interpreter;
};

