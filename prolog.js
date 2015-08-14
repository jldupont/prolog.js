/*! prolog.js - v0.0.1 - 2015-08-14 */

/**
 *  Lexer
 *  @constructor
 *  
 *  @param {String} text : the text to analyze
 */
function Lexer (text) {
	this.text = text;
	this.at_the_end = false;
	this.current_match = null;
	this.current_line = 0;
	this.offset = 0;
	
	this._tokenRegexp = /\d+(\.\d+)?|[A-Za-z_]+|:\-|=|\+\-|\-\+|[()\.,]|[\n]|./gm;
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
	,',':  function() { return new Token('op:conj', ',', {is_operator: true}) }
	,';':  function() { return new Token('op:disj', ';', {is_operator: true}) }
	,'=':  function() { return new Token('op:unif', '=', {is_operator: true}) }
	,'-':  function() { return new Token('op:minus', '-', {is_operator: true}) }
	,'+':  function() { return new Token('op:plus',  '+', {is_operator: true}) }
	
	,'\n': function() { return new Token('newline') }
	,'.':  function() { return new Token('period') }
	,'(':  function() { return new Token('parens_open',  null, {is_operator: true}) }
	,')':  function() { return new Token('parens_close', null, {is_operator: true}) }
};

Lexer.newline_as_null = true;

/**
 * Retrieves all tokens from the stream.
 * 
 * This function is useful for tests.
 * 
 * @returns {Array}
 */
Lexer.prototype.get_token_list = function() {
	
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
	this.found_rule = false;
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
	
	// Reset the state-machine
	if (head.name == 'period') {
		var period_token =  head;
		
		// we didn't found a rule definition
		//
		if (!this.found_rule && this.options.convert_fact) {
			
			this.found_rule = false;
			
			return [ new Token('op:rule', null, 0), 
			         new Token('term', 'true', 0), 
			         period_token ];
		};
		
		this.found_rule = false;
	};
	
	
	if (head.name == 'rule') {
		this.found_rule = true;
	};

	
	var head_plus_one = this.list.shift() || null;
	
	// Maybe it's the end of the stream ...
	//
	if (head_plus_one == null) {
		this.reached_end = true;
		return [head];
	};

	if (head.name == 'term' || head.name == 'string') {
		if (head_plus_one.name == 'parens_open') {
			
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

	// Check for whitespaces and remove
	if (head.name == 'term') {
		var value_without_whitespaces = (head.value || "").replace(/\s/g, '');
		if (value_without_whitespaces.length == 0)
			return null;
	};
	
	// check for variables
	if (head.name == 'term' && head.value != null) {
		var first_character = ""+head.value[0];
		
		if (first_character.toUpperCase() == first_character && ParserL1.isLetter(first_character))
			head.name = 'var';
		
		if (first_character=='_' && head.value.length == 1) {
			head.name = 'var_anon';
			head.value = null;
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
ParserL1.prototype.get_token_list = function() {
	
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
	this.index = list_index;
	
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
			return new OpNode('+');
		};
		
		if (token_n1.value == '+') {
			return new OpNode('-');
		};
	};

	if (token_n.value == '+') {
		
		// not the same thing as `++`
		if (token_n1.value == '+') {
			return new OpNode('+');
		};
		
		if (token_n1.value == '-') {
			return new OpNode('-');
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
	
	expression = new Array();
	
	for (;;) {
		
		// Pop a token from the input list
		token = this.tokens[this.index] || null;
		this.index = this.index + 1;
		
		if (token == null || token instanceof Eos)
			return this._handleEnd( expression );

		if (token.is_operator) {

			// If we are in a functor definition,
			//  we need to swap `op:conj` for a separator token
			if (this.context.diving) {
				if (token.name == 'op:conj') {
					token.is_operator = false;
					token.name = 'sep';
					expression.push(token);
					continue;
				};
					
			};
			
			
			// Look ahead 1 more token
			//  in order to handle the `- -` etc. replacements
			token_next = this.tokens[this.index] || null;
			
			if (token_next.is_operator) {
				
				var maybe_replacement_opnode = ParserL2.compute_ops_replacement(token, token_next);
				if (maybe_replacement_opnode != null) {
					
					maybe_replacement_opnode.line = token.line;
					maybe_replacement_opnode.col  = token.col;
					
					expression.push( maybe_replacement_opnode );
					this.index = this.index + 1;
					continue;
				}
			};
			
		};
		
		
		if (token.value == "+-" || token.value == "-+") {
			var opn = new OpNode("-");
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
			if (this.context.diving)
				return this._handleEnd( expression );
			
			continue;
		};
			
		// Should we be substituting an OpNode ?
		//
		// We also need to drop the "," tokens
		//  if we are inside a Functor
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
										{diving: true}
										);
	
	return parser_level_down.process();
};

ParserL2.prototype._handleEnd = function(current_expression) {
	
	if (current_expression.length != 0)
		this.result.push(current_expression);
	
	if (this.context.diving)
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
function ParserL3(expression, operators_list, maybe_context) {
	
	// the resulting terms list
	//
	this.result = [];
	
	this.op_list = operators_list;
	
	this.expression = expression;
	
	// Context defaults
	this.context = {
		// The index of the expression we are processing
		 index_exp:    maybe_context.index_exp    || 0
		 
		 // The index inside the expression we are processing
		,index_in_exp: maybe_context.index_in_exp || 0
		
		// The index in the operators list
		//,index_in_op:  maybe_context.index_in_op  || 0
	};
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
		var op = this.op_list[op_index]; 
		
		var total_opnodes_in_expression = 0;
		var total_opnodes_processed = 0;
		var total_opnodes_unprocessed = 0;
		
		for (var node_index in this.expression) {
			var node = this.expression[node_index];
			
			if (!(node instanceof OpNode))
				continue;
			
			
			
		}; // nodes
		
		// we didn't find anymore unprocessed OpNode in the last pass
		// in the expression
		if (total_opnodes_processed + total_opnodes_unprocessed == total_opnodes_in_expression)
			break;
		
	};// ops
	
	return result;
	
};// process



//
// =========================================================== PRIVATE
//



if (typeof module!= 'undefined') {
	module.exports.ParserL3 = ParserL3;
};

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

Token.prototype.inspect = function(){
	return "Token("+this.name+","+this.value+")";
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
			//console.log("match fail: "+input_token);
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
function Op(name, symbol, precedence, type, locked) {
	this.name = name;
	this.symbol = symbol;
	this.prec = precedence;
	this.type = type;
	
	// from the lexer
	this.line = 0;
	this.col  = 0;
	
	// by default, operators can not be redefined
	this.locked = locked || true;
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
	   ,new Op("minus",   '-',   500, 'yfx')
	   ,new Op("uminus",   '-',   200, 'fy')
	   ,new Op("plus",    '+',   500, 'yfx')
	   ,new Op("uplus",    '+',   200, 'fy') 
	  ]; 

/*
 *  Various Inits
 * 
 *  * an ordered list of operators
 *    from least to highest precedence
 *    
 *  * map by name
 */
(function(){
	
	Op.map_by_name = {};
	Op.ordered_list_by_precedence = [];
	
	for (var index in Op._list) {
		var o = Op._list[index];
		
		Op.ordered_list_by_precedence.push(o);
		Op.map_by_name [ o.name ] = o;
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
		throw Error("Expecting an OpNode from node_center");

	if (node_center.prec == null)
		throw Error("Expecting an valid OpNode from node_center");
	
	
	var result = "";
	var pc = node_center.prec;
	
	if (node_left.prec == pc)
		result += "y";
	else
		if (node_left.prec < pc)
			result += "x";
	
	result += 'f';
		
	if (node_right.prec == pc)
		result += 'y';
	else if (node_right.prec < pc)
		result += 'x';

	return result;
};

/**
 * TODO: maybe use an object for map ?
 * 
 * @param input_st
 * @param expected_st
 * @returns {Boolean}
 */
Op.is_compatible_subtype = function(input_st, expected_st) {
	
	if (input_st == null)
		if (expected_st != null)
			return false;
	
	if (input_st == 'y')
		if (expected_st == 'x')
			return false;
	
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



function OpNode(symbol, maybe_precedence) {
	
	this.symbol = symbol;
	
	// specifically designed
	//  so this causes a 'burst' if not initialized
	//  correctly during the processing
	this.prec   = maybe_precedence || null;
};

OpNode.prototype.inspect = function(){
	return "OpNode("+this.symbol+")";
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
};

Functor.prototype.inspect = function(){
	return "Functor("+this.name+"/"+this.args.length+this.format_args()+")";
};

Functor.prototype.format_args = function () {
	
	var result = "";
	for (var index in this.args) {
		var arg = this.args[index];
		if (arg.inspect)
			result += ","+arg.inspect();
		else
			result += ","+JSON.stringify(arg);
	};
	
	return result;
};

Functor.prototype.get_args = function(){
	return this.args;
};

Functor.prototype.push_arg = function(arg) {
	this.args.push(arg);
};

/**
 * Either monad
 */
function Either(value_a, value_b) {
	this.name = 'either';
	this.value_a = value_a || null;
	this.value_b = value_b || null;
};

Either.prototype.getA = function() {
	return this.value_a;
};

Either.prototype.getB = function() {
	return this.value_b;
};

if (typeof module!= 'undefined') {
	module.exports.Either = Either;
	module.exports.Nothing = Nothing;
	module.exports.Eos = Eos;
	module.exports.Functor = Functor;
	module.exports.Op = Op;
	module.exports.OpNode = OpNode;
	module.exports.Result = Result;
};