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
 * @raise ErrorExpectingFunctor
 */
Compiler.prototype.process_rule_or_fact = function(exp) {
	
	if (!(root instanceof Functor))
		throw new ErrorExpectingFunctor();
	
	if (root.name == 'rule')
		return this.process_rule(exp);

	return this.process_head(exp);
};

/**
 * Process assuming a `rule`
 * 
 * @param exp
 * @raise ErrorExpectingFunctor
 */
Compiler.prototype.process_rule = function(exp) {

	var head = exp.args[0];
	var body = exp.args[1];
	
	var result = this.process_body(body);
	
	result['head'] = this.process_head(head);
	
	return result;
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
	
	if (!(exp instanceof Functor))
		throw new ErrorExpectingFunctor();
	
	if (exp.name == 'conj' || (exp.name == 'disj'))
		throw new ErrorInvalidHead();
	
	var v = new Visitor(exp);
	
	var result = []; 
		
	
	/**
	 *   Functor
	 *   	- root ==> attribute in `ctx`
	 *   	- 1st time seen (and thus as a parameter to another Functor)
	 *   	- 2nd time seen (to process its arguments)
	 * 
	 */
	
	v.process(function(ctx){
		
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
		
	});//callback
	
	return result;
};


/**
 * Process a `query` expression  (i.e. just a `body`)
 * 
 * Expecting 1 root node
 * - conj Functor
 * - disjunction Functor
 * - Functor(name, ...)
 * 
 * @raise ErrorExpectingFunctor
 * @raise ErrorRuleInQuestion
 */
Compiler.prototype.process_query = function(exp) {
	
	if (!(root instanceof Functor))
		throw new ErrorExpectingFunctor();
	
	if (root.name == 'rule')
		throw new ErrorRuleInQuestion();
	
	return this.process_body(exp);
};



/**
 *  Just compiles the expression assuming it is a `body`
 *  
 *  The body is constituted of 1 or more `goals`.
 *  
 *  Each goal can be joined using
 *   conjunctions and/or disjunctions.
 *   
 *  Goal index starts at 0.
 *   
 *   @raise
 */
Compiler.prototype.process_body = function(exp) {
	
	var result = {};
	
	var v = new Visitor3(exp);
	
	var that = this;
	
	v.process(function(type, goal_id, left_or_root, right_maybe){
		
		var label = type+goal_id;
		var ctx = left_or_root;
		
		if (type == 'root') {
			label = 'g0';
			
			result[label] = that.process_goal( ctx.n );
			return;
		}
		
		/*
		 *   Cases:
		 *     left:  node | goal ref
		 *     right: node | goal ref
		 *     
		 *     type:  conj | disj
		 */
		
		var lcode = that.process_goal(left_or_root.n);
		var rcode = that.process_goal(right_maybe.n);

		var llabel = "g" + left_or_root.vc;
		var rlabel = "g" + maybe_right.vc;
		
		if (lcode)
			result[llabel] = lcode;
		
		if (rcode)
			result[rlabel] = rcode;
		
		if (type == 'conj') {
			lcode.push(new Instruction("goto", {p: rlabel}));
		};
		
		if (type == 'disj') {
			lcode.unshift(new Instruction("goto", {p: llabel}));
			lcode.unshift(new Instruction("try_else", {l: label, p: rlabel}));
			
		};
		
		
	});// process
	
	
	return result;
};


/**
 *  Just compiles an expression consisting of a single `goal`
 *   i.e. no conjunction / disjunction
 *   
 *   f1( ... )
 *   X is ...  ==>  is(X, ...) 
 *  
 *   
 *  The root node gets a CALL to the target predicate,
 *   the rest of the expression is treated as a structure.
 *   
 */
Compiler.prototype.process_goal = function(exp) {
	
	if (exp == undefined)
		return undefined;
	
	var v = new Visitor2(exp);
	
	var results = [];
	
	v.process(function(ctx){
		
		var struct_ctx = { f: ctx.n.name, a:ctx.n.args.length , x: ctx.vc };
		if (ctx.root)
			struct_ctx.x = 0;
		
		results.push(new Instruction("put_struct", struct_ctx));
		
		for (var index=0; index<ctx.args.length; index++) {
			
			var n = ctx.args[index];
			
			if (n instanceof Var) {
				results.push(new Instruction("put_var", {x: n.name}));
			};
			
			if (n instanceof Token) {
				if (n.name == 'number')
					results.push(new Instruction("put_number", {p: n.value}));
				
				if (n.name == 'term')
					results.push(new Instruction("put_term", {p: n.value}));
				
			};
			
		};//for
		
	});
	
	return results;
};





if (typeof module!= 'undefined') {
	module.exports.Compiler = Compiler;
};

