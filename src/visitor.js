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
	
	this._process(this.exp, 0);
};

/**
 *  Performs the actual processing
 *  
 *  @raise Error
 *  
 */
Visitor.prototype._process = function(node, depth) {
	
	//console.log("Visitor: ",node, " depth: ",depth);
	
	// that should happen
	if (!node)
		throw new Error("Visitor: got an undefined node.");
	
	this.cb(node, depth, null);
	
	// Recursively go through all arguments
	//  of the present Functor
	//
	for (var index=0;index<node.args.length;index++) {
		
		var bnode = node.args[index];
		
		this.cb(bnode, depth, index);
		
		if (bnode.args && bnode.args.length>0) {
			this._process(bnode, depth+1);
		}

	};// for args
}; // _preprocess



if (typeof module!= 'undefined') {
	module.exports.Visitor = Visitor;
};

