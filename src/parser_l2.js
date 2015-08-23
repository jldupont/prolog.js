/**
 *  parser_l2.js
 *  
 *  @author: jldupont
 *  
 *  
 *  * strip comments
 *  * strip newlines
 *  * build Functor, get rid of parens
 *  * build list functor, get rid of []
 *  * build OpNode
 *  * replace `- -` with `+`
 *  * replace `- +` with `-`
 *  * replace `-+`  with `-` *  
 *  * replace `+ -` with `-`
 *  * replace `+ +` with `+`
 *  * replace `+-`  with `-`
 *  
 *  * translate `( exp ... )` ==> functor `ident( exp ...)` 
 *  * Translate `Token(var, name)` ==> `Var(name)` 
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
	this.index = list_index || 0;
	
	this.context = maybe_context || {};
};

/**
 * Compute replacement for adjacent `-` & `+` tokens 
 * 
 * @param token_n
 * @param token_n1
 * 
 * @returns `+` or `-` | null
 */
ParserL2.compute_ops_replacement = function(token_n, token_n1){

	if (token_n.value == '-') {
		
		// not the same thing as `--`
		if (token_n1.value == '-') {
			return new OpNode('+', 500);
		};
		
		if (token_n1.value == '+') {
			return new OpNode('-', 500);
		};
	};

	if (token_n.value == '+') {
		
		// not the same thing as `++`
		if (token_n1.value == '+') {
			return new OpNode('+', 500);
		};
		
		if (token_n1.value == '-') {
			return new OpNode('-', 500);
		};
	};
	
	return null;
};

/**
 * Process the token list
 *
 * @return Result
 */
ParserL2.prototype.process = function(){

	var expression = null;
	var token = null;
	var token_next = null;
	
	expression = new Array();
	
	for (;;) {
		
		// Pop a token from the input list
		token = this.tokens[this.index] || null;
		this.index = this.index + 1;
		
		if (token == null || token instanceof Eos)
			return this._handleEnd( expression );

		// Translate Token for variable to Var
		if (token.name == 'var') {
			var v = new Var(token.value);
			v.col = token.col;
			v.line = token.line;
			expression.push(v);
			continue;
		};
		
		// Handle the case `(exp...)`
		//
		
		if (token.name == 'parens_open') {
			token.name = 'functor';
			token.value = 'expr';
			token.prec = 0;
			token.is_operator = false;
		};
		
		if (token.is_operator) {

			// If we are in a functor definition,
			//  we need to swap `op:conj` for a separator token
			if (this.context.diving_functor || this.context.diving_list) {
				if (token.name == 'op:conj') {
					token.is_operator = false;
					token.name = 'sep';
					expression.push(token);
					continue;
				};
					
			};
			
			
			// Look ahead 1 more token
			//  in order to handle the `- -` etc. replacements
			token_next = this.tokens[this.index] || null;
			
			if (token_next && token_next.is_operator) {
				
				var maybe_replacement_opnode = ParserL2.compute_ops_replacement(token, token_next);
				if (maybe_replacement_opnode != null) {
					
					maybe_replacement_opnode.line = token.line;
					maybe_replacement_opnode.col  = token.col;
					
					expression.push( maybe_replacement_opnode );
					this.index = this.index + 1;
					continue;
				}
			};
			
		}; // token is_operator
		
		
		if (token.value == "+-" || token.value == "-+") {
			var opn = new OpNode("-", 500);
			opn.line = token.line;
			opn.col  = token.col;
			expression.push( opn );
			continue;
		};
		
		
		// We are removing at this layer
		//  because we might want to introduce directives
		//  at parser layer 1
		//
		if (token.name == 'comment')
			continue;
		
		if (token.name == 'newline')
			continue;
				
		if (token.name == 'parens_close') {
			
			// we don't need to keep the parens
			//expression.push( token );

			// Were we 1 level down accumulating 
			//  arguments for a functor ?
			if (this.context.diving_functor)
				return this._handleEnd( expression );
			
			continue;
		};

		if (token.name == 'list:close') {
			
			if (this.context.diving_list)
				return this._handleEnd( expression );
			continue;
		};

		
		
		// Should we be substituting an OpNode ?
		//
		if (token.is_operator) {
			
			var opn = new OpNode(token.value);
			opn.line = token.line;
			opn.col  = token.col;
			expression.push( opn );
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
			functor_node.line = token.line;
			functor_node.col  = token.col;
			
			expression.push( functor_node );
			continue;
		};
		
		// Handle list
		//
		if (token.name == 'list:open') {
			
			var result = this._handleList();
			var new_index = result.index;
			
			this.index = new_index;
			
			var functor_node = new Functor('list');
			functor_node.args = result.terms[0];
			functor_node.line = token.line;
			functor_node.col  = token.col;
			
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
										{diving_functor: true}
										);
	
	return parser_level_down.process();
};

/**
 *  Handles the tokens related to a list
 *  
 *   @return Result
 */
ParserL2.prototype._handleList = function() {
	
	var parser_level_down = new ParserL2(this.tokens, 
										this.index,
										{diving_list: true}
										);
	
	return parser_level_down.process();
};


ParserL2.prototype._handleEnd = function(current_expression) {
	
	if (current_expression.length != 0)
		this.result.push(current_expression);
	
	if (this.context.diving_functor)
		return new Result(current_expression, this.index);
	
	return new Result(this.result, this.index);
};

//
// =========================================================== PRIVATE
//



if (typeof module!= 'undefined') {
	module.exports.ParserL2 = ParserL2;
};
