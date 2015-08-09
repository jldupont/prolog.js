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
 *  Lexer
 *  @constructor
 *  
 *  @param {String} text : the text to analyze
 */
function Lexer (text) {
	this.text = text;
	
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

/**
 *  Retrieve the next token in raw format
 *  
 *  @return Token | null 
 */
Lexer.prototype.next = function() {

	var match = null;
	
	// note that regex.exec keeps a context
	//  in the regex variable itself 
	match = this._tokenRegexp.exec(this.text);
	
	if (match!=null)
		return match[0];
	
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
Lexer.prototype.next_token = function() {
	
	var maybe_raw_token = this.next();
	
	if (maybe_raw_token == null)
		return new Token('null');
	
	var raw_token = maybe_raw_token;
	
	// are we dealing with a string ?
	//
	if (this.is_quote(raw_token)) {
		var string = "";
		var t;
		
		for (;;) {
			t = this.next();
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
