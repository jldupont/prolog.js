/**
 * Compiler
 * 
 *
 * 
 * @author jldupont
 * 
 * @dependency:  visitor.js
 * 
 * 
 **/

/* global ErrorExpectingFunctor, ErrorRuleInQuestion, ErrorInvalidToken */
/* global Functor, ErrorInvalidHead, Visitor, Visitor2, Visitor3 */
/* global Instruction, Var, Token, Value */

/**
 * Compiler
 * @constructor
 *
 */
function Compiler() {}


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
 * @raise ErrorExpectingFunctor
 * 
 * @return Object: compiled code
 */
Compiler.prototype.process_rule_or_fact = function(exp) {
	
	if (!(exp instanceof Functor))
		throw new ErrorExpectingFunctor("Expecting Functor, got: "+JSON.stringify(exp), exp);
	
	if (exp.name == 'rule')
		return this.process_rule(exp);

	var with_body = false;
	
	var result = {
		'head': this.process_head(exp, with_body)
		,'f': exp.name
		,'a': exp.args.length
	};
	
	return result;
};

/**
 * Process a `query`, `rule` or `fact` expression
 * 
 * Expecting a `rule` i.e. 1 root node Functor(":-", ...)
 *  OR a `fact`  i.e. 1 root node Functor(name, ...)
 *
 * A `fact` is a body-less rule (just a `head`)
 *  (or a rule with a body 'true').
 *
 *  -------------------------------------------------------------
 *  
 * @raise ErrorExpectingFunctor
 * 
 * @return Object: compiled code
 */
Compiler.prototype.process_query_or_rule_or_fact = function(exp) {
	
	if (!(exp instanceof Functor))
		throw new ErrorExpectingFunctor("Expecting Functor, got: "+JSON.stringify(exp), exp);


	if (exp.name == 'query')
		return this.process_query(exp.args[0]);


	if (exp.name == 'rule')
		return this.process_rule(exp);

	var with_body = false;
	
	var result = {
		'head': this.process_head(exp, with_body)
		,'f': exp.name
		,'a': exp.args.length
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
	
	var result = {};
	
	var with_body = true;
	var not_query = false;
	
	result.head = this.process_head(head, with_body);
	
	var head_vars = result.head.vars;

	var body_code  = this.process_body(body, not_query, head_vars);
	
	// I know this is ugly but we had to process
	//  the head first in order to retrieve the vars.
	for (var label in body_code)
		result[label] = body_code[label];
	
	result.f = head.name;
	result.a = head.args.length;
	
	// clean-up
	delete result.head.vars;
	
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
Compiler.prototype.process_head = function(exp, with_body) {
	
	if (!(exp instanceof Functor))
		throw new ErrorExpectingFunctor("Expecting Functor", exp);
	
	// Of course we can't be seeing conjunctions or disjunctions
	//  in the head of a rule.
	//
	if (exp.name == 'conj' || (exp.name == 'disj'))
		throw new ErrorInvalidHead("Unexpected conjunction or disjunction within Functor head", exp);
	
	var v = new Visitor(exp);
	
	var result = []; 
		
	var vars = {};
	
	/**
	 *   Functor
	 *   	- root ==> attribute in `ctx`
	 *   	- 1st time seen (and thus as a parameter to another Functor)
	 *   	- 2nd time seen (to process its arguments)
	 * 
	 */
	
	v.process(function(ctx){
		
		/*
		 *   Root Node gets ctx.n.is_root = true
		 */
		
		if (ctx.is_struct) {
			
			if (ctx.as_param) {
				
				result.push(new Instruction("get_var", {x:ctx.v}));
				return;
				
			} else {
				
				// We are seeing this functor node for the first time
				//  and so it is a root
				//
				result.push(new Instruction("get_struct", {f: ctx.n.name, a:ctx.n.args.length, x:ctx.v}));
				return;
				
			}
			
		}
		
		/*
		 *   Cases:
		 *   1- First time @ root            --> get_var
		 *   2- First time but inside struct --> unif_var
		 *   
		 *   3- Subsequent time @ root            --> get_value
		 *   4- Subsequent time but inside struct --> unify_value 
		 * 
		 */
		if (ctx.n instanceof Var) {
			
			var first_time = (vars[ctx.n.name] === undefined);
			var at_root = ctx.root_param;
			var in_cons = ctx.in_cons === true;

			// not the first time anymore...
			vars[ctx.n.name] = true;
			
			if (first_time && (at_root || in_cons)) {
				result.push(new Instruction("get_var", {p:ctx.n.name}));
				return;
			}
			
			if (first_time && !at_root) {
				
				if (ctx.n.name[0] == "_")
					result.push(new Instruction("unif_void"));
				else
					result.push(new Instruction("unif_var", {p:ctx.n.name}));
					
				return;
					
			}
			
			if (!first_time && at_root) {
				result.push(new Instruction("get_value", {p:ctx.n.name}));
			}
			
			if (!first_time && !at_root) {
				result.push(new Instruction("unif_value", {p:ctx.n.name}));
			}

						
			return;			
		}
		
		if (ctx.n instanceof Token) {
			
			if (ctx.n.name == 'nil') {
				result.push(new Instruction('get_nil'));
				return;
			}
			
			if (ctx.n.name == 'term') {
				
				if (ctx.root_param)
					result.push(new Instruction('get_term', { p: ctx.n.value }));
				else
					result.push(new Instruction('unify_term', { p: ctx.n.value }));
				return;
			}
				
			if (ctx.n.name == 'number') {
				if (ctx.root_param)
					result.push(new Instruction('get_number', { p: ctx.n.value }));
				else
					result.push(new Instruction('unify_number', { p: ctx.n.value }));
				return;
			}
			
		}// If Token
		
	});//callback
	
	if (with_body)
		result.push(new Instruction("jump", {p:'g0'}));
	else
		result.push(new Instruction("proceed"));
	
	result.vars = vars;
	
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
		throw new ErrorExpectingFunctor("Expecting Functor", exp);
	
	if (exp.name == 'rule')
		throw new ErrorRuleInQuestion("Unexpected rule definition in query", exp);
	
	var is_query = true;
	return this.process_body(exp, is_query);
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
 *  'proceed' goes on each branch of disjunctions
 *  but only goes on the right-hand side of conjunctions.
 *   
 *  @return Object
 * 
 *  @raise ErrorInvalidToken
 */
Compiler.prototype.process_body = function(exp, is_query, head_vars) {
	
	var vars = head_vars;
	var map = {};
	var result = {
		is_query: is_query
	};
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

		
		// Step -1
		// Get rid of 'proceed' in between conjunction terms (if any)
		var lcode = result[llabel];
		var last_instruction_on_left = lcode[lcode.length-1];
		
		if (last_instruction_on_left.opcode == 'proceed')
			lcode.pop();

		if (last_instruction_on_left.opcode == 'end')
			lcode.pop();

		
		// Step 0: include the boundary instruction
		//         between the 2 goals forming a conjunction
		//
		//         For primitive operators, the instruction
		//          handler will take care of backtracking if necessary.
		//
		var is_left_primitive = lctx.n && lctx.n.attrs.primitive;
		
		if (!is_left_primitive)
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
		}

		result[jlabel] = result[llabel];
		
		// Track merges
		//
		merges[llabel] = jlabel;
		
		// If we are at root with this disjunction,
		//  let's help the interpreter with an additional hint
		if (jctx.root) {
			result[rlabel].unshift(new Instruction("try_finally"));
		}
		
		delete result[llabel];
	};
	
	
	
	v.process(function(jctx, left_or_root, right_maybe){

		var type = jctx.type;
		var goal_id = jctx.goal_id;
		var is_root = jctx.root;
		

		var label = type+goal_id;
		var ctx = left_or_root;
		
		if (is_root)
			label = 'g0';
		
		if (type == 'root') {
			label = 'g0';
			
			result[label] = that.process_goal( ctx.n, is_query, vars );
			return;
		}
		
		/*
		 *   Cases:
		 *     left:  node | goal ref
		 *     right: node | goal ref
		 *     
		 *     type:  conj | disj
		 */
		
		var lcode = that.process_goal(left_or_root.n, is_query, vars);
		var rcode = that.process_goal(right_maybe.n, is_query, vars);

		
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
			
		}
		
		if (type == 'disj') {

			disj_link(jctx, left_or_root, right_maybe);
		}
		
		
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
Compiler.prototype.process_goal = function(exp, is_query, vars) {
	
	vars = vars || {};
	
	if (exp === undefined)
		return undefined;

	//console.log("Process Goal: ", exp);

	/*
	 *  The `cut` operator is simple to compile
	 *    but a bit more difficult to interpret ;)
	 */
	if (exp.name == 'cut') {
		return [new Instruction('cut'), new Instruction("proceed")];
	}

	if (exp.name == 'fail') {
		return [new Instruction('fail')];
	}
	
	
	if (exp.attrs.primitive && exp.attrs.to_evaluate) {
		return this.process_primitive(exp, is_query, vars);
	}
	
	// Transform 'not' operator
	//
	//  Just take the functor
	//
	if (exp.name == 'not') {
		exp = exp.args[0];
		exp.not = true;
	}
	
	var v = new Visitor2(exp);
	
	var results = [];

	results.push(new Instruction('allocate'));
	
	v.process(function(ctx){
		
		var struct_ctx = { f: ctx.n.name, a:ctx.n.args.length , x: ctx.vc };
		
		if (ctx.root) {
			struct_ctx.x = 0;
		}
		
		results.push(new Instruction("put_struct", struct_ctx));
		
		for (var index=0; index<ctx.args.length; index++) {
			
			var n = ctx.args[index];
			
			if (n instanceof Var) {
				if (n.name[0] == "_")
					results.push(new Instruction("put_void"));
				else {
					results.push(new Instruction("put_var", {p: n.name}));
					vars[n.name] = true;
				}
			}

			if (n instanceof Value) {
				results.push(new Instruction("put_value", {x: n.name}));
			}
			
			if (n instanceof Token) {
				if (n.name == 'number')
					results.push(new Instruction("put_number", {p: n.value}));
				
				if (n.name == 'term')
					results.push(new Instruction("put_term", {p: n.value}));
				
				if (n.name == 'nil')
					results.push(new Instruction("put_nil"));
			}
			
		}//for
		
		// Only root functor gets a CALL
		//
		if (ctx.root) {
			
			if (ctx.n.attrs.builtin) {
				results.push(new Instruction('setup'));
				results.push(new Instruction('bcall'));
				results.push(new Instruction('maybe_retry'));
				results.push(new Instruction('deallocate'));
			} else {
				results.push(new Instruction('setup'));
				results.push(new Instruction('call'));
				
				if (ctx.n.not)
					results.push(new Instruction('maybe_retryn'));
				else
					results.push(new Instruction('maybe_retry'));
				//results.push(new Instruction('maybe_retry'));
				results.push(new Instruction('deallocate'));
			}
			
			
			if (is_query)
				results.push(new Instruction('end'));
			else
				results.push(new Instruction('proceed'));
		}
			
		
	});

	return results;
};

Compiler.prototype.process_primitive = function(exp, is_query, vars) {

	
	var v = new Visitor2(exp);
	
	var results = [];

	v.process(function(ctx){

		//console.log("*** ctx:  ",ctx);
		
		var op_name = ctx.n.name;
		
		/*
		 *  This instruction will clear the primitive's
		 *   context in $x0
		 */
		results.push(new Instruction("prepare"));
		
		for (var index=0; index<ctx.args.length; index++) {
			
			var n = ctx.args[index];
			
			//console.log("+++ n: ", n);
			
			if (n instanceof Var) {
				results.push(new Instruction("push_var", {p: n.name}));
				vars[n.name] = true;
			}

			if (n instanceof Value) {
				results.push(new Instruction("push_value", {y: n.name}));
			}
			
			if (n instanceof Token) {
				if (n.name == 'number')
					results.push(new Instruction("push_number", {p: n.value}));
				
				if (n.name == 'term')
					//results.push(new Instruction("push_term", {p:n.value}));
					throw new ErrorInvalidToken("term: "+JSON.stringify(n.value), n);
				
				if (n.name == 'nil')
					//results.push(new Instruction("push_nil"));
					throw new ErrorInvalidToken("nil", n);
			}
			
		}//for
		
		var inst_name = "op_"+op_name;
		
		if (ctx.n.attrs.boolean || !ctx.n.attrs.retvalue)
			results.push(new Instruction(inst_name));
		else
			results.push(new Instruction(inst_name, {y: ctx.vc}));
		
	});


	results.push(new Instruction('proceed'));
	
	return results;
	
};



if (typeof module!= 'undefined') {
	module.exports.Compiler = Compiler;
}
