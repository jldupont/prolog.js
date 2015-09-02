/**
 * Compiler
 * 
 *
 * 
 * @author jldupont
 * 
 * @dependency:  visitor.js
 * 
 **/



/**
 * Compiler
 * @constructor
 *
 */
function Compiler() {

};

/**
 * Process a `rule` or `fact` expression
 * 
 * Expecting a `rule` i.e. 1 root node Functor(":-", ...)
 *  OR a `fact`  i.e. 1 root node Functor(name, ...)
 *
 * A `fact` is a body-less rule (just a `head`)
 *  (or a rule with a body 'true').
 *
 *  -------------------------------------------------------------
 *  
 *  
 *  
 * 
 * 
 * @raise Error
 */
Compiler.prototype.process_rule_or_fact = function(exp) {
	
};

/**
 *  Just compiles the expression assuming it is a `head`
 * 
 *  Generate "pattern matching" code for the input structure
 *  Go "depth-first"
 *  
 */
Compiler.prototype.process_head = function(exp) {
	
};


/**
 *  Just compiles the expression assuming it is a `body`
 * 
 */
Compiler.prototype.process_body = function(exp) {
	
};


/**
 * Process a `query` expression  (i.e. just a `body`)
 * 
 * Expecting 1 root node
 * - conj Functor
 * - disjunction Functor
 * - Functor(name, ...)
 * 
 * @raise Error
 */
Compiler.prototype.process_query = function(exp) {
	
};





if (typeof module!= 'undefined') {
	module.exports.Compiler = Compiler;
};

