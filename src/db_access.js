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
 *  whether `input` is a `fact` or a `rule`
 * 
 * @param input
 * @return {String}
 * @raise Error
 */
DbAccess.prototype.compute_signature = function(input) {
	
	
};


/**
 * Determine if the input object
 *  consists in a `fact`
 *  
 * @param root_node
 * @return Boolean
 */
DbAccess.prototype.is_fact = function(root_node) {

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
DbAccess.prototype.is_rule = function(root_node) {
	
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
DbAccess.prototype.extract_head_of_rule = function(root_node) {

	if (!(root_node instanceof Functor))
		return false;

	if (root_name.name != 'rule')
		throw new Error("Expecting a `rule`, got: "+root_node.name);
	
	return root_node.args[0];
};

/**
 * Compute the signature of a functor
 * 
 * @param node
 * @return {String}
 */
DbAccess.prototype.get_functor_signature = function(node){

	if (!(root_node instanceof Functor))
		return false;

	return ""+root.name+"/"+node.args.length;
};


if (typeof module!= 'undefined') {
	module.exports.DbAccess = DbAccess;
};

