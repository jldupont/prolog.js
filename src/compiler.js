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
	var top_functor_is_stripped = false;
	var result = []; 
		
	v.process(function(ctx){
		
		if (ctx.n instanceof Functor) {
			
			if (!top_functor_is_stripped) {
				top_functor_is_stripped = true;
				return;
			}
			
			
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
		
		
	});//callback
	
	return result;
};

Compiler.handle_head_term = function(ctx){
	return { c: "get_term", o: ctx.n.value };
};

Compiler.handle_head_number = function(ctx){
	return { c: "get_number", o: ctx.n.value };
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

