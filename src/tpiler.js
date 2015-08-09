/**
 *  tpiler.js
 *  
 *  Transpiler - making the lexicographical list more easily parsable
 *  
 *  @author: jldupont
 *  
 *  Goes through the token list and :
 *  * rearrange stream for infix notation for functors
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
