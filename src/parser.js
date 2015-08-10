/**
 *  parser.js
 *  
 *  @author: jldupont
 *  
 *  
 *  Building blocks:
 *  * Atom
 *  * Numbers
 *  * Variables
 *  * Compound term
 *
 *  Fact is a rule with `body` = true.
 *  
 *  
 *  
 *  
 *  @dependency: types.js
 */

/**
 *  Parser
 *  
 *  @constructor
 *  
 */
function Parser(maybe_context) {
	
	this.result = [];
	this.context = maybe_context || {};
	
	this.state = Parser.step_start;
};


/**
 * Public - Pushes 1 token down the processing pipeline
 * 
 * @return Expression | Error | Eos
 */
Parser.prototype.step = function(token) {
	
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
