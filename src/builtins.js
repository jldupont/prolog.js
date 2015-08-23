/**
 * builtins.js
 * 
 * 
 * @author jldupont
 * 
 * 
 **/

Builtins = {};

Builtins.db = {};


/**
 * Define a builtin functor
 */
Builtins.define = function(functor){
	
	var sig = DbAccess.compute_signature(functor);
	Builtins.db[sig] = functor;
};



if (typeof module!= 'undefined') {
	module.exports.Builtins = Builtins;
};

