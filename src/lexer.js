/**
 *  lexer.js
 *  
 *  @author: jldupont
 *  
 */

function Token(name, maybe_value) {
	this.name = name;
	this.value = maybe_value || null;
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
 * @returns {Boolean}
 */
Token.check_for_match = function(input_list, expected_list){
	
	for (var index in input_list) {
		
		var input_token = input_list[index];
		var expected_token = expected_list[index] || new Token('null');
	
		if (!Token.equal(input_token, expected_token))
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
	
	this._tokenRegexp = /[A-Za-z_]+|:\-|[()\.,]|[\n]|./gm;
};


/**
 *  The supported tokens 
 */
Lexer.token_map = {
	':-': new Token('predicate')
	,'.': new Token('end')
	,',': new Token('conjunction')
	,';': new Token('disjunction')
	,'\n': new Token('newline')
	,'(': new Token('parens_open')
	,')': new Token('parens_close')
};

Lexer.newline_as_null = true;

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
	
	var match = null;
	
	// note that regex.exec keeps a context
	//  in the regex variable itself 
	match = this._tokenRegexp.exec(this.text);
	
	if (match!=null)
		return match[0];
	
	if (match == '\n')
		return null;
	
	this.at_the_end = true;
	return null;
};

Lexer.prototype.is_quote = function(character) {
	return (character == '\'' | character == '\"');
};

/**
 *  Get the next token from the text
 *  
 *  If it's a token we don't recognize,
 *   we just emit an 'atom'.
 */
Lexer.prototype.next = function() {
	
	var maybe_raw_token = this.step();
	
	if (maybe_raw_token == null)
		return new Token('null');
	
	var raw_token = maybe_raw_token;
	
	// If we are dealing with a comment,
	//  skip till the end of the line
	if (raw_token == '%') {
		
		while( this.step(Lexer.newline_as_null) != null);
		return new Token('comment');
	};
	
	// are we dealing with a string ?
	//
	if (this.is_quote(raw_token)) {
		var string = "";
		var t;
		
		for (;;) {
			t = this.step();
			if (this.is_quote(t) | t == '\n' | t == null) {
				return new Token('string', string);
			} 
			string = string + t;
		}; 
		
	};
	
	return Lexer.token_map[maybe_raw_token] || new Token('atom', maybe_raw_token);
};


if (typeof module!= 'undefined') {
	module.exports.Lexer = Lexer;
	module.exports.Token = Token;
};
