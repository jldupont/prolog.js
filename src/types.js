/**
 *   types.js
 *   
 *   The definition of the types
 *   
 *   @author: jldupont
 */

/**
 *  Define an Atom
 *  @constructor
 *  
 *  Atoms are defined as follows:
 *  * start with a lowercase character
 *  * anything enclosed in single quote
 *  
 */
function Atom(name) {
	this.name = name;
};

/**
 *  Define a Rule
 *  @constructor 
 */
function Rule(name) {
	
};

/**
 * Either monad
 */
function Either(value_a, value_b) {
	this.value_a = value_a || null;
	this.value_b = value_b || null;
};


if (typeof module!= 'undefined') {
	module.exports.Rule = Rule;
	module.exports.Atom = Atom;
	module.exports.Either = Either;
};