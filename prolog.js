/*! prolog.js - v0.0.1 - 2015-08-20 */

var builtins = {};



if (typeof module!= 'undefined') {
	module.exports.builtins = builtins;
};


/*
 *  Database
 * 
 * @constructor
 */
function Database(access_layer) {
	this.db = {};
	this.al = access_layer;
};

/**
 *  Insert a rule/fact in the database
 *  
 *  The `root node` can be :
 *  -- Functor('rule', args...)
 *  -- Functor(X, args...)
 *  
 *  Rule:    `head :- body` 
 *   whereas `head`  is made up of `(functor args...)`
 *   
 *  The functor signature is derived 
 *   from the functor name and arity. 
 *  
 *  @param functor_signature {String}
 *  @param rule_nodes [] 
 *  @return signature
 *  @raise Error
 */
Database.prototype.insert = function(root_node){

	var functor_signature = this.al.compute_signature(root_node);
	
	var maybe_entries = this.db[functor_signature] || [];
	maybe_entries.push(root_node);
	
	this.db[functor_signature] = maybe_entries;
	
	return functor_signature;
};

Database.prototype.lookup_functor = function(functor_signature){
	
	return this.db[functor_signature] || null;
};

if (typeof module!= 'undefined') {
	module.exports.Database = Database;
};


/*
 *  Database
 * 
 * @constructor
 */
function DbAccess() {
};

/**
 * Compute the signature of the `input`
 *  whether `input` is a `fact` or a `rule`.
 *  
 *  Both are really represented by a `root node`
 *   of the type `Functor`.
 * 
 * @param input
 * @return {String}
 * @raise Error
 */
DbAccess.prototype.compute_signature = function(input) {
	
	var sig = null;
	
	try {
		var functor = this.extract_head_of_rule(input);
		sig = this.get_functor_signature(functor);
		
	} catch(e) {
		sig = this.get_functor_signature(input);
	};

	return sig;
};


/**
 * Determine if the input object
 *  consists in a `fact`
 *  
 * @param root_node
 * @return Boolean
 */
DbAccess.prototype.is_fact = function(root_node) {

	if (!(root_node instanceof Functor))
		return false;
	
	return root_node.name != 'rule';
};

/**
 * Determine if the input object
 *  consists in a `rule` 
 *  
 * @param root_node
 * @returns {Boolean}
 */
DbAccess.prototype.is_rule = function(root_node) {
	
	if (!(root_node instanceof Functor))
		return false;
	
	return root_node.name == 'rule';
};

/**
 * Extract the `head` part of a rule
 * 
 * rule :=  `head :- body`
 * 
 * @param root_node
 * @return Object (should probably just be a Functor)
 * @raise Error
 */
DbAccess.prototype.extract_head_of_rule = function(root_node) {

	if (!(root_node instanceof Functor) || (root_node.name != 'rule'))
		throw new Error("Expecting a `rule`, got: "+root_node.name);

	return root_node.args[0];
};

/**
 * Compute the signature of a functor
 * 
 * @param node
 * @return {String}
 */
DbAccess.prototype.get_functor_signature = function(node){

	if (!(node instanceof Functor))
		throw new Error("Expecting Functor, got: "+JSON.stringify(node));

	return ""+node.name+"/"+node.args.length;
};


if (typeof module!= 'undefined') {
	module.exports.DbAccess = DbAccess;
};


/**
 * Interpreter
 * @constructor
 * 
 * @param db    : Database
 * @param env   : Environment
 * @param stack : the processing stack i.e. where instructions are pushed and popped
 */
function Interpreter(db, env, stack) {
	this.exp = null;
	this.db  = db || {};
	this.env = env || {};
	this.stack = stack || [];
	
	// The index in the stack where the
	//  the input expression ends.
	// This is useful during backtracking.
	//
	this.index_of_expression_ending = 0;
};

Interpreter.prototype.get_stack = function(){
	return this.stack;
};

/**
 * Set the expression to work on
 * 
 * An expression is obtained by parsing an input string.
 * The parser pipeline (the one provided for `facts`
 *  and `rules` populating the database) should be used. 
 * 
 * Pre-processes the expression onto the provided stack
 * 
 * An expression is really made up of the parts :
 * 
 *   variant 1:  `Term.`
 *   variant 2:  `Term , Term... .`
 *   variant 3:  `Term ; Term.`
 *   variant 4:  `Term, Term ; Term.`
 *   
 * The expression should come as a rooted tree
 *  with a `Functor` instance being the root.
 * 
 * In other words, an expression is a combination of Term(s)
 *  joined by Conjunction(s) and/or Disjunction(s).
 * 
 * The pre-processing consists in linearizing the expression
 *  in pushing the resulting `instructions` (really Functors)
 *  on the provided stack. 
 * 
 * 
 * @param exp
 * @raise Error
 */
Interpreter.prototype.set_expression = function(exp) {
	
	if (!(exp instanceof Functor))
		throw new Error("Expecting a rooted tree with a Functor as root, got: "+JSON.stringify(exp));
	
	this.exp = exp;
	
	// By default, the result will be in variable `?answer`
	this._preprocess(this.exp);
};

/**
 *  Performs the first level linearization of the input expression
 *  
 *              Functor (conj | disj | atom)
 *          
 *    (func  a b c)
 *    (conj VAR1 VAR2)  (func1 x y z)  (func2 a b c)
 *    (disj VAR1 VAR2)  (func1 x y z)  (func2 a b c)
 *    
 *    Example: 
 *    
 *       goal1(X, Y), goal2(A,B) ; goal3(C,D).
 *       
 *       Parsing result:
 *       
 *       Functor(disj/2,
 *       	Functor(conj/2,
 *       		Functor(goal1/2,Token(var,X),Token(var,Y)),
 *       		Functor(goal2/2,Token(var,A),Token(var,B))),
 *       	Functor(goal3/2,Token(var,C),Token(var,D)))
 *  
 *  @raise Error
 *  
 *  Uses the provided stack to build the instructions set
 */
Interpreter.prototype._preprocess = function(node, variable_counter) {
	
	
	var is_root = variable_counter == undefined;
	variable_counter = variable_counter || 0;
	
	
	// that should happen
	if (!node)
		throw new Error("Preprocess: got an undefined node.");
	
	if (!(node instanceof Functor)) 
		throw new Error("Preprocess: expecting a Functor, got: ", node);

	
	
	
	
	// Go depth first, left first
	//
	var node_left = null, node_left_varname = null;
	
	if (node.args[0]) {
		
		if (node.args[0] instanceof Functor) {
			variable_counter = this._preprocess(node.args[0], variable_counter);
			node_left_varname = "?var"+variable_counter;
			variable_counter ++;
		} else
			node_left = node.args[0];
		
	};

	
	
	// Right-hand side
	//
	var node_right = null, node_right_varname = null;
	
	if (node.args[1]) {
		
		if (node.args[1] instanceof Functor) {
			variable_counter = this._preprocess(node.args[1], variable_counter);
			node_right_varname = "?var"+variable_counter;
			variable_counter ++;
		} else
			node_right = node.args[1];
		
	};
	
	
	// CENTER
	// =================
	
	var node_center = node_center = new Functor("call");
	
	if (is_root)
		node_center.args.push("?result");
	else
		node_center.args.push("?var"+variable_counter);
	
	node_center.args.push(node.name);
	
	if (node_left)
		node_center.args.push(node_left);
	else
		if (node_left_varname)
			node_center.args.push(new Token('var', node_left_varname));

	if (node_right)
		node_center.args.push(node_right);
	else
		if (node_right_varname)
			node_center.args.push(new Token('var', node_right_varname));
	
	this.stack.push(node_center);
	
	return variable_counter;
}; // _preprocess



/**
 * Take 1 processing step
 * 
 * @return true | false | null where `null` signifies `not done yet`
 * @raise Error
 */
Interpreter.prototype.next = function() {
	
};


if (typeof module!= 'undefined') {
	module.exports.Interpreter = Interpreter;
};


/**
 *  Lexer
 *  @constructor
 *  
 *  @param {String} | [{String}] text : the text to analyze
 */
function Lexer (text) {

	if (Array.isArray(text))
		this.text = text.join("\n"); 
	else
		this.text = text;
	
	this.at_the_end = false;
	this.current_match = null;
	this.current_line = 0;
	this.offset = 0;
	
	this._tokenRegexp = /\[|\]|\||is|\d+(\.\d+)?|[A-Za-z_0-9]+|:\-|=|\+\-|\*|\-\+|[()\.,]|[\n]|./gm;
};

Lexer.prototype._handleNewline = function(){
	this.offset = this._tokenRegexp.lastIndex;
	this.current_line = this.current_line + 1;
};

Lexer.prototype._computeIndex = function(index) {
	return index - this.offset; 
};

/**
 *  The supported tokens 
 */
Lexer.token_map = {
		
	// The operators should match with the ones supported
	//  downstream in the parsers
	// --------------------------------------------------
	':-':  function() { return new Token('op:rule', ':-', {is_operator: true}) }
	,',':  function() { return new Token('op:conj', ',',  {is_operator: true}) }
	,';':  function() { return new Token('op:disj', ';',  {is_operator: true}) }
	,'=':  function() { return new Token('op:unif', '=',  {is_operator: true}) }
	,'-':  function() { return new Token('op:minus', '-', {is_operator: true}) }
	,'+':  function() { return new Token('op:plus',  '+', {is_operator: true}) }
	,'*':  function() { return new Token('op:mult',  '*', {is_operator: true}) }
	,'is': function() { return new Token('op:is',    'is',{is_operator: true}) }
	,'|':  function() { return new Token('list:tail','|'  ) }
	
	,'\n': function() { return new Token('newline') }
	,'.':  function() { return new Token('period') }
	,'(':  function() { return new Token('parens_open',  null, {is_operator: true}) }
	,')':  function() { return new Token('parens_close', null, {is_operator: true}) }
	
	,'[':  function() { return new Token('list:open',  null) }
	,']':  function() { return new Token('list:close', null) }
};

Lexer.newline_as_null = true;

/**
 * Retrieves all tokens from the stream.
 * 
 * This function is useful for tests.
 * 
 * @returns {Array}
 */
Lexer.prototype.process = function() {
	
	var list = [];
	var t;
	
	for (;;) {
		t = this.next();
		
		if (t.name == 'null' | t.name == 'eof')
			break;
		
		list.push(t);
	};
	
	return list;
};

/**
 *  Retrieve the next token in raw format
 *  
 *  @param {boolean} newline_as_null : emit the newline as a null
 *  
 *  @return Token | null 
 */
Lexer.prototype.step = function(newline_as_null) {

	// we reached the end already,
	//  prevent restart
	if (this.at_the_end)
		return null;
	
	// note that regex.exec keeps a context
	//  in the regex variable itself 
	this.current_match = this._tokenRegexp.exec(this.text);
	
	if (this.current_match != null)
		return this.current_match[0];
	
	if (this.current_match == '\n' && newline_as_null)
		return null;
	
	this.at_the_end = true;
	return null;
};

Lexer.prototype.is_quote = function(character) {
	return (character == '\'' | character == '\"');
};

Lexer.is_number = function(maybe_number) {
	return String(parseFloat(maybe_number)) == String(maybe_number); 
};

/**
 *  Get the next token from the text
 *  
 *  If it's a token we don't recognize,
 *   we just emit an 'atom'.
 *   
 *   @return Token
 */
Lexer.prototype.next = function() {
	
	var return_token = null;
	
	var maybe_raw_token = this.step();
	
	if (maybe_raw_token == null)
		return new Token('eof');
	
	var raw_token = maybe_raw_token;
	
	var current_index = this._computeIndex( this.current_match.index );
	
	// If we are dealing with a comment,
	//  skip till the end of the line
	if (raw_token == '%') {
		
		return_token = new Token('comment', null);
		return_token.col  = current_index;
		return_token.line = this.current_line;
		
		this.current_line = this.current_line + 1;
		
		while( this.step(Lexer.newline_as_null) != null);
		return return_token;
	};
	
	// are we dealing with a number ?
	if (Lexer.is_number(raw_token)) {
		var number = parseFloat(raw_token);
		return_token = new Token('number', number);
		return_token.is_primitive = true;
		return_token.col = current_index;
		return_token.line = this.current_line;
		return return_token;
	};
	
	// are we dealing with a string ?
	//
	if (this.is_quote(raw_token)) {
		var string = "";
		var t;
		
		for (;;) {
			t = this.step();
			if (this.is_quote(t) | t == '\n' | t == null) {
				return_token = new Token('string', string);
				return_token.is_primitive = true;
				return_token.col = current_index;
				return_token.line = this.current_line;
				return return_token;
			} 
			string = string + t;
		}; 
		
	};

	function generate_new_term(value) {
		return new Token('term', value);
	};
	
	var fn = Lexer.token_map[maybe_raw_token] || generate_new_term; 
	
	return_token = fn(maybe_raw_token);	
	return_token.col = current_index;
	return_token.line = this.current_line;
	
	if (return_token.name == 'newline')
		this._handleNewline();
	
	return return_token;
};


if (typeof module!= 'undefined') {
	module.exports.Lexer = Lexer;
	module.exports.Token = Token;
};

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
		
	// Check for whitespaces and remove
	if (head.name == 'term') {
		var value_without_whitespaces = (head.value || "").replace(/\s/g, '');
		if (value_without_whitespaces.length == 0)
			return null;
	};
		
	var head_plus_one = this.list.shift() || null;
	
	// Maybe it's the end of the stream ...
	//
	if (head_plus_one == null) {
		this.reached_end = true;
		return [head];
	};

	if (head_plus_one.name == 'parens_open') {
		if (head.name == 'term' || head.name == 'string') {
			
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

	// check for variables
	if (head.name == 'term' && head.value != null) {
		var first_character = ""+head.value[0];
		
		if (first_character.toUpperCase() == first_character && ParserL1.isLetter(first_character))
			head.name = 'var';
		
		if (first_character=='_' && head.value.length == 1) {
			head.name = 'var_anon';
			head.value = null;
		};
			
		
	};
		
		
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
			
			if (token_next.is_operator) {
				
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

/**
 *  Parser
 *  
 *  @constructor
 *  
 *  @param expression_list: the list of expressions
 *  @param operators_list : the precedence ordered list of operators
 *  @param maybe_context
 */
function ParserL3(expressions, operators_list, maybe_context) {
	
	this.op_list = operators_list;
	this.expressions = expressions;
};

/**
 * Process the expression list
 *
 * - Order operator list from least to highest precedence
 * - For each operator,
 *
 * @return [result]
 */
ParserL3.prototype.process = function(){

	var result = [];
	
	for (var op_index in this.op_list) {
		var opcode = this.op_list[op_index]; 
		
		for (var index=0; index < (this.expressions).length; index++) {
						
			// go around doing object deep copy
			//
			var expression = result[index] || this.expressions[index];
			
			var r = ParserL3.process_expression(opcode, expression);
			result[index] = r;
		};
		
	};// ops
	
	return result;
	
};// process

/**
 *  @return [terms]
 */
ParserL3.process_expression = function(opcode, expression){

	var result;

	for(;;) {

		// Let's bypass the need to perform
		//  deep copy of objects
		//
		var expr = result || expression; 
	
		var tresult = ParserL3._process_expression(opcode, expr);
		var current_count_of_opnodes_processed = tresult[1];
		
		result = tresult[0];
		
		// we didn't make any progress... bail out
		//
		if (current_count_of_opnodes_processed == 0)
			break;
		
	}; //for;;
	
	return result;
	
};


ParserL3._process_expression = function(opcode, expression){
	
	var result = [];
	var processed_nodes = 0;
	
	for (var node_index=0; node_index < expression.length; node_index++) {
		
		var node = expression[node_index];
			
		// The Token(sep) is not helpful anymore
		if (node instanceof Token)
			if (node.name == 'sep')
				continue;
		
		// The recursion case first of course
		if (node instanceof Functor) {
			var exp_from_args = node.args;
			var fresult = ParserL3.process_expression(opcode, exp_from_args);
			node.args = fresult; 
		};
		
		if (!(node instanceof OpNode)) {
			result.push(node);
			continue;
		};
			
		
		// Is it the sort of operator we are
		//  interested in at this point?
		
		if (opcode.symbol != node.symbol) {
			result.push(node);
			continue;
		};
		
		
		// We need to get the proper precedence
		//  for the operator we which to be processing for
		//
		// The unary operators come with `null` as precedence
		//  because the parser needs to figure out if it's really
		//  used in the unary or infix context.
		//
		var opnode_center = OpNode.create_from_name(opcode.name);

		
		// gather 'node left' and 'node right'
		//
		// If `node_left` is undefined, it is marked as `` in the type
		//
		// We use the `result` array because we are replacing `in place`
		//  the nodes of the expression.
		//
		var node_left  = result[node_index - 1 ];
		var node_right = expression[node_index + 1 ];
		
		
		// A good dose of complexity goes on here
		//
		var type   = Op.classify_triplet(node_left, opnode_center, node_right);
		var compat = Op.are_compatible_types(type, opcode.type);
		
		if (!compat) {
			result.push(node);
			continue;
		};

		
		processed_nodes++;
		
		// We have compatibility and thus
		//  substitute for a Functor
		// We only have 2 cases:
		//  pattern 1:  `F_`  : a unary operator
		//  pattern 2:  `_F_` : a infix operator
		
		var functor = new Functor(opcode.name);
		functor.col = node.col;
		functor.line = node.line;
		
		if (Op.is_unary(opcode.type)) {
			functor.args = [node_right];
		} else {
			// we've already pushed node_left... remove it
			result.pop();
			functor.args = [node_left, node_right];
		};

		result.push(functor);
		node_index++;			

	}; // expression	
	
	return [result, processed_nodes];
};

//
// =========================================================== PRIVATE
//



if (typeof module!= 'undefined') {
	module.exports.ParserL3 = ParserL3;
};

/**
 *  Token
 *  
 *  name  : the name assigned to the Token
 *  value : the value of the token
 *  col : where on the line the token was found
 */
function Token(name, maybe_value, maybe_attrs) {
	
	maybe_attrs = maybe_attrs || {}; 
	
	this.name = name;
	this.value = maybe_value || null;
	
	// Precedence - this is fixed for Tokens
	//  until possibly later in the parsing pipeline
	this.prec = 0;
	
	// Position in input stream
	this.line = maybe_attrs.line || 0;
	this.col  = maybe_attrs.col || 0;
	
	this.is_primitive = maybe_attrs.is_primitive || false;
	this.is_operator =  maybe_attrs.is_operator || false;
	
};

Token.prototype.inspect = function(){
	return "Token("+this.name+","+this.value+")";
};

/**
 * Check for token equality
 * 
 * @param t1
 * @param t2
 * @returns {Boolean}
 */
Token.equal = function(t1, t2) {
	return ((t1.name == t2.name) && (t1.value == t2.value));
};

/**
 * Check for match between the list of tokens
 * 
 * @param input_list
 * @param expected_list
 * @param also_index : the also check the index of the token in the input stream (used for tests mainly)
 * 
 * @returns {Boolean}
 */
Token.check_for_match = function(input_list, expected_list, also_index){
	
	also_index = also_index || false;
	
	if (input_list.length != expected_list.length) {
		//console.log("match: list not same length");
		return false;
	}
		
	
	for (var index in input_list) {
		
		var input_token = input_list[index];
		var expected_token = expected_list[index] || new Token('null');
	
		if (!Token.equal(input_token, expected_token)) {
			console.log("match fail: "+JSON.stringify(input_token));
			return false;
		}
			
		
		if (also_index)
			if (input_token.col != expected_token.col) {
				//console.log("match: col mismatch: "+ JSON.stringify(input_token));
				return false;
			}
				
				
	};
	
	return true;
};


function Result(term_list, last_index) {
	this.terms = term_list;
	this.index = last_index;
};


/**
 * Operator
 * @constructor
 */
function Op(name, symbol, precedence, type) {
	this.name = name;
	this.symbol = symbol;
	this.prec = precedence;
	this.type = type;
	
	// from the lexer
	this.line = 0;
	this.col  = 0;
};

Op.prototype.inspect = function() {
	return "Op("+this.name+")";
};

/**
 *  aFb --> [a, F, b]
 *   Fb --> [null, F, b]
 *  aF  --> [a, F, null]
 * 
 *  @return [A, B, C]
 */
Op.parts = function(type) {
	
	var parts = type.split("");
	if (parts[0] == 'f')
		return [null, parts[0], parts[1]];
	
	return [parts[0], parts[1], parts[2] || null];
};

Op.AMBIGUOUS_PRECEDENCE = true;

//Initialize the operators

/*
 * Precedence is an integer between 0 and 1200. 
 * 
 * Type is one of: xf, yf, xfx, xfy, yfx, fy or fx. 
 * 
 * The `f' indicates the position of the functor, 
 *  while x and y indicate the position of the arguments. 
 *  `y' should be interpreted as 
 *    ``on this position a term with precedence lower or equal 
 *    to the precedence of the functor should occur''. 
 * 
 * For `x' the precedence of the argument must be strictly lower. 
 *  
 * The precedence of a term is 0, unless its principal functor is an operator, 
 *  in which case the precedence is the precedence of this operator. 
 *   
 *   A term enclosed in parentheses ( ... ) has precedence 0.
 */
Op._list = [ 
	    new Op("rule",    ':-', 1200, 'xfx')
	   ,new Op("disj",    ';',  1100, 'xfy')
	   ,new Op("conj",    ',',  1000, 'xfy')
	   ,new Op("unif",    '=',   700, 'xfx')
	   ,new Op("is",      'is',  700, 'xfx')
	    
	   ,new Op("minus",   '-',   500, 'yfx')
	   ,new Op("plus",    '+',   500, 'yfx')
	   ,new Op("mult",    '*',   400, 'yfx')
	    
	   ,new Op("uminus",   '-',  200, 'fy')
	   ,new Op("uplus",    '+',  200, 'fy') 
	  ]; 

Op._amap = {
		 '-':  { ambiguous_precence: true}
		,'+':  { ambiguous_precence: true}
};

Op.has_ambiguous_precedence = function(symbol) {
	return Op._amap[symbol] || false;
};

/*
 *  Various Inits
 * 
 *  * an ordered list of operators
 *    from least to highest precedence
 *    
 *  * map by name
 */
(function(){
	
	Op.map_by_symbol = {};
	Op.map_by_name = {};
	Op.ordered_list_by_precedence = [];
	
	for (var index in Op._list) {
		var o = Op._list[index];
		
		Op.ordered_list_by_precedence.push(o);
		Op.map_by_name [ o.name ] = o;
		Op.map_by_symbol[ o.symbol ] = o;
	};
	
	Op.ordered_list_by_precedence.sort(function(a, b){
		return (a.prec - b.prec);
	});
	
})();





/**
 *  Classify a triplet of nodes
 *  
 *  The node_center is determined i.e. it needs to be
 *   a fully configured OpNode with precedence & type.
 *  
 *  
 *  If node has strictly lower precedence than node_center => `x`
 *  If node has lower or equal precedence than node_center => `y`
 *  If node has higher precedence than node_center => ``
 * 
 * @param node_left   : the node on the lefthand side
 * @param node_center : should be an OpNode
 * @param node_right  : the node on the righthand side
 * 
 * @return String (e.g. xfx, yfx etc.) | null
 */
Op.classify_triplet = function (node_left, node_center, node_right) {

	if (!(node_center instanceof OpNode))
		throw Error("Expecting an OpNode from node_center: " + JSON.stringify( node_center));

	if (node_center.prec == null)
		throw Error("Expecting a valid OpNode for node_center: "+JSON.stringify( node_center ));
	
	return Op.__classify(node_left, node_center, node_right);
};

// PRIVATE METHOD
//
Op.__classify = function(node_left, node_center, node_right){
	
	var pc = node_center.prec;
	var result = "";
	
	try {
		if (node_left)
			if (node_left.prec == pc)
				result += "y";
			else
				if (node_left.prec < pc)
					result += "x";
		
	} catch(e) {}; // we anyhow need to report ``
	
	result += 'f';
	
	try {
		if (node_right)
			if (node_right.prec == pc)
				result += 'y';
			else if (node_right.prec < pc)
				result += 'x';
	} catch(e) {};

	return result;
};

/**
 * Figure out if a type is unary
 * 
 * @param type
 * @return Boolean
 */
Op.is_unary = function(type) {
	return  (""+type)[0] == 'f';
};

/**
 * TODO: maybe use an object for map ?
 * 
 * @param input_st
 * @param expected_st
 * @returns {Boolean}
 */
Op.is_compatible_subtype = function(input_st, expected_st) {

	if (expected_st == null)
		if (input_st !=null)
			return false;
	
	if (input_st == null)
		if (expected_st != null)
			return false;
	
	if (input_st == 'y')
		if (expected_st == 'x')
			return false;
	
	// e.g. f == f
	return true;
};

/**
 *   an `x` can also count for `y`
 *   but not the converse
 * 
 *   @param input_type:    the type to check against
 *   @param expected_type: the reference type
 *   @return true | false
 */
Op.are_compatible_types = function(input_type, expected_type) {
	
	var parts_input  = Op.parts( input_type );
	var parts_expect = Op.parts( expected_type );
	
	return Op.is_compatible_subtype(parts_input[0], parts_expect[0]) &&
			Op.is_compatible_subtype(parts_input[1], parts_expect[1]) &&
			Op.is_compatible_subtype(parts_input[2], parts_expect[2]);
};


/**
 * OpNode
 * @constructor
 */
function OpNode(symbol, maybe_precedence) {
	
	this.symbol = symbol;
	
	// specifically designed
	//  so this causes a 'burst' if not initialized
	//  correctly during the processing
	this.prec   = maybe_precedence || null;
	
	// attempt to look-up precedence
	if (this.prec == null) {
		var result = Op.has_ambiguous_precedence(symbol); 
		try {
			if (result === false)
				this.prec = Op.map_by_symbol[symbol].prec;
		} catch(e) {
			throw new Error("Can't find `" + symbol +"` in Op.map_by_symbol");
		}
	};
};

OpNode.prototype.inspect = function(){
	return "OpNode(`"+this.symbol+"`,"+this.prec+")";
};

/**
 * Create an OpNode from a name 
 */
OpNode.create_from_name = function(name) {
	var op = Op.map_by_name[name];
	
	if (!op)
		throw new Error("OpNode.create_from_name: expecting a valid 'name', got: "+name);
	
	return new OpNode(op.symbol, op.prec);
};



// End of stream
function Eos () {};

Eos.prototype.inspect = function () {
	return "Eos";
};

function Nothing () {};

/**
 *  Functor
 *  @constructor
 *  
 *  @param name: the functor's name
 *  @param maybe_arguments_list : an optional arguments list
 *          (useful during debugging)
 */
function Functor(name, maybe_arguments_list) {
	
	this.name = name;
	this.original_token = null;
	this.prec = 0;
	
	// from the lexer
	this.line = 0;
	this.col  = 0;
	
	// remove the first parameter of the constructor
	if (arguments.length > 1)
		this.args = Array.prototype.splice.call(arguments, 1);
	else
		this.args = [];
};

Functor.prototype.inspect = function(){
	return "Functor("+this.name+"/"+this.args.length+this.format_args()+")";
};

Functor.prototype.format_args = function () {
	
	var result = "";
	for (var index =0; index<this.args.length; index++) {
		var arg = this.args[index];
		
		if (arg && arg.inspect)
			result += ","+arg.inspect();
		else
			result += ","+JSON.stringify(arg);
	};
	
	return result;
};

Functor.prototype.get_args = function(){
	return this.args;
};

Functor.prototype.push_arg = function(arg) {
	this.args.push(arg);
};


if (typeof module!= 'undefined') {
	module.exports.Nothing = Nothing;
	module.exports.Eos = Eos;
	module.exports.Functor = Functor;
	module.exports.Op = Op;
	module.exports.OpNode = OpNode;
	module.exports.Result = Result;
};