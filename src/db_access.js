/**
 * db_access.js
 *
 * Manages access to a database
 *
 * This is the bridge between the Client layer
 *  and the database. This middleware bridge
 *  understands just enough about the information
 *  and data model of the client in order to efficiently
 *  proxy the requests to the database layer.
 * 
 * - Processes `insert` requests
 * 
 * 
 * @author jldupont
 **/

/*
 *  Database
 * 
 * @constructor
 */
function DbAccess() {
};

/**
 * Compute the signature of the `input`
 *  whether `input` is a `fact` or a `rule`.
 *  
 *  Both are really represented by a `root node`
 *   of the type `Functor`.
 * 
 * @param input
 * @return {String}
 * @raise Error
 */
DbAccess.compute_signature = function(input) {
	
	if (input instanceof Array) {
		var fname = input[0];
		var arity = input[1];
		
		return fname+"/"+arity;
	};
	
	var sig = null;
	
	try {
		var functor = DbAccess.extract_head_of_rule(input);
		sig = DbAccess.get_functor_signature(functor);
		
	} catch(e) {
		sig = DbAccess.get_functor_signature(input);
	};

	return sig;
};


/**
 * Determine if the input object
 *  consists in a `fact`
 *  
 * @param root_node
 * @return Boolean
 */
DbAccess.is_fact = function(root_node) {

	if (!(root_node instanceof Functor))
		return false;
	
	return root_node.name != 'rule';
};

/**
 * Determine if the input object
 *  consists in a `rule` 
 *  
 * @param root_node
 * @returns {Boolean}
 */
DbAccess.is_rule = function(root_node) {
	
	if (!(root_node instanceof Functor))
		return false;
	
	return root_node.name == 'rule';
};

/**
 * Extract the `head` part of a rule
 * 
 * rule :=  `head :- body`
 * 
 * @param root_node
 * @return Object (should probably just be a Functor)
 * @raise Error
 */
DbAccess.extract_head_of_rule = function(root_node) {

	if (!(root_node instanceof Functor) || (root_node.name != 'rule'))
		throw new Error("Expecting a `rule`, got: "+root_node.name);

	return root_node.args[0];
};

/**
 * Compute the signature of a functor
 * 
 * @param node
 * @return {String}
 */
DbAccess.get_functor_signature = function(node){

	if (!(node instanceof Functor))
		throw new Error("Expecting Functor, got: "+JSON.stringify(node));

	return ""+node.name+"/"+node.args.length;
};


if (typeof module!= 'undefined') {
	module.exports.DbAccess = DbAccess;
};

