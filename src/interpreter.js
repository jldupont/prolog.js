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
function Interpreter(db, env, stack) {

	this.db  = db || {};
	this.env = env || {};
	this.stack = stack || [];
	this.question = null;
	this.reached_end_question = false;
	this.question_index = 0;
};

Interpreter.prototype.get_stack = function(){
	return this.stack;
};

/**
 * Set the `question` to get an answer to
 * 
 * The `question` must be a
 * 
 * @param question
 */
Interpreter.prototype.set_question = function(question){
	this.question = question;
};


/**
 * Take 1 processing step
 * 
 * @return true | false | null where `null` signifies `not done yet`
 * @raise Error
 */
Interpreter.prototype.next = function() {

	
};


if (typeof module!= 'undefined') {
	module.exports.Interpreter = Interpreter;
};

