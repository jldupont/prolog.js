/*! prolog.js - v0.0.1 - 2015-09-26 */

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
Token.inspect_compact = false;

Token.prototype.inspect = function(){
	
	if (Token.inspect_compact)
		return this.value;
	
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
			//console.log("match fail: "+JSON.stringify(input_token));
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

	// Used in the context of the interpreter
	// ======================================
	// Target Arity
	this.arity = null;
	
};

Functor.prototype.get_arity = function() {
	return this.arity || this.args.length;
};

Functor.prototype.get_name = function(){
	return this.name;
};

Functor.inspect_compact_version = false;
Functor.inspect_short_version = false;
Functor.inspect_quoted = false;

Functor.prototype.inspect = function(){
	
	var result = "";
	
	var arity = this.arity || this.args.length;
	
	if (Functor.inspect_compact_version) {
		var fargs = this.format_args(this.args);
		result = this.name+"("+fargs+")";
		
	} else {
		
		if (Functor.inspect_short_version)
			result = "Functor("+this.name+"/"+arity+")";
		else {
			var fargs = this.format_args(this.args);
			result = "Functor("+this.name+"/"+arity+","+fargs+")";
		}
		
	}; 
	
	
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
	return this.args[index];
};



/**
 *  Var constructor
 *  
 *  For anonymous variables (start with `_`),
 *   the name is built with the `globally` unique
 *   id.  This is to support variable trailing
 *   correctly.  Furthermore, the name is 
 *   constructed in such a way that it is invalid
 *   from an prolog syntax point of view: this
 *   prevents introspection from the prolog code
 *   and thus limits potential namespace collision
 *   and security issues.
 */
function Var(name) {
	
	this.is_anon = (name[0] == '_');
	this.prec = 0;
	this.name = name;
	this.col = null;
	this.line = null;
	
	this.value = null;
	
	this.id = Var.counter++;
	
	if (this.name[0] == "_")
		this.name = this.name+"$"+this.id;
	
	//console.log(".............. CREATED: ", name, this.name, this.is_anon);
};

Var.counter = 0;
Var.inspect_extended = false;
Var.inspect_compact = false;

Var.prototype.inspect = function(depth){
	
	// Keep the anon name as it was
	//  requested during Var creation:
	//  this enable much simpler test case
	//  crafting and evaluation.
	//
	var name = this.is_anon ? "_" : this.name;
	
	depth = depth || 0;
	
	if (depth == 5)
		return "?CYCLE?";
	
	if (this.value) {
		
		var value = this.value.inspect? this.value.inspect(depth+1) : this.value;
		
		if (Var.inspect_compact) {
			return value;
		} else {
			if (Var.inspect_extended)
				return "Var("+name+", "+value+"){"+this.id+"}";
			else
				return "Var("+name+", "+value+")";
		};
		
	};
		
	if (Var.inspect_compact) {
		return "_"; 
	} else
		if (Var.inspect_extended)
			return "Var("+name+"){"+this.id+"}";
		else
			return "Var("+name+")";
};

Var.prototype.bind = function(value, on_bind) {
	
	if (this == value)
		throw new Error("Attempt to create cycle ...");
	
	if (value == null)
		throw new ErrorInvalidValue("Var("+this.name+"), attempted to bind 'null'");
	
	if (this.value != null)
		throw new ErrorAlreadyBound("Already Bound: Var("+this.name+")");
	
	if (on_bind) {
		on_bind(this);
	} 
		
	this.value = value;
};

Var.prototype.is_bound = function(){
	return this.value != null;
};

Var.prototype.unbind = function(){
	return this.value = null;
};

Var.prototype.get_value = function() {

	if (this.value == null)
		throw new ErrorNotBound("Not Bound: Var("+this.name+")");

	return this.value;
};

/**
 *   Var(X, Var(Y, Var(Z, 666) ) ) ==> Var(X, 666)
 * 
 *   Check for cycles
 *   
 */
Var.prototype.deref = function(check){

	if (check && check == this)
		return null;
		
	if (this.value instanceof Var) {
		
		if (this.value.is_bound())
			return this.value.deref(check);	
		else {
			
			if (check && check == this.value)
				return null;
			
			return this.value;
		}
	}
	return this;
};

/**
 * A safe version of bind
 * 
 * Check for cycles
 * 
 * @param to
 */
Var.prototype.safe_bind = function(to, on_bind) {
	
	var dvar, tvar;
	var to_is_var = to instanceof Var;
	
	var dvar = this.deref(to);
	if (dvar == null) {
		console.log("!!!!!!!!!! CYCLE AVERTED! ", this);
		return;
	};
	
	if (to instanceof Var) {
		tvar = to.deref(this);
		if (tvar == null) {
			console.log("!!!!!!!!!!! CYCLE AVERTED!", to);
			return;
		};
	} else
		tvar = to;
	
	if (dvar == tvar) {
		console.log("!!!!!!!!!!! CYCLE AVERTED!", to);
		return;
	};

	dvar.bind(tvar, on_bind);
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

Instruction.prototype.get = function(param, maybe_prefix) {
	if (maybe_prefix)
		return maybe_prefix + this.ctx[param];
	return this.ctx[param];
};

Instruction.prototype.get_parameter_name = function(){
	if (!this.ctx)
		return null;
	
	return this.ctx.p ? this.ctx.p : (this.ctx.x ? "$x" + this.ctx.x : null);
};

Instruction.prototype.inspect = function(){
	
	const params = [ 'p', 'x' ];
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

function ErrorExpectingFunctor(msg, _args) {
	this.message = msg;
	this.args = _args;
};
ErrorExpectingFunctor.prototype = Error.prototype;

function ErrorFunctorNotFound(msg, _args) {
	this.message = msg;
	this.args = _args;
};
ErrorFunctorNotFound.prototype = Error.prototype;

function ErrorFunctorClauseNotFound(msg, _args) {
	this.message = msg;
	this.args = _args;
};
ErrorFunctorClauseNotFound.prototype = Error.prototype;

function ErrorFunctorCodeNotFound(msg, _args) {
	this.message = msg;
	this.args = _args;
};
ErrorFunctorCodeNotFound.prototype = Error.prototype;


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

function ErrorInternal(msg) {
	this.message = msg;
};
ErrorInternal.prototype = Error.prototype;

function ErrorInvalidValue(msg) {
	this.message = msg;
};
ErrorInvalidValue.prototype = Error.prototype;

function ErrorAlreadyBound(msg) {
	this.message = msg;
};
ErrorAlreadyBound.prototype = Error.prototype;

function ErrorNotBound(msg) {
	this.message = msg;
};
ErrorNotBound.prototype = Error.prototype;

function ErrorExpectingListStart(msg) {
	this.message = msg;
};
ErrorExpectingListStart.prototype = Error.prototype;

function ErrorExpectingListEnd(msg) {
	this.message = msg;
};
ErrorExpectingListEnd.prototype = Error.prototype;

function ErrorSyntax(msg, type) {
	this.message = msg;
	this.type = type;
};
ErrorSyntax.prototype = Error.prototype;


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
	module.exports.ErrorFunctorNotFound = ErrorFunctorNotFound;
	module.exports.ErrorFunctorClauseNotFound = ErrorFunctorClauseNotFound;
	module.exports.ErrorFunctorCodeNotFound = ErrorFunctorCodeNotFound;
	module.exports.ErrorInternal = ErrorInternal;
	module.exports.ErrorAlreadyBound = ErrorAlreadyBound;
	module.exports.ErrorNotBound = ErrorNotBound;
	module.exports.ErrorSyntax = ErrorSyntax;
	
	module.exports.ErrorExpectingListStart = ErrorExpectingListStart;
	module.exports.ErrorExpectingListEnd = ErrorExpectingListEnd;
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
 * @raise ErrorExpectingFunctor
 * 
 * @return Object: compiled code
 */
Compiler.prototype.process_rule_or_fact = function(exp) {
	
	if (!(exp instanceof Functor))
		throw new ErrorExpectingFunctor("Expecting Functor, got: "+JSON.stringify(exp));
	
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
	
	result['head'] = this.process_head(head, with_body);
	
	var head_vars = result.head.vars;

	var body_code  = this.process_body(body, not_query, head_vars);
	
	// I know this is ugly but we had to process
	//  the head first in order to retrieve the vars.
	for (var label in body_code)
		result[label] = body_code[label];
	
	result['f'] = head.name;
	result['a'] = head.args.length;
	
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
		throw new ErrorExpectingFunctor();
	
	// Of course we can't be seeing conjunctions or disjunctions
	//  in the head of a rule.
	//
	if (exp.name == 'conj' || (exp.name == 'disj'))
		throw new ErrorInvalidHead();
	
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
				
			};
			
		};
		
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
			
			var first_time = (vars[ctx.n.name] == undefined);
			var at_root = ctx.root_param;
			
			if (first_time && at_root) {
				result.push(new Instruction("get_var", {p:ctx.n.name}));
			};
			
			if (first_time && !at_root) {
				if (ctx.n.name[0] == "_")
					result.push(new Instruction("unif_void"));
				else
					result.push(new Instruction("unif_var", {p:ctx.n.name}));
			};
			
			if (!first_time && at_root) {
				result.push(new Instruction("get_value", {p:ctx.n.name}));
			};
			
			if (!first_time && !at_root) {
				result.push(new Instruction("unif_value", {p:ctx.n.name}));
			};

			// not the first time anymore...
			vars[ctx.n.name] = true;
						
			return;			
		};
		
		if (ctx.n instanceof Token) {
			
			if (ctx.n.name == 'nil') {
				result.push(new Instruction('unif_nil'));
				return;
			};
			
			if (ctx.n.name == 'term') {
				
				if (ctx.root_param)
					result.push(new Instruction('get_term', { p: ctx.n.value }));
				else
					result.push(new Instruction('unify_term', { p: ctx.n.value }));
				return;
			};
				
			if (ctx.n.name == 'number') {
				if (ctx.root_param)
					result.push(new Instruction('get_number', { p: ctx.n.value }));
				else
					result.push(new Instruction('unify_number', { p: ctx.n.value }));
				return;
			};
			
		};// If Token
		
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
		throw new ErrorExpectingFunctor();
	
	if (exp.name == 'rule')
		throw new ErrorRuleInQuestion();
	
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
 *   @raise
 */
Compiler.prototype.process_body = function(exp, is_query, head_vars) {
	
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

		/*
		if (show_debug) {
			console.log("jctx: ", jctx);
			console.log("lctx: ", left_or_root);
			console.log("rctx: ", right_maybe, "\n");
		};
		*/
		
		
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
			
			result[label] = that.process_goal( ctx.n, is_query, head_vars );
			return;
		}
		
		/*
		 *   Cases:
		 *     left:  node | goal ref
		 *     right: node | goal ref
		 *     
		 *     type:  conj | disj
		 */
		
		var lcode = that.process_goal(left_or_root.n, is_query, head_vars);
		var rcode = that.process_goal(right_maybe.n, is_query, head_vars);

		
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
Compiler.prototype.process_goal = function(exp, is_query, head_vars) {
	
	head_vars = head_vars || {};
	
	if (exp == undefined)
		return undefined;
	
	var v = new Visitor2(exp);
	
	var results = [];

	results.push(new Instruction('allocate'));
	
	v.process(function(ctx){
		
		var struct_ctx = { f: ctx.n.name, a:ctx.n.args.length , x: ctx.vc };
		
		if (ctx.root) {
			struct_ctx.x = 0;
		};
		
		results.push(new Instruction("put_struct", struct_ctx));
		
		for (var index=0; index<ctx.args.length; index++) {
			
			var n = ctx.args[index];
			
			if (n instanceof Var) {
				if (n.name[0] == "_")
					results.push(new Instruction("put_void"));
				else
					if (head_vars[n.name] || is_query)
						results.push(new Instruction("put_var", {p: n.name}));
					else 
						results.push(new Instruction("unif_var", {p: n.name}));
			};

			if (n instanceof Value) {
				results.push(new Instruction("put_value", {x: n.name}));
			};
			
			if (n instanceof Token) {
				if (n.name == 'number')
					results.push(new Instruction("put_number", {p: n.value}));
				
				if (n.name == 'term')
					results.push(new Instruction("put_term", {p: n.value}));
				
				if (n.name == 'nil')
					results.push(new Instruction("put_nil"));
			};
			
		};//for
		
		// Only root functor gets a CALL
		//
		if (ctx.root) {
			results.push(new Instruction('setup'));
			results.push(new Instruction('call'));
			results.push(new Instruction('maybe_retry'));
			results.push(new Instruction('deallocate'));
			
			if (is_query)
				results.push(new Instruction('end'));
			else
				results.push(new Instruction('proceed'));
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
Database.prototype.insert = function(root_nodes){

	if (!(root_nodes instanceof Array))
		root_nodes = [root_nodes];
	
	for (var index in root_nodes) {
		this._insert(root_nodes[index]);
	}

};

Database.prototype._insert = function(root_node){

	var functor_signature = this.al.compute_signature(root_node);
	
	var maybe_entries = this.db[functor_signature] || [];
	maybe_entries.push(root_node);
	
	this.db[functor_signature] = maybe_entries;
	
	return functor_signature;
};


Database.prototype.batch_insert_code = function(codes) {

	if (!(codes instanceof Array))
		codes = [codes];
	
	for (var index in codes) {
		var code_object = codes[index];
		var f = code_object.f;
		var a = code_object.a;
		
		this.insert_code(f, a, code_object);
	};

};

Database.prototype.insert_code = function(functor, arity, code) {
	
	var functor_signature = this.al.compute_signature([functor, arity]);

	var maybe_entries = this.db[functor_signature] || [];
	maybe_entries.push(code);
	
	this.db[functor_signature] = maybe_entries;
};

Database.prototype.get_code = function(functor, arity) {
	
	var functor_signature = this.al.compute_signature([functor, arity]);

	var maybe_entries = this.db[functor_signature] || [];

	return maybe_entries;
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
	
	if (input instanceof Array) {
		var fname = input[0];
		var arity = input[1];
		
		return fname+"/"+arity;
	};
	
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
	
	this.tracer = null;
	this.reached_end_question = false;
	
};

Interpreter.prototype.get_stack = function(){
	return this.stack;
};

Interpreter.prototype.set_tracer = function(tracer) {
	this.tracer = tracer;
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
	if (!(question_code instanceof Array))
		this.db.insert_code(".q.", 0, question_code);
	else
		this.db.insert_code(".q.", 0, question_code[0]);
	
	/*
	 *  Interpreter Context
	 */
	this.ctx = {

		step_counter: 0
			
		// The current instruction pointer
		//
		,p: { 
			f:  ".q.",  // which functor in the database
			a:  0,      // arity
			ci: 0,      // clause index
			ct: 1,      // Total number of clause
			l:  'g0',   // which label
			i:  0       // and finally which index in the label entry
			}
	
		// The current code inside functor:label pointed to by 'p'
		//
		,cc: null

		/*
		 *   Related to `CALL` setup
		 * 
		 *   cv: the structure being built with
		 *       `put_struct`, `put_var`, `put_term`, `put_number` and `put_value`
		 * 
		 */
		,cv: null
		
		/*  Related to `HEAD` Processing
		 * 
		 *   csx:  The current local variable being used to deconstruct
		 *          in the `head` functor.
		 * 
		 *   cs:   The current structure being worked on
		 *         This is retrieved through the "get_struct" instruction.
		 *       
		 *   csi:  The current index in the arguments of `cs`.
		 *         We need this index pointer because we can't be
		 *         destructively `popping` the arguments from the structure.
		 *         This should not be confused with the parent's `head functor` arguments.
		 *         
		 *   csm:  The current mode, either "r" or "w".
		 *   
		 */
		,cs:  null
		,csx: null   
		,csi: 0     
		,csm: 'r'   
		
		/*
		 *  Current unification status
		 */
		,cu: true
		
		/*  Top of stack environment
		 *   i.e. the latest 'allocated'
		 */
		,tse: {}
		
		/*  Current Environment
		 * 
		 */
		,cse: {}

		/*
		 *  `end` instruction encountered
		 */
		,end: false
	};
	
	this.stack = [];
	
	/*   Initialize top of stack
	 *    to point to question in the database
	 *    
	 *   The definitions contained herein
	 *    apply to all environment stack frames.
	 */
	qenv = {

		qenv: true

		/*  Continuation Point
		 *    Used to return from a 'call' 
		 *    
		 *    Uses the same format as 'p'
		 *    but also 'ce' added (continuation environment) 
		 */
		,cp: {}
		
		,vars: {}
	
		/*  Trail
		 */
		,trail: []


		,ci: 0 // Clause Index
		
		// Total number of clauses for the current functor
		,ct: 0

		// TRY_ELSE continuation
		,te: null
		
		/*  Related to building a structure for a CALL instruction
		 */
		,cv: null  // the name of variable where to find the structure being built
		
	};//
	
	// The question's environment
	//
	this.stack.push(qenv);
	this.ctx.cse = qenv;

	// No `call` construction is in progress of course!
	this.ctx.tse = null;
	
	// Prime the whole thing
	this._execute();
};

/**
 *  Backtrack
 *  
 *  @return true  : can backtrack
 *  @return false : can not backtrack (e.g. end of choice points) 
 */
Interpreter.prototype.backtrack = function() {
	
	if (this.tracer)
		this.tracer("backtracking", this.ctx);
	
	
	// Pretend we've got a failure
	//  but in most cases this will anyhow be the case...
	this.ctx.cu = false;
	this.ctx.end = false;
	
	// We are at the top of the stack
	if (this.ctx.tse.qenv)
		return false;
	
	this._restore_continuation( this.ctx.tse.cp );
	this._execute();
	
	return true;
};


/**
 * Take 1 processing step
 * 
 * @return true | false : where 'true' means 'end'
 * 
 * @raise ErrorNoMoreInstruction
 * @raise ErrorInvalidInstruction
 */
Interpreter.prototype.step = function() {

	if (this.ctx.end)
		return true;
	
	this.ctx.step_counter++;
	
	var inst = this.fetch_next_instruction();
	
	var fnc_name = "inst_" + inst.opcode;
	
	var fnc = this[fnc_name];
	if (!fnc)
		throw new ErrorInvalidInstruction(inst.opcode);

	if (this.tracer) {
		this.tracer('before_inst', this, inst);
		this[fnc_name].apply(this, [inst]);
		this.tracer('after_inst', this, inst);
	} else {
		// Execute the instruction
		this[fnc_name].apply(this, [inst]);	
	};
	
	return this.ctx.end;
	
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
	
	//console.log("fetch: ", this.ctx.p.f+"/"+this.ctx.p.a, this.ctx.p.l, this.ctx.p.i);
	
	// Just try fetching next instruction from env.cc
	var inst = this.ctx.cc[this.ctx.p.l][this.ctx.p.i];
	
	this.ctx.p.i++;
	
	if (inst)
		return inst;
	
	// A jump should have occurred in the code anyways
	//
	throw new ErrorNoMoreInstruction("No More Instruction");
};

/**
 *  Get Functor code
 * 
 * @param ctx.f  : functor_name
 * @param ctx.a  : arity
 * @param ctx.ci : clause_index
 * 
 * @raise ErrorFunctorNotFound
 * @raise ErrorFunctorClauseNotFound
 * 
 * @return ctx with additionally { cc: code, ct: clauses_count }
 */
Interpreter.prototype._get_code = function(functor_name, arity, clause_index) {
	
	//console.log(">>> GET CODE: ", functor_name+"/"+arity, clause_index, " clause: ",clause_index);
	
	var result = {};
	
	var clauses;
	var clauses_count;
	
	try {
		clauses = this.db.get_code(functor_name, arity);
		result.ct = clauses.length;
	} catch(e) {
		throw new ErrorFunctorNotFound("Functor not found: "+functor_name+"/"+arity);
	};
	
	if (clause_index >= result.ct) {
		throw new ErrorFunctorClauseNotFound("Functor clause not found: "+functor_name+"/"+arity);
	};
	
	result.cc = clauses[clause_index];
	
	if (!result.cc)
		return ErrorFunctorCodeNotFound("Functor clause code not found: "+functor_name+"/"+arity);
	
	//console.log(">>> GOT CODE: ", functor_name+"/"+arity, clause_index, " clause: ",clause_index, " CODE: ", result);
	//console.log(">>> GOT CODE: ", functor_name+"/"+arity, clause_index, " clause: ",clause_index);
	
	return result;
	
};//_get_code


/**
 *  Jump to a specific code instruction in the database
 * 
 * @param ctx.f  : functor name
 * @param ctx.a  : functor arity
 * @param ctx.ci : clause index
 * @param ctx.l  : clause label
 * @param ctx.i  : clause label instruction index
 * 
 * @raise ErrorFunctorNotFound, ErrorFunctorCodeNotFound, ErrorFunctorClauseNotFound
 */
Interpreter.prototype._execute = function( ctx ){

	var result = {};
	
	if (ctx) {
		/*
		 *  If input `ctx` is specified,
		 *   it is in the case of a `call` instruction.
		 *   Thus, we are transferring the control flow
		 *   to the beginning of the `head` 
		 *   of the functor specified.
		 */
		
		result = this._get_code(ctx.f, ctx.a, ctx.ci);
		
		this.ctx.p.f  = ctx.f;
		this.ctx.p.a  = ctx.a;
		this.ctx.p.ci = ctx.ci
		this.ctx.p.i = 0;

		this.ctx.cc   = result.cc;
		this.ctx.p.ct = result.ct;
		
	}
	else {
		/*
		 *  In the following case, we are either 
		 *  -- `retrying`
		 *  -- `backtracking`
		 */
		
		result = this._get_code(this.ctx.p.f, this.ctx.p.a, this.ctx.p.ci);
		this.ctx.cc = result.cc;
	}

	// ctx.cc  now contains the code for the specified clause
	//          for the specified functor/arity
	
	/*
	 *  We either have a `fact` (head, no body)
	 *  or a `rule`  (head & body).
	 *  
	 *  Just having `g0` would mean a `query`.
	 */

	if (ctx) {
		this.ctx.p.l = ctx.l || 'head';	
	}
	
	if (this.tracer)
		this.tracer("execute", this.ctx);
	
	return result;
};

Interpreter.prototype._restore_continuation = function(from) {
	
	if (this.tracer)
		this.tracer("restore", from);
	
	this.ctx.cse  = from.ce;
	this.ctx.te   = from.te;
	this.ctx.p.f  = from.p.f;
	this.ctx.p.a  = from.p.a;
	this.ctx.p.ci = from.p.ci;
	this.ctx.p.ct = from.p.ct;
	this.ctx.p.l  = from.p.l;
	this.ctx.p.i  = from.p.i;

};



Interpreter.prototype._save_continuation = function(where, instruction_offset) {
	
	where.p = {};
	
	where.ce   = this.ctx.cse;
	where.te   = this.ctx.te;
	where.p.f  = this.ctx.p.f;
	where.p.a  = this.ctx.p.a;
	where.p.ci = this.ctx.p.ci;
	where.p.ct = this.ctx.p.ct;
	where.p.l  = this.ctx.p.l;
	where.p.i  = this.ctx.p.i + (instruction_offset || 0);
	
	if (this.tracer)
		this.tracer("save", where);
};

Interpreter.prototype._add_to_trail = function(which_trail, what_var) {
	
	var vtrail_name = what_var.name;
	which_trail[vtrail_name] = what_var;
};


Interpreter.prototype.maybe_add_to_trail = function(which_trail, what_var) {
	
	// We only add unbound variables of course
	var dvar = what_var.deref();
	if (dvar.is_bound())
		return;
	
	var vtrail_name = dvar.name
	which_trail[vtrail_name] = dvar;
	
	//console.log("| TRAILED: ", dvar.name, dvar.id);
};


/**
 *  Unwind Trail
 * 
 *  Note that we can't remove elements from the
 *   trail because this one is created during the
 *   `setup` phase yielding to the `call` and won't
 *   be revisited during the possible 
 *   subsequent `retry` phase(s).
 *   
 *   Thus, the trail must exist for as long as the
 *    choice point is kept.
 *    
 * 
 * @param which
 */
Interpreter.prototype._unwind_trail = function(which) {
	
	for (var v in which) {
		var trail_var = which[v];
		
		/*
		 *  We don't deref because the variable
		 *   could have been bound to another one
		 *   which is not bound itself (a chain).
		 */
		
		if (!trail_var.is_bound())
			continue;
		
		trail_var.unbind();
		
		//console.log("> TRAIL UNBOUND: ", trail_var.name);
	};
	
	// Next time around, we might have a different clause
	//  with different variables ... so do some cleanup!
	which = {};

};


Interpreter.prototype.get_query_vars = function() {
	return this.ctx.cse.vars;
};


//
//
// ================================================================================= INSTRUCTIONS
//
//

/**
 *  Instruction "end"
 * 
 * 
 *  Saves Continuation Point to point
 *   at the "maybe retry" following the `call` instruction
 * 
 */
Interpreter.prototype.inst_end = function() {
	this.ctx.end = true;
};

/**
 *  Instruction "setup"
 * 
 * 
 *  Saves Continuation Point to point
 *   at the "maybe retry" following the `call` instruction
 * 
 */
Interpreter.prototype.inst_setup = function() {
	
	// We only need an offset of 1 
	//  because the `fetch instruction` increments
	//  already by 1.
	//
	this._save_continuation(this.ctx.tse.cp, 1);
	
	// Initialize the clause index
	//
	this.ctx.tse.p.ci = this.ctx.tse.p.ci || 0;
	
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
	
	/*
	 * Clean-up target variables
	 *  We used some variables to construct
	 *  the main structure at $x0 but we need
	 *  to get rid of these or else the target
	 *  functor might unify with values it shouldn't.
	 */
	var x0 = this.ctx.tse.vars['$x0'];
	this.ctx.tse.vars = {};
	this.ctx.tse.vars['$x0'] = x0;
	
	// I know it's pessimistic
	this.ctx.cu = false
	
	// Get ready for `head` related instructions
	this.ctx.cs = null;
	this.ctx.csx = null;
	this.ctx.csm = 'r';
	this.ctx.csi = 0;
	
	
	// Get functor name & arity from the 
	//  environment variable x0
	
	var fname = x0.name;
	var arity = x0.args.length;
	
	/*  Takes care of
	 *  - label `l` component
	 *  - current code `cc`
	 *  - instruction pointer `i` inside label
	 */  

	var result = this._execute({
		 f:  fname
		,a:  arity
		,ci: this.ctx.tse.p.ci
	});
	
	this.ctx.tse.p.ct = result.ct;
	
	//  Make the jump in the target environment
	//
	this.ctx.cse = this.ctx.tse;
	
	// We got this far... so everything is good
	this.ctx.cu = true;
	
}; // CALL


/**
 *   Instruction "maybe_retry"
 * 
 *   When used, this instruction **must** 
 *     always follow a 'CALL' instruction.
 * 
 *   Used to retry the preceding 'CALL' if a failure occurred.
 *   
 *   * Increment clause index
 *   * IF the clause index == # of clauses ==> failure
 *   * ELSE
 *   *   p--, p--
 * 
 */
Interpreter.prototype.inst_maybe_retry = function() {
	
	// A 'noop' if there isn't a failure reported
	//
	if (this.ctx.cu)
		return;

	/*  Whatever happens after, we anyways need
	 *   to unwind the trail before attempting anything else.
	 * 
	 */
	this._unwind_trail( this.ctx.tse.trail );
	
	this.ctx.tse.p.ci ++;

	/*
	 *  The Choice Point context is kept on the top of stack `tse`
	 */
	if (this.ctx.tse.p.ci < this.ctx.tse.p.ct) {
		
		/* We can try the next clause
		 * 
		    The fetch function will have incremented the
		    instruction pointer past this instruction
		    so we need to subtract 2 to get it pointing
		    back to the 'CALL' instruction.
		
			The `backtrack` step will have already
			loaded the code, we just have to cause a
			`jump` by manipulating `i` directly.
		*/
		this.ctx.p.i -= 2;
	};

	// ELSE:  the following `deallocate` will get rid of the
	//        environment from the stack
	
};


/**
 *   Instruction "allocate"
 *   
 *   Denotes beginning of a "choice point" code block
 *   
 *   Create an environment for this choice point and
 *    and push a link in the current environment.
 */
Interpreter.prototype.inst_allocate = function() {
	
	var env = { vars: {}, cp: {}, trail: {}, p:{} , spos: this.stack.length };
	this.ctx.tse = env;
	this.stack.push(env);
};

/**
 *   Instruction "deallocate"
 * 
 *   Deallocates, if possible, a "choice point" environment.
 * 
 *   Cases:
 *   - Choice Point succeeds : do not deallocate environment   
 *   - No Choice Point left
 */
Interpreter.prototype.inst_deallocate = function() {

	/*
	 * Cannot deallocate if we have had
	 *  a successful choice point
	 */
	if (this.ctx.cu)
		return;

	/*
	 *  We've got valuable information here!
	 * 
	 */
	this._unwind_trail( this.ctx.tse.trail );
	
	/*
	 *  The previous choice point list is exhausted.
	 *  There is no use keeping the context.
	 */
	this._deallocate();
};

Interpreter.prototype._deallocate = function(){
	
	this.stack.pop();
	
	// tse goes back to top of stack
	this.ctx.tse = this.stack[ this.stack.length-1 ];
};

/**
 *   Instruction "maybe_fail"
 *   
 *   Used to 'fail' the goal if the result
 *    of the preceding 'CALL' failed.
 *  
 *  
 *   IF a goal was loaded by a 'try_else' instruction,
 *     JUMP to this goal.
 *     
 *   ELSE jump to continuation point.
 *   
 */
Interpreter.prototype.inst_maybe_fail = function() {
	
	// NOOP if we are not faced with a failure
	if (this.ctx.cu)
		return;

	// A disjunction is available?
	//
	if (this.ctx.cse.te) {
		
		this._goto( this.ctx.cse.te );
		
		// just making sure
		this.ctx.cse.te = null;
		
		return;
	};
	
	this.backtrack();
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
Interpreter.prototype.inst_try_else = function( inst ) {
	
	var vname = "g" + inst.get("p");
	this.ctx.cse.te = vname;
};

/**
 *   Instruction "try_finally"
 * 
 *   Last goal of a disjunction   
 */
Interpreter.prototype.inst_try_finally = function( ) {
	
	this.ctx.cse.te = null;
};


/**
 *   Instruction  "jump"
 * 
 *   Used to jump between labels within a clause
 * 
 */
Interpreter.prototype.inst_jump = function( inst ) {
	
	var vname = inst.get("p");
	
	// Within same functor (i.e. clause)
	this.ctx.p.l = vname;
	this.ctx.p.i = 0;
	
};



/**
 *   Instruction 'proceed'
 *   
 *   Look Continuation Point in `p`
 *   
 */
Interpreter.prototype.inst_proceed = function() {
	
	if (this.ctx.cu) {
		this._restore_continuation( this.ctx.cse.cp );
		this._execute();
		return;
	};
	
	this.backtrack();
};


//=========================================================================== CALL




/**
 *   Instruction "put_struct $f $a $x"
 * 
 *   Used to construct a structure $f or arity $a in the 
 *   target choice point environment.  Starts building the structure in the
 *    choice point environment at variable $x.
 * 
 *   The target variable $x is retained in the current environment
 *    as to help with the remainder of the construction.
 * 
 */
Interpreter.prototype.inst_put_struct = function(inst) {
	
	var f = new Functor(inst.get('f'));
	var a = inst.get('a');
	f.arity = a;
	
	var x = "$x" + inst.get('x');
	
	this.ctx.cv = x;
	this.ctx.tse.vars[x] = f;
};

/**
 *   Instruction "put_term"
 * 
 *   Inserts a 'term' in the structure being built.
 */
Interpreter.prototype.inst_put_term = function(inst) {
	
	var term = inst.get("p");
	
	// Structure being built on the top of stack
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];
	
	struct.push_arg(term);
};

/**
 *   Instruction "put_number"
 * 
 *   Inserts a 'number' in the structure being built.
 */
Interpreter.prototype.inst_put_number = function(inst) {
	
	var num = inst.get("p");
	
	// Structure being built on the top of stack
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];
	
	struct.push_arg(new Token('number', num));
};

Interpreter.prototype.inst_put_void = function() {

	// Structure being built on the top of stack
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];

	var vvar = new Var("_");
	
	//this._add_to_trail(this.ctx.tse.trail, vvar);
	
	struct.push_arg(vvar);
};

Interpreter.prototype.inst_put_nil = function() {

	// Structure being built on the top of stack
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];

	struct.push_arg( new Token('nil') );
};

/**
 *   Instruction "put_var"
 * 
 *   Inserts a 'var' in the structure being built.
 */
Interpreter.prototype.inst_put_var = function(inst) {
	
	var vname = inst.get("p");
	
	// Structure being built on the top of stack
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];

	// Do we have a local variable already setup?
	var local_var = this.ctx.cse.vars[vname];
	if (!local_var) {
		local_var = new Var(vname);
		this.ctx.cse.vars[local_var.name] = local_var;
	} 
	
	struct.push_arg(local_var);
};

/**
 *   Instruction "put_value"
 * 
 *   Inserts a 'value' in the structure being built.
 *
 *   We don't have to `trail` anything here: the `value`
 *    in question is really just a substructure of the
 *    target one being built in $x0.
 *    
 */
Interpreter.prototype.inst_put_value = function(inst) {
	
	var vname = "$x" + inst.get("x");
	
	var value = this.ctx.tse.vars[vname];
	
	// The current structure being worked on
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];

	struct.push_arg(value);
};


//=========================================================================== HEAD

/**
 *   Instruction `unif_value`
 *   
 *   Used in the `head`, inside a structure, subsequent appearances of variable
 *    (i.e. not on first appearance of variable).
 *    
 *   In `read` mode   ==> unify
 *   In `write` mode  ==> just put value 
 *   
 */
Interpreter.prototype.inst_unif_value = function(inst) {
	
	var p = inst.get('p');
	var pv = this.ctx.cse.vars[p];
	
	/*
	 *  Cases:
	 *    What is locally at 'p'
	 *    1- a Var
	 *    2- a Functor (structure) or a Token
	 *    
	 *  In case of (1) :
	 *  ================
	 *     in 'w' mode ==> push
	 *     in 'r' mode ==> unify
	 *     
	 *  In case of (2) :
	 *  ================
	 *     in 'w' mode ==> push
	 *     in 'r' mode ==> unify
	 */

	// `write` mode ?
	//
	if (this.ctx.csm == 'w') {
		this.ctx.cs.push_arg( pv );
		this.ctx.cu = true;
		return;
	};
	
	
	var from_current_structure = this.ctx.cs.get_arg( this.ctx.csi++ );
	
	// IMPORTANT: the variable should already
	//            have been created in the local environment
	// =====================================================
	
	var that = this;
	this.ctx.cu = Utils.unify(from_current_structure, pv, function(t1) {
		
		// we are in the `head` and thus we accumulate the trail
		//  in the current environment context
		//
		that.maybe_add_to_trail(that.ctx.cse.trail, t1);
	});
	
	if (!this.ctx.cu)
		this.backtrack();
};

/**
 *   Skip a structure's argument
 */
Interpreter.prototype.inst_unif_void = function() {
	
	this.ctx.csi++;
	this.ctx.cu = true;
	
	if (this.ctx.csm == 'w') {
		var vvar = new Var("_");
		this._add_to_trail( this.ctx.cse.trail, vvar);
		this.ctx.cs.push_arg( vvar );
	};
	
};

/**
 *   Skip a structure's argument
 */
Interpreter.prototype.inst_unif_nil = function() {
	
	if (this.ctx.csm == 'w') {
		this.ctx.cs.push_arg( new Token('nil') );
		this.ctx.cu = true;
		return;
	};

	var cell = this.ctx.cs.get_arg( this.ctx.csi++ );
	this.ctx.cu = (cell instanceof Token) && (cell.name == 'nil');

	if (!this.ctx.cu)
		this.backtrack();	
};

/**
 *   Instruction "unif_var" $x
 *   
 *   Unify the value at the current variable
 *    being matched in the environment.
 *   
 *   - Token(term)
 *   - Token(number)
 *   - Functor, recursively
 * 
 *   Algorithm:
 *     http://www.dai.ed.ac.uk/groups/ssp/bookpages/quickprolog/node12.html
 * 
 *   NOTE:  Need to manage the trail.
 *   =====
 * 
 */
Interpreter.prototype.inst_unif_var = function(inst) {
	
	var v = inst.get('p');

	if (!v) {
		v = "$x" + inst.get('x');
	};
	
	var pv = this.ctx.cse.vars[v];

	/*
	 *  Just a symbol, not even a Var assigned yet
	 */
	if (!pv) {
		pv = new Var(v);
		this.ctx.cse.vars[pv.name] = pv;
	};
	
	
	
	if (this.ctx.csm == 'w') {
		
		//console.log("unif_var (W): ", JSON.stringify(pv));
		
		// We don't accumulate on trail because
		//  there wasn't a binding yet
		this.ctx.cs.push_arg( pv );
		this.ctx.cu = true;
		return;
	};
	
	
	// Get from the structure being worked on
	//
	var value_or_var = this.ctx.cs.get_arg( this.ctx.csi++ );
	
	//console.log("unif_var: ", value_or_var);
	
	var that = this;
	this.ctx.cu = Utils.unify(pv, value_or_var, function(t1) {
		
		// In the `head`, accumulate in current environment
		//
		that._add_to_trail(that.ctx.cse.trail, t1);
	});
	
	if (!this.ctx.cu)
		this.backtrack();
	
};// unif_var

/**
 *  Instruction `get_var`
 *  
 *  Used in the `head` when a variable is first encountered.
 *  The variable is at the `root` of the `head` (and thus
 *   not inside a structure in the `head`).
 *  
 *  - Get the variable and place it in the local vars
 * 
 * @param inst
 */
Interpreter.prototype.inst_get_var = function(inst) {
	
	var local_var = inst.get('p') || inst.get('x', "$x");
	
	var value_or_var = this.ctx.cs.get_arg( this.ctx.csi++ );

	// We don't need to trail anything here :
	//  we are just using a reference and 
	//  all local variables will get flushed during a subsequent `call`.
	//
	this.ctx.cse.vars[local_var] = value_or_var;
	
	this.ctx.cu = true;
};

/**
 *  Instruction `get_value`
 *  
 *  Used in the `head` when a variable already appeared earlier
 *  
 * @param inst
 */
Interpreter.prototype.inst_get_value = function(inst) {
	
	var p = inst.get('p');
	var value_or_var = this.ctx.cs.get_arg( this.ctx.csi++ );

	var pv = this.ctx.cse.vars[p];
	
	console.log("get_value, p: ", p, pv);
	
	//var dvar = p.deref();

	var that = this;
	this.ctx.cu = Utils.unify(pv, value_or_var, function(t1) {
		that.maybe_add_to_trail(that.ctx.cse.trail, t1);
	});
	
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
	
	var x = inst.get('x', "$x");
	
	// Are we switching argument in the `head` functor?
	//
	//  If this is the case, we need to reset the 'mode'
	//   and associated variable used to construct a 
	//   structure in `write` mode.
	//
	if (x != this.ctx.csx) {
		
		this.ctx.csm = 'r';
		this.ctx.csx = x;
		
	} else {
		/*
		 *  If we are indeed trying to "get_struct"
		 *  on the same argument we were already processing,
		 *  this means something is terribly wrong,
		 *  probably a bug in the compiler.
		 */
		throw new ErrorInternal("Attempting to 'get_struct' again on same argument: " + x);
	};
	
	var fname  = inst.get('f');
	var farity = inst.get('a');
	
	
	// Assume this will fail to be on the safe side
	//
	this.ctx.cu = false;
	
	// Prepare
	this.ctx.cs = null;
	this.ctx.csi = 0;
	

	// Fetch the local value
	var input_node = this.ctx.cse.vars[x];


	var dvar;

	if (input_node instanceof Var) {
		
		dvar = input_node.deref();
		
		if ( !dvar.is_bound() ) {

			/*
			 * We have received a unbound variable ==> "w" mode + trail
			 */
			this._add_to_trail(this.ctx.cse.trail, input_node);
			
			this.ctx.csm = 'w';
			
			var struct = new Functor(fname);
			this.ctx.cs = struct;
			
			dvar.bind( struct );
			
			this.ctx.cu = true;
			return;
		}
		
		
	};
	
	// We can only be in 'r' mode pass this point
	//
	this.ctx.csm = 'r';
	
	var node = input_node; 
	
	if (dvar) {
		
		/*
		 *  We have a bound variable ==> "r" mode, unify
		 */
		node = dvar.get_value();
		
	};
	
	/*
	 *  We have a proper structure
	 *    passed on in the `head`
	 */
	if (node instanceof Functor) {
		
		if (node.get_name() != fname) {
			return this.backtrack();	
		};

		if (node.get_arity() != +farity ) {
			return this.backtrack();
		};
		
		this.ctx.cs = node;
		this.ctx.cu = true;
		return;
	};

	
	
	this.backtrack();
};

/**
 *   Instruction "get_number" $p
 *   
 *   Expects a 'number' $p at the current variable being
 *    matched in the environment.
 * 
 */
Interpreter.prototype.inst_get_number = function(inst) {

	this._get_x(inst, 'number');
	
	if (!this.ctx.cu)
		this.backtrack();
};



/**
 *   Instruction "get_term" $p
 *   
 *   Expects a 'term' $p at the current variable being
 *    matched in the environment.
 * 
 */
Interpreter.prototype.inst_get_term = function(inst) {

	this._get_x(inst, 'term');
	
	if (!this.ctx.cu)
		this.backtrack();
};



Interpreter.prototype._get_x = function(inst, type) {
	
	var p = inst.get('p');
	
	if (this.ctx.csm == 'w') {
		this.ctx.cs.push_arg( new Token(type, p) );
		this.ctx.cu = true;
		return;
	};
	
	var value_or_var = this.ctx.cs.get_arg( this.ctx.csi++ );
	
	/*  Cases:
	 *  A) unbound variable ==> bind to expected number / term
	 *  B) bound variable   ==> unification
	 *  C) token(number) 
	 */

	
	this.ctx.cu = false;
	
	
	// CASE (C)
	//
	if (value_or_var instanceof Token) {
		if (value_or_var.name == type) {
			this.ctx.cu = ( value_or_var.value == p );
			return;
		};
		
		// FAIL
		return;
	};
	
	//  Could this really be happening ???
	//
	if (value_or_var == p) {
		this.ctx.cu = true;
		return;
	};
	
	//  We can't have something like a Functor here!
	//
	if ((!value_or_var instanceof Var)) {
		return; // fail
	}
	
	var variable = value_or_var;
	
	var dvar = variable.deref();
	
	// Case (B)
	//
	if (dvar.is_bound()) {
		
		// Unify
		//
		this.ctx.cu = (dvar.get_value() == p);
		return;
	};
	
	// Case (A)
	//
	dvar.bind(p);
	this._add_to_trail( this.ctx.cse.trail, dvar );
	
	this.ctx.cu = true;	
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
	
	this._tokenRegexp = />=|=<|\[|\]|\||\s.is\s.|\d+(\.\d+)?|[A-Za-z_0-9]+|:\-|=|\+\-|\*|\-\+|[()\.,]|[\n]|./gm;
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

/*
 * Get rid of all `,`
 * 
 * NOTE: not used really
 */
ParserL2.preprocess_list = function(input, index) {
	
	index = index || 0;
	
	var result = [];
	var depth  = 0;
	
	for (;;index++) {
		
		var token = input[index];
		if (!token)
			break;
		
		if (token.name == 'list:open') {
			depth++;
			result.push(token);
			continue;
		};
		
		if (token.name == 'list:close') {
			depth--;
			result.push(token);
			if (depth == 0)
				break;
			continue;
		};
		
		if (token.name == 'op:conj')
			continue;
			
		result.push(token);
	};
	
	return result;
};

ParserL2.nil = new Token('nil');

ParserL2.prototype.get_token = function() {
	
	/*
	 *  Swap Token('var', X) ==> Var(X)
	 */
	var maybe_translate_var = function(token) {
		
		if (token == null)
			return null;
		
		if (token.name == 'var') {
			var v = new Var(token.value);
			v.col = token.col;
			v.line = token.line;
			return v;
		};
		return token;
	};
	
	var token = this.tokens[this.index] || null;
	this.index = this.index + 1;
	
	return maybe_translate_var(token);
};

/**
 *  Processes the input stream assuming it is a list
 *   and returns a cons/2 structure
 * 
 * @param input
 * @param index
 * @returns { index, result }
 * 
 */
ParserL2.process_list = function(input, index) {
	
	index = index || 0;

	var token_1 = input[index];
	var token_1_name = token_1.name || null;
	
	if (token_1_name == 'nil')
		return { index: index, result: token_1};
	
	if (token_1_name != 'list:open')
		throw new ErrorExpectingListStart("Expected the start of a list, got: "+JSON.stringify(input));
	
	index++;
	
	/*
	 *  Swap Token('var', X) ==> Var(X)
	 */
	var proc_token = function(token) {
		
		if (token && token.name == 'var') {
			var v = new Var(token.value);
			v.col = token.col;
			v.line = token.line;
			return v;
		};
		return token;
	};
	
	var output =  ParserL2._process_list(function(){
		var token = input[index++];
		return proc_token(token);
	});

	//var result = (output.name == 'nil' ? output: output.args[0]); 
	
	return {index: index, result: output };
};


/*
 *  Processed a list of terms to a cons/2 structure
 *  
 */
ParserL2._process_list = function(get_token, maybe_token){

	var head = maybe_token || get_token();
	
	
	/*
	 *  Cases:
	 *  * Constant, Functor, Var, nil  ==> OK, proper head 
	 *  * list:open  ==> start a new cons/2
	 *  * list:close ==> should have been replaced already but issue `nil`
	 *                   if this wasn't done
	 *    
	 *  * op:conj    ==> Syntax Error
	 *  * list:tail
	 */

	
	while (head && (head.name == 'op:conj'))
		head = get_token();
	
	if (!head || head.name == 'nil') {
		return ParserL2.nil;
	};

	if (head.name == 'list:close') {
		return ParserL2.nil;
	};

	
	
	
	var cons = new Functor('cons');
		
	if (head.name == 'list:open') {
		var value = ParserL2._process_list( get_token );
		cons.push_arg( value );
	}
	else {
		cons.push_arg(head);
	}

	var next_token = get_token();
	
	if (next_token.name == 'list:tail') {
		next_token = get_token();
		cons.push_arg( next_token );
		
		next_token = get_token();
		if (next_token.name != 'list:close')
			throw new ErrorExpectingListEnd("Expecting list end, got:" + JSON.stringify(next_token));
		
		return cons;
	};
	
	var tail = ParserL2._process_list( get_token, next_token );
	cons.push_arg( tail );
	
	return cons;
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
		token = this.get_token();
		
		if (token == null || token instanceof Eos)
			return this._handleEnd( expression );

		// We must ensure that a list is transformed
		//  in a cons/2 structure
		//
		
		if (token.name == 'list:open') {
			
			var lresult = ParserL2.process_list(this.tokens, this.index-1);
			this.index = lresult.index;
			expression.push(lresult.result);
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
						
			// instead of doing object deep copy
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

	//console.log("- process_expression: ",opcode, expression);
	
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
	
	//console.log(">>>> ", opcode, expression);
	
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

		
		// gather 'node left' and 'node right'
		//
		// If `node_left` is undefined, it is marked as `` in the type
		//
		// We use the `result` array because we are replacing `in place`
		//  the nodes of the expression.
		//
		var node_left  = result[node_index - 1 ];
		var node_right = expression[node_index + 1 ];
		
		var iresult = this._process_one(opcode, node_left, node, node_right);

		if (iresult == null) {
			result.push(node);
			continue;
		};
			
		processed_nodes++;

		if (!iresult.is_unary)
			result.pop();
		
		result.push(iresult.result);
		
		node_index++;			

	}; // expression	
	
	return [result, processed_nodes];
};


ParserL3._process_one = function(opcode, node_left, node_center, node_right) { 
	
	// We need to get the proper precedence
	//  for the operator we which to be processing for
	//
	// The unary operators come with `null` as precedence
	//  because the parser needs to figure out if it's really
	//  used in the unary or infix context.
	//
	var opnode_center = OpNode.create_from_name(opcode.name);

		
	// A good dose of complexity goes on here
	//
	var type   = Op.classify_triplet(node_left, opnode_center, node_right);
	var compat = Op.are_compatible_types(type, opcode.type);
	
	if (!compat) {
		return null;
	};

	// We have compatibility and thus
	//  substitute for a Functor
	// We only have 2 cases:
	//  pattern 1:  `F_`  : a unary operator
	//  pattern 2:  `_F_` : a infix operator
	
	var functor = new Functor(opcode.name);
	functor.col = node_center.col;
	functor.line = node_center.line;
	
	var is_unary = Op.is_unary(opcode.type); 
	
	if (is_unary) {
		functor.args = [node_right];
	} else {
		functor.args = [node_left, node_right];
	};

	return { is_unary: is_unary, result: functor };
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

/*
 * Two terms unify if they can be matched. Two terms can be matched if:
 * 
 * - they are the same term (obviously), or
 * - they contain variables that can be unified so that the two terms without variables are the same.
 * 
 * 
 * term1 and term2 unify whenever:
 * 
 * + If term1 and term2 are constants, then term1 and term2 unify if and only if they are the same atom, or the same number.
 * 
 * + If term1 is a variable and term2 is any type of term, then term1 and term2 unify, and term1 is instantiated to term2. 
 *   (And vice versa.) (If they are both variables, they're both instantiated to each other, and we say that they share values.)
 * 
 * + If term1 and term2 are complex terms, they unify if and only if:
 *   a. They have the same functor and arity. The functor is the "function" name (this functor is foo: foo(X, bar)). The arity is the number of arguments for the functor (the arity for foo(X, bar) is 2).
 *   b. All of their corresponding arguments unify. Recursion!
 *   c. The variable instantiations are compatible (i.e., the same variable is not given two different unifications/values).
 *   
 * + Two terms unify if and only if they unify for one of the above three reasons (there are no reasons left unstated).
 * 
 */
Utils.unify = function(t1, t2, on_bind) {

	/*
	var t1id, t2id;
	
	if (t1)
		t1id = t1.id ? t1.id : "?";
	
	if (t2)
		t2id = t2.id ? t2.id : "?";
	
	
	console.log("++++ Utils.Unify: ",t1,t1id, t2, t2id);
	*/
	
	//console.log("\n");
	//console.log("++++ Utils.Unify: t1 = ",t1);
	//console.log("++++ Utils.Unify: t2 = ",t2);
	
	/*
	 *  Covers:
	 *    null == null
	 */
	if (t1 == t2)
		return true;
	
	var t1_is_var = t1 instanceof Var;
	var t2_is_var = t2 instanceof Var;
		
	var t1d, t2d;
	
	if (t1_is_var && t2_is_var) {

		var t1d = t1.deref(t2);
		var t2d = t2.deref(t1);
		
		// Check for cycle...
		if (t1d == null || t2d == null){
			//console.log("CYCLE AVERTED!");
			return true;
		}
		
		if (t1d.is_bound() && t2d.is_bound()) {
			return Utils.unify( t1d.get_value(), t2d.get_value(), on_bind ); 
		};
		
		if (t1d.is_bound()) {
			t2.safe_bind(t1, on_bind);
			return true;
		};
		
		if (t2d.is_bound()) {
			t1.safe_bind(t2, on_bind);
			return true;
		};
		
		// Both unbound
		// ============
		
		t1d.bind(t2, on_bind);
		return true;
	};
	
	if (t1_is_var) {
		t1d = t1d || t1.deref();
		
		if (t1d.is_bound()) {
			return Utils.unify(t1d.get_value(), t2, on_bind);
		};
		
		t1d.bind(t2, on_bind);
		return true;
	};
	
	if (t2_is_var) {
		t2d = t2d || t2.deref();
		
		if (t2d.is_bound()) {
			return Utils.unify(t2d.get_value(), t1, on_bind);
		};

		t2d.bind(t1, on_bind);
		return true;
	};
	

	
	if (t1 instanceof Functor && t2 instanceof Functor) {

		if (t1.args.length != t2.args.length)
			return false;
		
		for (var index in t1.args)
			if (!Utils.unify(t1.args[index], t2.args[index], on_bind))
				return false;
		
		return true;
	};
	
	if (t1 instanceof Token && t2 instanceof Token) {
		return t1.value == t2.value;
	};
	
	return false;
}; // unify

Utils.pad = function(string, width, what_char) {
	
	return string + Array(width - string.length).join(what_char || " ");	
};

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
				this.cb({ n: n, i: index, root_param: bnode.is_root });
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

