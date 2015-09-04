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
	
	var breadth_first = false;
	
	var v = new Visitor(root, breadth_first);
	var top_functor_is_stripped = false;
	var result = []; 
		
	
	
	v.process(function(ctx){
		
		result.push(ctx);
		/*
		// Temporary variable used for
		//  traversing the tree
		var tmp_var = ctx.col < 2 ? 0: ctx.col-1;
		
		
		if (ctx.n instanceof Functor) {
			
			if (!top_functor_is_stripped) {
				top_functor_is_stripped = true;
				return;
			}
			
			if (ctx.is_struct) {
				if (ctx.d == 1) {
					result.push(Compiler.handle_head_structure(ctx, ctx.col));
					result.push(Compiler.handle_head_unify_variable(ctx, tmp_var));
					return;
				} else {
					result.push(Compiler.handle_head_structure(ctx, tmp_var));
					result.push(Compiler.handle_head_unify_variable(ctx, tmp_var));
					return;
				};
			};
		};//if Functor
		
		if (ctx.n instanceof Token) {
			if (ctx.n.name == 'term') {
				result.push(Compiler.handle_head_term(ctx));
				return;
			};
				
			if (ctx.n.name == 'number') {
				result.push(Compiler.handle_head_number(ctx));
				return;
			};
			
		};// If Token
		*/
		
	});//callback
	
	return result;
};

Compiler.handle_head_unify_variable = function(ctx, var_index){
	return { c: "unify_variable", o2: var_index };
};

Compiler.handle_head_structure = function(ctx, var_index){
	return { c: "get_structure", o0:ctx.n.name, o1:ctx.n.args.length, o2: var_index };
};


Compiler.handle_head_term = function(ctx){
	return { c: "get_term", o2: ctx.n.value };
};

Compiler.handle_head_number = function(ctx){
	return { c: "get_number", o2: ctx.n.value };
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

