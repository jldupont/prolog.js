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
function Visitor(exp, breadth_first) {
	this.exp = exp;
	this.cb = null;
	
	if (breadth_first == true)
		this.breadth = true;
	else
		this.depth = true;
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
	
	if (this.depth)
		return this._process_depth(this.exp);
	else
		return this._process_breadth(this.exp, 0, 0);
};

/**
 *  Performs the actual processing
 *  
 *  @raise Error
 *  
 */
Visitor.prototype._process_depth = function(node) {
	
	// that should not happen
	if (!node)
		throw new Error("Visitor: got an undefined node.");

	return this.__process_depth(node);
}; // process depth

/**
 * Depth-First visitor with callback
 * 
 * v: denotes the variable index that should be used
 *    to unify the term
 *    
 * i: index in the arguments list
 * 
 * is_struct
 * 
 * 
 * @param node
 * @returns {Array}
 */
Visitor.prototype.__process_depth = function(node){

	var variable_counter = 0;
	var result = [];
	var stack = [ node ];
	var ctx = {};
	
	node.is_root = true;
	
	for (;;) {

		var bnode = stack.pop();
		if (!bnode)
			break;
		
		ctx = {
			 n: bnode
			,v: bnode.v || variable_counter++
			,is_struct: (bnode instanceof Functor)
		};

		/*
		 *  Announces 'root' node
		 *   and nodes at a 2nd pass
		 */
		this.cb(ctx);
		
		for (var index=0; index<bnode.args.length; index++) {
			
			var n = bnode.args[index];
			
			if (n.args && n.args.length>0) {
				
				// 1st time announce for structures
				//
				n.v = variable_counter++;

				this.cb({ n: n, is_struct: true, i:index, v: n.v, as_param: true});

				// Schedule for revisiting (i.e. continue down the tree)
				stack.unshift(n);
				
			} else {
				
				// This covers all other node types
				//  e.g. terms such as Numbers and Atoms
				this.cb({ n: n, i: index});
			}
			
		}; // for args
		
	}; // for stack

	return result;
};


/**
 *  Performs the actual processing
 *  
 *  @raise Error
 *  
 */
Visitor.prototype._process_breadth = function(root_node, depth, col) {
	
	var root = true;
	var stack = [ root_node ];
	
	// that should happen
	if (!root_node)
		throw new Error("Visitor: got an undefined node.");
	
	for(;;) {

		var node = stack.shift();
		if (!node)
			break;

		this.cb({ n: node, d: depth, 
			is_struct: true, is_root: root, col: col});
		
		// Recursively go through all arguments
		//  of the present Functor
		//
		for (var index=0;index<node.args.length;index++) {
			
			var col = (root ? index:node.col);
			
			var bnode = node.args[index];
			
			this.cb({ n: bnode, d: depth, i: index, 
						is_arg: true, col: col});
			
			if (bnode.args && bnode.args.length>0) {
				
				if (root)
					bnode.col = index;
				stack.push(bnode);
			}

		};// for args
		
		root = false;
		depth++;
		
	}; // for
	
	
}; // breadth



if (typeof module!= 'undefined') {
	module.exports.Visitor = Visitor;
};

