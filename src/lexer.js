/**
 *  lexer.js
 *  
 *  @author: jldupont
 *  
 *  In prolog, we have the following tokens:
 *  
 *  :-    a rule
 *  .     fact or rule terminator
 *  ,     conjunction
 *  ;     disjunction
 *  
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
 *  Retrieve the next token
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

/**
 *  Get the next token from the text
 */
Lexer.prototype.next_token = function() {
	
	var maybe_raw_token = this.next();
	var maybe_token = Lexer.token_map[maybe_raw_token] || new Token('atom', maybe_raw_token);
	
	return maybe_token;
};


if (typeof module!= 'undefined') {
	module.exports.Lexer = Lexer;
};
