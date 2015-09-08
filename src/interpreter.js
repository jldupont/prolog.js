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
	
	this.db['.q.'] = question_code;
	
	this.stack = [];
	
	// Initialize top of stack
	//  to point to question in the database
	//
	this.env = {
		
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
	};
	
	try {
		this.env.cc = this.db['.q.']['g0'];	
	} catch (e){
		throw new ErrorExpectingGoal("Expecting at least 1 goal in question");
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
	this[fnc_name].apply(this);	

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
	
	if (this.env.p.f == 'head') {
		
		// update pointer to 1st goal then
		this.env.p.f = 'g0';
		this.env.p.i = 0;
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
	
	// Just try fetching next instruction from env.cc
	var inst = this.env.cc[this.env.p.i];
	
	this.env.p.i++;
	
	return inst || null;
};

Interpreter.prototype._fetch_code = function(){
	
	var cc = this.db[this.env.p.f];
	this.env.p.i = 0;
	this.env.cc = cc;
};


//
//
// ======================================================================== INSTRUCTIONS
//
//



/**
 *   Instruction "allocate"
 *   
 *   Denotes beginning of a "choice point" code block
 *   
 *   Create an environment for this choice point and
 *    and push a link in the current environment.
 */
Interpreter.prototype.inst_allocate = function() {
	
	console.log("Instruction: 'allocate'");
	
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
	
	console.log("Instruction: 'deallocate'");
	
};

/**
 *   Instruction "put_struct $x"
 * 
 *   Used to construct a structure in the target choice point
 *    environment.  Starts building the structure in the
 *    choice point environment at variable $x.
 * 
 *   The target variable $x is retain the current environment
 *    as to help with the remainder of the construction  (cpv).
 * 
 */
Interpreter.prototype.inst_put_struct = function() {
	
	console.log("Instruction: 'put_struct'");
	
};

/**
 *   Instruction "put_term"
 * 
 *   Inserts a 'term' in the structure being built.
 */
Interpreter.prototype.inst_put_term = function() {
	
	console.log("Instruction: 'put_term'");
	
};

/**
 *   Instruction "put_number"
 * 
 *   Inserts a 'number' in the structure being built.
 */
Interpreter.prototype.inst_put_number = function() {
	
	console.log("Instruction: 'put_number'");
	
};


/**
 *   Instruction "put_var"
 * 
 *   Inserts a 'var' in the structure being built.
 */
Interpreter.prototype.inst_put_var = function() {
	
	console.log("Instruction: 'put_var'");
	
};

/**
 *   Instruction "put_value"
 * 
 *   Inserts a 'value' in the structure being built.
 *   
 *   The 'value' is obtained through dereferencing
 *    the variable.
 */
Interpreter.prototype.inst_put_value = function() {
	
	console.log("Instruction: 'put_value'");
	
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
 *   Instruction "call"
 * 
 *   Executes the Functor pointed to by $x0
 *    in the target environment.
 *    
 *   The Continuation Point (CP) will be saved
 *    in the current environment.
 *   
 */
Interpreter.prototype.inst_call = function() {
	
	console.log("Instruction: 'call'");
	
};

/**
 *   Instruction "get_struct" $f, $a, $x
 *   
 *   Expects a structure of name $f and arity $a 
 *    at the current variable $x being
 *    matched in the environment.
 * 
 */
Interpreter.prototype.inst_get_struct = function() {
	
	console.log("Instruction: 'get_struct'");
	
};


/**
 *   Instruction "get_term" $p
 *   
 *   Expects a 'term' $p at the current variable being
 *    matched in the environment.
 * 
 */
Interpreter.prototype.inst_get_term = function() {
	
	console.log("Instruction: 'get_term'");
	
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

