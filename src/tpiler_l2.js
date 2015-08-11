/**
 *  tpiler_l2.js
 *  
 *  Transpiler Level 2
 *  
 *  @author: jldupont
 *  
 *  Goes through the token list and :
 *  
 *  * converts operator Tokens to Op type instances
 *  * 
 *  
 *  @dependency: types.js
 */

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
