/**
 *  lexer.js
 *  
 *  @author: jldupont
 *  
 *  @dependency: types.js
 */

/* global Token, InComment
*/

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
	
	this.offset_in_text = 0;
	
	// Comment processing
	this.comment_start_line = 0;
	this.in_comment = false;
	this.comment_chars = "";
	
	this._tokenRegexp = /[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?|>=|=<|=\\=|=\:=|"""|\[|\]|\||\s.not\s.|\s.is\s.|\s.true\s.|\s.false\s.|\s.fail\s.|\d+(\.\d+)?|[A-Za-z_0-9]+|\?\-|:\-|\\=|=|\+\-|\*|\/|\-\+|[()\.,]|[\n\r]|./gm;
}

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
	':-':   function() { return new Token('op:rule',  ':-',     {is_operator: true}); }
	,'?-':  function() { return new Token('op:query', '?-',     {is_operator: true}); }
	,'=\\=':function() { return new Token('op:equalnot', '=\\=',{is_operator: true}); }
	,'=:=': function() { return new Token('op:equal',    '=:=', {is_operator: true}); }
	,',':   function() { return new Token('op:conj', ',',       {is_operator: true}); }
	,';':   function() { return new Token('op:disj', ';',       {is_operator: true}); }
	,'=':   function() { return new Token('op:unif', '=',       {is_operator: true}); }
	,'\\=': function() { return new Token('op:notunif', '\\=',  {is_operator: true}); }
	,'<':   function() { return new Token('op:lt',   '<',       {is_operator: true}); }
	,'>':   function() { return new Token('op:gt',   '>',       {is_operator: true}); }
	,'=<':  function() { return new Token('op:em',   '=<',      {is_operator: true}); }
	,'>=':  function() { return new Token('op:ge',   '>=',      {is_operator: true}); }
	,'-':   function() { return new Token('op:minus', '-',      {is_operator: true}); }
	,'+':   function() { return new Token('op:plus',  '+',      {is_operator: true}); }
	,'*':   function() { return new Token('op:mult',  '*',      {is_operator: true}); }
	,'/':   function() { return new Token('op:div',   '/',      {is_operator: true}); }
	,'not': function() { return new Token('op:not',   'not',    {is_operator: true}); }
	,'is':  function() { return new Token('op:is',    'is',     {is_operator: true, to_evaluate: true}); }
	,'|':   function() { return new Token('list:tail','|'  ); }
	
	,'\n':  function() { return new Token('newline'); }
	,'.':   function() { return new Token('period'); }
	,'(':   function() { return new Token('parens_open',  null); }
	,')':   function() { return new Token('parens_close', null); }
	
	,'[':   function() { return new Token('list:open',  null); }
	,']':   function() { return new Token('list:close', null); }
};

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
		
		if (t instanceof InComment)
			continue;
		
		if (t && t.name === null || t.name == 'eof')
			break;
		
		if (t !== undefined )
			list.push(t);
	};
	
	return list;
};

Lexer.InComment = new InComment();

Lexer.prototype.process_per_sentence = function() {
	
	var result = [];
	var current = [];
	var t;
	
	for (;;) {
		
		t = this.next();
		
		if (t instanceof InComment)
			continue;

		if ( t === null || t.name == 'eof') {
			if (current.length > 0)
				result.push(current);
			break;
		}
		
		if (t.name == 'newline')
			continue;
		
		if (t.name == 'period') {
			result.push(current);
			current = [];
			continue;
		}
		
		current.push( t );
	}
	
	return result;
};

/**
 *  Retrieve the next token in raw format
 *  
 *  @param {boolean} newline_as_null : emit the newline as a null
 *  
 *  @return Token | null 
 */
Lexer.prototype.step = function() {

	// we reached the end already,
	//  prevent restart
	if (this.at_the_end)
		return null;
	
	// note that regex.exec keeps a context
	//  in the regex variable itself 
	this.current_match = this._tokenRegexp.exec(this.text);
	this.offset_in_text = this._tokenRegexp.lastIndex;
	
	if (this.current_match !== null)
		return this.current_match[0];
	
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
	
	if (maybe_raw_token === null) {
		return new Token('eof');
	}
		
	var raw_token = maybe_raw_token;
	
	var current_index = this._computeIndex( this.current_match.index );
	
	/*  Accumulate comment chars
	*/
	if (this.in_comment && raw_token != '"""') {
		this.comment_chars += raw_token;
		
		if (raw_token == '\n')
			this.current_line ++;
		
		return Lexer.InComment;
	};
	
	/*  Start accumulating comment chars
	*/
	if (raw_token == '"""') {
		
		if (this.in_comment) {
			// end	
			this.in_comment = false;
			
			return_token = new Token('comment', this.comment_chars);
			return_token.col = 0;
			return_token.line = this.comment_start_line;
			return_token.offset = this.offset_in_text;
			return return_token;
			
		} else {
			// start
			this.in_comment = true;
			this.comment_start_line = this.current_line;
			this.comment_chars = "";
		}
		
		return Lexer.InComment;
	}
	
	// If we are dealing with a comment,
	//  skip till the end of the line
	if (raw_token == '%') {
		
		return_token = new Token('comment', null);
		return_token.col  = current_index;
		return_token.line = this.current_line;
		return_token.offset = this.offset_in_text;
		
		this.current_line = this.current_line + 1;
		
		var comment_chars = "";

		for(;;) {
			var char = this.step(Lexer.newline_as_null);
			if (char === null || char == "\n" || char == '\r')
				break;
			
			comment_chars += char;
		}

		return_token.value = comment_chars;
		return return_token;
	}
	
	// are we dealing with a number ?
	if (Lexer.is_number(raw_token)) {
		var number = parseFloat(raw_token);
		return_token = new Token('number', number);
		return_token.is_primitive = true;
		return_token.col = current_index;
		return_token.line = this.current_line;
		return_token.offset = this.offset_in_text;
		return return_token;
	}
	
	// are we dealing with a string ?
	//
	if (this.is_quote(raw_token)) {
		var string = "";
		var t;
		
		for (;;) {
			t = this.step();
			if (this.is_quote(t) | t == '\n' | t === null) {
				return_token = new Token('string', string);
				return_token.is_primitive = true;
				return_token.col = current_index;
				return_token.line = this.current_line;
				return_token.offset = this.offset_in_text;
				return return_token;
			} 
			string = string + t;
		}
		
	}

	function generate_new_term(value) {
		return new Token('term', value);
	}
	
	var fn = Lexer.token_map[maybe_raw_token] || generate_new_term; 
	
	return_token = fn(maybe_raw_token);	
	return_token.col = current_index;
	return_token.line = this.current_line;
	return_token.offset = this.offset_in_text;
	
	if (return_token.name == 'newline')
		this._handleNewline();
	
	return return_token;
};


if (typeof module!= 'undefined') {
	module.exports.Lexer = Lexer;
	module.exports.Token = Token;
}
