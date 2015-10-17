/**
 * Node Visitor
 * 
 * 
 * @author jldupont
 **/

/*
global Functor, ErrorExpectingFunctor, Value
*/

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
}

/**
 * Process the expression, depth-first
 * 
 * 
 * @raise Error
 */
Visitor.prototype.process = function(callback_function) {
	
	if (!(this.exp.args))
		throw new Error("Expecting a rooted tree, got: "+JSON.stringify(this.exp));
	
	this.cb = callback_function;
	
	return this._process_depth(this.exp);
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
 * Visitor targeted at processing `head` of a rule.
 * 
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

	node.is_root = true;
	var stack = [ node ];

	
	var variable_counter = 0;
	var result = [];
	var ctx = {};
	
	
	for (;;) {

		var bnode = stack.pop();
		if (!bnode)
			break;
		
		ctx = {
			 n: bnode
			,v: bnode.v || variable_counter++
			,is_struct: (bnode instanceof Functor)
		};

		var in_cons = (bnode.name == 'cons');
		
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

				this.cb({ n: n, is_struct: true, i:index, v: n.v, as_param: true, in_cons: in_cons});

				// Schedule for revisiting (i.e. continue down the tree)
				stack.unshift(n);
				
			} else {
				
				// This covers all other node types
				//  e.g. terms such as Numbers and Atoms
				this.cb({ n: n, i: index, root_param: bnode.is_root, in_cons: in_cons });
			}
			
		} // for args
		
	} // for stack

	return result;
};

//============================================================================== VISITOR2

function Visitor2(exp) {
	this.exp = exp;
	this.cb = null;
}

/**
 * Visitor targeted at the processing of individual goals
 *  
 * @param callback
 * @returns
 * 
 * @raise ErrorExpectingFunctor
 */
Visitor2.prototype.process = function(callback) {

	if (!(this.exp instanceof Functor))
		throw new ErrorExpectingFunctor("Expecting a rooted tree, got: "+JSON.stringify(this.exp));
	
	this.exp.root = true;
	
	this.cb = callback;
	this._process(this.exp);
	
};

Visitor2.prototype._process = function(node, variable_counter) {
	
	variable_counter = variable_counter || 1;
	
	if (!node)
		throw new ErrorExpectingFunctor("Visitor2: got an undefined node.");
	
	if (!(node instanceof Functor)) 
		throw new ErrorExpectingFunctor("Visitor2: expecting a Functor, got: ", node);
	
	/*
	 *  Depth-First
	 */
	var args = [];
	
	for (var index=0;index<node.args.length;index++) {
		
		var bnode = node.args[index];
		
		if (bnode instanceof Functor) {
			
			variable_counter = this._process(bnode, variable_counter);
			args.push(new Value(variable_counter++));
			
		} else {
			args.push(bnode);
		}
		
	}// for args
	
	this.cb({ n: node, args: args, vc: variable_counter, root: node.root });
	
	return variable_counter;
}; // _process


// ============================================================================== VISITOR3

/**
 *  Visitor targeted mainly at the `body` of a rule (or a query).
 *  
 *  Each node gets an 'id' upon first encounter.
 *  
 *  Nodes are traversed depth-first.
 *  
 *  A junction:  'conjunction' or 'disjunction'
 */
function Visitor3(exp) {
	this.exp = exp;
	this.cb = null;
}

Visitor3.prototype.process = function(callback) {
	this.cb = callback;
	this._process(this.exp);
};

Visitor3.prototype._process = function(node, vc) {

	var is_root = vc === undefined;
	vc = vc || 0;
	
	// that should happen
	if (!node)
		throw new ErrorExpectingFunctor("Visitor3: got an undefined node.");
	
	if (!(node instanceof Functor)) 
		throw new ErrorExpectingFunctor("Visitor3: expecting a Functor, got: " + JSON.stringify(node));
	
	/*
	 * Since we are only just concerned about Conjunctions and Disjunctions
	 *  and those are of binary arity, we only have to deal with 'left' and 'right' nodes
	 */
	if (!(node.name == 'conj' || (node.name == 'disj'))) {
		
		// vc == 0
		//
		if (is_root)
			return this.cb({type: 'root', vc:vc }, { n: node }, null);
		
		return { vc: vc, n: node, is_junction: false };
	}
		
	var left  = node.args[0];
	var right = node.args[1];
	
	var lctx = this._process(left,  vc+1);
	
	// Start distributing id's on the right-hand side
	//  following the last id distributed on the left-hand side
	//
	var rvc = lctx.vc+1;
	
	var rctx = this._process(right, rvc);

	// Report the id's as they were
	//  attributed on the left node and right node
	//
	rctx.vc = rvc;
	lctx.vc = vc+1;
	
	// Remove extraneous information
	//  so that we don't get tempted to use
	//  it downstream.
	//
	if (rctx.is_junction)
		delete rctx.n;
	
	if (lctx.is_junction)
		delete lctx.n;
	
	delete lctx.is_junction;
	delete rctx.is_junction;

	
	this.cb({type: node.name, vc:vc, root: is_root}, lctx, rctx);
	
	return { vc: rctx.vc, is_junction: true };
};




if (typeof module!= 'undefined') {
	module.exports.Visitor = Visitor;
	module.exports.Visitor2 = Visitor2;
	module.exports.Visitor3 = Visitor3;
}
