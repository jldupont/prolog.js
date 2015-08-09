/*! prolog.js - v0.0.1 - 2015-08-09 */

/**
 *  Token
 *  
 *  name  : the name assigned to the Token
 *  value : the value of the token
 *  index : where on the line the token was found
 */
function Token(name, maybe_value, maybe_index) {
	this.name = name;
	this.value = maybe_value || null;
	this.index = maybe_index || 0;
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
	
	this._tokenRegexp = /[0-9\.]+|[A-Za-z_]+|:\-|[()\.,]|[\n]|./gm;
};


/**
 *  The supported tokens 
 */
Lexer.token_map = {
	':-': new Token('rule')
	,'.': new Token('period')
	,',': new Token('conjunction')
	,';': new Token('disjunction')
	,'\n': new Token('newline')
	,'(': new Token('parens_open')
	,')': new Token('parens_close')
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
	
	var maybe_raw_token = this.step();
	
	if (maybe_raw_token == null)
		return new Token('eof');
	
	var raw_token = maybe_raw_token;
	
	var current_index = this.current_match.index;
	
	// If we are dealing with a comment,
	//  skip till the end of the line
	if (raw_token == '%') {
		
		while( this.step(Lexer.newline_as_null) != null);
		return new Token('comment', null, current_index);
	};
	
	// are we dealing with a number ?
	if (Lexer.is_number(raw_token)) {
		var number = parseFloat(raw_token);
		return new Token('number', number, current_index);
	};
	
	// are we dealing with a string ?
	//
	if (this.is_quote(raw_token)) {
		var string = "";
		var t;
		
		for (;;) {
			t = this.step();
			if (this.is_quote(t) | t == '\n' | t == null) {
				return new Token('string', string, current_index);
			} 
			string = string + t;
		}; 
		
	};
	
	var maybe_return_token = Lexer.token_map[maybe_raw_token];
	var return_token = maybe_return_token || new Token('term', maybe_raw_token);
	
	return_token.index = current_index;
	
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
	this.list = [];
	this.index = 0;
	this.state = Parser.step_start;
	this.result = [];
	this.context = maybe_context || {};
};

/**
 * Peek at the head of the result list
 * 
 * @return Token | null
 */
Parser.prototype.head = function() {
	
	return this.result[0] || null;
};

Parser.prototype.get_state = function() {
	return this.state;
};
/**
 * Public - goes 1 step in the state-machine
 * 
 * @return Either(Expression, Error) | null
 */
Parser.prototype.next = function() {
	
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
function Tpiler(token_list) {
	this.list = token_list;
	this.reached_end = false;
};

/**
 *  Processes the token list 1 by 1
 *  
 *  @return Token | Nothing | Eos
 */
Tpiler.prototype.next = function() {
	
	if (this.reached_end)
		return new Eos();
	
	var head = this.list.shift() || null;
	if (head == null)
		return new Eos();
	
	var head_plus_one = this.list.shift() || null;
	
	// Maybe it's the end of the stream ...
	//  Return the token and mark the end of the stream
	if (head_plus_one == null) {
		this.reached_end = true;
		return head;
	};

	if (head.name == 'term' || head.name == 'string') {
		if (head_plus_one.name == 'parens_open') {
			// we have found :  term(
			//  Return the parens_open
			this.list.unshift( head );
			return head_plus_one;
		};
	};
	
	this.list.unshift(head_plus_one);
	return head;
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
		if (maybe_token instanceof Eos)
			break;
		result.push(maybe_token);
	};
	
	return result;
};

if (typeof module!= 'undefined') {
	module.exports.Tpiler = Tpiler;
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
};