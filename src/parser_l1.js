/**
 *  parser_l1.js
 *  
 *  Parser Level 1 - making the token list more easily parsable
 *  
 *  @author: jldupont
 *  
 *  Goes through the token list and :
 *  
 *  * get rid of whitespaces
 *  * handle boolean values
 *  
 *  * rearrange stream for infix notation for functors
 *    e.g.  functor(arg1, arg2, ...) ==>  functor, arg1, arg2, ...)
 *    
 *  * convert variable
 *  
 *  @dependency: types.js
 */

/* global Eos
*/

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
	
}

/**
 *  Processes the token list 1 by 1
 *  
 *  @return [Token] | Eos | null
 */
ParserL1.prototype.next = function() {
	
	if (this.reached_end)
		return new Eos();
	
	var head;
	
	do {
		head = this.list.shift();
	} while (head === null);
	
	if (head === undefined)
		return new Eos();
		
		
	if (head.name == 'term')
		if (head.value === 'true' || head.value === 'false') {
			head.name = 'boolean';
			head.value = head.value === 'true';
		}
			
		
	// Check for whitespaces and remove
	//
	if (head.name == 'term') {
		var value_without_whitespaces = (head.value || "").replace(/\s/g, '');
		if (value_without_whitespaces.length === 0)
			return null;
	}
		
	var head_plus_one = this.list.shift() || null;
	
	// Maybe it's the end of the stream ...
	//
	if (head_plus_one === null) {
		this.reached_end = true;
	}

	if (head_plus_one && head_plus_one.name == 'list:close') {
		if (head.name == 'list:open') {
			
			//  functor(  ==>  functor
			//
			//  i.e. remove parens_open
			//
			head.name = 'nil';
			return [head];
		}
	}
	
	
	if (head_plus_one && head_plus_one.name == 'parens_open') {
		if (head.name == 'term' || head.name == 'string') {
			
			//  functor(  ==>  functor
			//
			//  i.e. remove parens_open
			//
			head.name = 'functor';
			return [head];
		}
	}
	
	// We must unshift the token
	//  as not to loose the state-machine's context
	//
	this.list.unshift(head_plus_one);

	// check for variables
	if (head.name == 'term' && head.value !== null) {
		var first_character = ""+head.value[0];
		
		if (first_character.toUpperCase() == first_character && ParserL1.isLetter(first_character))
			head.name = 'var';
		
		if (first_character=='_' && head.value.length == 1) {
			head.name = 'var';
			head.value = '_';
		}
			
		
	}
		
		
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

		if (maybe_token === null)
			continue;
		
		if (maybe_token instanceof Eos)
			break;
		
		Array.prototype.push.apply(result, maybe_token);
	}

	return result;
};

if (typeof module!= 'undefined') {
	module.exports.ParserL1 = ParserL1;
}
