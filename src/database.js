/**
 * database.js
 * 
 * To contain the facts & rules
 * 
 * - need to add facts & rules
 * - need to traverse, depth first, the whole database
 * 
 * @author jldupont
 * 
 * 
 **/

/* global ErrorAttemptToRedefineBuiltin, ErrorExpectingFunctor
*/

/*
 *  Database
 * 
 * @constructor
 */
function Database(access_layer) {
	this.db = {};
	this.al = access_layer;
}

Database.prototype.clear = function() {
	this.db = {};
};

/**
 *  Insert a rule/fact in the database
 *  
 *  The `root node` can be :
 *  -- Functor('rule', args...)
 *  -- Functor(X, args...)
 *  
 *  Rule:    `head :- body` 
 *   whereas `head`  is made up of `(functor args...)`
 *   
 *  The functor signature is derived 
 *   from the functor name and arity. 
 *  
 *  @param functor_signature {String}
 *  @param rule_nodes [] 
 *  @return signature
 *  @raise Error
 */
Database.prototype.insert = function(root_nodes){

	if (!(root_nodes instanceof Array))
		root_nodes = [root_nodes];
	
	for (var index in root_nodes) {
		this._insert(root_nodes[index]);
	}

};

Database.prototype._insert = function(root_node){

	var functor_signature = this.al.compute_signature(root_node);
	
	var maybe_entries = this.db[functor_signature] || [];
	maybe_entries.push(root_node);
	
	this.db[functor_signature] = maybe_entries;
	
	return functor_signature;
};

/**
 *  Insert Code objects in the database
 * 
 *  Each Code object looks something like:
 * 
 *   {
 	    f: $functor_name
 	   ,a: $functor_arity
 	   ,head: $functor_head_code
 	   ,g* : $functor_goal_code
     }
 
 *
 *   @throws ErrorExpectingFunctor 
 */
Database.prototype.batch_insert_code = function(codes) {

	if (!(codes instanceof Array))
		codes = [codes];
	
	for (var index in codes) {
		var code_object = codes[index];
		var f = code_object.f || code_object.code.f;
		var a = code_object.a || code_object.code.a;
		
		this.insert_code(f, a, code_object.code || code_object);
	}

};

/** 
 *  Verifies if the specified Functor exists in this database
 * 
 *  @return Boolean
 */
Database.prototype.exists = function(functor, arity) {

	var functor_signature = this.al.compute_signature([functor, arity]);
	return this.db[functor_signature] !== undefined;
};

/**
 *   Insert 1 Functor code in the database
 * 
 *   @throws ErrorExpectingFunctor
 */ 
Database.prototype.insert_code = function(functor, arity, code) {
	
	if (functor===undefined || arity===undefined || code===undefined)
		throw new ErrorExpectingFunctor("Invalid functor name/arity/code: "+functor+"/"+arity+" code: "+JSON.stringify(code));
	
	var functor_signature = this.al.compute_signature([functor, arity]);

	var maybe_entries = this.db[functor_signature] || [];
	maybe_entries.push(code);
	
	this.db[functor_signature] = maybe_entries;
};

Database.prototype.get_code = function(functor, arity) {
	
	var functor_signature = this.al.compute_signature([functor, arity]);

	var maybe_entries = this.db[functor_signature] || [];

	return maybe_entries;
};


/**
 *  Retrieve clause(s) from looking up
 *   an input Functor node 
 */
Database.prototype.get = function(functor_node) {
	
	var functor_signature = this.al.compute_signature(functor_node);
	return this.db[functor_signature] || null;
	
};

/**
 * Define a Functor in the database
 * 
 * @param root_node
 */
Database.prototype.define = function(root_node){
	
	var functor_signature = this.al.compute_signature(root_node);
	this.db[functor_signature] = root_node;
};


Database.prototype.lookup_functor = function(functor_signature){
	
	return this.db[functor_signature] || null;
};


// =============================================================== MANAGER

function DatabaseManager(db_builtins, db_user) {
	this.db_builtins = db_builtins;
	this.db_user = db_user;
}

/**
 *  Insert code in the Builtin database
 */
DatabaseManager.prototype.builtin_insert_code = function(functor, arity, code) {
	
	this.db_builtins.insert_code(functor, arity, code);
};

/**
 *  Insert code, if possible, in the User database
 * 
 *  If the Functor/Arity is already defined in the
 *   Builtin database, reject with
 */
DatabaseManager.prototype.user_insert_code = function(functor, arity, code) {
	
	if (this.db_builtins.exists(functor, arity))
		throw new ErrorAttemptToRedefineBuiltin("Attempt to redefine Functor", functor, arity);
		
	this.db_user.insert_code(functor, arity, code);
	
};


if (typeof module != 'undefined') {
	module.exports.Database = Database;
	module.exports.DatabaseManager = DatabaseManager;
}
