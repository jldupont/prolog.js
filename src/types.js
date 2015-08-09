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

// End of stream
function Eos () {};

function Nothing () {};

/**
 *  Functor
 *  @constructor
 */
function Functor(name, maybe_arguments_list) {
	this.name = name;
	
	// remove the first parameter of the constructor
	this.args = Array.prototype.splice.call(arguments, 1);
};

Functor.prototype.get_args = function(){
	return this.args;
};

Functor.prototype.push_arg = function(arg) {
	this.args.push(arg);
};

/**
 * Either monad
 */
function Either(value_a, value_b) {
	this.name = 'either';
	this.value_a = value_a || null;
	this.value_b = value_b || null;
};

Either.prototype.getA = function() {
	return this.value_a;
};

Either.prototype.getB = function() {
	return this.value_b;
};

function Error(name, maybe_details) {
	this.name = name;
	this.details = maybe_details || null;
};

if (typeof module!= 'undefined') {
	module.exports.Rule = Rule;
	module.exports.Atom = Atom;
	module.exports.Either = Either;
	module.exports.Nothing = Nothing;
	module.exports.Error = Error;
	module.exports.Eos = Eos;
	module.exports.Functor = Functor;
};