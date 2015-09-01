/**
 * Compiler
 * 
 * 
 * @author jldupont
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
 * @raise Error
 */
Compiler.prototype.process_rule_or_fact = function() {
	
};


/**
 * Process a `query` expression
 * 
 * Expecting 1 root node
 * - conj Functor
 * - disjunction Functor
 * - Functor(name, ...)
 * 
 * @raise Error
 */
Compiler.prototype.process_query = function() {
	
};





if (typeof module!= 'undefined') {
	module.exports.Compiler = Compiler;
};

