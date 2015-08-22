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
	this.exp = null;
	this.db  = db || {};
	this.env = env || {};
	this.stack = stack || [];
};

Interpreter.prototype.get_stack = function(){
	return this.stack;
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

