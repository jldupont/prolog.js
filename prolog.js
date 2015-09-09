/*! prolog.js - v0.0.1 - 2015-09-09 */

/**
 *  Token
 *  
 *  name  : the name assigned to the Token
 *  value : the value of the token
 *  col : where on the line the token was found
 */
function Token(name, maybe_value, maybe_attrs) {
	
	maybe_attrs = maybe_attrs || {}; 
	
	this.name = name;
	this.value = maybe_value || null;
	
	// Precedence - this is fixed for Tokens
	//  until possibly later in the parsing pipeline
	this.prec = 0;
	
	// Position in input stream
	this.line = maybe_attrs.line || 0;
	this.col  = maybe_attrs.col || 0;
	
	this.is_primitive = maybe_attrs.is_primitive || false;
	this.is_operator =  maybe_attrs.is_operator || false;
	
};

Token.inspect_quoted = false;

Token.prototype.inspect = function(){
	var result = "";
	
	result = "Token("+this.name+","+this.value+")";
	
	if (Token.inspect_quoted)
		result = "'"+result+"'";
	
	return result;
};

/**
 * Check for token equality
 * 
 * @param t1
 * @param t2
 * @returns {Boolean}
 */
Token.equal = function(t1, t2) {
	return ((t1.name == t2.name) && (t1.value == t2.value));
};

/**
 * Check for match between the list of tokens
 * 
 * @param input_list
 * @param expected_list
 * @param also_index : the also check the index of the token in the input stream (used for tests mainly)
 * 
 * @returns {Boolean}
 */
Token.check_for_match = function(input_list, expected_list, also_index){
	
	also_index = also_index || false;
	
	if (input_list.length != expected_list.length) {
		//console.log("match: list not same length");
		return false;
	}
		
	
	for (var index in input_list) {
		
		var input_token = input_list[index];
		var expected_token = expected_list[index] || new Token('null');
	
		if (!Token.equal(input_token, expected_token)) {
			console.log("match fail: "+JSON.stringify(input_token));
			return false;
		}
			
		
		if (also_index)
			if (input_token.col != expected_token.col) {
				//console.log("match: col mismatch: "+ JSON.stringify(input_token));
				return false;
			}
				
				
	};
	
	return true;
};


function Result(term_list, last_index) {
	this.terms = term_list;
	this.index = last_index;
};


/**
 * Operator
 * @constructor
 */
function Op(name, symbol, precedence, type) {
	this.name = name;
	this.symbol = symbol;
	this.prec = precedence;
	this.type = type;
	
	// from the lexer
	this.line = 0;
	this.col  = 0;
};

Op.prototype.inspect = function() {
	return "Op("+this.name+")";
};

/**
 *  aFb --> [a, F, b]
 *   Fb --> [null, F, b]
 *  aF  --> [a, F, null]
 * 
 *  @return [A, B, C]
 */
Op.parts = function(type) {
	
	var parts = type.split("");
	if (parts[0] == 'f')
		return [null, parts[0], parts[1]];
	
	return [parts[0], parts[1], parts[2] || null];
};

Op.AMBIGUOUS_PRECEDENCE = true;

//Initialize the operators

/*
 * Precedence is an integer between 0 and 1200. 
 * 
 * Type is one of: xf, yf, xfx, xfy, yfx, fy or fx. 
 * 
 * The `f' indicates the position of the functor, 
 *  while x and y indicate the position of the arguments. 
 *  `y' should be interpreted as 
 *    ``on this position a term with precedence lower or equal 
 *    to the precedence of the functor should occur''. 
 * 
 * For `x' the precedence of the argument must be strictly lower. 
 *  
 * The precedence of a term is 0, unless its principal functor is an operator, 
 *  in which case the precedence is the precedence of this operator. 
 *   
 *   A term enclosed in parentheses ( ... ) has precedence 0.
 */
Op._list = [ 
	    new Op("rule",    ':-', 1200, 'xfx')
	   ,new Op("disj",    ';',  1100, 'xfy')
	   ,new Op("conj",    ',',  1000, 'xfy')
	   ,new Op("unif",    '=',   700, 'xfx')
	   ,new Op("em",      '=<',  700, 'xfx')
	   ,new Op("ge",      '>=',  700, 'xfx')
	   ,new Op("is",      'is',  700, 'xfx')
	    
	   ,new Op("minus",   '-',   500, 'yfx')
	   ,new Op("plus",    '+',   500, 'yfx')
	   ,new Op("mult",    '*',   400, 'yfx')
	    
	   ,new Op("uminus",   '-',  200, 'fy')
	   ,new Op("uplus",    '+',  200, 'fy') 
	  ]; 

Op._amap = {
		 '-':  { ambiguous_precence: true}
		,'+':  { ambiguous_precence: true}
};

Op.has_ambiguous_precedence = function(symbol) {
	return Op._amap[symbol] || false;
};

/*
 *  Various Inits
 * 
 *  * an ordered list of operators
 *    from least to highest precedence
 *    
 *  * map by name
 */
(function(){
	
	Op.map_by_symbol = {};
	Op.map_by_name = {};
	Op.ordered_list_by_precedence = [];
	
	for (var index in Op._list) {
		var o = Op._list[index];
		
		Op.ordered_list_by_precedence.push(o);
		Op.map_by_name [ o.name ] = o;
		Op.map_by_symbol[ o.symbol ] = o;
	};
	
	Op.ordered_list_by_precedence.sort(function(a, b){
		return (a.prec - b.prec);
	});
	
})();





/**
 *  Classify a triplet of nodes
 *  
 *  The node_center is determined i.e. it needs to be
 *   a fully configured OpNode with precedence & type.
 *  
 *  
 *  If node has strictly lower precedence than node_center => `x`
 *  If node has lower or equal precedence than node_center => `y`
 *  If node has higher precedence than node_center => ``
 * 
 * @param node_left   : the node on the lefthand side
 * @param node_center : should be an OpNode
 * @param node_right  : the node on the righthand side
 * 
 * @return String (e.g. xfx, yfx etc.) | null
 */
Op.classify_triplet = function (node_left, node_center, node_right) {

	if (!(node_center instanceof OpNode))
		throw Error("Expecting an OpNode from node_center: " + JSON.stringify( node_center));

	if (node_center.prec == null)
		throw Error("Expecting a valid OpNode for node_center: "+JSON.stringify( node_center ));
	
	return Op.__classify(node_left, node_center, node_right);
};

// PRIVATE METHOD
//
Op.__classify = function(node_left, node_center, node_right){
	
	var pc = node_center.prec;
	var result = "";
	
	try {
		if (node_left)
			if (node_left.prec == pc)
				result += "y";
			else
				if (node_left.prec < pc)
					result += "x";
		
	} catch(e) {}; // we anyhow need to report ``
	
	result += 'f';
	
	try {
		if (node_right)
			if (node_right.prec == pc)
				result += 'y';
			else if (node_right.prec < pc)
				result += 'x';
	} catch(e) {};

	return result;
};

/**
 * Figure out if a type is unary
 * 
 * @param type
 * @return Boolean
 */
Op.is_unary = function(type) {
	return  (""+type)[0] == 'f';
};

/**
 * TODO: maybe use an object for map ?
 * 
 * @param input_st
 * @param expected_st
 * @returns {Boolean}
 */
Op.is_compatible_subtype = function(input_st, expected_st) {

	if (expected_st == null)
		if (input_st !=null)
			return false;
	
	if (input_st == null)
		if (expected_st != null)
			return false;
	
	if (input_st == 'y')
		if (expected_st == 'x')
			return false;
	
	// e.g. f == f
	return true;
};

/**
 *   an `x` can also count for `y`
 *   but not the converse
 * 
 *   @param input_type:    the type to check against
 *   @param expected_type: the reference type
 *   @return true | false
 */
Op.are_compatible_types = function(input_type, expected_type) {
	
	var parts_input  = Op.parts( input_type );
	var parts_expect = Op.parts( expected_type );
	
	return Op.is_compatible_subtype(parts_input[0], parts_expect[0]) &&
			Op.is_compatible_subtype(parts_input[1], parts_expect[1]) &&
			Op.is_compatible_subtype(parts_input[2], parts_expect[2]);
};


/**
 * OpNode
 * @constructor
 */
function OpNode(symbol, maybe_precedence) {
	
	this.symbol = symbol;
	
	// specifically designed
	//  so this causes a 'burst' if not initialized
	//  correctly during the processing
	this.prec   = maybe_precedence || null;
	
	// attempt to look-up precedence
	if (this.prec == null) {
		var result = Op.has_ambiguous_precedence(symbol); 
		try {
			if (result === false)
				this.prec = Op.map_by_symbol[symbol].prec;
		} catch(e) {
			throw new Error("Can't find `" + symbol +"` in Op.map_by_symbol");
		}
	};
};

OpNode.prototype.inspect = function(){
	return "OpNode(`"+this.symbol+"`,"+this.prec+")";
};

/**
 * Create an OpNode from a name 
 */
OpNode.create_from_name = function(name) {
	var op = Op.map_by_name[name];
	
	if (!op)
		throw new Error("OpNode.create_from_name: expecting a valid 'name', got: "+name);
	
	return new OpNode(op.symbol, op.prec);
};



// End of stream
function Eos () {};

Eos.prototype.inspect = function () {
	return "Eos";
};

function Nothing () {};

/**
 *  Functor
 *  @constructor
 *  
 *  @param name: the functor's name
 *  @param maybe_arguments_list : an optional arguments list
 *          (useful during debugging)
 */
function Functor(name, maybe_arguments_list) {
	
	this.name = name;
	this.original_token = null;
	this.prec = 0;
	
	// from the lexer
	this.line = 0;
	this.col  = 0;
	
	// remove the first parameter of the constructor
	if (arguments.length > 1)
		this.args = Array.prototype.splice.call(arguments, 1);
	else
		this.args = [];
	
	// Target Arity
	//  Used in the context of the interpreter
	this.arity = null;
};

Functor.prototype.get_arity = function() {
	return this.arity || this.args.length;
};

Functor.prototype.get_name = function(){
	return this.name;
};

Functor.inspect_short_version = false;
Functor.inspect_quoted = false;

Functor.prototype.inspect = function(){
	
	var result = "";
	
	var arity = this.arity || this.args.length;
	
	if (Functor.inspect_short_version)
		result = "Functor("+this.name+"/"+arity+")";
	else {
		var fargs = this.format_args(this.args);
		result = "Functor("+this.name+"/"+arity+","+fargs+")";
	}
	
	if (Functor.inspect_quoted)
		result = "'"+result+"'";
	
	return result;
};

Functor.prototype.format_args = function (input) {
	
	var result = "";
	for (var index = 0; index<input.length; index++) {
		var arg = input[index];
		
		if (index>0)
			result += ',';
		
		if (Array.isArray(arg)) {
			result += '[';
			result += this.format_args(arg);
			result += ']';
		} else 
			result = this.format_arg(result, arg);
	};
	
	return result;
};

Functor.prototype.format_arg = function(result, arg){
	
	if (arg && arg.inspect)
		result += arg.inspect();
	else
		result += JSON.stringify(arg);
	
	return result;	
};

Functor.prototype.get_args = function(){
	return this.args;
};

Functor.prototype.push_arg = function(arg) {
	this.args.push(arg);
};

Functor.prototype.get_arg = function(index) {
	this.args[index];
};




function Var(name) {
	this.prec = 0;
	this.name = name;
	this.col = null;
	this.line = null;
};

Var.prototype.inspect = function(){
	return "Var("+this.name+")";
};


function Value(name) {
	this.name = name;
};

Value.prototype.inspect = function(){
	return "Value("+this.name+")";
};


Builtins = {};

Builtins.db = {};

/**
 * Define a builtin functor
 */
Builtins.define = function(name, arity, functor){

	var sig = name+"/"+arity;
	Builtins.db[sig] = functor;
};

//============================================================ Instruction

/**
 *  Context:
 *  a: arity
 *  f: functor name
 *  p: input parameter
 *  
 *  x: target register number
 *  y: target argument index
 */
function Instruction(opcode, ctx) {
	this.opcode = opcode;
	this.ctx = ctx || null;
};

Instruction.inspect_quoted = false;

Instruction.prototype.is = function(opcode) {
	return this.opcode == opcode;
};

Instruction.prototype.get = function(param) {
	return this.ctx[param];
};

Instruction.prototype.inspect = function(){
	
	const params = [ 'p', 'x', 'y', 'i' ];
	var result = ""; 
	
	if (this.ctx && this.ctx.l)
		result = this.ctx.l + "  ";
		
	result += this.opcode + (Array(13 - this.opcode.length).join(" "));
	
	if (this.ctx == null)
		return result;
	
	result += " ( ";
	
	if (this.ctx.f)
		result += this.ctx.f+"/"+this.ctx.a;
	
	for (var i=0, inserted=false;i<params.length;i++) {
		
		if (this.ctx[params[i]] !=undefined ) {
			
			if (inserted || (this.ctx.f && !inserted))
				result += ", ";
			
			result += params[i] + "("+ JSON.stringify(this.ctx[params[i]])+")";
			inserted= true;
		}
	};
	
	result += " )";
	
	if (Instruction.inspect_quoted)
		result = "'"+result+"'";
	
	return result;
};

// ============================================================ Errors

function ErrorExpectingFunctor(msg) {
	this.message = msg;
};
ErrorExpectingFunctor.prototype = Error.prototype;

function ErrorExpectingGoal(msg) {
	this.message = msg;
};
ErrorExpectingGoal.prototype = Error.prototype;

function ErrorInvalidHead(msg) {
	this.message = msg;
};
ErrorInvalidHead.prototype = Error.prototype;

function ErrorRuleInQuestion(msg) {
	this.message = msg;
};
ErrorRuleInQuestion.prototype = Error.prototype;

function ErrorNoMoreInstruction(msg) {
	this.message = msg;
};
ErrorNoMoreInstruction.prototype = Error.prototype;

function ErrorInvalidInstruction(msg) {
	this.message = msg;
};
ErrorInvalidInstruction.prototype = Error.prototype;


if (typeof module!= 'undefined') {
	module.exports.Nothing = Nothing;
	module.exports.Eos = Eos;
	module.exports.Functor = Functor;
	module.exports.Op = Op;
	module.exports.Var = Var;
	module.exports.Value = Value;
	module.exports.OpNode = OpNode;
	module.exports.Result = Result;
	module.exports.Instruction = Instruction;
	module.exports.Builtins = Builtins;
	
	// Errors
	module.exports.ErrorExpectingFunctor = ErrorExpectingFunctor;
	module.exports.ErrorInvalidHead = ErrorInvalidHead;
	module.exports.ErrorRuleInQuestion = ErrorRuleInQuestion;
	module.exports.ErrorExpectingGoal = ErrorExpectingGoal;
	module.exports.ErrorNoMoreInstruction = ErrorNoMoreInstruction;
	module.exports.ErrorInvalidInstruction = ErrorInvalidInstruction;
};
/**
 *  The builtin 'call' functor
 *  
 *  @param env: the environment containing the stack, the database and the registers
 *  @param return_var_name: the variable name to use for return
 *  @param functor_name: the actual target functor name
 *  @param args: the arguments for the functor call
 * 
 *  @return null
 */
Builtins.define('call', 3, function(env, return_var_name, functor_name, args){
	
	
	
});


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
Compiler.prototype.process_body = function(exp) {
	
	var result = {};
	
	var v = new Visitor3(exp);
	
	var that = this;
	
	/**
	 *  Link code across a conjunction
	 *  
	 *  Conj(Gx, L, R ) ==> Gx: L R
	 *  
	 *    Combine code of L and R under label Gx
	 *  
	 */
	var conj_link = function(jctx, lctx, rctx) {
		
		// Step 1, combine code of R under code for L
		//      
		var llabel = "g"+lctx.vc;
		var rlabel = "g"+rctx.vc;
		
		result[llabel] = result[llabel].concat(result[rlabel]);
		
		// Step 2, get rid of R
		delete result[rlabel];
		
		// Step 3, move everything under the Conjunction's label
		var jlabel = "g"+jctx.vc;
		
		result[jlabel] = result[llabel];
		
		// Step 4, finally get rid of L
		delete result[llabel];
	};

	
	/**
	 *  Link code across a disjunction
	 * 
	 *  Disj(Gx, L, R)
	 *  
	 *    - Bring L code under the label Gx
	 *    - Add link code on top of Gx code
	 * 
	 */
	var disj_link = function(jctx, lctx, rctx){

		// Step 1, combine code of L under code for Gx
		//
		var jlabel = "g"+jctx.vc;
		var llabel = "g"+lctx.vc;
		
		result[jlabel] = result[llabel];
		
		// Step 2, we don't need the L label anymore
		delete result[llabel];
		
		// Step 3, link
		var rlabel = "g"+rctx.vc;
		
		result[jlabel].unshift(new Instruction('try_else', {p: rlabel}));
	};
	
	
	
	v.process(function(jctx, left_or_root, right_maybe){
		
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
		
		
		var llabel = "g" + left_or_root.vc;
		var rlabel = "g" + right_maybe.vc;
		
		if (lcode)
			result[llabel] = lcode;
		
		if (rcode)
			result[rlabel] = rcode;
		
		if (type == 'conj') {
			
			conj_link(jctx, left_or_root, right_maybe);
			
		};
		
		if (type == 'disj') {

			disj_link(jctx, left_or_root, right_maybe);
			
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
			results.push(new Instruction('deallocate'));
		};
			
		
	});
	
	return results;
};





if (typeof module!= 'undefined') {
	module.exports.Compiler = Compiler;
};


/*
 *  Database
 * 
 * @constructor
 */
function Database(access_layer) {
	this.db = {};
	this.al = access_layer;
};

/**
 *  Insert a rule/fact in the database
 *  
 *  The `root node` can be :
 *  -- Functor('rule', args...)
 *  -- Functor(X, args...)
 *  
 *  Rule:    `head :- body` 
 *   whereas `head`  is made up of `(functor args...)`
 *   
 *  The functor signature is derived 
 *   from the functor name and arity. 
 *  
 *  @param functor_signature {String}
 *  @param rule_nodes [] 
 *  @return signature
 *  @raise Error
 */
Database.prototype.insert = function(root_node){

	var functor_signature = this.al.compute_signature(root_node);
	
	var maybe_entries = this.db[functor_signature] || [];
	maybe_entries.push(root_node);
	
	this.db[functor_signature] = maybe_entries;
	
	return functor_signature;
};

/**
 *  Retrieve clause(s) from looking up
 *   an input Functor node 
 */
Database.prototype.get = function(functor_node) {
	
	var functor_signature = this.al.compute_signature(functor_node);
	return this.db[functor_signature] || null;
	
};

/**
 * Define a Functor in the database
 * 
 * @param root_node
 */
Database.prototype.define = function(root_node){
	
	var functor_signature = this.al.compute_signature(root_node);
	this.db[functor_signature] = root_node;
};


Database.prototype.lookup_functor = function(functor_signature){
	
	return this.db[functor_signature] || null;
};

if (typeof module!= 'undefined') {
	module.exports.Database = Database;
};


/*
 *  Database
 * 
 * @constructor
 */
function DbAccess() {
};

/**
 * Compute the signature of the `input`
 *  whether `input` is a `fact` or a `rule`.
 *  
 *  Both are really represented by a `root node`
 *   of the type `Functor`.
 * 
 * @param input
 * @return {String}
 * @raise Error
 */
DbAccess.compute_signature = function(input) {
	
	var sig = null;
	
	try {
		var functor = DbAccess.extract_head_of_rule(input);
		sig = DbAccess.get_functor_signature(functor);
		
	} catch(e) {
		sig = DbAccess.get_functor_signature(input);
	};

	return sig;
};


/**
 * Determine if the input object
 *  consists in a `fact`
 *  
 * @param root_node
 * @return Boolean
 */
DbAccess.is_fact = function(root_node) {

	if (!(root_node instanceof Functor))
		return false;
	
	return root_node.name != 'rule';
};

/**
 * Determine if the input object
 *  consists in a `rule` 
 *  
 * @param root_node
 * @returns {Boolean}
 */
DbAccess.is_rule = function(root_node) {
	
	if (!(root_node instanceof Functor))
		return false;
	
	return root_node.name == 'rule';
};

/**
 * Extract the `head` part of a rule
 * 
 * rule :=  `head :- body`
 * 
 * @param root_node
 * @return Object (should probably just be a Functor)
 * @raise Error
 */
DbAccess.extract_head_of_rule = function(root_node) {

	if (!(root_node instanceof Functor) || (root_node.name != 'rule'))
		throw new Error("Expecting a `rule`, got: "+root_node.name);

	return root_node.args[0];
};

/**
 * Compute the signature of a functor
 * 
 * @param node
 * @return {String}
 */
DbAccess.get_functor_signature = function(node){

	if (!(node instanceof Functor))
		throw new Error("Expecting Functor, got: "+JSON.stringify(node));

	return ""+node.name+"/"+node.args.length;
};


if (typeof module!= 'undefined') {
	module.exports.DbAccess = DbAccess;
};


/**
 * Interpreter
 * @constructor
 * 
 * @param db    : Database
 * @param env   : Environment
 * @param stack : the processing stack i.e. where instructions are pushed and popped
 */
function Interpreter(db, builtins, optional_stack) {

	this.db  = db;
	this.builtins = builtins;
	this.stack = optional_stack || [];
	
	this.env = {};	
	this.reached_end_question = false;
};

Interpreter.prototype.get_stack = function(){
	return this.stack;
};

/**
 * Set the `question` to get an answer to
 * 
 * The `question` must be an expression (not a rule)
 *  organized as a single root node.
 * 
 * @param question
 * 
 * @raise ErrorExpectingFunctor
 */
Interpreter.prototype.set_question = function(question_code){
	
	//if (!(question instanceof Functor))
	//	throw new ErrorExpectingFunctor("Expecting functor, got: "+JSON.stringify(question));

	// Enter the `question` in the database
	//  as to only have 1 location to work on from
	
	this.db['.q.'] = question_code;
	
	this.stack = [];
	
	// Initialize top of stack
	//  to point to question in the database
	//
	this.env = {
		
		// The current instruction pointer
		//
		p: { 
			f: ".q.",  // which functor in the database 
			l: 'g0',  // which label
			i: 0      // and finally which index in the label entry
			}
	
		// The current code inside functor:label pointed to by 'p'
		//
		,cc: null
		
		
		// The current variable in the target choice point
		//
		// Used to track the construction of a structure in the
		//  target choice point.
		//
		,cpv: null
		
		
		/*  Continuation Point
		 * 
		 */
		,cp: null
		
		/*
		 *  Current target env frame on the stack
		 */
		,ce: {}
		
		/*
		 *  Variable used in the current structure 
		 */
		,cv: null
		,cvi: 0
		
		/*
		 *  Current unification status
		 */
		,cu: null
	};
	
	try {
		this.env.cc = this.db['.q.']['g0'];	
	} catch (e){
		throw new ErrorExpectingGoal("Expecting at least 1 goal in question");
	};

};



/**
 * Take 1 processing step
 * 
 * @return true | false | null where `null` signifies `not done yet`
 * 
 * @raise ErrorNoMoreInstruction
 * @raise ErrorInvalidInstruction
 */
Interpreter.prototype.step = function() {

	var inst = this.fetch_next_instruction();
	
	var fnc_name = "inst_" + inst.opcode;
	
	var fnc = this[fnc_name];
	if (!fnc)
		throw new ErrorInvalidInstruction(inst.opcode);
	
	// Execute the instruction
	this[fnc_name].apply(this, [inst]);	

};// step

/**
 *  Cases:
 *  
 *  a)  null --> *p     i.e. at initialization  (already taken care of)
 *  b)  HEAD --> G0     i.e. when executing a functor
 *  c)  Gx   --> Gx'    i.e. when executing inside a functor
 * 
 * @return Instruction | null
 * 
 */
Interpreter.prototype.fetch_next_instruction = function(){
	
	// Just try fetching next instruction from env.cc
	var inst = this._fetch();
	
	if (inst)
		return inst;
	
	// Are we at the end of `head` ?
	
	if (this.env.p.f == 'head') {
		
		// update pointer to 1st goal then
		this.env.p.f = 'g0';
		this.env.p.i = 0;
		this._fetch_code();
		
	} else {
		
		// If we are inside a goal, try the next one.
		// In the current implementation, this should not
		//  happen directly: some branching would have occurred.
		throw new ErrorNoMoreInstruction();
	};
	
	return this._fetch();
};

Interpreter.prototype._fetch = function(){
	
	// Just try fetching next instruction from env.cc
	var inst = this.env.cc[this.env.p.i];
	
	this.env.p.i++;
	
	return inst || null;
};

Interpreter.prototype._fetch_code = function(){
	
	var cc = this.db[this.env.p.f];
	this.env.p.i = 0;
	this.env.cc = cc;
};

Interpreter.prototype.get_env_var = function(evar) {
	return this.env[evar];
};

//
//
// ======================================================================== INSTRUCTIONS
//
//



/**
 *   Instruction "allocate"
 *   
 *   Denotes beginning of a "choice point" code block
 *   
 *   Create an environment for this choice point and
 *    and push a link in the current environment.
 */
Interpreter.prototype.inst_allocate = function() {
	
	//console.log("Instruction: 'allocate'");
	
	var env = { vars: {} };
	this.env.ce = env;
	this.stack.push(env);
	
};

/**
 *   Instruction "deallocate"
 * 
 *   Deallocates, if possible, a "choice point" environment.
 * 
 *   Cases:
 *   - Choice Point succeeds : do not deallocate environment
 *   - Choice Point fails & no other clause : deallocate environment
 */
Interpreter.prototype.inst_deallocate = function() {
	
	console.log("Instruction: 'deallocate'");
	
};

/**
 *   Instruction "put_struct $f $a $x"
 * 
 *   Used to construct a structure $f or arity $a in the 
 *   target choice point environment.  Starts building the structure in the
 *    choice point environment at variable $x.
 * 
 *   The target variable $x is retain the current environment
 *    as to help with the remainder of the construction  (cpv).
 * 
 */
Interpreter.prototype.inst_put_struct = function(inst) {
	
	var f = new Functor(inst.get('f'));
	var a = inst.get('a');
	f.arity = a;
	
	var x = "x" + inst.get('p');
	
	this.env.cv = x;
	this.env.ce.vars[x] = f;

	//console.log("Instruction: 'put_struct': "+inst.get('f')+"/"+a+", "+x);
	//console.log("Env: ", this.env);

};

/**
 *   Instruction "put_term"
 * 
 *   Inserts a 'term' in the structure being built.
 */
Interpreter.prototype.inst_put_term = function(inst) {
	
	var term = inst.get("p");
	
	//console.log("Instruction: 'put_term':", term);

	var cv = this.env.cv;
	var struct = this.env.ce.vars[cv];
	
	struct.push_arg(term);
	
};

/**
 *   Instruction "put_number"
 * 
 *   Inserts a 'number' in the structure being built.
 */
Interpreter.prototype.inst_put_number = function(inst) {
	
	var num = inst.get("p");
	
	//console.log("Instruction: 'put_number': ", num);
	
	var cv = this.env.cv;
	var struct = this.env.ce.vars[cv];
	
	struct.push_arg(num);
};


/**
 *   Instruction "put_var"
 * 
 *   Inserts a 'var' in the structure being built.
 */
Interpreter.prototype.inst_put_var = function(inst) {
	
	var vname = inst.get("p");
	
	//console.log("Instruction: 'put_var'");

	var cv = this.env.cv;
	var struct = this.env.ce.vars[cv];
	
	struct.push_arg(new Var(vname));
	
};

/**
 *   Instruction "put_value"
 * 
 *   Inserts a 'value' in the structure being built.
 *   
 *   The 'value' is obtained through dereferencing
 *    the variable.
 */
Interpreter.prototype.inst_put_value = function(inst) {
	
	var vname = "x" + inst.get("p");
	
	var value = this.env.ce.vars[vname];
	
	//console.log("Instruction: 'put_value': ", value);
	
	// The current structure being worked on
	var cv = this.env.cv;
	var struct = this.env.ce.vars[cv];

	struct.push_arg(value);
};

/**
 *   Instruction "try_else $target"
 * 
 *   Denotes a disjunctive choice point
 * 
 *   Insert choice point to $target in the current environment.
 *   
 *   If the following choice point about to be tried fails,
 *    it will be removed from the choice point list and the
 *    one inserted to $target will be tried next.
 *   
 */
Interpreter.prototype.inst_try_else = function() {
	
	console.log("Instruction: 'try_else'");
	
};


/**
 *   Instruction "call"
 * 
 *   Executes the Functor pointed to by $x0
 *    in the target environment.
 *    
 *   The Continuation Point (CP) will be saved
 *    in the current environment.
 *   
 */
Interpreter.prototype.inst_call = function(inst) {
	
	console.log("Instruction: 'call'");
	
	// Get functor name & arity from the 
	//  environment variable x0
	var x0 = this.env.ce.vars['x0'];
	
	// Consult the database
	
	
};

/**
 *   Instruction "get_struct" $f, $a, $x
 *   
 *   Expects a structure of name $f and arity $a 
 *    at the current variable $x being
 *    matched in the environment.
 * 
 */
Interpreter.prototype.inst_get_struct = function(inst) {
	
	//console.log("Instruction: 'get_struct'");
	
	var fname  = inst.get('f');
	var farity = inst.get('a');
	var x      = "x" + inst.get('p');
	
	// The current value
	//
	// Assume this will fail to be on the safe side
	//
	this.env.cv = null;
	this.env.cu = false;
	
	// Fetch the value from the target input variable
	var maybe_struct = this.env.ce.vars[x];
	
	if (!(maybe_struct instanceof Functor)) {
		// Not a structure ...
		return;
	};
	
	if (maybe_struct.get_name() != fname) {
		return;	
	};

	if (maybe_struct.get_arity() != +farity ) {
		return;
	};
	
	// Everything checks out
	this.env.cv = maybe_struct;
	this.env.cvi = 0;
	this.env.cu = true;
};


/**
 *   Instruction "get_term" $p
 *   
 *   Expects a 'term' $p at the current variable being
 *    matched in the environment.
 * 
 */
Interpreter.prototype.inst_get_term = function(inst) {
	
	var p = inst.get('p');
	
	//console.log("Instruction: 'get_term': ", p);
	
	var value = this.env.cv.get_arg( this.env.cvi++ );	
	
	this.env.cu = ( p == value );
};


/**
 *   Instruction "get_number" $p
 *   
 *   Expects a 'number' $p at the current variable being
 *    matched in the environment.
 * 
 */
Interpreter.prototype.inst_get_number = function() {
	
	console.log("Instruction: 'get_number'");
	
};


/**
 *   Instruction "unif_var" $x
 *   
 *   Unify the value at the current variable
 *    being matched in the environment.
 *   
 * 
 */
Interpreter.prototype.inst_unif_var = function() {
	
	console.log("Instruction: 'unif_var'");
	
};


if (typeof module != 'undefined') {
	module.exports.Interpreter = Interpreter;
};


/**
 *  Lexer
 *  @constructor
 *  
 *  @param {String} | [{String}] text : the text to analyze
 */
function Lexer (text) {

	if (Array.isArray(text))
		this.text = text.join("\n"); 
	else
		this.text = text;
	
	this.at_the_end = false;
	this.current_match = null;
	this.current_line = 0;
	this.offset = 0;
	
	this._tokenRegexp = />=|=<|\[|\]|\||is|\d+(\.\d+)?|[A-Za-z_0-9]+|:\-|=|\+\-|\*|\-\+|[()\.,]|[\n]|./gm;
};

Lexer.prototype._handleNewline = function(){
	this.offset = this._tokenRegexp.lastIndex;
	this.current_line = this.current_line + 1;
};

Lexer.prototype._computeIndex = function(index) {
	return index - this.offset; 
};

/**
 *  The supported tokens 
 */
Lexer.token_map = {
		
	// The operators should match with the ones supported
	//  downstream in the parsers
	// --------------------------------------------------
	':-':  function() { return new Token('op:rule', ':-', {is_operator: true}) }
	,',':  function() { return new Token('op:conj', ',',  {is_operator: true}) }
	,';':  function() { return new Token('op:disj', ';',  {is_operator: true}) }
	,'=':  function() { return new Token('op:unif', '=',  {is_operator: true}) }
	,'=<': function() { return new Token('op:em',   '=<',  {is_operator: true}) }
	,'>=': function() { return new Token('op:ge',   '>=',  {is_operator: true}) }
	,'-':  function() { return new Token('op:minus', '-', {is_operator: true}) }
	,'+':  function() { return new Token('op:plus',  '+', {is_operator: true}) }
	,'*':  function() { return new Token('op:mult',  '*', {is_operator: true}) }
	,'is': function() { return new Token('op:is',    'is',{is_operator: true}) }
	,'|':  function() { return new Token('list:tail','|'  ) }
	
	,'\n': function() { return new Token('newline') }
	,'.':  function() { return new Token('period') }
	,'(':  function() { return new Token('parens_open',  null, {is_operator: true}) }
	,')':  function() { return new Token('parens_close', null, {is_operator: true}) }
	
	,'[':  function() { return new Token('list:open',  null) }
	,']':  function() { return new Token('list:close', null) }
};

Lexer.newline_as_null = true;

/**
 * Retrieves all tokens from the stream.
 * 
 * This function is useful for tests.
 * 
 * @returns {Array}
 */
Lexer.prototype.process = function() {
	
	var list = [];
	var t;
	
	for (;;) {
		t = this.next();
		
		if (t.name == 'null' | t.name == 'eof')
			break;
		
		list.push(t);
	};
	
	return list;
};

/**
 *  Retrieve the next token in raw format
 *  
 *  @param {boolean} newline_as_null : emit the newline as a null
 *  
 *  @return Token | null 
 */
Lexer.prototype.step = function(newline_as_null) {

	// we reached the end already,
	//  prevent restart
	if (this.at_the_end)
		return null;
	
	// note that regex.exec keeps a context
	//  in the regex variable itself 
	this.current_match = this._tokenRegexp.exec(this.text);
	
	if (this.current_match != null)
		return this.current_match[0];
	
	if (this.current_match == '\n' && newline_as_null)
		return null;
	
	this.at_the_end = true;
	return null;
};

Lexer.prototype.is_quote = function(character) {
	return (character == '\'' | character == '\"');
};

Lexer.is_number = function(maybe_number) {
	return String(parseFloat(maybe_number)) == String(maybe_number); 
};

/**
 *  Get the next token from the text
 *  
 *  If it's a token we don't recognize,
 *   we just emit an 'atom'.
 *   
 *   @return Token
 */
Lexer.prototype.next = function() {
	
	var return_token = null;
	
	var maybe_raw_token = this.step();
	
	if (maybe_raw_token == null)
		return new Token('eof');
	
	var raw_token = maybe_raw_token;
	
	var current_index = this._computeIndex( this.current_match.index );
	
	// If we are dealing with a comment,
	//  skip till the end of the line
	if (raw_token == '%') {
		
		return_token = new Token('comment', null);
		return_token.col  = current_index;
		return_token.line = this.current_line;
		
		this.current_line = this.current_line + 1;
		
		while( this.step(Lexer.newline_as_null) != null);
		return return_token;
	};
	
	// are we dealing with a number ?
	if (Lexer.is_number(raw_token)) {
		var number = parseFloat(raw_token);
		return_token = new Token('number', number);
		return_token.is_primitive = true;
		return_token.col = current_index;
		return_token.line = this.current_line;
		return return_token;
	};
	
	// are we dealing with a string ?
	//
	if (this.is_quote(raw_token)) {
		var string = "";
		var t;
		
		for (;;) {
			t = this.step();
			if (this.is_quote(t) | t == '\n' | t == null) {
				return_token = new Token('string', string);
				return_token.is_primitive = true;
				return_token.col = current_index;
				return_token.line = this.current_line;
				return return_token;
			} 
			string = string + t;
		}; 
		
	};

	function generate_new_term(value) {
		return new Token('term', value);
	};
	
	var fn = Lexer.token_map[maybe_raw_token] || generate_new_term; 
	
	return_token = fn(maybe_raw_token);	
	return_token.col = current_index;
	return_token.line = this.current_line;
	
	if (return_token.name == 'newline')
		this._handleNewline();
	
	return return_token;
};


if (typeof module!= 'undefined') {
	module.exports.Lexer = Lexer;
	module.exports.Token = Token;
};

function Parser() {
};


Parser.prototype.process = function(input_text){

	var l = new Lexer(text);
	var tokens = l.process();

	var t = new ParserL1(tokens);
	var ttokens = t.process();
	
	var p = new ParserL2(ttokens);
	
	var result = p.process();
	var terms = result.terms;
	
	var p3 = new ParserL3(terms, Op.ordered_list_by_precedence);
	var r3 = p3.process();
	
};


if (typeof module!= 'undefined') {
	module.exports.Parser = Parser;
};


/**
 * ParserL1
 * 
 * @constructor
 */
function ParserL1(token_list, options) {
	
	var default_options = {
		
		// convert fact term to rule
		convert_fact: true	
	};
	
	this.list = token_list;
	this.reached_end = false;
	this.options = options || default_options;
	
};

/**
 *  Processes the token list 1 by 1
 *  
 *  @return [Token] | Eos | null
 */
ParserL1.prototype.next = function() {
	
	if (this.reached_end)
		return new Eos();
	
	var head = this.list.shift() || null;
	if (head == null)
		return new Eos();
		
	// Check for whitespaces and remove
	//
	if (head.name == 'term') {
		var value_without_whitespaces = (head.value || "").replace(/\s/g, '');
		if (value_without_whitespaces.length == 0)
			return null;
	};
		
	var head_plus_one = this.list.shift() || null;
	
	// Maybe it's the end of the stream ...
	//
	if (head_plus_one == null) {
		this.reached_end = true;
	};

	if (head_plus_one && head_plus_one.name == 'list:close') {
		if (head.name == 'list:open') {
			
			//  functor(  ==>  functor
			//
			//  i.e. remove parens_open
			//
			head.name = 'nil';
			return [head];
		};
	};
	
	
	if (head_plus_one && head_plus_one.name == 'parens_open') {
		if (head.name == 'term' || head.name == 'string') {
			
			//  functor(  ==>  functor
			//
			//  i.e. remove parens_open
			//
			head.name = 'functor';
			return [head];
		};
	};
	
	// We must unshift the token
	//  as not to loose the state-machine's context
	//
	this.list.unshift(head_plus_one);

	// check for variables
	if (head.name == 'term' && head.value != null) {
		var first_character = ""+head.value[0];
		
		if (first_character.toUpperCase() == first_character && ParserL1.isLetter(first_character))
			head.name = 'var';
		
		if (first_character=='_' && head.value.length == 1) {
			head.name = 'var';
			head.value = '_';
		};
			
		
	};
		
		
	return [head];
};

ParserL1.isLetter = function(char) {
	var code = char.charCodeAt(0);
	return ((code >= 65) && (code <= 90)) || ((code >= 97) && (code <= 122));
};

/**
 *  Transpiles the token list entirely
 *   Useful for tests
 *   
 *   @return [Token]
 */
ParserL1.prototype.process = function() {
	
	var result = [];
	
	for (;;) {
		var maybe_token = this.next();

		if (maybe_token == null)
			continue;
		
		if (maybe_token instanceof Eos)
			break;
		
		Array.prototype.push.apply(result, maybe_token);
	};

	return result;
};

if (typeof module!= 'undefined') {
	module.exports.ParserL1 = ParserL1;
};

/**
 *  Parser
 *  
 *  @constructor
 *  
 *  @param token_list: the token_list
 *  @param list_index: the index to start from in the token_list
 */
function ParserL2(token_list, list_index, maybe_context) {
	
	// the resulting terms list
	//
	this.result = [];
	
	this.tokens = token_list;
	this.index = list_index || 0;
	
	this.context = maybe_context || {};
};

/**
 * Compute replacement for adjacent `-` & `+` tokens 
 * 
 * @param token_n
 * @param token_n1
 * 
 * @returns `+` or `-` | null
 */
ParserL2.compute_ops_replacement = function(token_n, token_n1){

	if (token_n.value == '-') {
		
		// not the same thing as `--`
		if (token_n1.value == '-') {
			return new OpNode('+', 500);
		};
		
		if (token_n1.value == '+') {
			return new OpNode('-', 500);
		};
	};

	if (token_n.value == '+') {
		
		// not the same thing as `++`
		if (token_n1.value == '+') {
			return new OpNode('+', 500);
		};
		
		if (token_n1.value == '-') {
			return new OpNode('-', 500);
		};
	};
	
	return null;
};

/**
 * Process the token list
 *
 * @return Result
 */
ParserL2.prototype.process = function(){

	var expression = null;
	var token = null;
	var token_next = null;
	var toggle = false;
	var depth = 0;
	
	expression = new Array();
	
	for (;;) {
		
		// Pop a token from the input list
		token = this.tokens[this.index] || null;
		this.index = this.index + 1;
		
		if (token == null || token instanceof Eos)
			return this._handleEnd( expression );

		// Translate Token for variable to Var
		if (token.name == 'var') {
			var v = new Var(token.value);
			v.col = token.col;
			v.line = token.line;
			expression.push(v);
			continue;
		};
		
		// Handle the case `(exp...)`
		//
		
		if (token.name == 'parens_open') {
			token.name = 'functor';
			token.value = 'expr';
			token.prec = 0;
			token.is_operator = false;
		};

		if (this.context.diving_list && token.name == 'list:tail')
			continue;
		
		if (token.is_operator) {

			if (this.context.diving_functor && token.name == 'op:conj')
				continue;


			// If we are in a functor / list definition,
			//  we need to get rid of `op:conj` 
			if (this.context.diving_list) {
				
				if (token.name == 'op:conj') {
			
					var result = this._handleList();
					var new_index = result.index;
					
					this.index = new_index;
					
					var functor_node = new Functor('cons');
					functor_node.args = result.terms[0];
					functor_node.line = token.line;
					functor_node.col  = token.col;
					
					expression.push( functor_node );
					continue;			
					
				};
				
			};
			
			
			// Look ahead 1 more token
			//  in order to handle the `- -` etc. replacements
			token_next = this.tokens[this.index] || null;
						
			if (token_next && token_next.is_operator) {
				
				var maybe_replacement_opnode = ParserL2.compute_ops_replacement(token, token_next);
				if (maybe_replacement_opnode != null) {
					
					maybe_replacement_opnode.line = token.line;
					maybe_replacement_opnode.col  = token.col;
					
					expression.push( maybe_replacement_opnode );
					this.index = this.index + 1;
					continue;
				}
			};
			
		}; // token is_operator
		
		
		if (token.value == "+-" || token.value == "-+") {
			var opn = new OpNode("-", 500);
			opn.line = token.line;
			opn.col  = token.col;
			expression.push( opn );
			continue;
		};
		
		
		// We are removing at this layer
		//  because we might want to introduce directives
		//  at parser layer 1
		//
		if (token.name == 'comment')
			continue;
		
		if (token.name == 'newline')
			continue;
				
		if (token.name == 'parens_close') {
			
			// we don't need to keep the parens
			//expression.push( token );

			// Were we 1 level down accumulating 
			//  arguments for a functor ?
			if (this.context.diving_functor)
				return this._handleEnd( expression );
			
			continue;
		};

		if (token.name == 'list:close') {
			
			if (this.context.diving_list)
				return this._handleEnd( expression );
			
			continue;
		};

		
		
		// Should we be substituting an OpNode ?
		//
		if (token.is_operator) {
			
			var opn = new OpNode(token.value);
			opn.line = token.line;
			opn.col  = token.col;
			expression.push( opn );
			continue;
		};
		
		// Complete an expression, start the next
		if (token.name == 'period') {
			this.result.push( expression );
			expression = new Array();
			continue;
		};
		
		if (token.name == 'functor') {
			
			var result = this._handleFunctor();
			var new_index = result.index;
			
			// adjust our index
			this.index = new_index;
			
			var functor_node = new Functor(token.value);
			functor_node.args =  result.terms;
			functor_node.original_token = token;
			functor_node.line = token.line;
			functor_node.col  = token.col;
			
			expression.push( functor_node );
			continue;
		};
		
		// Handle list
		//
		if (token.name == 'list:open') {
			
			var result = this._handleList();
			var new_index = result.index;
			
			this.index = new_index;
			
			var functor_node = new Functor('cons');
			functor_node.args = result.terms[0];
			functor_node.line = token.line;
			functor_node.col  = token.col;
			
			expression.push( functor_node );
			continue;			
		};
		
		
		
		// default is to build the expression 
		//
		expression.push( token );
		
	}; // for
	
	// WE SHOULDN'T GET DOWN HERE
	
};// process

/**
 *  Handles the tokens related to a functor 'call'
 *  
 *   @return Result
 */
ParserL2.prototype._handleFunctor = function() {
	
	var parser_level_down = new ParserL2(this.tokens, 
										this.index,
										{diving_functor: true}
										);
	
	return parser_level_down.process();
};

/**
 *  Handles the tokens related to a list
 *  
 *   @return Result
 */
ParserL2.prototype._handleList = function() {
	
	var parser_level_down = new ParserL2(this.tokens, 
										this.index,
										{diving_list: true}
										);
	
	return parser_level_down.process();
};


ParserL2.prototype._handleEnd = function(current_expression) {
	
	if (current_expression.length != 0)
		this.result.push(current_expression);
	
	if (this.context.diving_functor)
		return new Result(current_expression, this.index);
	
	return new Result(this.result, this.index);
};

//
// =========================================================== PRIVATE
//



if (typeof module!= 'undefined') {
	module.exports.ParserL2 = ParserL2;
};

/**
 *  Parser
 *  
 *  @constructor
 *  
 *  @param expression_list: the list of expressions
 *  @param operators_list : the precedence ordered list of operators
 *  @param maybe_context
 */
function ParserL3(expressions, operators_list, maybe_context) {
	
	this.op_list = operators_list;
	this.expressions = expressions;
};

/**
 * Process the expression list
 *
 * - Order operator list from least to highest precedence
 * - For each operator,
 *
 * @return [result]
 */
ParserL3.prototype.process = function(){

	var result = [];
	
	for (var op_index in this.op_list) {
		var opcode = this.op_list[op_index]; 
		
		for (var index=0; index < (this.expressions).length; index++) {
						
			// go around doing object deep copy
			//
			var expression = result[index] || this.expressions[index];
			
			var r = ParserL3.process_expression(opcode, expression);
			result[index] = r;
		};
		
	};// ops
	
	return result;
	
};// process

/**
 *  @return [terms]
 */
ParserL3.process_expression = function(opcode, expression){

	var result;

	for(;;) {

		// Let's bypass the need to perform
		//  deep copy of objects
		//
		var expr = result || expression; 
	
		var tresult = ParserL3._process_expression(opcode, expr);
		var current_count_of_opnodes_processed = tresult[1];
		
		result = tresult[0];
		
		// we didn't make any progress... bail out
		//
		if (current_count_of_opnodes_processed == 0)
			break;
		
	}; //for;;
	
	return result;
	
};


ParserL3._process_expression = function(opcode, expression){
	
	var result = [];
	var processed_nodes = 0;
	
	for (var node_index=0; node_index < expression.length; node_index++) {
		
		var node = expression[node_index];
			
		// The recursion case first of course
		if (node instanceof Functor) {
			var exp_from_args = node.args;
			var fresult = ParserL3.process_expression(opcode, exp_from_args);
			node.args = fresult; 
		};
		
		if (!(node instanceof OpNode)) {
			result.push(node);
			continue;
		};
			
		
		// Is it the sort of operator we are
		//  interested in at this point?
		
		if (opcode.symbol != node.symbol) {
			result.push(node);
			continue;
		};
		
		
		// We need to get the proper precedence
		//  for the operator we which to be processing for
		//
		// The unary operators come with `null` as precedence
		//  because the parser needs to figure out if it's really
		//  used in the unary or infix context.
		//
		var opnode_center = OpNode.create_from_name(opcode.name);

		
		// gather 'node left' and 'node right'
		//
		// If `node_left` is undefined, it is marked as `` in the type
		//
		// We use the `result` array because we are replacing `in place`
		//  the nodes of the expression.
		//
		var node_left  = result[node_index - 1 ];
		var node_right = expression[node_index + 1 ];
		
		
		// A good dose of complexity goes on here
		//
		var type   = Op.classify_triplet(node_left, opnode_center, node_right);
		var compat = Op.are_compatible_types(type, opcode.type);
		
		if (!compat) {
			result.push(node);
			continue;
		};

		
		processed_nodes++;
		
		// We have compatibility and thus
		//  substitute for a Functor
		// We only have 2 cases:
		//  pattern 1:  `F_`  : a unary operator
		//  pattern 2:  `_F_` : a infix operator
		
		var functor = new Functor(opcode.name);
		functor.col = node.col;
		functor.line = node.line;
		
		if (Op.is_unary(opcode.type)) {
			functor.args = [node_right];
		} else {
			// we've already pushed node_left... remove it
			result.pop();
			functor.args = [node_left, node_right];
		};

		result.push(functor);
		node_index++;			

	}; // expression	
	
	return [result, processed_nodes];
};

//
// =========================================================== PRIVATE
//



if (typeof module!= 'undefined') {
	module.exports.ParserL3 = ParserL3;
};

function Utils() {};

/**
 * Compare Objects
 * 
 * @param expected
 * @param input
 * 
 * @returns Boolean
 */
Utils.compare_objects = function(expected, input, use_throw){
	
	// ARRAY
	//
	if (expected instanceof Array) {
		
		if (!(input instanceof Array)) {
			if (use_throw)
				throw new Error("Expecting an array");
			
			return false;
		};
			
		
		if (input.length != expected.length) {
			if (use_throw)
				throw new Error("Expecting arrays of same arity");
			return false;
		};
			
		
		for (var index = 0; index<expected.length; index++)
			if (!Utils.compare_objects(expected[index], input[index], use_throw))
				return false;
		
		return true;
	};
	
	// Shortcut
	//
	if (expected === input)
		return true;
	
	
	/*
	 *  Check if we are dealing with the case
	 *   where we have a string representation
	 *   of a function
	 */
	if ((typeof input == 'function') || typeof expected == 'string'){
		
		if (input.inspect) {
			var repr = input.inspect();
			
			//console.log("CHECK, input    repr: ", repr);
			//console.log("CHECK, expected repr: ", expected);
			
			if (repr == expected)
				return true;

			// Trim leading and trailing spaces
			repr = repr.replace(/^\s+|\s+$/g,'');

			if (repr == expected)
				return true;
			
		};
		
	};
	
	
	if (expected && expected.inspect) {
		if (input && !input.inspect) {
			if (use_throw)
				throw new Error("Expecting 'inspect' method on: " + JSON.stringify(input));
			return false;
		}
		
		//console.log("Comparing: expected: ", expected);
		//console.log("Comparing: input:    ", input);
		
		if (expected.inspect() != input.inspect() ) {
			if (use_throw)
				throw new Error("Expecting match using inspect: " + JSON.stringify(expected));
			return false;
		};

	}
	
	
	
	if (typeof expected == 'object') {
		
		if (typeof input != 'object') {
			if (use_throw)
				throw new Error("Expecting "+JSON.stringify(expected)+" object, got: "+JSON.stringify(input));
			return false;
		}
		
		for (var key in expected) {
			
			var e = expected[key];
			var i = input[key];

			if (e == i)
				continue;
			
			if (!e || !i) {
				if (use_throw)
					throw new Error("Expected/Input got undefined: e="+JSON.stringify(e)+", i:"+JSON.stringify(i));
				return false;
			};
				
			
			if (e.hasOwnProperty(key) !== i.hasOwnProperty(key)) {
				if (use_throw)
					throw new Error("Expecting property: " + key);
				
				return false;
			}
			
			if (!Utils.compare_objects(e, i))
				return false;
						
		};// all object keys
		
		return true;
	};// object

	//console.log("Comparing: expected: ", expected);
	//console.log("Comparing: input:    ", JSON.stringify(input));
	
	if (use_throw)
		throw new Error("Unsupported check, expected: " + JSON.stringify(expected));
	
	return false;
};//compare_objects


if (typeof module!= 'undefined') {
	module.exports.Utils = Utils;
};


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

//============================================================================== VISITOR2

function Visitor2(exp) {
	this.exp = exp;
	this.cb = null;
};

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
		};
		
	};// for args
	
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
};

Visitor3.prototype.process = function(callback) {
	this.cb = callback;
	this._process(this.exp);
};

Visitor3.prototype._process = function(node, vc) {

	var is_root = vc == undefined;
	vc = vc || 0;
	
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
		
		// vc == 0
		//
		if (is_root)
			return this.cb({type: 'root', vc:vc }, { n: node }, null);
		
		return { vc: vc, n: node, is_junction: false };
	};
		
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
	
	delete lctx.is_junction
	delete rctx.is_junction

	
	this.cb({type: node.name, vc:vc, root: is_root}, lctx, rctx);
	
	return { vc: rctx.vc, is_junction: true };
};




if (typeof module!= 'undefined') {
	module.exports.Visitor = Visitor;
	module.exports.Visitor2 = Visitor2;
	module.exports.Visitor3 = Visitor3;
};

