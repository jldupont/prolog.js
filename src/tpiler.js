/**
 *  tpiler.js
 *  
 *  Transpiler - making the token list more easily parsable
 *  
 *  @author: jldupont
 *  
 *  Goes through the token list and :
 *  * rearrange stream for infix notation for functors
 *    e.g.  functor(arg1, arg2, ...) ==>  (functor, arg1, arg2, ...)
 *    
 *  * convert `fact` to `rule`
 *    e.g.  love(enfants).  ==>  love(enfants) :- true.
 *  
 *  @dependency: types.js
 */

/**
 * Tpiler
 * 
 * @constructor
 */
function Tpiler(token_list) {
	this.list = token_list;
	this.reached_end = false;
	this.found_rule = false;
};

/**
 *  Handle the cases 
 *    (1) end of stream
 *    (2) end of expression
 *  
 *  If the expression was a 'fact', turn it to
 *   the form of rule with 'true'.
 *   
 */
Tpiler.prototype.handle_end = function() {
	
};

/**
 *  Processes the token list 1 by 1
 *  
 *  @return [Token] | Eos
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
		
		if (!this.found_rule) {
			
			this.found_rule = false;
			
			return [ new Token('rule', null, 0), 
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
	//  Check if we need to turn a 'fact' to a 'rule' with 'true'.
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
		if (maybe_token instanceof Eos)
			break;
		
		Array.prototype.push.apply(result, maybe_token);
	};

	return result;
};

if (typeof module!= 'undefined') {
	module.exports.Tpiler = Tpiler;
};
