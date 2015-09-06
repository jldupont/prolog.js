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

// =============================================================================== VISITOR2

function Visitor2(exp) {
	this.exp = exp;
	this.cb = null;
};

/**
 * 
 * @param callback
 * @returns
 * 
 * @raise ErrorExpectingFunctor
 */
Visitor2.prototype.process = function(callback) {

	//console.log("Visitor2.process, exp: ", this.exp instanceof Functor);
	
	if (!(this.exp instanceof Functor))
		throw new ErrorExpectingFunctor("Expecting a rooted tree, got: "+JSON.stringify(this.exp));
	
	this.exp.root = true;
	
	this.cb = callback;
	this._process(this.exp);
	
};

/**
 * 
 * @param node
 * @param variable_counter
 * 
 * @raise ErrorExpectingFunctor
 */
Visitor2.prototype._process = function(node, variable_counter) {
	
	var is_root = variable_counter == undefined;
	variable_counter = variable_counter || 1;
	
	// that should happen
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
			args.push(new Var(variable_counter++));
			
		} else {
			args.push(bnode);
		};
		
	};// for args
	
	this.cb({ n: node, args: args, vc: variable_counter, root: node.root });
	
	return variable_counter;
}; // _process


function Visitor3(exp) {
	this.exp = exp;
	this.cb = null;
};

Visitor3.prototype.process = function(callback) {
	this.cb = callback;
	this._process(this.exp);
};

Visitor3.prototype._process = function(node, vc) {

	var is_root = vc == undefined;
	vc = vc || 1;
	
	// that should happen
	if (!node)
		throw new ErrorExpectingFunctor("Visitor3: got an undefined node.");
	
	if (!(node instanceof Functor)) 
		throw new ErrorExpectingFunctor("Visitor3: expecting a Functor, got: ", node);
	
	/*
	 * Since we are only just concerned about Conjunctions and Disjunctions
	 *  and those are of binary arity, we only have to deal with 'left' and 'right' nodes
	 */
	if (!(node.name == 'conj' || (node.name == 'disj'))) {
		
		if (is_root)
			this.cb('root', vc, { n: node }, null);
		
		return vc;
	};
		
		
	var left  = node.args[0];
	var right = node.args[1];
	
	var lvc = this._process(left, vc+1);
	var rvc = this._process(right, lvc++);

	this.cb(node.name, vc, {n: left, vc: lvc}, {n:right, vc: rvc});
	
	return vc++;
};




if (typeof module!= 'undefined') {
	module.exports.Visitor = Visitor;
	module.exports.Visitor2 = Visitor2;
	module.exports.Visitor3 = Visitor3;
};

