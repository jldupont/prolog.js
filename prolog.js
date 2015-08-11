/*! prolog.js - v0.0.1 - 2015-08-11 */

/**
 *  Token
 *  
 *  name  : the name assigned to the Token
 *  value : the value of the token
 *  index : where on the line the token was found
 */
function Token(name, maybe_value, maybe_index, maybe_line) {
	this.name = name;
	this.value = maybe_value || null;
	this.index = maybe_index || 0;
	this.line = maybe_line || 0;
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
	
	if (input_list.length != expected_list.length)
		return false;
	
	for (var index in input_list) {
		
		var input_token = input_list[index];
		var expected_token = expected_list[index] || new Token('null');
	
		if (!Token.equal(input_token, expected_token))
			return false;
		
		if (also_index)
			if (input_token.index != expected_token.index)
				return false;
				
	};
	
	return true;
};

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
	
	this._tokenRegexp = /[0-9\.]+|[A-Za-z_]+|:\-|[()\.,]|[\n]|./gm;
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
	':-':  function() { return new Token('op:rule') }
	,'.':  function() { return new Token('period') }
	,',':  function() { return new Token('op:conj') }
	,';':  function() { return new Token('op:disj') }
	,'\n': function() { return new Token('newline') }
	,'(':  function() { return new Token('parens_open') }
	,')':  function() { return new Token('parens_close') }
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
		
		return_token = new Token('comment', null, current_index);
		return_token.line = this.current_line;
		
		this.current_line = this.current_line + 1;
		
		while( this.step(Lexer.newline_as_null) != null);
		return return_token;
	};
	
	// are we dealing with a number ?
	if (Lexer.is_number(raw_token)) {
		var number = parseFloat(raw_token);
		return_token = new Token('number', number, current_index);
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
				return_token = new Token('string', string, current_index);
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
	return_token.index = current_index;
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
 *  Parser
 *  
 *  @constructor
 *  
 */
function Parser(maybe_context) {
	
	this.result = [];
	this.context = maybe_context || {};
	
	this.state = Parser.step_start;
};


/**
 * Public - Pushes 1 token down the processing pipeline
 * 
 * @return Expression | Error | Eos
 */
Parser.prototype.step = function(token) {
	
	// go one step in the state-machine
	var token = this.list.shift();
	if (!token)
		return null;
	
	// End of stream ? Bailout
	if (token.name=='eof')
		return new Either(token, null);
	
	return this._dispatch(token);
};

/**
 *  Handles the start of a stream of tokens
 *   and of course at the same time the start
 *   of a new expression in the stream
 *   
 *  Each expression starts with an atom.
 *  
 *  An atom can turn up to be a functor 
 *   if an open parens follows.
 *   
 *  @return Either(null, Error) | null
 */
Parser.step_start = function (token) {
	//console.log("Parser: Start: ", token);
	
	if (token.name != 'term')
		return new Either(null, new Error('expect_term', "Expecting a term, got: "+ token));
		
	// Determine if we have really an atom
	//  An atom starts a lowercase character
	var first_character = token.value[0] || '';
	
	if (first_character.toLowerCase() == first_character) {
		this.result.push( new Token('atom', token.value, token.index) );
		this.state = Parser.step_start_with_atom;
		
		// we can't possibly have a complete expression at this point of course!
		return null;
	};
		
	return new Either(null, new Error('expect_atom', 'Expecting atom, got: '+ token));
};

/**
 *  We have a successful start of expression with an 'atom'
 *  Now we can either have:
 *  * open parens  : start of a functor
 *  * :-           : start of a rule definition
 *  
 */
Parser.step_start_with_atom = function(token) {
	
	if (token.name == 'parens_open') {
		
		// we need to adjust the token we have in the result
		//  to reflect the situation we are dealing with a Functor
		var tail_token = this.result.pop();
		var name = tail_token.name; 
		var functor = new Functor(name);
		this.result.push( functor );
		
		// now we switch the state-machine to accumulate
		//  the parameters.
		this.state = Parser.step_accumulate_functor_arguments;
		
		// we haven't finished an expression yet.
		return null;
	};
	
	if (token.name == 'rule') {
		
	};
	
	return new Either(null, new Error('expect_parens_or_rule', 'Expecting an open parens or rule start, got: '+ token));
};

/**
 *  We are accumulating the parameters of the functor
 */
Parser.step_accumulate_functor_arguments = function(token) {
	
};

/**
 * Pushes a list of tokens to process

 * @param token_list
 * 
 */
Parser.prototype.push_tokens = function(token_list) {
	
	// extend the list
	this.list.push.apply(this.list, token_list);
};

//
// =========================================================== PRIVATE
//

/**
 * Private - Dispatch to state machine function
 * 
 * @param token
 * @returns
 */
Parser.prototype._dispatch = function(token) {
	return this.state.apply(this, [token]);
};


if (typeof module!= 'undefined') {
	module.exports.Parser = Parser;
};

/**
 * Tpiler
 * 
 * @constructor
 */
function Tpiler(token_list, options) {
	
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
Tpiler.prototype.next = function() {
	
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
			
			return [head_plus_one, head];
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
	
	return [head];
};

/**
 *  Transpiles the token list entirely
 *   Useful for tests
 *   
 *   @return [Token]
 */
Tpiler.prototype.get_token_list = function() {
	
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
	module.exports.Tpiler = Tpiler;
};

/**
 * TpilerL2
 * 
 * @constructor
 */
function TpilerL2(token_list, options) {
	
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
 *  @return [Token] | Eos
 */
TpilerL2.prototype.next = function() {
	
	if (this.reached_end)
		return new Eos();
	
	var head = this.list.shift() || null;
	if (head == null)
		return new Eos();
	

	
	// We must unshift the token
	//  as not to loose the state-machine's context
	//
	this.list.unshift(head_plus_one);
	
	return [head];
};

/**
 *  Transpiles the token list entirely
 *   Useful for tests
 *   
 *   @return [Token]
 */
TpilerL2.prototype.get_token_list = function() {
	
	var result = [];
	
	for (;;) {
		var maybe_token = this.next();
		if (maybe_token instanceof Eos)
			break;
		
		Array.prototype.push.apply(result, maybe_token);
	};

	return result;
};

if (typeof module!= 'undefined') {
	module.exports.TpilerL2 = TpilerL2;
};

/**
 * Operator
 * @constructor
 */
function Op(name, symbol, precedence, type, locked) {
	this.name = name;
	this.symbol = symbol;
	this.precedence = precedence;
	this.type = type;
	
	// by default, operators can not be redefined
	this.locked = locked || true;
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
Op._map = {
	 ':-': new Op("rule",    ':-', 1200, 'xfx')
	,';':  new Op("disj",    ';',  1100, 'xfy')
	,',':  new Op("conj",    ',',  1000, 'xfy')
	,'.':  new Op("period",  '.',   100, 'yfx')
	,'\n': new Op("newline", '\n',    0, '*')

	,'(':  new Op("parens_open",  '(',    0, '*')
	,')':  new Op("parens_close", '(',    0, '*')
};


/**
 *  Define an Atom
 *  @constructor
 *  
 *  Atoms are defined as follows:
 *  * start with a lowercase character
 *  * anything enclosed in single quote
 *  
 */
function Atom(name) {
	this.name = name;
};

/**
 *  Define a Rule
 *  @constructor 
 */
function Rule(name) {
	
};

// End of stream
function Eos () {};

function Nothing () {};

/**
 *  Functor
 *  @constructor
 */
function Functor(name, maybe_arguments_list) {
	this.name = name;
	
	// remove the first parameter of the constructor
	this.args = Array.prototype.splice.call(arguments, 1);
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

function Error(name, maybe_details) {
	this.name = name;
	this.details = maybe_details || null;
};

if (typeof module!= 'undefined') {
	module.exports.Rule = Rule;
	module.exports.Atom = Atom;
	module.exports.Either = Either;
	module.exports.Nothing = Nothing;
	module.exports.Error = Error;
	module.exports.Eos = Eos;
	module.exports.Functor = Functor;
	module.exports.Op = Op;
};