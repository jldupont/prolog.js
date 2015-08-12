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
 *  
 *  * rearrange stream for infix notation for functors
 *    e.g.  functor(arg1, arg2, ...) ==>  functor, arg1, arg2, ...)
 *    
 *  * convert `fact` to `rule`
 *    e.g.  love(enfants).  ==>  love(enfants) :- true.
 *    
 *  * convert Term to variable
 *  
 *  @dependency: types.js
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
		if (first_character.toUpperCase() == first_character)
			head.name = 'var';
		
		if (first_character=='_' && head.value.length == 1) {
			head.name = 'var_anon';
			head.value = null;
		};
			
		
	};
		
		
	return [head];
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
