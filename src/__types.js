/**
 *   types.js
 *   
 *   The definition of the types
 *   
 *   @author: jldupont
 */

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
	
	// so, 0 || null ==> null ...
	if (maybe_value ===0)
		this.value = 0;
	
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
		if (this.name == 'nil')
			return 'nil';
		else
			return ""+this.value;
	
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
	
	if (input_list instanceof Array && input_list[0] instanceof Array) {
		
		for (var index=0; index<input_list.length ;index++) {
			if (!Token.check_for_match(input_list[index], expected_list[index]))
				return false;
		}
		
		return true;
	}
	
	
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


function Result(term_list, last_token) {
	this.terms = term_list;
	this.last_token = last_token;
};


/**
 * Operator
 * @constructor
 */
function Op(name, symbol, precedence, type, attrs) {
	this.name = name;
	this.symbol = symbol;
	this.prec = precedence;
	this.type = type;
	this.attrs = attrs || {};
	
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
	   ,new Op("unif",    '=',   700, 'xfx', {builtin:   true, boolean: true})
	   ,new Op("em",      '=<',  700, 'xfx', {primitive: true, boolean: true})
	   ,new Op("ge",      '>=',  700, 'xfx', {primitive: true, boolean: true})
	   ,new Op("lt",      '<',   700, 'xfx', {primitive: true, boolean: true})
	   ,new Op("gt",      '>',   700, 'xfx', {primitive: true, boolean: true})
	   ,new Op("is",      'is',  700, 'xfx', {primitive: true, retvalue: false})
	    
	   ,new Op("minus",   '-',   500, 'yfx', {primitive: true, retvalue: true})
	   ,new Op("plus",    '+',   500, 'yfx', {primitive: true, retvalue: true})
	   ,new Op("mult",    '*',   400, 'yfx', {primitive: true, retvalue: true})
	   ,new Op("div",     '/',   400, 'yfx', {primitive: true, retvalue: true})
	    
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
	
	var opn = new OpNode(op.symbol, op.prec);
	opn.line = op.line;
	opn.col  = op.col;
	return opn;
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
	
	// That's what we assume for the general case.
	this.attrs = {
		primitive: false
		,boolean: false
		,retvalue: false
	}
	
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
			
			if (arity>0)
				result = "Functor("+this.name+"/"+arity+","+fargs+")";
			else
				result = "Functor("+this.name+"/"+arity+")";
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

Instruction.inspect_compact = false;
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
	
	const params = [ 'p', 'x', 'y' ];
	var result = ""; 
	
	if (this.ctx && this.ctx.l)
		result = this.ctx.l + "  ";
		
	result += this.opcode + (Array(13 - this.opcode.length).join(" "));
	
	if (this.ctx == null)
		return result;
	
	if (!Instruction.inspect_compact)
		result += " ( ";
	
	if (this.ctx.f)
		result += this.ctx.f+"/"+this.ctx.a;
	
	for (var i=0, inserted=false;i<params.length;i++) {
		
		if (this.ctx[params[i]] != undefined ) {
			
			if (inserted || (this.ctx.f && !inserted))
				result += ", ";
			
			result += params[i] + "("+ JSON.stringify(this.ctx[params[i]])+")";
			inserted= true;
		}
	};
	
	if (!Instruction.inspect_compact)
		result += " )";
	
	if (Instruction.inspect_quoted)
		result = "'"+result+"'";
	
	return result;
};

// ============================================================ Summary

function ParseSummary(maybe_error, maybe_token_list) {
	this.maybe_error = maybe_error;
	this.maybe_token_list = maybe_token_list;
}

ParseSummary.prototype.inspect = function() {
	
	if (this.maybe_error) {
		return "Error: "+this.maybe_error.classname;
	}
	
	if (this.maybe_token_list instanceof Array) {
		var result = "[";
		
		for (var index=0; index<this.maybe_token_list.length; index++) {
			var value = this.maybe_token_list[index];
			
			if (index>0)
				result += ",";
				
			result += (value.inspect ? value.inspect() : JSON.stringify(value));
		}
		
		return result + ']';
	}
	
	if ((this.maybe_token_list).inspect)
		return ( this.maybe_token_list ).inspect();

	return JSON.stringify( this.maybe_token_list );
	
};

// ============================================================ Errors

/*
function ErrorSyntax(msg, type) {
	this.classname = 'ErrorSyntax';
	this.message = msg;
	this.type = type;
};
ErrorSyntax.prototype = Error.prototype;
*/


function ErrorExpectingFunctor(msg, token) {
	this.classname = 'ErrorExpectingFunctor';
	this.message = msg;
	this.token = token;
};
ErrorExpectingFunctor.prototype = Error.prototype;


function ErrorExpectingVariable(msg, token) {
	this.classname = 'ErrorExpectingVariable';
	this.message = msg;
	this.token = token;
};
ErrorExpectingVariable.prototype = Error.prototype;


function ErrorFunctorNotFound(msg, token) {
	this.classname = 'ErrorFunctorNotFound';
	this.message = msg;
	this.token = token;
};
ErrorFunctorNotFound.prototype = Error.prototype;

function ErrorFunctorClauseNotFound(msg, token) {
	this.classname = 'ErrorFunctorClauseNotFound';
	this.message = msg;
	this.token = token;
};
ErrorFunctorClauseNotFound.prototype = Error.prototype;

function ErrorFunctorCodeNotFound(msg, token) {
	this.classname = 'ErrorFunctorCodeNotFound';
	this.message = msg;
	this.token = token;
};
ErrorFunctorCodeNotFound.prototype = Error.prototype;


function ErrorExpectingGoal(msg, token) {
	this.classname = 'ErrorExpectingGoal';
	this.message = msg;
	this.token = token;
};
ErrorExpectingGoal.prototype = Error.prototype;

function ErrorInvalidHead(msg, token) {
	this.classname = 'ErrorInvalidHead';
	this.message = msg;
	this.token = token;
};
ErrorInvalidHead.prototype = Error.prototype;

function ErrorRuleInQuestion(msg, token) {
	this.classname = 'ErrorRuleInQuestion';
	this.message = msg;
	this.token = token;
};
ErrorRuleInQuestion.prototype = Error.prototype;

function ErrorNoMoreInstruction(msg, token) {
	this.classname = 'ErrorNoMoreInstruction';
	this.message = msg;
	this.token = token;
};
ErrorNoMoreInstruction.prototype = Error.prototype;

function ErrorInvalidInstruction(msg, token) {
	this.classname = 'ErrorInvalidInstruction';
	this.message = msg;
	this.token = token;
};
ErrorInvalidInstruction.prototype = Error.prototype;

function ErrorInternal(msg, token) {
	this.classname = 'ErrorInternal';
	this.message = msg;
	this.token = token;
};
ErrorInternal.prototype = Error.prototype;

function ErrorInvalidValue(msg, token) {
	this.classname = 'ErrorInvalidValue';
	this.message = msg;
	this.token = token;
};
ErrorInvalidValue.prototype = Error.prototype;

function ErrorAlreadyBound(msg, token) {
	this.classname = 'ErrorAlreadyBound';
	this.message = msg;
	this.token = token;
};
ErrorAlreadyBound.prototype = Error.prototype;

function ErrorNotBound(msg, token) {
	this.classname = 'ErrorNotBound';
	this.message = msg;
	this.token = token;
};
ErrorNotBound.prototype = Error.prototype;

function ErrorExpectingListStart(msg, token) {
	this.classname = 'ErrorExpectingListStart';
	this.message = msg;
	this.token = token;
};
ErrorExpectingListStart.prototype = Error.prototype;

function ErrorExpectingListEnd(msg, token) {
	this.classname = 'ErrorExpectingListEnd';
	this.message = msg;
	this.token = token;
};
ErrorExpectingListEnd.prototype = Error.prototype;


function ErrorInvalidToken(msg, token) {
	this.classname = 'ErrorInvalidToken';
	this.message = msg;
	this.token = token;
};
ErrorInvalidToken.prototype = Error.prototype;

function ErrorUnexpectedParensClose(msg, token) {
	this.classname = 'ErrorUnexpectedParensClose';
	this.message = msg;
	this.token = token;
};
ErrorUnexpectedParensClose.prototype = Error.prototype;

function ErrorUnexpectedPeriod(msg, token) {
	this.classname = 'ErrorUnexpectedPeriod';
	this.message = msg;
	this.token = token;
}
ErrorUnexpectedPeriod.prototype = Error.prototype;

function ErrorUnexpectedEnd(msg, token) {
	this.classname = 'ErrorUnexpectedEnd';
	this.message = msg;
	this.token = token;
}
ErrorUnexpectedEnd.prototype = Error.prototype;

function ErrorUnexpectedListEnd(msg, token) {
	this.classname = 'ErrorUnexpectedListEnd';
	this.message = msg;
	this.token = token;
}
ErrorUnexpectedListEnd.prototype = Error.prototype;


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
	
	module.exports.ParseSummary = ParseSummary;

	// Errors
	module.exports.ErrorExpectingFunctor = ErrorExpectingFunctor;
	module.exports.ErrorExpectingVariable = ErrorExpectingVariable; 
	module.exports.ErrorInvalidHead = ErrorInvalidHead;
	module.exports.ErrorInvalidToken = ErrorInvalidToken;
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
	//module.exports.ErrorSyntax = ErrorSyntax;
	
	module.exports.ErrorExpectingListStart = ErrorExpectingListStart;
	module.exports.ErrorExpectingListEnd = ErrorExpectingListEnd;
	module.exports.ErrorUnexpectedListEnd = ErrorUnexpectedListEnd;
	module.exports.ErrorUnexpectedParensClose = ErrorUnexpectedParensClose;
	module.exports.ErrorUnexpectedPeriod = ErrorUnexpectedPeriod;
	module.exports.ErrorUnexpectedEnd = ErrorUnexpectedEnd;
};