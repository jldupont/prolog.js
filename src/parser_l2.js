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
 *  * translate `fail` to functor('fail')
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

/*  global OpNode, Token, Var, Functor, Eos, Result
           ,ErrorExpectingListStart, ErrorExpectingListEnd
           ,ErrorUnexpectedParensClose, ErrorUnexpectedPeriod
           ,ErrorUnexpectedEnd, ErrorUnexpectedListEnd
           
 */

/**
 *  Parser
 *  
 *  @constructor
 *  
 *  @param token_list: the token_list
 *  @param list_index: the index to start from in the token_list
 */
function ParserL2(token_list, options) {
	
	this.options = options || {};
	
	this.tokens = token_list;
	this.index = 0;
	
	this.ptokens = [];
}

/**
 * Compute replacement for adjacent `-` & `+` tokens 
 * 
 * @param token_n
 * @param token_n1
 * 
 * @returns `+` or `-` | null
 */
ParserL2.compute_ops_replacement = function(token_n, token_n1){

	var opn;

	if (token_n.value == '-') {
		
		// not the same thing as `--`
		if (token_n1.value == '-') {
			opn = new OpNode('+', 500);
			opn.line = token_n1.line;
			opn.col  = token_n1.col;
			opn.offset = token_n1.offset;
			return opn;
		}
		
		if (token_n1.value == '+') {
			opn = new OpNode('-', 500);
			opn.line = token_n1.line;
			opn.col  = token_n1.col;
			opn.offset = token_n1.offset;
			return opn;
		}
	}

	if (token_n.value == '+') {
		
		// not the same thing as `++`
		if (token_n1.value == '+') {
			opn = new OpNode('+', 500);
			opn.line = token_n1.line;
			opn.col  = token_n1.col;
			opn.offset = token_n1.offset;
			return opn;
		}
		
		if (token_n1.value == '-') {
			opn = new OpNode('-', 500);
			opn.line = token_n1.line;
			opn.col  = token_n1.col;
			opn.offset = token_n1.offset;
			return opn;
		}
	}
	
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
		}
		
		if (token.name == 'list:close') {
			depth--;
			result.push(token);
			if (depth === 0)
				break;
			continue;
		}
		
		if (token.name == 'op:conj')
			continue;
			
		result.push(token);
	}
	
	return result;
};

ParserL2.nil = new Token('nil');


ParserL2.prototype.next = function() {

	var token = this.tokens[this.index] || null;
	this.index = this.index + 1;
	
	return token;	
};


ParserL2.prototype.regive = function() {

	this.index --;
};



ParserL2.prototype.get_token = function() {
	
	// We are removing at this layer
	//  because we might want to introduce directives
	//  at parser layer 1
	//
	var token;
	
	for(;;) {
		token = this.next();	
		
		if (!token)
			break;
		
		if (token.name != 'comment' && token.name != 'newline')
			break;
	}
	

	return token;
};

/**
 *  Processes the input stream assuming it is a list
 *   and returns a cons/2 structure
 * 
 * @param input
 * @param index
 * @returns Object
 * 
 */
ParserL2.prototype.process_list = function() {
	
	var token_1 = this.get_token();
	var token_1_name = token_1.name || null;
	
	if (token_1_name == 'nil')
		return token_1;
	
	if (token_1_name != 'list:open')
		throw new ErrorExpectingListStart("Expected the start of a list, got: "+JSON.stringify(token_1), token_1);
	
	return this._process_list();
};


/*
 *  Processed a list of terms to a cons/2 structure
 *  
 */
ParserL2.prototype._process_list = function(maybe_token){

	var head = maybe_token || this.get_token();
	
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

	function gen_nil(token) {
		var nil = new Token('nil');
		nil.line = token ? token.line: null;
		nil.col  = token ? token.col : null;
		nil.offset = token ? token.offset: null;
		return nil;
	}
	
	while (head && (head.name == 'op:conj' || head.symbol == ","))
		head = this.get_token();
	
	
	if (!head || head.name == 'nil') {
		return gen_nil(head);
	}


	if (head.name == 'list:close') {
		return gen_nil(head);
	}

	
	var res;
	
	var cons = new Functor('cons');
	cons.line = head.line;
	cons.col  = head.col;
	cons.offset = head.offset;
		
	if (head.name == 'list:open') {
		var value = this._process_list();
		cons.push_arg( value );
	}
	else {
		
		if (head.name=='functor') {
			this.regive();
			res = this._process({ process_functor: true });
			head = res.terms;
		}
		cons.push_arg( head );
	}

	var next_token = this.get_token();
	
	// I know, misleading variable name
	var previous_token = next_token;
	
	if (next_token === null)
		throw new ErrorUnexpectedEnd("Unexpected end in list definition", head);

	previous_token = next_token;

	if (next_token.name == 'list:tail') {
		
		next_token = this.get_token();

		if (next_token === null)
			throw new ErrorUnexpectedEnd("Unexpected end in list definition", previous_token);
		
		if (next_token.name == 'functor') {
			this.regive();
			res = this._process({ process_functor: true });
			next_token = res.terms;
		}

		if (next_token.name == 'list:open') {
			next_token = this._process_list();
		}

		cons.push_arg( next_token );
		
		next_token = this.get_token();
		
		if (next_token === null)
			throw new ErrorUnexpectedEnd("Unexpected end in list definition", previous_token);

		if (next_token.name != 'list:close')
			throw new ErrorExpectingListEnd("Expecting list end, got:" + JSON.stringify(next_token), next_token);
		
		return cons;
	}
	
	var tail = this._process_list( next_token );
	cons.push_arg( tail );
	
	return cons;
};


ParserL2.prototype.process = function(){
	
	this._preprocess();
	this.index = 0;
	this.tokens = this.ptokens;
	
	var res;
	var expressions = [];
	
	for (;;) {
		res = this._process();	
		
		if (res.terms.length > 0)
			expressions.push( res.terms );
		
		if ((res.last_token === null) || (res.last_token instanceof Eos))
			break;
			
	}
	
	return new Result(expressions, this.index);
};


/**
 * Process the token list
 *
 * @return Result
 */
ParserL2.prototype._process = function( ctx ){

	ctx = ctx || {};

	//console.log("_process: ", ctx);

	var expression = [];
	var token = null;
	var token_previous = null;

	for (;;) {
		
		// Pop a token from the input list
		token = this.get_token();
		
		if (token === null || token instanceof Eos) {
			
			if (ctx.diving_functor)
				throw new ErrorUnexpectedEnd("Within a Functor definition", token_previous);
			
			return new Result(expression, token);
		}

		token_previous = token;
		
		
		// A list is handled
		//  through proper 'list:open'
		//
		if (token.name == 'list:close')
			throw new ErrorUnexpectedListEnd("Close list within corresponding Open list", token);
			

		// We must ensure that a list is transformed
		//  in a cons/2 structure
		//
		if (token.name == 'list:open') {
			
			this.regive();
			
			var lresult = this.process_list();
			expression.push(lresult);
			continue;
		}
		
		// Only if we are inside a Functor
		//  definition can we safely discard the conj.
		if (ctx.diving_functor)
			if (token instanceof OpNode)
				if (token.symbol == ",")
					continue;

		
		if (token.name == 'parens_close') {
			
			// we don't need to keep the parens
			//expression.push( token );

			// Were we 1 level down accumulating 
			//  arguments for a functor ?
			if (ctx.diving_functor) {
				//console.log("_process: exiting...");
				return new Result(expression, token);	
			}

			throw new ErrorUnexpectedParensClose("Parens close without corresponding parens open", token);
		}


		// Complete an expression, start the next
		if (token.name == 'period') {
			
			if (ctx.diving_functor)
				throw new ErrorUnexpectedPeriod("Unexpected period within Functor definition", token);
				
			return new Result(expression, token);
		}
		
		if (token.name == 'functor') {
			
			var result = this._process({ diving_functor: true });

			var functor_node = new Functor(token.value);
			functor_node.args =  result.terms;
			functor_node.original_token = token;
			functor_node.line = token.line;
			functor_node.col  = token.col;
			functor_node.offset = token.offset;
			
			if (ctx.process_functor) {
				return new Result(functor_node, token);
			}
			
			expression.push( functor_node );
			continue;
		}
		
		// default is to build the expression 
		//
		expression.push( token );
		
	} // for
	
	// WE SHOULDN'T GET DOWN HERE
	
};// process

/**
 * Perform the first substitution level
 */
ParserL2.prototype._preprocess = function() {

	var token, token_next, opn;
	
	for (;;) {
		token = this.get_token();

		if (token === null)
			break;
			
		if (token instanceof Eos)
			break;
				
		if (token.name == 'var') {
			var v = new Var(token.value);
			v.col = token.col;
			v.line = token.line;
			v.offset = token.offset;
			this.ptokens.push(v);
			continue;
		}

		
		// Handle the case `(exp...)`
		//
		if (token.name == 'parens_open') {
			token.name = 'functor';
			token.value = 'expr';
			token.prec = 0;
			token.is_operator = false;
			token.attrs= token.attrs || {};
			token.attrs.primitive = true;
			this.ptokens.push(token);
			continue;
		}

		if (token.name == 'boolean') {
			
			var fbool = new Functor(""+token.value);
			fbool.attrs.primitive = true;
			//fbool.attrs.to_evaluate = true;
			fbool.original_token = token;
			fbool.line = token.line;
			fbool.col  = token.col;
			fbool.offset = token.offset;
			this.ptokens.push(fbool);
			continue;
		}
		
		if (token.name == 'term' && token.value == '!') {
			var fcut = new Functor("cut");
			fcut.attrs.primitive = true;
			fcut.original_token = token;
			fcut.line = token.line;
			fcut.col  = token.col;
			fcut.offset = token.offset;
			this.ptokens.push(fcut);
			continue;
		}

		if (token.name == 'term' && token.value == 'fail') {
			var ffail = new Functor("fail");
			ffail.attrs.primitive = true;
			ffail.original_token = token;
			ffail.line = token.line;
			ffail.col  = token.col;
			ffail.offset = token.offset;
			this.ptokens.push(ffail);
			continue;
		}

		if (token.value == "+-" || token.value == "-+") {
			opn = new OpNode("-", 500);
			opn.line = token.line;
			opn.col  = token.col;
			opn.offset = token.offset;
			this.ptokens.push(opn);
			continue;
		}


		if (token.is_operator) {
			// Look ahead 1 more token
			//  in order to handle the `- -` etc. replacements
			token_next = this.tokens[this.index] || null;
						
			if (token_next && token_next.is_operator) {
				
				var maybe_replacement_opnode = ParserL2.compute_ops_replacement(token, token_next);
				if (maybe_replacement_opnode !== null) {
					
					maybe_replacement_opnode.line = token.line;
					maybe_replacement_opnode.col  = token.col;
					
					this.ptokens.push( maybe_replacement_opnode );
					
					// Successful replacement ... consume
					this.index = this.index + 1;
					continue;
				}
			}
			
		} // token is_operator
		
		// Should we be substituting an OpNode ?
		//
		if (token.is_operator) {
			
			opn = new OpNode(token.value);
			opn.line = token.line;
			opn.col  = token.col;
			opn.offset = token.offset;
			this.ptokens.push(opn);
			continue;
		}
		

		
		this.ptokens.push(token);

		
	}
	
};

//
// =========================================================== PRIVATE
//



if (typeof module!= 'undefined') {
	module.exports.ParserL2 = ParserL2;
}
