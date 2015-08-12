/**
 *  parser_l2.js
 *  
 *  @author: jldupont
 *  
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
 *  @param token_list: the token_list
 *  @param list_index: the index to start from in the token_list
 */
function ParserL2(token_list, list_index, maybe_context) {
	
	// the resulting terms list
	//
	this.result = [];
	
	this.tokens = token_list;
	this.index = list_index;
	
	this.context = maybe_context || {};
};

/**
 * Process the token list
 *
 * 1) Functor 'call' ==> Compound Term with 'down' pointer to 'Functor'
 * 
 * @return Result
 */
ParserL2.prototype.process = function(){

	var expression = null;
	var token = null;
	
	expression = new Array();
	
	for (;;) {
		
		// Pop a token from the input list
		token = this.tokens[this.index] || null;
		this.index = this.index + 1;
		
		if (token == null || token instanceof Eos)
			return this._handleEnd( expression );

		// We are removing at this layer
		//  because we might want to introduce directives
		//  at parser layer 1
		//
		if (token.name == 'comment')
			continue;
		
		if (token.name == 'newline')
			continue;
				
		if (token.name == 'parens_close') {
			expression.push( token );

			// Were we 1 level down accumulating 
			//  arguments for a functor ?
			if (this.context.diving)
				return this._handleEnd( expression );
			
			continue;
		};
			
		
		// Complete an expression, start the next
		if (token.name == 'period') {
			this.result.push( expression );
			expression = new Array();
			continue;
		};
		
		if (token.name == 'functor') {
			
			var result = this._handleFunctor();
			var new_index = result.index;
			
			// adjust our index
			this.index = new_index;
			
			var functor_node = new Functor(token.value);
			functor_node.args =  result.terms;
			functor_node.original_token = token;
			
			expression.push( functor_node );
			continue;
		};
		
		// default is to build the expression 
		//
		expression.push( token );
		
	}; // for
	
	// WE SHOULDN'T GET DOWN HERE
	
};// process

/**
 *  Handles the tokens related to a functor 'call'
 *  
 *   @return Result
 */
ParserL2.prototype._handleFunctor = function() {
	
	var parser_level_down = new ParserL2(this.tokens, 
										this.index,
										{diving: true}
										);
	
	return parser_level_down.process();
};

ParserL2.prototype._handleEnd = function(current_expression) {
	
	if (current_expression.length != 0)
		this.result.push(current_expression);
	
	if (this.context.diving)
		return new Result(current_expression, this.index);
	
	return new Result(this.result, this.index);
};

//
// =========================================================== PRIVATE
//



if (typeof module!= 'undefined') {
	module.exports.ParserL2 = ParserL2;
};
