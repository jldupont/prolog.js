/**
 * Compiler
 * 
 *
 * 
 * @author jldupont
 * 
 * @dependency:  visitor.js
 * 
 **/



/**
 * Compiler
 * @constructor
 *
 */
function Compiler() {

};

/**
 * Process a `rule` or `fact` expression
 * 
 * Expecting a `rule` i.e. 1 root node Functor(":-", ...)
 *  OR a `fact`  i.e. 1 root node Functor(name, ...)
 *
 * A `fact` is a body-less rule (just a `head`)
 *  (or a rule with a body 'true').
 *
 *  -------------------------------------------------------------
 *  
 *  
 *  
 * 
 * 
 * @raise Error
 */
Compiler.prototype.process_rule_or_fact = function(exp) {
	
};

/**
 *  Just compiles the expression assuming it is a `head`
 * 
 *  Generate "pattern matching" code for the input structure
 *  Go "depth-first"
 *  
 *  A `head` structure must be 
 *  - single element `Functor`
 *  - not a Conjunction nor a Disjunction
 *  
 *  * The root Functor is stripped
 *  * 
 *  
 *  
 *  @raise ErrorExpectingFunctor
 *  @raise ErrorInvalidHead
 */
Compiler.prototype.process_head = function(exp) {
	
	var root;
	
	if (exp instanceof Array)
		root = exp[0];
	else
		root = exp;
	
	if (!(root instanceof Functor))
		throw new ErrorExpectingFunctor();
	
	if (root.name == 'conj' || (root.name == 'disj'))
		throw new ErrorInvalidHead();
	
	var v = new Visitor(root);
	
	//var top_functor_is_stripped = false;
	var result = []; 
		
	
	/**
	 *   Functor
	 *   	- root ==> attribute in `ctx`
	 *   	- 1st time seen (and thus as a parameter to another Functor)
	 *   	- 2nd time seen (to process its arguments)
	 * 
	 */
	
	v.process(function(ctx){
		
		//result.push(ctx);
		
		// Temporary variable used for
		//  traversing the tree
		
		// /*
		if (ctx.is_struct) {
			
			// We are seeing this functor node for the first time
			//  and so it is a root
			//
			
			if (ctx.as_param) {
				result.push(new Instruction("unif_var", {x:ctx.v}));
				return;
			} else {
				result.push(new Instruction("get_struct", {f: ctx.n.name, a:ctx.n.args.length, x:ctx.v}));
				return;
				
			};
			
		};
		
		if (ctx.n instanceof Token) {
			if (ctx.n.name == 'term') {
				result.push(new Instruction('get_term', { p: ctx.n.value }));
				return;
			};
				
			if (ctx.n.name == 'number') {
				result.push(new Instruction('get_number', { p: ctx.n.value }));
				return;
			};
			
		};// If Token
		// */
		
	});//callback
	
	return result;
};

Compiler.handle_head_unify_variable = function(ctx, var_index){
	return { c: "unify_variable", o2: var_index };
};

Compiler.handle_head_structure = function(ctx, var_index){
	return { c: "get_structure", o0:ctx.n.name, o1:ctx.n.args.length, o2: var_index };
};



/**
 *  Just compiles the expression assuming it is a `body`
 * 
 */
Compiler.prototype.process_body = function(exp) {
	
};


/**
 * Process a `query` expression  (i.e. just a `body`)
 * 
 * Expecting 1 root node
 * - conj Functor
 * - disjunction Functor
 * - Functor(name, ...)
 * 
 * @raise Error
 */
Compiler.prototype.process_query = function(exp) {
	
};





if (typeof module!= 'undefined') {
	module.exports.Compiler = Compiler;
};

