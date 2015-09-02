/**
 * Node Visitor
 * 
 * 
 * @author jldupont
 **/

/**
 * ParserL4
 * 
 * @constructor
 *
 * @param exp: the expression to process
 */
function Visitor(exp, callback_fnc) {
	this.exp = exp;
	this.cb = callback_fnc;
};

/**
 * Process the expression, depth-first
 * 
 * 
 * @raise Error
 */
Visitor.prototype.process = function() {
	
	if (!(this.exp.args))
		throw new Error("Expecting a rooted tree, got: "+JSON.stringify(exp));
	
	this._process(0, this.exp, 0);
};

/**
 *  Performs the actual processing
 *  
 *  @raise Error
 *  
 */
Visitor.prototype._process = function(var_counter, node, depth) {
	
	//console.log("Visitor: ",node, " depth: ",depth);
	
	// that should happen
	if (!node)
		throw new Error("Visitor: got an undefined node.");
	
	this.cb({ vc: var_counter, n: node, d: depth, is_struct: true});
	
	// Recursively go through all arguments
	//  of the present Functor
	//
	for (var index=0;index<node.args.length;index++) {
		
		var bnode = node.args[index];
		
		this.cb({ vc: var_counter, n: bnode, d: depth, i: index, is_arg: true});
		
		var_counter ++;
		
		if (bnode.args && bnode.args.length>0) {
			var_counter = this._process(var_counter, bnode, depth+1);
		}

	};// for args
	
	return var_counter;
}; // _preprocess



if (typeof module!= 'undefined') {
	module.exports.Visitor = Visitor;
};

