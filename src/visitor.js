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
function Visitor(exp) {
	this.exp = exp;
	this.cb = null;
	this.is_root = false;
};

/**
 * Process the expression, depth-first
 * 
 * 
 * @raise Error
 */
Visitor.prototype.process = function(callback_function) {
	
	if (!(this.exp.args))
		throw new Error("Expecting a rooted tree, got: "+JSON.stringify(exp));
	
	this.cb = callback_function;
	this.is_root = true;
	
	this._process(0, this.exp, 0, 0);
};

/**
 *  Performs the actual processing
 *  
 *  @raise Error
 *  
 */
Visitor.prototype._process = function(var_counter, node, depth, col) {
	
	var root = this.is_root;
	
	// that should happen
	if (!node)
		throw new Error("Visitor: got an undefined node.");
	
	this.cb({ vc: var_counter, n: node, d: depth, 
				is_struct: true, is_root: this.is_root, col: col});
	
	this.is_root = false;
	
	// Recursively go through all arguments
	//  of the present Functor
	//
	for (var index=0;index<node.args.length;index++) {
		
		var c = (root ? index:col);
		
		var bnode = node.args[index];
		
		this.cb({ vc: var_counter, n: bnode, d: depth, i: index, 
					is_arg: true, col: c});
		
		var_counter ++;
		
		if (bnode.args && bnode.args.length>0) {
			var_counter = this._process(var_counter, bnode, depth+1, c);
		}

	};// for args
	
	
	
	return var_counter;
}; // _preprocess



if (typeof module!= 'undefined') {
	module.exports.Visitor = Visitor;
};

