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
 *  * translate `!` to functor('cut')
 *  
 *  * translate `( exp ... )` ==> functor `ident( exp ...)` 
 *  * Translate `Token(var, name)` ==> `Var(name)` 
 *  
 *  * convert list to cons
 *     []      ==> nil
 *     [1]     ==> cons(1,nil)
 *     [1,2]   ==> cons(1,cons(2,nil))
 *     [1,2,3] ==> cons(1,cons(2,3))
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

/*
 * Get rid of all `,`
 * 
 * NOTE: not used really
 */
ParserL2.preprocess_list = function(input, index) {
	
	index = index || 0;
	
	var result = [];
	var depth  = 0;
	
	for (;;index++) {
		
		var token = input[index];
		if (!token)
			break;
		
		if (token.name == 'list:open') {
			depth++;
			result.push(token);
			continue;
		};
		
		if (token.name == 'list:close') {
			depth--;
			result.push(token);
			if (depth == 0)
				break;
			continue;
		};
		
		if (token.name == 'op:conj')
			continue;
			
		result.push(token);
	};
	
	return result;
};

ParserL2.nil = new Token('nil');

ParserL2.prototype.get_token = function() {
	
	/*
	 *  Swap Token('var', X) ==> Var(X)
	 */
	var maybe_translate_var = function(token) {
		
		if (token == null)
			return null;
		
		if (token.name == 'var') {
			var v = new Var(token.value);
			v.col = token.col;
			v.line = token.line;
			return v;
		};
		return token;
	};
	
	var token = this.tokens[this.index] || null;
	this.index = this.index + 1;
	
	return maybe_translate_var(token);
};

/**
 *  Processes the input stream assuming it is a list
 *   and returns a cons/2 structure
 * 
 * @param input
 * @param index
 * @returns { index, result }
 * 
 */
ParserL2.process_list = function(input, index) {
	
	index = index || 0;

	var token_1 = input[index];
	var token_1_name = token_1.name || null;
	
	if (token_1_name == 'nil')
		return { index: index, result: token_1};
	
	if (token_1_name != 'list:open')
		throw new ErrorExpectingListStart("Expected the start of a list, got: "+JSON.stringify(input));
	
	index++;
	
	/*
	 *  Swap Token('var', X) ==> Var(X)
	 */
	var proc_token = function(token) {
		
		if (token && token.name == 'var') {
			var v = new Var(token.value);
			v.col = token.col;
			v.line = token.line;
			return v;
		};
		return token;
	};
	
	var output =  ParserL2._process_list(function(){
		var token = input[index++];
		return proc_token(token);
	});

	//var result = (output.name == 'nil' ? output: output.args[0]); 
	
	return {index: index, result: output };
};


/*
 *  Processed a list of terms to a cons/2 structure
 *  
 */
ParserL2._process_list = function(get_token, maybe_token){

	var head = maybe_token || get_token();
	
	
	/*
	 *  Cases:
	 *  * Constant, Functor, Var, nil  ==> OK, proper head 
	 *  * list:open  ==> start a new cons/2
	 *  * list:close ==> should have been replaced already but issue `nil`
	 *                   if this wasn't done
	 *    
	 *  * op:conj    ==> Syntax Error
	 *  * list:tail
	 */

	
	while (head && (head.name == 'op:conj'))
		head = get_token();
	
	if (!head || head.name == 'nil') {
		return ParserL2.nil;
	};

	if (head.name == 'list:close') {
		return ParserL2.nil;
	};

	
	
	
	var cons = new Functor('cons');
		
	if (head.name == 'list:open') {
		var value = ParserL2._process_list( get_token );
		cons.push_arg( value );
	}
	else {
		cons.push_arg(head);
	}

	var next_token = get_token();
	
	if (next_token.name == 'list:tail') {
		next_token = get_token();
		cons.push_arg( next_token );
		
		next_token = get_token();
		if (next_token.name != 'list:close')
			throw new ErrorExpectingListEnd("Expecting list end, got:" + JSON.stringify(next_token));
		
		return cons;
	};
	
	var tail = ParserL2._process_list( get_token, next_token );
	cons.push_arg( tail );
	
	return cons;
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
	var toggle = false;
	var depth = 0;
	
	expression = new Array();
	
	for (;;) {
		
		// Pop a token from the input list
		token = this.get_token();
		
		if (token == null || token instanceof Eos)
			return this._handleEnd( expression );

		// We must ensure that a list is transformed
		//  in a cons/2 structure
		//
		
		if (token.name == 'list:open') {
			
			var lresult = ParserL2.process_list(this.tokens, this.index-1);
			this.index = lresult.index;
			expression.push(lresult.result);
			continue;
		};
		
		
		// Handle the case `(exp...)`
		//
		
		if (token.name == 'parens_open') {
			token.name = 'functor';
			token.value = 'expr';
			token.prec = 0;
			token.is_operator = false;
			token.attrs= token.attrs || {};
			token.attrs.primitive = true;
		};

		
		if (token.is_operator) {

			if (this.context.diving_functor && token.name == 'op:conj')
				continue;


			// If we are in a functor / list definition,
			//  we need to get rid of `op:conj` 
			if (this.context.diving_list) {
				
				if (token.name == 'op:conj') {
			
					var result = this._handleList();
					var new_index = result.index;
					
					this.index = new_index;
					
					var functor_node = new Functor('cons');
					functor_node.args = result.terms[0];
					functor_node.line = token.line;
					functor_node.col  = token.col;
					
					expression.push( functor_node );
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
		
		if (token.name == 'term' && token.value == '!') {
			var fcut = new Functor("cut");
			
			fcut.original_token = token;
			fcut.line = token.line;
			fcut.col  = token.col;
			expression.push( fcut );
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
