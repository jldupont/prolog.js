/**
 * database.js
 * 
 * To contain the facts & rules
 * 
 * - need to add facts & rules
 * - need to traverse, depth first, the whole database
 * 
 * @author jldupont
 **/

/*
 *  Database
 * 
 * @constructor
 */
function Database() {
	this.db = {};
};

/**
 *  Insert a rule in the database
 *  
 *  Rule:    `head :- body` 
 *   whereas `head`  is made up of `(functor args...)`
 *   
 *  The functor signature is derived 
 *   from the functor name and arity. 
 *  
 *  @param functor_signature {String}
 *  @param rule_nodes [] 
 */
Database.prototype.insert = function(functor_signature, rule_nodes){

	var maybe_entries = this.db[functor_signature] || [];
	maybe_entries.push(rule_nodes);
	
	this.db[functor_signature] = maybe_entries;
};

Database.prototype.lookup_functor = function(functor_signature){
	
	return this.db[functor_signature] || null;
};

if (typeof module!= 'undefined') {
	module.exports.Database = Database;
};

