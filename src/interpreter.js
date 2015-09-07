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
 * @raise Error
 */
Interpreter.prototype.step = function() {

	
};

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
	
	return inst;
};

Interpreter.prototype._fetch_code = function(){
	
	var cc = this.db[this.env.p.f];
	this.env.p.i = 0;
	this.env.cc = cc;
};



if (typeof module != 'undefined') {
	module.exports.Interpreter = Interpreter;
};

