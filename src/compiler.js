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
function Compiler() {};

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
	
	if (!(exp instanceof Functor))
		throw new ErrorExpectingFunctor("Expecting Functor, got: "+JSON.stringify(exp));
	
	if (exp.name == 'rule')
		return this.process_rule(exp);

	var result = {
		'head': this.process_head(exp)
	};
	
	return result;
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
	
	// Of course we can't be seeing conjunctions or disjunctions
	//  in the head of a rule.
	//
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
				result.push(new Instruction("unif_var", {p:ctx.v}));
				return;
			} else {
				result.push(new Instruction("get_struct", {f: ctx.n.name, a:ctx.n.args.length, p:ctx.v}));
				return;
				
			};
			
		};
		
		if (ctx.n instanceof Var) {
			
			result.push(new Instruction("unif_var", {p:ctx.n.name}));
			return;
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
	
	if (!(exp instanceof Functor))
		throw new ErrorExpectingFunctor();
	
	if (exp.name == 'rule')
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
Compiler.prototype.process_body = function(exp, show_debug) {
	
	var map = {};
	var result = {};
	var merges = {};
	
	var v = new Visitor3(exp);
	
	var that = this;
	
	/*
	 *  Dereference the label
	 *   through the merges that 
	 *   occurred during the 'conj' and 'disj'
	 *   compilation
	 */
	var deref = function(label, last) {
				
		var merged = merges[label];
		
		// Yes it can happen to have no derefencing to perform
		if (!last && !merged)
			return label;
		
		if (merged)
			return deref(merged, merged);
		
		return last;
	};
	
	/**
	 *  Link code across a conjunction
	 *  
	 *  Conj(Gx, L, R ) ==> Gx: L R
	 *  
	 *    Combine code of L and R under label Gx
	 *  
	 */
	var conj_link = function(jctx, lctx, rctx) {

		var llabel = "g"+lctx.vc;
		var rlabel = "g"+rctx.vc;
				
		// Step 0: include the boundary instruction
		//         between the 2 goals forming a conjunction
		
		result[llabel].push(new Instruction("maybe_fail"));
		
		// Step 1, combine code of R under code for L
		//      
		result[llabel] = result[llabel].concat(result[rlabel]);
		
		// Everytime there is a merge, we track it
		merges[rlabel] = llabel;
		
		// Step 2, get rid of R
		delete result[rlabel];
		
		// Step 3, move everything under the Conjunction's label
		var jlabel = "g"+jctx.vc;
		
		result[jlabel] = result[llabel];
		
		// Of course here too...
		merges[llabel] = jlabel;
		
		// Step 4, finally get rid of L
		delete result[llabel];
	};

	
	/**
	 *  Link code across a disjunction
	 * 
	 *  Disj(Gx, L, R)
	 *  
	 */
	var disj_link = function(jctx, lctx, rctx){

		var jlabel = "g"+jctx.vc;
		var llabel = "g"+lctx.vc;
		var rlabel = "g"+rctx.vc;
		
		// We've got a Functor node on the left side,
		//  so point it to the right side node
		if (lctx.n) {
			
			result[llabel].unshift(new Instruction('try_else', {p: rlabel}));
			
		} else {
			
			/*
			 *  More difficult case: 
			 *   We've got just a label on the left side
			 *   and so we must deref until we find the right side
			 *   code node under the label.
			 */
			
			var lmap = map[llabel];
			var rnode_label = lmap.r;
			
			var dlabel = deref(rnode_label);
			
			result[dlabel].unshift(new Instruction('try_else', {p: rlabel}));
		};

		result[jlabel] = result[llabel];
		
		// Track merges
		//
		merges[llabel] = jlabel;
		
		// If we are at root with this disjunction,
		//  let's help the interpreter with an additional hint
		if (jctx.root) {
			result[rlabel].unshift(new Instruction("try_finally"));
		};
		
		delete result[llabel];
	};
	
	
	
	v.process(function(jctx, left_or_root, right_maybe){

		
		if (show_debug) {
			console.log("jctx: ", jctx);
			console.log("lctx: ", left_or_root);
			console.log("rctx: ", right_maybe, "\n");
		};
		
		
		
		var type = jctx.type;
		var goal_id = jctx.goal_id;
		var is_root = jctx.root;
		
		var inst, inst2;
		
		var label = type+goal_id;
		var ctx = left_or_root;
		
		if (is_root)
			label = 'g0';
		
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

		
		// CAUTION: lcode/rcode *may* be undefined
		//          This is intended behavior.
		
		var jlabel = "g" + jctx.vc;
		var llabel = "g" + left_or_root.vc;
		var rlabel = "g" + right_maybe.vc;
		
		
		map[jlabel] = {l: llabel, r: rlabel };
		
		
		if (lcode)
			result[llabel] = lcode;
		
		if (rcode)
			result[rlabel] = rcode;
		
		if (type == 'conj') {
			
			conj_link(jctx, left_or_root, right_maybe);
			
		};
		
		if (type == 'disj') {

			disj_link(jctx, left_or_root, right_maybe);
			
			//var target_label = merges[llabel] || llabel;
			
			//console.log("Merges: ", merges);
			//console.log("Target Label: ", target_label);
			
			//result[target_label].push(new Instruction('try_else', {p: rlabel}));
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

	results.push(new Instruction('allocate'));
	
	v.process(function(ctx){
		
		var struct_ctx = { f: ctx.n.name, a:ctx.n.args.length , p: ctx.vc };
		
		if (ctx.root) {
			struct_ctx.p = 0;
		};
		
		results.push(new Instruction("put_struct", struct_ctx));
		
		for (var index=0; index<ctx.args.length; index++) {
			
			var n = ctx.args[index];
			
			if (n instanceof Var) {
				results.push(new Instruction("put_var", {p: n.name}));
			};

			if (n instanceof Value) {
				results.push(new Instruction("put_value", {p: n.name}));
			};
			
			if (n instanceof Token) {
				if (n.name == 'number')
					results.push(new Instruction("put_number", {p: n.value}));
				
				if (n.name == 'term')
					results.push(new Instruction("put_term", {p: n.value}));
				
			};
			
		};//for
		
		// Only root functor gets a CALL
		//
		if (ctx.root) {
			results.push(new Instruction('call'));
			results.push(new Instruction('maybe_retry'));
			results.push(new Instruction('deallocate'));
		};
			
		
	});
	
	return results;
};





if (typeof module!= 'undefined') {
	module.exports.Compiler = Compiler;
};

