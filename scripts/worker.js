/**
 *   Main file for worker.js
 * 
 *   Input Messages:
 *   ===============
 * 
 *   - code     : provide user or builtin code
 *   - run      : execute a number of instructions
 *   - redo     : attempt to find another solution
 *   - question : provide the question/query
 * 
 * 
 *   Output Messages:
 *   ================
 * 
 *   - pr_question_ok
 *   - pr_result   : the interpreter shares a solution
 *   - pr_paused   : the interpreter finished running 
 *                    the specified number of steps
 * 
 *   - pr_error : the compiler / interpreter encountered an error 
 * 
 * 
 *   States:
 *   =======
 * 
 *   - running : the interpreter is running
 *   - paused  : the interpreter is paused
 *   - result  : the interpreter provided a solution
 *   - end     : the query can no longer provide any solution
 *   - error   : the interpreter is in error state
 * 
 *   State "Error"
 *   =============
 * 
 *   Possible causes:
 *   - 
 * 
 */

/* global Database, DbAccess, DatabaseManager, Interpreter, Prolog
            Functor, Var, Token
*/

addEventListener('message', function(msg_enveloppe) {
    console.debug("Worker message: ", msg_enveloppe);
    
    var msg = msg_enveloppe.data;
    
    if (msg.type == 'code') {
        store_code(msg);
        return;
    }


    if (msg.type == 'run') {
        do_run(msg);
        return;
    }
 
 
   if (msg.type == 'redo') {
        do_redo();
        return;
    }
 
 
});






var db_user     = new Database(DbAccess);
var db_builtins = new Database(DbAccess);

var dbm = new DatabaseManager( db_builtins, db_user );

var interpreter = new Interpreter(db_user, db_builtins);


/**
 *  Receive 'text code' from the main thread
 *  Compile
 *  Put in db
 */
function store_code(msg) {

    Functor.inspect_compact_version = true;
    Functor.inspect_cons = true;
    Var.inspect_compact = true;
    Token.inspect_compact = true;


    if (msg.code_type == 'user')
        db_user.clear();    
        
    //console.debug("Worker: storing code: ", msg.code_type);
    
    var parsed_text = Prolog.parse_per_sentence(msg.code_text);

    //console.log("Worker, parsed: ", parsed_text);

    // there should not be any errors
    //  because checks are performed on the main thread side
    
    
    var codes = Prolog.compile_per_sentence(parsed_text);
    
    //console.log("Worker, codes: ", codes);
    
    put_code_in_db(msg.code_type, codes);

}


function put_code_in_db(code_type, codes) {

    for (var index=0; index<codes.length; index++) {
        var code = codes[index];
        var f = code.code.f;
        var a = code.code.a;
        
        if (code.code.is_query) {
            interpreter.set_question(code.code);
            
            postMessage({
                type: 'pr_question_ok'
            });
            return;
        }
        
        
        //console.debug("Worker: Storing ", code_type," code: f/a: ", f, a);    

        if (code_type == 'user')
            dbm.user_insert_code(f, a, code.code);
        else
            dbm.builtin_insert_code(f, a, code.code);
    }
    
}



function do_run(msg) {
    
    var steps   = msg.steps    || 10000;
    var ref     = msg.ref      || 0;

    var result;

    for (var count = 0 ; count<steps; count++)
        try {
            
            result = interpreter.step();
            
        } catch(e) {
            
            console.log(e);
            
            postMessage({
                 type: 'pr_error'
                ,error: JSON.stringify(e)
            });
            return;
        }
    
    if (result) {
        // the end has been reached ... a result should be available

        //console.log("Worker Stack:   ", interpreter.get_stack());
        //console.log("Worker Context: ", interpreter.ctx);

        var vars = interpreter.get_query_vars();
        var varss = {};
        
        for (var key in vars) {
            
            var value = vars[key];
            
            varss[key] = value.inspect ? value.inspect() : JSON.stringify(value);
        }
            

        postMessage({
            type: 'pr_result'
            ,ref: ref
            ,state: interpreter.get_context().cu
            ,step_count: interpreter.ctx.step_counter
            ,vars: varss
        });

         
    } else {
        
        postMessage({
            type: 'pr_paused'
            ,ref:  ref
            ,step_count: interpreter.ctx.step_counter
        });
        
    }
    
}


function do_redo() {
    
    var result = interpreter.backtrack();
    
    postMessage({
         type:   'pr_redo'
        ,result: result
    });
    
}
/*! prolog.js - v0.0.1 - 2015-10-24 */

/* global Lexer, ParserL1, ParserL2, ParserL3 */
/* global Op, Compiler, Code, Functor
          ,ParseSummary
          ,ErrorRuleInQuestion, ErrorInvalidFact
*/
 
var Prolog = {};



/**
 *   Parse sentence by sentence
 *    and return a per-sentence summary of errors, if any.
 * 
 *  @param is_query: true --> indicates the parsing should assume
 *                            the input text constitutes a query
 *
 *  A query cannot take the form of a 'rule' and can only be 1 expression.
 * 
 *  @return { sentences: [ ParseSummary ] , is_error: true|false }
 * 
 */ 
Prolog.parse_per_sentence = function(input_text, is_query) {

    is_query = is_query || false;

    var result = { 
                    // ParseSummary items
                    sentences: [ ], 
                    
                    // Is there at least 1 error in ParseSummary entries?
                    is_error: false
    };

	var l = new Lexer(input_text);
	var sentences = l.process_per_sentence();
    
    var p1, p2, p3;
    var p1t, p2t, p3t;
    
    for (var index = 0; index<sentences.length; index++) {
        var sentence = sentences[index];
     
        try {   
            p1  = new ParserL1(sentence);
            p1t = p1.process();
            
            p2  = new ParserL2(p1t);
            p2t = p2.process().terms;
            
            p3  = new ParserL3(p2t, Op.ordered_list_by_precedence);
            p3t = p3.process();

            if (!p3t || !p3t[0])
                continue;
            
            var root_functor = p3t[0][0];
            
            if (!root_functor)
                continue;

            if (is_query)
                if (root_functor.name == 'rule')
                    throw new ErrorRuleInQuestion("Rule in Query", root_functor);
            
            if (root_functor.name != 'rule')
                if (root_functor.name == 'conj' || root_functor.name == 'disj')
                    throw new ErrorInvalidFact("Can not include conj or disj", root_functor);
            
            // we should only get 1 root Functor per sentence
            if (root_functor)
                result.sentences.push( new ParseSummary(null, root_functor) );
                
            
        } catch(e) {
            result.sentences.push(new ParseSummary(e));
            result.is_error = true;
        }   
        
    }
    
    return result;
};

/**
 *  Compiles a list of sentences
 *  
 *  `sentence` is really an object Functor
 * 
 *  @param parsed_sentences: [ sentence ] | [ ParseSummary ]
 *  @return [Code | Error]
 */
Prolog.compile_per_sentence = function(parsed_sentences) {
    
    if (parsed_sentences.is_error)
        throw new Error("Attempt to compile erroneous sentences");
    
    //if (!(parsed_sentences instanceof Array))
    //   throw new Error("Expecting Array");
    
    var result=[];
    var c = new Compiler();
    var code_object;
    var parsed_sentence;
    var sentences = parsed_sentences.sentences || parsed_sentences; 
    
    for (var index=0; index<sentences.length; index++) {
            
        parsed_sentence = sentences[index];
         
        if (parsed_sentence instanceof ParseSummary)
            parsed_sentence = parsed_sentence.maybe_token_list;
            
        try {
            
            if (parsed_sentence instanceof Functor && parsed_sentence.name == 'query') {
                code_object = c.process_query( parsed_sentence.args[0] );
            } else {
                code_object = c.process_rule_or_fact(parsed_sentence);
            }
            
            result.push( new Code(code_object) );
            
        } catch(e) {
            result.push(e);
        }
        
        result.push();
    }
    
    return result;
};

/**
 * Compiles a query
 * 
 * @param functor : an object Functor
 * @return Code | Error
 */
Prolog.compile_query = function(functor) {
    
    var result, code;
    
    var c = new Compiler();
    
    try {
        code = c.process_query(functor);
        
        result = new Code(code) ;
    } catch(e) {
        result = e;
    }
    
    return result;
};

if (typeof module != 'undefined') {
	module.exports.Prolog = Prolog;
}
/**
 *  Token
 *  
 *  name  : the name assigned to the Token
 *  value : the value of the token
 *  col : where on the line the token was found
 */
function Token(name, maybe_value, maybe_attrs) {
	
	this.__classname__ = 'Token';
	
	maybe_attrs = maybe_attrs || {}; 
	
	this.name = name;
	
	if (maybe_value === false)
		this.value = false;
	else
		this.value = maybe_value || null;
	
	// so, 0 || null ==> null ...
	if (maybe_value ===0)
		this.value = 0;
	
	// Precedence - this is fixed for Tokens
	//  until possibly later in the parsing pipeline
	this.prec = 0;
	
	// Position in input stream
	this.line = maybe_attrs.line || 0;
	this.col  = maybe_attrs.col || 0;
	this.offset = maybe_attrs.offset || 0;
	
	this.is_primitive = maybe_attrs.is_primitive || false;
	this.is_operator =  maybe_attrs.is_operator || false;
	
}

Token.inspect_quoted = false;
Token.inspect_compact = false;

Token.prototype.toJSON = function() {
	return "Token:"+this.name+":"+this.value;
};

Token.fromJSON = function(name, value){
	return new Token(name, value);
};

Token.prototype.inspect = function(maybe_arg){
	
	if (Token.inspect_compact) {
		if (this.name == 'nil')
			return 'nil';
		else
			return this.value;
	}
	
	var result = "";
	
	result = "Token("+this.name+","+this.value+")";
	
	if (Token.inspect_quoted)
		result = "'"+result+"'";
	
	return result;
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
	
	var index;
	
	if (input_list instanceof Array && input_list[0] instanceof Array) {
		
		for (index=0; index<input_list.length ;index++) {
			if (!Token.check_for_match(input_list[index], expected_list[index]))
				return false;
		}
		
		return true;
	}
	
	
	if (input_list.length != expected_list.length) {
		//console.log("match: list not same length");
		return false;
	}
		
	
	for (index in input_list) {
		
		var input_token = input_list[index];
		var expected_token = expected_list[index] || new Token('null');
	
		if (!Token.equal(input_token, expected_token)) {
			//console.log("match fail: "+JSON.stringify(input_token));
			return false;
		}
			
		
		if (also_index)
			if (input_token.col != expected_token.col) {
				//console.log("match: col mismatch: "+ JSON.stringify(input_token));
				return false;
			}
				
				
	}
	
	return true;
};


function Result(term_list, last_token) {
	this.terms = term_list;
	this.last_token = last_token;
}


/**
 * Operator
 * @constructor
 */
function Op(name, symbol, precedence, type, attrs) {
	this.name = name;
	this.symbol = symbol;
	this.prec = precedence;
	this.type = type;
	this.attrs = attrs || {};
	
	// from the lexer
	this.line = 0;
	this.col  = 0;
	this.offset = 0;
}

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
		new Op("query",   '?-', 1300, 'fy')
	   ,new Op("rule",    ':-', 1200, 'xfx')
	   ,new Op("disj",    ';',  1100, 'xfy')
	   ,new Op("conj",    ',',  1000, 'xfy')
	   
	   ,new Op("equal",   '=:=',  700, 'xfx', {builtin:   true, boolean: true})
	   ,new Op("equalnot",'=\\=', 700, 'xfx', {builtin:   true, boolean: true})
	   
	   ,new Op("unif",    '=',   700, 'xfx', {builtin:   true, boolean: true})
	   ,new Op("notunif", '\\=', 700, 'xfx', {builtin:   true, boolean: true})
	   
	   ,new Op("em",      '=<',  700, 'xfx', {primitive: true, boolean: true, to_evaluate: true})
	   ,new Op("ge",      '>=',  700, 'xfx', {primitive: true, boolean: true, to_evaluate: true})
	   ,new Op("lt",      '<',   700, 'xfx', {primitive: true, boolean: true, to_evaluate: true})
	   ,new Op("gt",      '>',   700, 'xfx', {primitive: true, boolean: true, to_evaluate: true})
	   
	   ,new Op("is",      'is',  700, 'xfx', {primitive: true, retvalue: false, to_evaluate: true})
	   
	    
	   ,new Op("minus",   '-',   500, 'yfx', {primitive: true, retvalue: true})
	   ,new Op("plus",    '+',   500, 'yfx', {primitive: true, retvalue: true})
	   ,new Op("mult",    '*',   400, 'yfx', {primitive: true, retvalue: true})
	   ,new Op("div",     '/',   400, 'yfx', {primitive: true, retvalue: true})
	   
	   ,new Op("not",     'not', 200, 'fy',  {primitive: true}) 
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
	}
	
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

	if (node_center.prec === null)
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
		
	} catch(e) {} // we anyhow need to report ``
	
	result += 'f';
	
	try {
		if (node_right)
			if (node_right.prec == pc)
				result += 'y';
			else if (node_right.prec < pc)
				result += 'x';
	} catch(e) {}

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

	if (expected_st === null)
		if (input_st !==null)
			return false;
	
	if (input_st === null)
		if (expected_st !== null)
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
	if (this.prec === null) {
		var result = Op.has_ambiguous_precedence(symbol); 
		try {
			if (result === false)
				this.prec = Op.map_by_symbol[symbol].prec;
		} catch(e) {
			throw new Error("Can't find `" + symbol +"` in Op.map_by_symbol");
		}
	}
}

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
	
	var opn = new OpNode(op.symbol, op.prec);
	opn.line = op.line;
	opn.col  = op.col;
	return opn;
};


// During the tokenisation of a comment stream
function InComment() {}

// End of stream
function Eos () {}

Eos.prototype.inspect = function () {
	return "Eos";
};

function Code(code) {
	this.code = code || {};
}

Code.prototype.inspect = function(){
	return "Code("+this.code.f+"/"+this.code.arity+")";
};

/**
 *  Functor
 *  @constructor
 *  
 *  @param name: the functor's name
 *  @param maybe_arguments_list : an optional arguments list
 *          (useful during debugging)
 */
function Functor(name, maybe_arguments_list) {
	
	this.__classname__ = 'Functor';
	
	this.name = name;
	this.original_token = null;
	this.prec = 0;
	
	// That's what we assume for the general case.
	this.attrs = {
		primitive: false
		,boolean: false
		,retvalue: false
	};
	
	// from the lexer
	this.line = 0;
	this.col  = 0;
	this.offset = 0;

	// Used in the context of the interpreter
	// ======================================
	// Target Arity
	this.arity = null;
	
	// remove the first parameter of the constructor
	if (arguments.length > 1) {
		this.args = Array.prototype.splice.call(arguments, 1);
		this.arity = this.args.length;
	}
		
	else
		this.args = [];

}

Functor.prototype.get_arity = function() {
	return this.arity || this.args.length;
};

Functor.prototype.get_name = function(){
	return this.name;
};

Functor.inspect_compact_version = false;
Functor.inspect_short_version = false;
Functor.inspect_quoted = false;
Functor.inspect_cons = false;

Functor.prototype.inspect = function(inside_cons){
	
	var fargs;
	var result = "";
	
	var arity = this.arity || this.args.length;
	
	if (Functor.inspect_compact_version) {
		
		
		if (this.name == 'cons' && Functor.inspect_cons) {
			fargs = this.format_args(this.args, true);
			
			if (inside_cons === true)
				result = fargs;
			else
				result = "["+fargs+"]";

		}
			
		else {
			fargs = this.format_args(this.args);
			result = this.name+"("+fargs+")";
		}
			
		
	} else {
		
		if (Functor.inspect_short_version)
			result = "Functor("+this.name+"/"+arity+")";
		else {
			fargs = this.format_args(this.args);
			
			if (arity>0)
				result = "Functor("+this.name+"/"+arity+","+fargs+")";
			else
				result = "Functor("+this.name+"/"+arity+")";
		}
		
	}
	
	
	if (Functor.inspect_quoted)
		result = "'"+result+"'";
	
	return result;
};

Functor.prototype.format_args = function (input, inside_cons) {
	
	var result = "";
	for (var index = 0; index<input.length; index++) {
		var arg = input[index];
		
		if (index>0)
			result += ',';
		
		if (Array.isArray(arg)) {
			result += '[';
			result += this.format_args(arg, inside_cons);
			result += ']';
		} else 
			result = this.format_arg(result, arg, inside_cons);
	}
	
	return result;
};

Functor.prototype.format_arg = function(result, arg, inside_cons){
	
	if (typeof arg == 'string')
		return result + arg;
	
	if (arg && arg.inspect)
		result += arg.inspect(inside_cons);
	else
		result += JSON.stringify(arg);
	
	return result;	
};

Functor.prototype.get_args = function(){
	return this.args;
};

Functor.prototype.push_arg = function(arg) {
	this.args.push(arg);
};

Functor.prototype.get_arg = function(index) {
	return this.args[index];
};

Functor.compare = function(f1, f2) {
	if (f1.name == f2.name)
		if (f1.arity == f2.arity)
			return true;
			
	return false;
};

/**
 *  Var constructor
 *  
 *  For anonymous variables (start with `_`),
 *   the name is built with the `globally` unique
 *   id.  This is to support variable trailing
 *   correctly.  Furthermore, the name is 
 *   constructed in such a way that it is invalid
 *   from an prolog syntax point of view: this
 *   prevents introspection from the prolog code
 *   and thus limits potential namespace collision
 *   and security issues.
 */
function Var(name) {
	
	this.__classname__ = 'Var';
	
	this.is_anon = (name[0] == '_');
	this.prec = 0;
	this.name = name;
	this.col = null;
	this.line = null;
	this.offset = 0;
	
	this.value = null;
	
	this._id = Var.counter++;
	
	if (this.name[0] == "_")
		this.name = this.name+"$"+this._id;
	
	//console.log(".............. CREATED: ", name, this.name, this.is_anon);
}

Var.counter = 0;
Var.inspect_extended = false;
Var.inspect_compact = false;

Var.prototype.toJSON = function() {
	return "Var:"+this.name+":"+JSON.stringify(this.value);
};

Var.fromJSON = function(name, raw_value) {
	
	//console.log("Var.fromJSON: ", raw_value);
	
	var value = JSON.parse(raw_value, Types.ReviveFromJSON);
	
	//console.log("Var.fromJSON: value: ", value);
	
	var v = new Var(name);
	v.bind(value);
	
	return v;
};

Var.prototype.inspect = function(maybe_param, depth){
	
	// Keep the anon name as it was
	//  requested during Var creation:
	//  this enable much simpler test case
	//  crafting and evaluation.
	//
	var name = this.is_anon ? "_" : this.name;
	
	depth = depth || 0;
	
	if (depth == 5)
		return "?CYCLE?";
	
	if (this.value) {
		
		var value = this.value.inspect? this.value.inspect(maybe_param,depth+1) : this.value;
		
		if (Var.inspect_compact) {
			return value;
		} else {
			if (Var.inspect_extended)
				return "Var("+name+", "+value+"){"+this.id+"}";
			else
				return "Var("+name+", "+value+")";
		}
		
	}
		
	if (Var.inspect_compact) {
		return "_"; 
	} else
		if (Var.inspect_extended)
			return "Var("+name+"){"+this.id+"}";
		else
			return "Var("+name+")";
};

Var.prototype.bind = function(value, on_bind) {
	
	if (this == value)
		throw new Error("Attempt to create cycle ...");
	
	if (value === null)
		throw new ErrorInvalidValue("Var("+this.name+"), attempted to bind 'null'");
	
	if (this.value !== null)
		throw new ErrorAlreadyBound("Already Bound: Var("+this.name+")");
	
	

	if (on_bind) {
		on_bind(this, value);
	} 

	this.value = value;		
	
};

Var.prototype.is_bound = function(){
	return this.value !== null;
};

Var.prototype.unbind = function(){
	this.value = null;
};

Var.prototype.get_value = function() {

	if (this.value === null)
		throw new ErrorNotBound("Not Bound: Var("+this.name+")");

	return this.value;
};

/**
 *   Var(X, Var(Y, Var(Z, 666) ) ) ==> Var(X, 666)
 * 
 *   Check for cycles
 *   
 */
Var.prototype.deref = function(check){

	if (check && check == this)
		return null;
		
	if (this.value instanceof Var) {
		
		if (this.value.is_bound())
			return this.value.deref(check);	
		else {
			
			if (check && check == this.value)
				return null;
			
			return this.value;
		}
	}
	return this;
};

/**
 * A safe version of bind
 * 
 * Check for cycles
 * 
 * @param to
 */
Var.prototype.safe_bind = function(to, on_bind) {
	
	var dvar, tvar;

	dvar = this.deref(to);
	if (dvar === null) {
		console.log("!!!!!!!!!! CYCLE AVERTED! ", this);
		return;
	}
	
	if (to instanceof Var) {
		tvar = to.deref(this);
		if (tvar === null) {
			console.log("!!!!!!!!!!! CYCLE AVERTED!", to);
			return;
		}
	} else
		tvar = to;
	
	if (dvar == tvar) {
		console.log("!!!!!!!!!!! CYCLE AVERTED!", to);
		return;
	}

	dvar.bind(tvar, on_bind);
};


function Value(name) {
	this.name = name;
}

Value.prototype.inspect = function(){
	return "Value("+this.name+")";
};


//============================================================ Instruction

/**
 *  Context:
 *  a: arity
 *  f: functor name
 *  p: input parameter
 *  
 *  x: target register number
 *  y: target argument index
 */
function Instruction(opcode, ctx) {
	this.opcode = opcode;
	this.ctx = ctx || null;
}

Instruction.inspect_compact = false;
Instruction.inspect_quoted = false;

Instruction.prototype.is = function(opcode) {
	return this.opcode == opcode;
};

Instruction.prototype.get = function(param, maybe_prefix) {
	if (maybe_prefix)
		return maybe_prefix + this.ctx[param];
	return this.ctx[param];
};

Instruction.prototype.get_parameter_name = function(){
	if (!this.ctx)
		return null;
	
	return this.ctx.p ? this.ctx.p : (this.ctx.x ? "$x" + this.ctx.x : null);
};

Instruction.prototype.inspect = function(){
	
	var params = [ 'p', 'x', 'y' ];
	var result = ""; 
	
	if (this.ctx && this.ctx.l)
		result = this.ctx.l + "  ";
		
	result += this.opcode + (Array(13 - this.opcode.length).join(" "));
	
	if (this.ctx === null)
		return result;
	
	if (!Instruction.inspect_compact)
		result += " ( ";
	
	if (this.ctx.f)
		result += this.ctx.f+"/"+this.ctx.a;
	
	for (var i=0, inserted=false;i<params.length;i++) {
		
		if (this.ctx[params[i]] !== undefined ) {
			
			if (inserted || (this.ctx.f && !inserted))
				result += ", ";
			
			var raw_value = this.ctx[params[i]];
			
			//console.log("Raw Value: ", raw_value);
			
			var value = raw_value.inspect ? raw_value.inspect() : JSON.stringify(raw_value);
			
			if (Instruction.inspect_compact && raw_value[0] == "_")
				value = "_";
			
			result += params[i] + "("+ value +")";
			inserted= true;
		}
	}
	
	if (!Instruction.inspect_compact)
		result += " )";
	
	if (Instruction.inspect_quoted)
		result = "'"+result+"'";
	
	return result;
};

// ============================================================ Summary

function ParseSummary(maybe_error, maybe_token_list) {
	this.maybe_error = maybe_error;
	this.maybe_token_list = maybe_token_list;
}

ParseSummary.prototype.inspect = function() {
	
	if (this.maybe_error) {
		return "Error: "+this.maybe_error.classname;
	}
	
	if (this.maybe_token_list instanceof Array) {
		var result = "[";
		
		for (var index=0; index<this.maybe_token_list.length; index++) {
			var value = this.maybe_token_list[index];
			
			if (index>0)
				result += ",";
				
			result += (value.inspect ? value.inspect() : JSON.stringify(value));
		}
		
		return result + ']';
	}
	
	if ((this.maybe_token_list).inspect)
		return "ParseSummary: " + ( this.maybe_token_list ).inspect();

	return JSON.stringify( this.maybe_token_list );
	
};





// ============================================================ Errors



function ErrorSyntax(msg, token) {
	this.__classname__ = 'ErrorSyntax';
	this.message = msg;
	this.token = token;
}
ErrorSyntax.prototype = Error.prototype;


function ErrorInvalidFact(msg, token) {
	this.__classname__ = 'ErrorInvalidFact';
	this.message = msg;
	this.token = token;
}
ErrorInvalidFact.prototype = Error.prototype;


function ErrorExpectingFunctor(msg, token) {
	this.__classname__ = 'ErrorExpectingFunctor';
	this.message = msg;
	this.token = token;
}
ErrorExpectingFunctor.prototype = Error.prototype;


function ErrorExpectingVariable(msg, token) {
	this.__classname__ = 'ErrorExpectingVariable';
	this.message = msg;
	this.token = token;
}
ErrorExpectingVariable.prototype = Error.prototype;


function ErrorFunctorNotFound(msg, token) {
	this.__classname__ = 'ErrorFunctorNotFound';
	this.message = msg;
	this.token = token;
}
ErrorFunctorNotFound.prototype = Error.prototype;

function ErrorFunctorClauseNotFound(msg, token) {
	this.__classname__ = 'ErrorFunctorClauseNotFound';
	this.message = msg;
	this.token = token;
}
ErrorFunctorClauseNotFound.prototype = Error.prototype;

function ErrorFunctorCodeNotFound(msg, token) {
	this.__classname__ = 'ErrorFunctorCodeNotFound';
	this.message = msg;
	this.token = token;
}
ErrorFunctorCodeNotFound.prototype = Error.prototype;


function ErrorExpectingGoal(msg, token) {
	this.__classname__ = 'ErrorExpectingGoal';
	this.message = msg;
	this.token = token;
}
ErrorExpectingGoal.prototype = Error.prototype;

function ErrorInvalidHead(msg, token) {
	this.__classname__ = 'ErrorInvalidHead';
	this.message = msg;
	this.token = token;
}
ErrorInvalidHead.prototype = Error.prototype;

function ErrorRuleInQuestion(msg, token) {
	this.__classname__ = 'ErrorRuleInQuestion';
	this.message = msg;
	this.token = token;
}
ErrorRuleInQuestion.prototype = Error.prototype;

function ErrorNoMoreInstruction(msg, token) {
	this.__classname__ = 'ErrorNoMoreInstruction';
	this.message = msg;
	this.token = token;
}
ErrorNoMoreInstruction.prototype = Error.prototype;

function ErrorInvalidInstruction(msg, token) {
	this.__classname__ = 'ErrorInvalidInstruction';
	this.message = msg;
	this.token = token;
}
ErrorInvalidInstruction.prototype = Error.prototype;

function ErrorInternal(msg, token) {
	this.__classname__ = 'ErrorInternal';
	this.message = msg;
	this.token = token;
}
ErrorInternal.prototype = Error.prototype;

function ErrorInvalidValue(msg, token) {
	this.__classname__ = 'ErrorInvalidValue';
	this.message = msg;
	this.token = token;
}
ErrorInvalidValue.prototype = Error.prototype;

function ErrorAlreadyBound(msg, token) {
	this.__classname__ = 'ErrorAlreadyBound';
	this.message = msg;
	this.token = token;
}
ErrorAlreadyBound.prototype = Error.prototype;

function ErrorNotBound(msg, token) {
	this.__classname__ = 'ErrorNotBound';
	this.message = msg;
	this.token = token;
}
ErrorNotBound.prototype = Error.prototype;

function ErrorExpectingListStart(msg, token) {
	this.__classname__ = 'ErrorExpectingListStart';
	this.message = msg;
	this.token = token;
}
ErrorExpectingListStart.prototype = Error.prototype;

function ErrorExpectingListEnd(msg, token) {
	this.__classname__ = 'ErrorExpectingListEnd';
	this.message = msg;
	this.token = token;
}
ErrorExpectingListEnd.prototype = Error.prototype;


function ErrorInvalidToken(msg, token) {
	this.__classname__ = 'ErrorInvalidToken';
	this.message = msg;
	this.token = token;
}
ErrorInvalidToken.prototype = Error.prototype;

function ErrorUnexpectedParensClose(msg, token) {
	this.__classname__ = 'ErrorUnexpectedParensClose';
	this.message = msg;
	this.token = token;
}
ErrorUnexpectedParensClose.prototype = Error.prototype;

function ErrorUnexpectedPeriod(msg, token) {
	this.__classname__ = 'ErrorUnexpectedPeriod';
	this.message = msg;
	this.token = token;
}
ErrorUnexpectedPeriod.prototype = Error.prototype;

function ErrorUnexpectedEnd(msg, token) {
	this.__classname__ = 'ErrorUnexpectedEnd';
	this.message = msg;
	this.token = token;
}
ErrorUnexpectedEnd.prototype = Error.prototype;

function ErrorUnexpectedListEnd(msg, token) {
	this.__classname__ = 'ErrorUnexpectedListEnd';
	this.message = msg;
	this.token = token;
}
ErrorUnexpectedListEnd.prototype = Error.prototype;

function ErrorAttemptToRedefineBuiltin(msg, functor, arity) {
	this.__classname__ = 'ErrorAttemptToRedefineBuiltin';
	this.message = msg;
	this.functor = functor;
	this.arity = arity;
}
ErrorAttemptToRedefineBuiltin.prototype = Error.prototype;


// ============================================================ TYPES

var Types = {};

Types.revivable = {
	Token    : Token
	,Var     : Var
	,Functor : Functor
};

/**
 *  This function is meant to be used along
 *   with JSON.parse
 */
Types.ReviveFromJSON = function(key, value) {
	
	//console.log("ReviveFromJSON: ", key, "Value: ", value);
	//console.log("ReviveFromJSON: this= ", this);
	
	var parts = value.match(/(.*?):(.*?):(.*)/);
	
	var type  = parts[1];
	var name  = parts[2];
	var val   = parts[3];
	
	//var v = JSON.parse(val, Types.ReviveFromJSON);
	
	var constructor = Types.revivable[type];
	
	//console.log("Parts ", type, parts);
	
	var obj = constructor.fromJSON(name, val);
	
	return obj;
};


// ============================================================== EXPORTS



if (typeof module!= 'undefined') {
	
	module.exports.Types = Types;
	module.exports.Eos = Eos;
	module.exports.Code = Code;
	module.exports.InComment = InComment;
	module.exports.Functor = Functor;
	module.exports.Op = Op;
	module.exports.Var = Var;
	module.exports.Value = Value;
	module.exports.OpNode = OpNode;
	module.exports.Result = Result;
	module.exports.Instruction = Instruction;
	
	module.exports.ParseSummary = ParseSummary;

	// Errors
	module.exports.ErrorSyntax = ErrorSyntax;
	module.exports.ErrorInvalidFact = ErrorInvalidFact;
	module.exports.ErrorExpectingFunctor = ErrorExpectingFunctor;
	module.exports.ErrorExpectingVariable = ErrorExpectingVariable; 
	module.exports.ErrorInvalidHead = ErrorInvalidHead;
	module.exports.ErrorInvalidToken = ErrorInvalidToken;
	module.exports.ErrorRuleInQuestion = ErrorRuleInQuestion;
	module.exports.ErrorExpectingGoal = ErrorExpectingGoal;
	module.exports.ErrorNoMoreInstruction = ErrorNoMoreInstruction;
	module.exports.ErrorInvalidInstruction = ErrorInvalidInstruction;
	module.exports.ErrorFunctorNotFound = ErrorFunctorNotFound;
	module.exports.ErrorFunctorClauseNotFound = ErrorFunctorClauseNotFound;
	module.exports.ErrorFunctorCodeNotFound = ErrorFunctorCodeNotFound;
	module.exports.ErrorInternal = ErrorInternal;
	module.exports.ErrorAlreadyBound = ErrorAlreadyBound;
	module.exports.ErrorNotBound = ErrorNotBound;

	module.exports.ErrorExpectingListStart = ErrorExpectingListStart;
	module.exports.ErrorExpectingListEnd = ErrorExpectingListEnd;
	module.exports.ErrorUnexpectedListEnd = ErrorUnexpectedListEnd;
	module.exports.ErrorUnexpectedParensClose = ErrorUnexpectedParensClose;
	module.exports.ErrorUnexpectedPeriod = ErrorUnexpectedPeriod;
	module.exports.ErrorUnexpectedEnd = ErrorUnexpectedEnd;
	
	module.exports.ErrorAttemptToRedefineBuiltin = ErrorAttemptToRedefineBuiltin;
}
/* global ErrorExpectingFunctor, ErrorRuleInQuestion, ErrorInvalidToken */
/* global Functor, ErrorInvalidHead, Visitor, Visitor2, Visitor3 */
/* global Instruction, Var, Token, Value */

/**
 * Compiler
 * @constructor
 *
 */
function Compiler() {}


/**
 * Process a `rule` or `fact` expression
 * 
 * Expecting a `rule` i.e. 1 root node Functor(":-", ...)
 *  OR a `fact`  i.e. 1 root node Functor(name, ...)
 *
 * A `fact` is a body-less rule (just a `head`)
 *  (or a rule with a body 'true').
 *
 *  -------------------------------------------------------------
 *  
 * @raise ErrorExpectingFunctor
 * 
 * @return Object: compiled code
 */
Compiler.prototype.process_rule_or_fact = function(exp) {
	
	if (!(exp instanceof Functor))
		throw new ErrorExpectingFunctor("Expecting Functor, got: "+JSON.stringify(exp), exp);
	
	if (exp.name == 'rule')
		return this.process_rule(exp);

	var with_body = false;
	
	var result = {
		'head': this.process_head(exp, with_body)
		,'f': exp.name
		,'a': exp.args.length
	};
	
	return result;
};

/**
 * Process a `query`, `rule` or `fact` expression
 * 
 * Expecting a `rule` i.e. 1 root node Functor(":-", ...)
 *  OR a `fact`  i.e. 1 root node Functor(name, ...)
 *
 * A `fact` is a body-less rule (just a `head`)
 *  (or a rule with a body 'true').
 *
 *  -------------------------------------------------------------
 *  
 * @raise ErrorExpectingFunctor
 * 
 * @return Object: compiled code
 */
Compiler.prototype.process_query_or_rule_or_fact = function(exp) {
	
	if (!(exp instanceof Functor))
		throw new ErrorExpectingFunctor("Expecting Functor, got: "+JSON.stringify(exp), exp);


	if (exp.name == 'query')
		return this.process_query(exp.args[0]);


	if (exp.name == 'rule')
		return this.process_rule(exp);

	var with_body = false;
	
	var result = {
		'head': this.process_head(exp, with_body)
		,'f': exp.name
		,'a': exp.args.length
	};
	
	return result;
};

/**
 * Process assuming a `rule`
 * 
 * @param exp
 * @raise ErrorExpectingFunctor
 */
Compiler.prototype.process_rule = function(exp) {

	var head = exp.args[0];
	var body = exp.args[1];
	
	var result = {};
	
	var with_body = true;
	var not_query = false;
	
	result.head = this.process_head(head, with_body);
	
	var head_vars = result.head.vars;

	var body_code  = this.process_body(body, not_query, head_vars);
	
	// I know this is ugly but we had to process
	//  the head first in order to retrieve the vars.
	for (var label in body_code)
		result[label] = body_code[label];
	
	result.f = head.name;
	result.a = head.args.length;
	
	// clean-up
	delete result.head.vars;
	
	return result;
};



/**
 *  Just compiles the expression assuming it is a `head`
 * 
 *  Generate "pattern matching" code for the input structure
 *  Go "depth-first"
 *  
 *  A `head` structure must be 
 *  - single element `Functor`
 *  - not a Conjunction nor a Disjunction
 *  
 *  * The root Functor is stripped
 *  * 
 *  
 *  
 *  @raise ErrorExpectingFunctor
 *  @raise ErrorInvalidHead
 */
Compiler.prototype.process_head = function(exp, with_body) {
	
	if (!(exp instanceof Functor))
		throw new ErrorExpectingFunctor("Expecting Functor", exp);
	
	// Of course we can't be seeing conjunctions or disjunctions
	//  in the head of a rule.
	//
	if (exp.name == 'conj' || (exp.name == 'disj'))
		throw new ErrorInvalidHead("Unexpected conjunction or disjunction within Functor head", exp);
	
	var v = new Visitor(exp);
	
	var result = []; 
		
	var vars = {};
	
	/**
	 *   Functor
	 *   	- root ==> attribute in `ctx`
	 *   	- 1st time seen (and thus as a parameter to another Functor)
	 *   	- 2nd time seen (to process its arguments)
	 * 
	 */
	
	v.process(function(ctx){
		
		/*
		 *   Root Node gets ctx.n.is_root = true
		 */
		
		if (ctx.is_struct) {
			
			if (ctx.as_param) {
				
				result.push(new Instruction("get_var", {x:ctx.v}));
				return;
				
			} else {
				
				// We are seeing this functor node for the first time
				//  and so it is a root
				//
				result.push(new Instruction("get_struct", {f: ctx.n.name, a:ctx.n.args.length, x:ctx.v}));
				return;
				
			}
			
		}
		
		/*
		 *   Cases:
		 *   1- First time @ root            --> get_var
		 *   2- First time but inside struct --> unif_var
		 *   
		 *   3- Subsequent time @ root            --> get_value
		 *   4- Subsequent time but inside struct --> unify_value 
		 * 
		 */
		if (ctx.n instanceof Var) {
			
			var first_time = (vars[ctx.n.name] === undefined);
			var at_root = ctx.root_param;
			var in_cons = ctx.in_cons === true;

			// not the first time anymore...
			vars[ctx.n.name] = true;
			
			if (first_time && (at_root || in_cons)) {
				result.push(new Instruction("get_var", {p:ctx.n.name}));
				return;
			}
			
			if (first_time && !at_root) {
				
				if (ctx.n.name[0] == "_")
					result.push(new Instruction("unif_void"));
				else
					result.push(new Instruction("unif_var", {p:ctx.n.name}));
					
				return;
					
			}
			
			if (!first_time && at_root) {
				result.push(new Instruction("get_value", {p:ctx.n.name}));
			}
			
			if (!first_time && !at_root) {
				result.push(new Instruction("unif_value", {p:ctx.n.name}));
			}

						
			return;			
		}
		
		if (ctx.n instanceof Token) {
			
			if (ctx.n.name == 'nil') {
				result.push(new Instruction('get_nil'));
				return;
			}
			
			if (ctx.n.name == 'term') {
				
				if (ctx.root_param)
					result.push(new Instruction('get_term', { p: ctx.n.value }));
				else
					result.push(new Instruction('unify_term', { p: ctx.n.value }));
				return;
			}
				
			if (ctx.n.name == 'number') {
				if (ctx.root_param)
					result.push(new Instruction('get_number', { p: ctx.n.value }));
				else
					result.push(new Instruction('unify_number', { p: ctx.n.value }));
				return;
			}
			
		}// If Token
		
	});//callback
	
	if (with_body)
		result.push(new Instruction("jump", {p:'g0'}));
	else
		result.push(new Instruction("proceed"));
	
	result.vars = vars;
	
	return result;
};


/**
 * Process a `query` expression  (i.e. just a `body`)
 * 
 * Expecting 1 root node
 * - conj Functor
 * - disjunction Functor
 * - Functor(name, ...)
 * 
 * @raise ErrorExpectingFunctor
 * @raise ErrorRuleInQuestion
 */
Compiler.prototype.process_query = function(exp) {
	
	if (!(exp instanceof Functor))
		throw new ErrorExpectingFunctor("Expecting Functor", exp);
	
	if (exp.name == 'rule')
		throw new ErrorRuleInQuestion("Unexpected rule definition in query", exp);
	
	var is_query = true;
	return this.process_body(exp, is_query);
};



/**
 *  Just compiles the expression assuming it is a `body`
 *  
 *  The body is constituted of 1 or more `goals`.
 *  
 *  Each goal can be joined using
 *   conjunctions and/or disjunctions.
 *   
 *  Goal index starts at 0.
 *   
 *  'proceed' goes on each branch of disjunctions
 *  but only goes on the right-hand side of conjunctions.
 *   
 *  @return Object
 * 
 *  @raise ErrorInvalidToken
 */
Compiler.prototype.process_body = function(exp, is_query, head_vars) {
	
	var vars = head_vars;
	var map = {};
	var result = {
		is_query: is_query
	};
	var merges = {};
	
	var v = new Visitor3(exp);
	
	var that = this;
	
	/*
	 *  Dereference the label
	 *   through the merges that 
	 *   occurred during the 'conj' and 'disj'
	 *   compilation
	 */
	var deref = function(label, last) {
				
		var merged = merges[label];
		
		// Yes it can happen to have no derefencing to perform
		if (!last && !merged)
			return label;
		
		if (merged)
			return deref(merged, merged);
		
		return last;
	};
	
	/**
	 *  Link code across a conjunction
	 *  
	 *  Conj(Gx, L, R ) ==> Gx: L R
	 *  
	 *    Combine code of L and R under label Gx
	 *  
	 */
	var conj_link = function(jctx, lctx, rctx) {

		var llabel = "g"+lctx.vc;
		var rlabel = "g"+rctx.vc;

		
		// Step -1
		// Get rid of 'proceed' in between conjunction terms (if any)
		var lcode = result[llabel];
		var last_instruction_on_left = lcode[lcode.length-1];
		
		if (last_instruction_on_left.opcode == 'proceed')
			lcode.pop();

		if (last_instruction_on_left.opcode == 'end')
			lcode.pop();

		
		// Step 0: include the boundary instruction
		//         between the 2 goals forming a conjunction
		//
		//         For primitive operators, the instruction
		//          handler will take care of backtracking if necessary.
		//
		var is_left_primitive = lctx.n && lctx.n.attrs.primitive;
		
		if (!is_left_primitive)
			result[llabel].push(new Instruction("maybe_fail"));
		
		// Step 1, combine code of R under code for L
		//      
		result[llabel] = result[llabel].concat(result[rlabel]);
		
		// Everytime there is a merge, we track it
		merges[rlabel] = llabel;
		
		// Step 2, get rid of R
		delete result[rlabel];
		
		// Step 3, move everything under the Conjunction's label
		var jlabel = "g"+jctx.vc;
		
		result[jlabel] = result[llabel];
		
		// Of course here too...
		merges[llabel] = jlabel;
		
		// Step 4, finally get rid of L
		delete result[llabel];
	};

	
	/**
	 *  Link code across a disjunction
	 * 
	 *  Disj(Gx, L, R)
	 *  
	 */
	var disj_link = function(jctx, lctx, rctx){

		var jlabel = "g"+jctx.vc;
		var llabel = "g"+lctx.vc;
		var rlabel = "g"+rctx.vc;
		
		// We've got a Functor node on the left side,
		//  so point it to the right side node
		if (lctx.n) {
			
			result[llabel].unshift(new Instruction('try_else', {p: rlabel}));
			
		} else {
			
			/*
			 *  More difficult case: 
			 *   We've got just a label on the left side
			 *   and so we must deref until we find the right side
			 *   code node under the label.
			 */
			
			var lmap = map[llabel];
			var rnode_label = lmap.r;
			
			var dlabel = deref(rnode_label);
			
			result[dlabel].unshift(new Instruction('try_else', {p: rlabel}));
		}

		result[jlabel] = result[llabel];
		
		// Track merges
		//
		merges[llabel] = jlabel;
		
		// If we are at root with this disjunction,
		//  let's help the interpreter with an additional hint
		if (jctx.root) {
			result[rlabel].unshift(new Instruction("try_finally"));
		}
		
		delete result[llabel];
	};
	
	
	
	v.process(function(jctx, left_or_root, right_maybe){

		var type = jctx.type;
		var goal_id = jctx.goal_id;
		var is_root = jctx.root;
		

		var label = type+goal_id;
		var ctx = left_or_root;
		
		if (is_root)
			label = 'g0';
		
		if (type == 'root') {
			label = 'g0';
			
			result[label] = that.process_goal( ctx.n, is_query, vars );
			return;
		}
		
		/*
		 *   Cases:
		 *     left:  node | goal ref
		 *     right: node | goal ref
		 *     
		 *     type:  conj | disj
		 */
		
		var lcode = that.process_goal(left_or_root.n, is_query, vars);
		var rcode = that.process_goal(right_maybe.n, is_query, vars);

		
		// CAUTION: lcode/rcode *may* be undefined
		//          This is intended behavior.
		
		var jlabel = "g" + jctx.vc;
		var llabel = "g" + left_or_root.vc;
		var rlabel = "g" + right_maybe.vc;
		
		
		map[jlabel] = {l: llabel, r: rlabel };
		
		
		if (lcode)
			result[llabel] = lcode;
		
		if (rcode)
			result[rlabel] = rcode;
		
		if (type == 'conj') {
			
			conj_link(jctx, left_or_root, right_maybe);
			
		}
		
		if (type == 'disj') {

			disj_link(jctx, left_or_root, right_maybe);
		}
		
		
	});// process
	
	
	return result;
};


/**
 *  Just compiles an expression consisting of a single `goal`
 *   i.e. no conjunction / disjunction
 *   
 *   f1( ... )
 *   X is ...  ==>  is(X, ...) 
 *  
 *   
 *  The root node gets a CALL to the target predicate,
 *   the rest of the expression is treated as a structure.
 *   
 */
Compiler.prototype.process_goal = function(exp, is_query, vars) {
	
	vars = vars || {};
	
	if (exp === undefined)
		return undefined;

	//console.log("Process Goal: ", exp);

	/*
	 *  The `cut` operator is simple to compile
	 *    but a bit more difficult to interpret ;)
	 */
	if (exp.name == 'cut') {
		return [new Instruction('cut'), new Instruction("proceed")];
	}

	if (exp.name == 'fail') {
		return [new Instruction('fail')];
	}
	
	
	if (exp.attrs.primitive && exp.attrs.to_evaluate) {
		return this.process_primitive(exp, is_query, vars);
	}
	
	// Transform 'not' operator
	//
	//  Just take the functor
	//
	if (exp.name == 'not') {
		exp = exp.args[0];
		exp.not = true;
	}
	
	var v = new Visitor2(exp);
	
	var results = [];

	results.push(new Instruction('allocate'));
	
	v.process(function(ctx){
		
		var struct_ctx = { f: ctx.n.name, a:ctx.n.args.length , x: ctx.vc };
		
		if (ctx.root) {
			struct_ctx.x = 0;
		}
		
		results.push(new Instruction("put_struct", struct_ctx));
		
		for (var index=0; index<ctx.args.length; index++) {
			
			var n = ctx.args[index];
			
			if (n instanceof Var) {
				if (n.name[0] == "_")
					results.push(new Instruction("put_void"));
				else {
					results.push(new Instruction("put_var", {p: n.name}));
					vars[n.name] = true;
				}
			}

			if (n instanceof Value) {
				results.push(new Instruction("put_value", {x: n.name}));
			}
			
			if (n instanceof Token) {
				if (n.name == 'number')
					results.push(new Instruction("put_number", {p: n.value}));
				
				if (n.name == 'term')
					results.push(new Instruction("put_term", {p: n.value}));
				
				if (n.name == 'nil')
					results.push(new Instruction("put_nil"));
			}
			
		}//for
		
		// Only root functor gets a CALL
		//
		if (ctx.root) {
			
			if (ctx.n.attrs.builtin) {
				results.push(new Instruction('setup'));
				results.push(new Instruction('bcall'));
				results.push(new Instruction('maybe_retry'));
				results.push(new Instruction('deallocate'));
			} else {
				results.push(new Instruction('setup'));
				results.push(new Instruction('call'));
				
				if (ctx.n.not)
					results.push(new Instruction('maybe_retryn'));
				else
					results.push(new Instruction('maybe_retry'));
				//results.push(new Instruction('maybe_retry'));
				results.push(new Instruction('deallocate'));
			}
			
			
			if (is_query)
				results.push(new Instruction('end'));
			else
				results.push(new Instruction('proceed'));
		}
			
		
	});

	return results;
};

Compiler.prototype.process_primitive = function(exp, is_query, vars) {

	
	var v = new Visitor2(exp);
	
	var results = [];

	v.process(function(ctx){

		//console.log("*** ctx:  ",ctx);
		
		var op_name = ctx.n.name;
		
		/*
		 *  This instruction will clear the primitive's
		 *   context in $x0
		 */
		results.push(new Instruction("prepare"));
		
		for (var index=0; index<ctx.args.length; index++) {
			
			var n = ctx.args[index];
			
			//console.log("+++ n: ", n);
			
			if (n instanceof Var) {
				results.push(new Instruction("push_var", {p: n.name}));
				vars[n.name] = true;
			}

			if (n instanceof Value) {
				results.push(new Instruction("push_value", {y: n.name}));
			}
			
			if (n instanceof Token) {
				if (n.name == 'number')
					results.push(new Instruction("push_number", {p: n.value}));
				
				if (n.name == 'term')
					//results.push(new Instruction("push_term", {p:n.value}));
					throw new ErrorInvalidToken("term: "+JSON.stringify(n.value), n);
				
				if (n.name == 'nil')
					//results.push(new Instruction("push_nil"));
					throw new ErrorInvalidToken("nil", n);
			}
			
		}//for
		
		var inst_name = "op_"+op_name;
		
		if (ctx.n.attrs.boolean || !ctx.n.attrs.retvalue)
			results.push(new Instruction(inst_name));
		else
			results.push(new Instruction(inst_name, {y: ctx.vc}));
		
	});


	results.push(new Instruction('proceed'));
	
	return results;
	
};



if (typeof module!= 'undefined') {
	module.exports.Compiler = Compiler;
}

/* global ErrorAttemptToRedefineBuiltin, ErrorExpectingFunctor
*/

/*
 *  Database
 * 
 * @constructor
 */
function Database(access_layer) {
	this.db = {};
	this.al = access_layer;
}

Database.prototype.clear = function() {
	this.db = {};
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
Database.prototype.insert = function(root_nodes){

	if (!(root_nodes instanceof Array))
		root_nodes = [root_nodes];
	
	for (var index in root_nodes) {
		this._insert(root_nodes[index]);
	}

};

Database.prototype._insert = function(root_node){

	var functor_signature = this.al.compute_signature(root_node);
	
	var maybe_entries = this.db[functor_signature] || [];
	maybe_entries.push(root_node);
	
	this.db[functor_signature] = maybe_entries;
	
	return functor_signature;
};

/**
 *  Insert Code objects in the database
 * 
 *  Each Code object looks something like:
 * 
 *   {
 	    f: $functor_name
 	   ,a: $functor_arity
 	   ,head: $functor_head_code
 	   ,g* : $functor_goal_code
     }
 
 *
 *   @throws ErrorExpectingFunctor 
 */
Database.prototype.batch_insert_code = function(codes) {

	if (!(codes instanceof Array))
		codes = [codes];
	
	for (var index in codes) {
		var code_object = codes[index];
		var f = code_object.f || code_object.code.f;
		var a = code_object.a || code_object.code.a;
		
		this.insert_code(f, a, code_object.code || code_object);
	}

};

/** 
 *  Verifies if the specified Functor exists in this database
 * 
 *  @return Boolean
 */
Database.prototype.exists = function(functor, arity) {

	var functor_signature = this.al.compute_signature([functor, arity]);
	return this.db[functor_signature] !== undefined;
};

/**
 *   Insert 1 Functor code in the database
 * 
 *   @throws ErrorExpectingFunctor
 */ 
Database.prototype.insert_code = function(functor, arity, code) {
	
	if (functor===undefined || arity===undefined || code===undefined)
		throw new ErrorExpectingFunctor("Invalid functor name/arity/code: "+functor+"/"+arity+" code: "+JSON.stringify(code));
	
	var functor_signature = this.al.compute_signature([functor, arity]);

	var maybe_entries = this.db[functor_signature] || [];
	maybe_entries.push(code);
	
	this.db[functor_signature] = maybe_entries;
};

Database.prototype.get_code = function(functor, arity) {
	
	var functor_signature = this.al.compute_signature([functor, arity]);

	var maybe_entries = this.db[functor_signature] || [];

	return maybe_entries;
};


/**
 *  Retrieve clause(s) from looking up
 *   an input Functor node 
 */
Database.prototype.get = function(functor_node) {
	
	var functor_signature = this.al.compute_signature(functor_node);
	return this.db[functor_signature] || null;
	
};

/**
 * Define a Functor in the database
 * 
 * @param root_node
 */
Database.prototype.define = function(root_node){
	
	var functor_signature = this.al.compute_signature(root_node);
	this.db[functor_signature] = root_node;
};


Database.prototype.lookup_functor = function(functor_signature){
	
	return this.db[functor_signature] || null;
};


// =============================================================== MANAGER

function DatabaseManager(db_builtins, db_user) {
	this.db_builtins = db_builtins;
	this.db_user = db_user;
}

/**
 *  Insert code in the Builtin database
 */
DatabaseManager.prototype.builtin_insert_code = function(functor, arity, code) {
	
	this.db_builtins.insert_code(functor, arity, code);
};

/**
 *  Insert code, if possible, in the User database
 * 
 *  If the Functor/Arity is already defined in the
 *   Builtin database, reject with
 */
DatabaseManager.prototype.user_insert_code = function(functor, arity, code) {
	
	if (this.db_builtins.exists(functor, arity))
		throw new ErrorAttemptToRedefineBuiltin("Attempt to redefine Functor", functor, arity);
		
	this.db_user.insert_code(functor, arity, code);
	
};


if (typeof module != 'undefined') {
	module.exports.Database = Database;
	module.exports.DatabaseManager = DatabaseManager;
}

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
DbAccess.compute_signature = function(input) {
	
	if (input instanceof Array) {
		var fname = input[0];
		var arity = input[1];
		
		return fname+"/"+arity;
	};
	
	var sig = null;
	
	try {
		var functor = DbAccess.extract_head_of_rule(input);
		sig = DbAccess.get_functor_signature(functor);
		
	} catch(e) {
		sig = DbAccess.get_functor_signature(input);
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
DbAccess.is_fact = function(root_node) {

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
DbAccess.is_rule = function(root_node) {
	
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
DbAccess.extract_head_of_rule = function(root_node) {

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
DbAccess.get_functor_signature = function(node){

	if (!(node instanceof Functor))
		throw new Error("Expecting Functor, got: "+JSON.stringify(node));

	return ""+node.name+"/"+node.args.length;
};


if (typeof module!= 'undefined') {
	module.exports.DbAccess = DbAccess;
};


/* global ErrorInvalidInstruction, ErrorNoMoreInstruction
			,ErrorFunctorNotFound, ErrorFunctorClauseNotFound
			,ErrorFunctorCodeNotFound,ErrorExpectingVariable
			, ErrorErrorNotBound, ErrorInvalidToken, ErrorInternal
			, Var, Token, Functor
			, Utils
*/

/**
 * Interpreter
 * @constructor
 * 
 * @param db    : Database
 * @param env   : Environment
 * @param stack : the processing stack i.e. where instructions are pushed and popped
 */
function Interpreter(db, db_builtins) {

	this.db  = db;
	this.db_builtins = db_builtins || {};
	
	this.tracer = null;
	this.reached_end_question = false;
	
}

Interpreter.prototype.get_context = function(){
	return this.ctx;
};

Interpreter.prototype.get_stack = function(){
	return this.stack;
};

Interpreter.prototype.set_tracer = function(tracer) {
	this.tracer = tracer;
};


/**
 * Set the `question` to get an answer to
 * 
 * The `question` must be an expression (not a rule)
 *  organized as a single root node.
 * 
 * @param question
 * 
 * @raise ErrorExpectingFunctor
 */
Interpreter.prototype.set_question = function(question_code){
	
	// Enter the `question` in the database
	//  as to only have 1 location to work on from
	if (!(question_code instanceof Array))
		this.db.insert_code(".q.", 0, question_code);
	else
		this.db.insert_code(".q.", 0, question_code[0]);
	
	/*
	 *  Interpreter Context
	 */
	this.ctx = {

		step_counter: 0
			
		// The current instruction pointer
		//
		,p: { 
			f:  ".q.",  // which functor in the database
			a:  0,      // arity
			ci: 0,      // clause index
			ct: 1,      // Total number of clause
			l:  'g0',   // which label
			i:  0       // and finally which index in the label entry
			}
	
		// The current code inside functor:label pointed to by 'p'
		//
		,cc: null

		/*
		 *   Related to `CALL` setup
		 * 
		 *   cv: the structure being built with
		 *       `put_struct`, `put_var`, `put_term`, `put_number` and `put_value`
		 * 
		 */
		,cv: null
		
		/*  Related to `HEAD` Processing
		 * 
		 *   csx:  The current local variable being used to deconstruct
		 *          in the `head` functor.
		 * 
		 *   cs:   The current structure being worked on
		 *         This is retrieved through the "get_struct" instruction.
		 *       
		 *   csi:  The current index in the arguments of `cs`.
		 *         We need this index pointer because we can't be
		 *         destructively `popping` the arguments from the structure.
		 *         This should not be confused with the parent's `head functor` arguments.
		 *         
		 *   csm:  The current mode, either "r" or "w".
		 *   
		 */
		,cs:  null
		,csx: null   
		,csi: 0     
		,csm: 'r'   
		
		/*
		 *  Current unification status
		 */
		,cu: true
		
		/*  Top of stack environment
		 *   i.e. the latest 'allocated'
		 */
		,tse: {}
		
		/*  Current Environment
		 * 
		 */
		,cse: {}

		/*
		 *  `end` instruction encountered
		 */
		,end: false
	};
	
	this.stack = [];
	
	/*   Initialize top of stack
	 *    to point to question in the database
	 *    
	 *   The definitions contained herein
	 *    apply to all environment stack frames.
	 */
	var qenv = {

		qenv: true

		/*  Continuation Point
		 *    Used to return from a 'call' 
		 *    
		 *    Uses the same format as 'p'
		 *    but also 'ce' added (continuation environment) 
		 */
		,cp: {}
		
		,vars: {}
	
		/*  Trail
		 */
		,trail: []


		,ci: 0 // Clause Index
		
		// Total number of clauses for the current functor
		,ct: 0

		// TRY_ELSE continuation
		,te: null
		
		/*  Related to building a structure for a CALL instruction
		 */
		,cv: null  // the name of variable where to find the structure being built
		
	};//
	
	// The question's environment
	//
	this.stack.push(qenv);
	this.ctx.cse = qenv;

	// No `call` construction is in progress of course!
	this.ctx.tse = null;
	
	// Prime the whole thing
	this._execute();
};

/**
 *  Backtrack
 *  
 *  @return true  : can backtrack
 *  @return false : can not backtrack (e.g. end of choice points) 
 */
Interpreter.prototype.backtrack = function() {
	
	if (this.tracer)
		this.tracer("backtracking", this.ctx);
	
	// Pretend we've got a failure
	//  but in most cases this will anyhow be the case...
	this.ctx.cu = false;
	this.ctx.end = false;
	
	// We are at the top of the stack
	if (this.ctx.tse.qenv)
		return false;
	
	/*
	 * Are we at a cut ?
	 */	
	var maybe_cut_spos = this.ctx.tse.cut;
	
	if (maybe_cut_spos === undefined ) {
		this._restore_continuation( this.ctx.tse.cp );
		this._execute();
		return true;
	}
		
	/*
	 * We are a cut point ...
	 */
	for (;;) {
		
		// We are at the top of the stack
		if (this.ctx.tse.qenv)
			break;
		
		this._unwind_trail( this.ctx.tse.trail );
		
		var spos = this.ctx.tse.spos;

		// Reached the end of the cut ?
		if (maybe_cut_spos == spos )
			break;
		

		this.stack.pop();
		this.ctx.tse = this.stack[ this.stack.length-1 ];
		this.ctx.cse = this.ctx.tse;
		
	}

	// We are at the top of the stack
	if (this.ctx.tse.qenv)
		return false;
	
	this._restore_continuation( this.ctx.tse.cp );
	this._execute();
	
	return true;
};


/**
 * Take 1 processing step
 * 
 * @return true | false : where 'true' means 'end'
 * 
 * @raise ErrorNoMoreInstruction
 * @raise ErrorInvalidInstruction
 */
Interpreter.prototype.step = function() {

	if (this.ctx.end)
		return true;
	
	this.ctx.step_counter++;
	
	var inst = this.fetch_next_instruction();
	
	var fnc_name = "inst_" + inst.opcode;
	
	var fnc = this[fnc_name];
	if (!fnc)
		throw new ErrorInvalidInstruction(inst.opcode, inst);

	if (this.tracer) {
		this.tracer('before_inst', this, inst);
		this[fnc_name].apply(this, [inst]);
		this.tracer('after_inst', this, inst);
	} else {
		// Execute the instruction
		this[fnc_name].apply(this, [inst]);	
	}
	
	return this.ctx.end;
	
};// step

/**
 *  Cases:
 *  
 *  a)  null --> *p     i.e. at initialization  (already taken care of)
 *  b)  HEAD --> G0     i.e. when executing a functor
 *  c)  Gx   --> Gx'    i.e. when executing inside a functor
 * 
 * @return Instruction | null
 * 
 */
Interpreter.prototype.fetch_next_instruction = function(){
	
	//console.log("fetch: ", this.ctx.p.f+"/"+this.ctx.p.a, this.ctx.p.l, this.ctx.p.i);
	
	// Just try fetching next instruction from env.cc
	var inst = this.ctx.cc[this.ctx.p.l][this.ctx.p.i];
	
	this.ctx.p.i++;
	
	if (inst)
		return inst;
	
	// A jump should have occurred in the code anyways
	//
	throw new ErrorNoMoreInstruction("No More Instruction", inst);
};

/**
 *  Get Functor code
 * 
 *  Checks the 'user' database first
 *   and second the 'builtin' database.
 */
 Interpreter.prototype._get_code = function(functor_name, arity, clause_index) { 
 	
 	if (this.db.exists(functor_name, arity)) {
 		return this.__get_code(this.db, functor_name, arity, clause_index);
 	}
 	
 	return this.__get_code(this.db_builtins, functor_name, arity, clause_index);
 };


/**
 *  Get Functor code
 * 
 * @param ctx.f  : functor_name
 * @param ctx.a  : arity
 * @param ctx.ci : clause_index
 * 
 * @raise ErrorFunctorNotFound
 * @raise ErrorFunctorClauseNotFound
 * 
 * @return ctx with additionally { cc: code, ct: clauses_count }
 */
Interpreter.prototype.__get_code = function(db, functor_name, arity, clause_index) {
	
	var result = {};
	var fname;
	var clauses;

	try {
		clauses = db.get_code(functor_name, arity);
		result.ct = clauses.length;
	} catch(e) {
		fname = functor_name+"/"+arity;
		throw new ErrorFunctorNotFound("Functor not found: "+fname, fname);
	}
	
	if (clause_index >= result.ct) {
		fname = functor_name+"/"+arity;
		throw new ErrorFunctorClauseNotFound("Functor clause not found: "+fname, fname);
	}
	
	result.cc = clauses[clause_index];
	
	if (!result.cc) {
		fname = functor_name+"/"+arity;
		return ErrorFunctorCodeNotFound("Functor clause code not found: "+fname, fname);
	}
	
	return result;
	
};//_get_code


Interpreter.prototype._goto = function( label ){
	
	this.ctx.p.l = label;
	this.ctx.p.i = 0;
	
};

/**
 *  Jump to a specific code instruction in the database
 * 
 * @param ctx.f  : functor name
 * @param ctx.a  : functor arity
 * @param ctx.ci : clause index
 * @param ctx.l  : clause label
 * @param ctx.i  : clause label instruction index
 * 
 * @raise ErrorFunctorNotFound, ErrorFunctorCodeNotFound, ErrorFunctorClauseNotFound
 */
Interpreter.prototype._execute = function( ctx ){

	var result = {};
	
	if (ctx) {
		/*
		 *  If input `ctx` is specified,
		 *   it is in the case of a `call` instruction.
		 *   Thus, we are transferring the control flow
		 *   to the beginning of the `head` 
		 *   of the functor specified.
		 */
		
		result = this._get_code(ctx.f, ctx.a, ctx.ci);
		
		this.ctx.p.f  = ctx.f;
		this.ctx.p.a  = ctx.a;
		this.ctx.p.ci = ctx.ci;
		this.ctx.p.i = 0;

		this.ctx.cc   = result.cc;
		this.ctx.p.ct = result.ct;
		
	}
	else {
		/*
		 *  In the following case, we are either 
		 *  -- `retrying`
		 *  -- `backtracking`
		 */
		
		result = this._get_code(this.ctx.p.f, this.ctx.p.a, this.ctx.p.ci);
		this.ctx.cc = result.cc;
	}

	// ctx.cc  now contains the code for the specified clause
	//          for the specified functor/arity
	
	/*
	 *  We either have a `fact` (head, no body)
	 *  or a `rule`  (head & body).
	 *  
	 *  Just having `g0` would mean a `query`.
	 */

	if (ctx) {
		this.ctx.p.l = ctx.l || 'head';	
	}
	
	if (this.tracer)
		this.tracer("execute", this.ctx);
	
	return result;
};

Interpreter.prototype._restore_continuation = function(from) {
	
	if (this.tracer)
		this.tracer("restore", from);
	
	this.ctx.cse  = from.ce;
	this.ctx.te   = from.te;
	this.ctx.p.f  = from.p.f;
	this.ctx.p.a  = from.p.a;
	this.ctx.p.ci = from.p.ci;
	this.ctx.p.ct = from.p.ct;
	this.ctx.p.l  = from.p.l;
	this.ctx.p.i  = from.p.i;

};



Interpreter.prototype._save_continuation = function(where, instruction_offset) {
	
	where.p = {};
	
	where.ce   = this.ctx.cse;
	where.te   = this.ctx.te;
	where.p.f  = this.ctx.p.f;
	where.p.a  = this.ctx.p.a;
	where.p.ci = this.ctx.p.ci;
	where.p.ct = this.ctx.p.ct;
	where.p.l  = this.ctx.p.l;
	where.p.i  = this.ctx.p.i + (instruction_offset || 0);
	
	if (this.tracer)
		this.tracer("save", where);
};

Interpreter.prototype._add_to_trail = function(which_trail, what_var) {
	
	var vtrail_name = what_var.name;
	which_trail[vtrail_name] = what_var;
};


Interpreter.prototype.maybe_add_to_trail = function(which_trail, what_var) {
	
	// We only add unbound variables of course
	var dvar = what_var.deref();
	if (dvar.is_bound())
		return;
	
	var vtrail_name = dvar.name;
	which_trail[vtrail_name] = dvar;
	
	//console.log("| TRAILED: ", dvar.name, dvar.id);
};


/**
 *  Unwind Trail
 * 
 *  Note that we can't remove elements from the
 *   trail because this one is created during the
 *   `setup` phase yielding to the `call` and won't
 *   be revisited during the possible 
 *   subsequent `retry` phase(s).
 *   
 *   Thus, the trail must exist for as long as the
 *    choice point is kept.
 *    
 * 
 * @param which
 */
Interpreter.prototype._unwind_trail = function(which) {
	
	for (var v in which) {
		var trail_var = which[v];
		
		/*
		 *  We don't deref because the variable
		 *   could have been bound to another one
		 *   which is not bound itself (a chain).
		 */
		
		if (!trail_var.is_bound())
			continue;
		
		trail_var.unbind();
		
		//console.log("> TRAIL UNBOUND: ", trail_var.name);
	}
	
	// Next time around, we might have a different clause
	//  with different variables ... so do some cleanup!
	which = {};

};


Interpreter.prototype.get_query_vars = function() {
	return this.ctx.cse.vars;
};


//
//
// ================================================================================= INSTRUCTIONS
//
//

/**
 *  Instruction "end"
 * 
 * 
 *  Saves Continuation Point to point
 *   at the "maybe retry" following the `call` instruction
 * 
 */
Interpreter.prototype.inst_end = function() {
	this.ctx.end = true;
};

/**
 *  Instruction "setup"
 * 
 * 
 *  Saves Continuation Point to point
 *   at the "maybe retry" following the `call` instruction
 * 
 */
Interpreter.prototype.inst_setup = function() {
	
	// We only need an offset of 1 
	//  because the `fetch instruction` increments
	//  already by 1.
	//
	this._save_continuation(this.ctx.tse.cp, 1);
	
	// Initialize the clause index
	//
	this.ctx.tse.p.ci = 0; 
	this.ctx.tse.p.ct = 0;
};

//
//
// ================================================================================= BUILTINS
//
//

/**
 *   Instruction "bcall"
 * 
 *   Calling builtin functors
 * 
 *   x0 contains the functor recognized
 *      as builtin.
 * 
 */
Interpreter.prototype.inst_bcall = function(inst) {


	//  Make the jump in the target environment
	//
	this.ctx.cse = this.ctx.tse;
	
	// We got this far... so everything is good
	this.ctx.cu = true;
	
	var x0 = this.ctx.tse.vars.$x0;

	this.ctx.tse.vars = {};
	this.ctx.tse.vars.$x0 = x0;
	
	var bname = x0.name;
	
	var bfunc = this["builtin_"+bname];
	if (!bfunc)
		throw new ErrorFunctorNotFound(bname, bname);
		
	bfunc.apply(this, [x0]);
	
	this._restore_continuation( this.ctx.cse.cp );
};

Interpreter.prototype.builtin_unif = function(x0) {
	
	//console.log("--- BUILTIN: unif: ", x0);
	
	var left  = x0.args[0];
	var right = x0.args[1];
	
	//console.log("--- BUILTIN: typeof left:  ", typeof left.value);
	//console.log("--- BUILTIN: typeof right: ", typeof right.value);
	
	//console.log("--- BUILTIN: Unif: Left:  ", JSON.stringify(left));
	//console.log("--- BUILTIN: Unif: Right: ", JSON.stringify(right));
	
	var that = this;
	this.ctx.cu = Utils.unify(left, right, function(t1, value) {
			
			// we are in the `head` and thus we accumulate the trail
			//  in the current environment context
			//
			that.maybe_add_to_trail(that.ctx.tse.trail, t1);
			
			//console.log("builtin_unif: add to trail: ", t1.name, t1.id, value);
		});
	
	//console.log("---- BCALL result: ", typeof this.ctx.cu);
	//console.log("---- BCALL result: ", this.ctx.cu);
};


/**
 *   Instruction `op_notunif`
 *
 *   $x0.arg[0]  ==> lvalue
 *   $x0.arg[1]  ==> rvalue
 *   
 */
Interpreter.prototype.builtin_notunif = function(x0) {

	var left  = x0.args[0];
	var right = x0.args[1];

	this.ctx.cu = !Utils.unify(left, right, {no_bind: true});

};

/**
 *   Instruction `op_equal`
 *
 *   $x0.arg[0]  ==> lvalue
 *   $x0.arg[1]  ==> rvalue
 *   
 */
Interpreter.prototype.builtin_equal = function(x0) {

	var left  = x0.args[0];
	var right = x0.args[1];
	
	var lvalue = this._get_value(left);
	var rvalue = this._get_value(right);

	this.ctx.cu = lvalue == rvalue;
};

Interpreter.prototype.builtin_equalnot = function(x0) {

	this.builtin_equal(x0);
	this.ctx.cu = !this.ctx.cu;
};

//
//
// ================================================================================= CONTROL-FLOW
//
//

/**
 *   Instruction "fail"
 * 
 */
Interpreter.prototype.inst_fail = function(inst) {
	
	this.backtrack();
	
};

/**
 *   Instruction "call"
 * 
 *   Executes the Functor pointed to by $x0
 *    in the target environment.
 *    
 *   The Continuation Point (CP) will be saved
 *    in the current environment.
 *   
 */
Interpreter.prototype.inst_call = function(inst) {
	
	/*
	 * Clean-up target variables
	 *  We used some variables to construct
	 *  the main structure at $x0 but we need
	 *  to get rid of these or else the target
	 *  functor might unify with values it shouldn't.
	 */
	var x0 = this.ctx.tse.vars.$x0;
	this.ctx.tse.vars = {};
	this.ctx.tse.vars.$x0 = x0;
	
	// Get ready for `head` related instructions
	this.ctx.cs = null;
	this.ctx.csx = null;
	this.ctx.csm = 'r';
	this.ctx.csi = 0;
	
	
	// Get functor name & arity from the 
	//  environment variable x0
	
	var fname = x0.name;
	var arity = x0.args.length;
	
	//console.log(".......... CALLING: ", fname, arity);
	
	/*  Takes care of
	 *  - label `l` component
	 *  - current code `cc`
	 *  - instruction pointer `i` inside label
	 */  

	//this.ctx.p.same = (this.ctx.p.f == fname && this.ctx.p.a == arity);

	var result = this._execute({
		 f:  fname
		,a:  arity
		,ci: this.ctx.tse.p.ci
	});
	
	this.ctx.tse.p.ct = result.ct;
	
	//  Make the jump in the target environment
	//
	this.ctx.cse = this.ctx.tse;
	
	// We got this far... so everything is good
	this.ctx.cu = true;
	
}; // CALL



/**
 *   Instruction "maybe_retry"
 * 
 *   When used, this instruction **must** 
 *     always follow a 'CALL' instruction.
 * 
 *   Used to retry the preceding 'CALL' if a failure occurred.
 *   
 *   * Increment clause index
 *   * IF the clause index == # of clauses ==> failure
 *   * ELSE
 *   *   p--, p--
 * 
 */
Interpreter.prototype.inst_maybe_retry = function() {
	
	// A 'noop' if there isn't a failure reported
	//
	if (this.ctx.cu)
		return;

	/*  Whatever happens after, we anyways need
	 *   to unwind the trail before attempting anything else.
	 * 
	 */
	this._unwind_trail( this.ctx.tse.trail );
	
	this.ctx.tse.p.ci ++;

	/*
	 *  The Choice Point context is kept on the top of stack `tse`
	 */
	if (this.ctx.tse.p.ci < this.ctx.tse.p.ct) {
		
		/* We can try the next clause
		 * 
		    The fetch function will have incremented the
		    instruction pointer past this instruction
		    so we need to subtract 2 to get it pointing
		    back to the 'CALL' instruction.
		
			The `backtrack` step will have already
			loaded the code, we just have to cause a
			`jump` by manipulating `i` directly.
		*/
		this.ctx.p.i -= 2;
	}

	// ELSE:  the following `deallocate` will get rid of the
	//        environment from the stack
	
};

Interpreter.prototype.inst_maybe_retryn = function() {
	
	// A 'noop' if there isn't a failure reported
	//
	if (!this.ctx.cu) {
		this.ctx.cu = !this.ctx.cu;
		return;
	}
		

	/*  Whatever happens after, we anyways need
	 *   to unwind the trail before attempting anything else.
	 * 
	 */
	this._unwind_trail( this.ctx.tse.trail );
	
	this.ctx.tse.p.ci ++;

	/*
	 *  The Choice Point context is kept on the top of stack `tse`
	 */
	if (this.ctx.tse.p.ci < this.ctx.tse.p.ct) {
		
		/* We can try the next clause
		 * 
		    The fetch function will have incremented the
		    instruction pointer past this instruction
		    so we need to subtract 2 to get it pointing
		    back to the 'CALL' instruction.
		
			The `backtrack` step will have already
			loaded the code, we just have to cause a
			`jump` by manipulating `i` directly.
		*/
		this.ctx.p.i -= 2;
	}

	// ELSE:  the following `deallocate` will get rid of the
	//        environment from the stack
	
};

/**
 *   Instruction "allocate"
 *   
 *   Denotes beginning of a "choice point" code block
 *   
 *   Create an environment for this choice point and
 *    and push a link in the current environment.
 */
Interpreter.prototype.inst_allocate = function() {
	
	var env = { vars: {}, cp: {}, trail: {}, p:{} , spos: this.stack.length };
	this.ctx.tse = env;
	this.stack.push(env);
};

/**
 *   Instruction "deallocate"
 * 
 *   Deallocates, if possible, a "choice point" environment.
 * 
 *   Cases:
 *   - Choice Point succeeds : do not deallocate environment   
 *   - No Choice Point left
 */
Interpreter.prototype.inst_deallocate = function() {

	/*
	 * Cannot deallocate if we have had
	 *  a successful choice point
	 */
	if (this.ctx.cu)
		return;

	/*
	 *  We've got valuable information here!
	 * 
	 */
	this._unwind_trail( this.ctx.tse.trail );
	
	/*
	 *  The previous choice point list is exhausted.
	 *  There is no use keeping the context.
	 */
	this._deallocate();
};

Interpreter.prototype._deallocate = function(){
	
	this.stack.pop();
	
	// tse goes back to top of stack
	this.ctx.tse = this.stack[ this.stack.length-1 ];
};

/**
 *   Instruction "maybe_fail"
 *   
 *   Used to 'fail' the goal if the result
 *    of the preceding 'CALL' failed.
 *  
 *  
 *   IF a goal was loaded by a 'try_else' instruction,
 *     JUMP to this goal.
 *     
 *   ELSE jump to continuation point.
 *   
 */
Interpreter.prototype.inst_maybe_fail = function() {
	
	// At this point, we don't need $x0 anymore
	//delete this.ctx.cse.vars.$x0 ;
	
	// NOOP if we are not faced with a failure
	if (this.ctx.cu)
		return;

	// A disjunction is available?
	//
	if (this.ctx.cse.te) {
		
		this._goto( this.ctx.cse.te );
		
		// just making sure
		this.ctx.cse.te = null;
		
		return;
	}
	
	this.backtrack();
};


/**
 *   Instruction "try_else $target"
 * 
 *   Denotes a disjunctive choice point
 * 
 *   Insert choice point to $target in the current environment.
 *   
 *   If the following choice point about to be tried fails,
 *    it will be removed from the choice point list and the
 *    one inserted to $target will be tried next.
 *   
 */
Interpreter.prototype.inst_try_else = function( inst ) {
	
	var vname = inst.get("p");
	this.ctx.cse.te = vname;
};

/**
 *   Instruction "try_finally"
 * 
 *   Last goal of a disjunction   
 */
Interpreter.prototype.inst_try_finally = function( ) {
	
	this.ctx.cse.te = null;
};


/**
 *   Instruction  "jump"
 * 
 *   Used to jump between labels within a clause
 * 
 */
Interpreter.prototype.inst_jump = function( inst ) {
	
	var vname = inst.get("p");
	
	// Within same functor (i.e. clause)
	this.ctx.p.l = vname;
	this.ctx.p.i = 0;
	
};



/**
 *   Instruction 'proceed'
 *   
 *   Look Continuation Point in `p`
 *   
 */
Interpreter.prototype.inst_proceed = function() {
		
	if (this.ctx.cu) {
		this._restore_continuation( this.ctx.cse.cp );
		this._execute();
		return;
	}
	
	// A disjunction is available?
	//
	if (this.ctx.cse.te) {
		
		this._goto( this.ctx.cse.te );
		
		// just making sure
		this.ctx.cse.te = null;
		
		return;
	}
	
	
	this.backtrack();
};


//=========================================================================== PRIMITIVES


/**
 *   Instruction `cut`
 *
 *   A special environment containing the current stack depth 
 *    is pushed on the stack.  When backtracking occurs and lands
 *    on this environment entry, all the choice point entries on
 *    the stack up to the stack depth indicated in the `cut` environment
 *    is unwound.
 *   
 */
Interpreter.prototype.inst_cut = function() {

	var cut_stack_position = this.ctx.cse.spos; 
	
	this.ctx.tse.cut = cut_stack_position;
	
	// not sure this is necessary
	//
	this.ctx.cu = true;
};



/**
 *   Instruction `prepare`
 *   
 *   `x` contains the local register's index where
 *       to store the result      
 */
Interpreter.prototype.inst_prepare = function(_inst) {

	this.ctx.cse.vars.$y0 = new Functor('$op');
	this.ctx.cu = true;
};


/**
 *   Instruction `push_var`
 *   
 */
Interpreter.prototype.inst_push_var = function(inst) {

	var vname = inst.get("p");
	
	var struct = this.ctx.cse.vars.$y0;

	// Do we have a local variable already setup?
	var local_var = this.ctx.cse.vars[vname];
	if (!local_var) {
		local_var = new Var(vname);
		this.ctx.cse.vars[local_var.name] = local_var;
	} 
	
	struct.push_arg(local_var);
};

Interpreter.prototype._get_value = function(token) {
	
	if (token instanceof Var) {
		var dvar = token.deref();
		if (!dvar.is_bound())
			throw new ErrorErrorNotBound("Expecting bound variable for: "+token.name, token);
		
		// not the prettiest solution I know
		token = dvar.get_value();
	}
		
	
	if (Utils.isNumeric(token))
		return token;
	
	if (token instanceof Token) {
		if (token.name == 'number')
			return token.value;

		if (token.name == 'boolean')
			return token.value;
	}
			
			
	
	throw new ErrorInvalidToken("Invalid Token: Got: "+JSON.stringify(token), token);
};

/**
 *   Instruction "push_value"
 * 
 *   Inserts a 'value' in the structure being built.
 *    
 */
Interpreter.prototype.inst_push_value = function(inst) {
	
	var vname = inst.get("y", "$y");
	var struct = this.ctx.cse.vars.$y0;
	
	var yvar = this.ctx.cse.vars[vname];
	var value = this._get_value(yvar);
	
	
	struct.push_arg(value);
};

/**
 *   Instruction "push_number"
 * 
 *   Inserts a 'number' in the structure being built.
 *    
 */
Interpreter.prototype.inst_push_number = function(inst) {
	
	var p = inst.get("p");
	
	var struct = this.ctx.cse.vars.$y0;
	struct.push_arg(p);
};



/**
 *   Instruction `op_unif`
 *
 *   $x0.arg[0]  ==> lvalue
 *   $x0.arg[1]  ==> rvalue
 *   
 */
Interpreter.prototype.inst_op_unif = function(_inst) {

	var y0 = this.ctx.cse.vars.$y0;
	
	var vy0 = this._get_value(y0.args[0]);
	var vy1 = this._get_value(y0.args[1]);
	
	
	var that = this;
	this.ctx.cu = Utils.unify(vy0, vy1, function(t1) {
		that.maybe_add_to_trail(that.ctx.cse.trail, t1);
	} );

	return this._exit(); 
};



/**
 *   Exit procedure for all primitives
 *   
 */
Interpreter.prototype._exit = function() {

	if (this.ctx.cu)
		return;
	
	// A disjunction is available?
	//
	if (this.ctx.cse.te) {
		
		this._goto( this.ctx.cse.te );
		
		// just making sure
		this.ctx.cse.te = null;
		
		return;
	}
	
	this.backtrack();
};

/**
 *   Instruction `op_is`
 *   
 *     `Var is value`
 *   
 *   $x0.arg[0] ==> lvalue
 *   $x0.arg[1] ==> rvalue
 *   
 */
Interpreter.prototype.inst_op_is = function(inst) {

	var y0 = this.ctx.cse.vars.$y0;
	
	// Expecting a variable for lvalue
	var lvar = y0.args[0];
	var rval = y0.args[1];

	if (!(lvar instanceof Var))
		throw new ErrorExpectingVariable("Expecting an unbound variable as lvalue of `is`, got: "+JSON.stringify(lvar), inst);
	
	// lvar is not supposed to be bound yet!
	//
	lvar.bind(rval);
	
	this.ctx.cu = true;
};

/**
 *   Instruction `op_true`
 *   
 *   
 */
Interpreter.prototype.inst_op_true = function(inst) {

	this.ctx.cse.vars.$y1 = new Token("boolean", true);
	this.ctx.cu = true;
};

Interpreter.prototype.inst_op_false = function(inst) {

	this.ctx.cse.vars.$y1 = new Token("boolean", false);
	this.ctx.cu = true;
};

Interpreter.prototype.inst_op_not = function(inst) {

	this.ctx.cu = true;
	
	var p = this.ctx.cse.vars.$y0.args[0];

	console.log("op_not: p= ", p);

	if (p instanceof Token && p.name == 'boolean') {
		this.ctx.cse.vars.$y1 = new Token("boolean", !p.value);
		return;
	}
		
	if (p !== true && p !== false)
		throw Error("Expecting Boolean got: "+JSON.stringify(p));
		
	this.ctx.cse.vars.$y1 = new Token("boolean", !p);
	
};


Interpreter.prototype._get_values = function() {

	var y0 = this.ctx.cse.vars.$y0;
	
	// Expecting variables or values
	var l = y0.args[0];
	var r = y0.args[1];

	var lval, rval;
	
	if (l instanceof Var)
		lval = l.deref().get_value();
	else
		if (Utils.isNumeric(l))
			lval = l;
		else
			lval = l.value;
	
	if (r instanceof Var )
		rval = r.deref().get_value();
	else
		if (Utils.isNumeric(r))
			rval = r;
		else
			rval = r.value;
	
	return {r: rval, l: lval};
};

/**
 *  Instruction `plus`
 * 
 */
Interpreter.prototype.inst_op_plus = function(inst) {

	var y = inst.get("y", "$y");
	
	var values = this._get_values();
	
	this.ctx.cse.vars[y] =  values.l + values.r;
	
	this.ctx.cu = true;
};

/**
 *  Instruction `minus`
 * 
 */
Interpreter.prototype.inst_op_minus = function(inst) {

	var y = inst.get("y", "$y");
	
	var values = this._get_values();
	
	this.ctx.cse.vars[y] =  values.l - values.r;
	
	this.ctx.cu = true;
};

/**
 *  Instruction `mult`
 * 
 */
Interpreter.prototype.inst_op_mult = function(inst) {

	var y = inst.get("y", "$y");
	
	var values = this._get_values();
	
	this.ctx.cse.vars[y] =  values.l * values.r;
	
	this.ctx.cu = true;
};

/**
 *  Instruction `div`
 * 
 */
Interpreter.prototype.inst_op_div = function(inst) {

	var y = inst.get("y", "$y");
	
	var values = this._get_values();
	
	this.ctx.cse.vars[y] =  values.l / values.r;
	
	this.ctx.cu = true;
};


/**
 *  Instruction `>`
 * 
 */
Interpreter.prototype.inst_op_gt = function() {

	var values = this._get_values();
	
	this.ctx.cu = values.l > values.r;
	
	this._exit();
};

/**
 *  Instruction `<`
 * 
 */
Interpreter.prototype.inst_op_lt = function() {

	var values = this._get_values();
	
	this.ctx.cu = values.l < values.r;
	
	this._exit();
};

/**
 *  Instruction `>=`
 * 
 */
Interpreter.prototype.inst_op_ge = function() {

	var values = this._get_values();
	
	this.ctx.cu = values.l >= values.r;
	
	this._exit();
};

/**
 *  Instruction `=<`
 * 
 */
Interpreter.prototype.inst_op_em = function() {

	var values = this._get_values();
	
	this.ctx.cu = values.l <= values.r;
	
	this._exit();
};


//=========================================================================== CALL




/**
 *   Instruction "put_struct $f $a $x"
 * 
 *   Used to construct a structure $f or arity $a in the 
 *   target choice point environment.  Starts building the structure in the
 *    choice point environment at variable $x.
 * 
 *   The target variable $x is retained in the current environment
 *    as to help with the remainder of the construction.
 * 
 */
Interpreter.prototype.inst_put_struct = function(inst) {
	
	var f = new Functor(inst.get('f'));
	var a = inst.get('a');
	f.arity = a;
	
	var x = "$x" + inst.get('x');
	
	this.ctx.cv = x;
	this.ctx.tse.vars[x] = f;
};

/**
 *   Instruction "put_term"
 * 
 *   Inserts a 'term' in the structure being built.
 */
Interpreter.prototype.inst_put_term = function(inst) {
	
	var term = inst.get("p");
	
	// Structure being built on the top of stack
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];
	
	//struct.push_arg(new Token('term', term) );
	struct.push_arg( term );
};

/**
 *   Instruction "put_number"
 * 
 *   Inserts a 'number' in the structure being built.
 */
Interpreter.prototype.inst_put_number = function(inst) {
	
	var num = inst.get("p");
	
	// Structure being built on the top of stack
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];
	
	struct.push_arg(new Token('number', num));
};

Interpreter.prototype.inst_put_void = function() {

	// Structure being built on the top of stack
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];

	var vvar = new Var("_");
	
	//this._add_to_trail(this.ctx.tse.trail, vvar);
	
	struct.push_arg(vvar);
};

Interpreter.prototype.inst_put_nil = function() {

	// Structure being built on the top of stack
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];

	struct.push_arg( new Token('nil') );
};

/**
 *   Instruction "put_var"
 * 
 *   Inserts a 'var' in the structure being built.
 */
Interpreter.prototype.inst_put_var = function(inst) {
	
	var vname = inst.get("p");
	
	// Structure being built on the top of stack
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];

	// Do we have a local variable already setup?
	var local_var = this.ctx.cse.vars[vname];
	if (local_var === undefined) {
		local_var = new Var(vname);
		this.ctx.cse.vars[local_var.name] = local_var;
	} 
	
	struct.push_arg(local_var);
};

/**
 *   Instruction "put_value"
 * 
 *   Inserts a 'value' in the structure being built.
 *
 *   We don't have to `trail` anything here: the `value`
 *    in question is really just a substructure of the
 *    target one being built in $x0.
 *    
 */
Interpreter.prototype.inst_put_value = function(inst) {
	
	var vname = inst.get("x", "$x");
	
	var value = this.ctx.tse.vars[vname];
	
	// The current structure being worked on
	var cv = this.ctx.cv;
	var struct = this.ctx.tse.vars[cv];

	struct.push_arg(value);
};


//=========================================================================== HEAD

/**
 *   Instruction `unif_value`
 *   
 *   Used in the `head`, inside a structure, subsequent appearances of variable
 *    (i.e. not on first appearance of variable).
 *    
 *   In `read` mode   ==> unify
 *   In `write` mode  ==> just put value 
 *   
 */
Interpreter.prototype.inst_unif_value = function(inst) {
	
	var p = inst.get('p');
	var pv = this.ctx.cse.vars[p];
	
	/*
	 *  Cases:
	 *    What is locally at 'p'
	 *    1- a Var
	 *    2- a Functor (structure) or a Token
	 *    
	 *  In case of (1) :
	 *  ================
	 *     in 'w' mode ==> push
	 *     in 'r' mode ==> unify
	 *     
	 *  In case of (2) :
	 *  ================
	 *     in 'w' mode ==> push
	 *     in 'r' mode ==> unify
	 */

	// `write` mode ?
	//
	if (this.ctx.csm == 'w') {
		this.ctx.cs.push_arg( pv );
		this.ctx.cu = true;
		return;
	}
	
	
	var from_current_structure = this.ctx.cs.get_arg( this.ctx.csi++ );
	
	// IMPORTANT: the variable should already
	//            have been created in the local environment
	// =====================================================
	
	var that = this;
	this.ctx.cu = Utils.unify(from_current_structure, pv, function(t1) {
		
		// we are in the `head` and thus we accumulate the trail
		//  in the current environment context
		//
		that.maybe_add_to_trail(that.ctx.cse.trail, t1);
	});
	
	if (!this.ctx.cu)
		this.backtrack();
};

/**
 *   Skip a structure's argument
 */
Interpreter.prototype.inst_unif_void = function() {
	
	this.ctx.csi++;
	this.ctx.cu = true;
	
	if (this.ctx.csm == 'w') {
		var vvar = new Var("_");
		this._add_to_trail( this.ctx.cse.trail, vvar);
		this.ctx.cs.push_arg( vvar );
	}
	
};

/**
 *   Skip a structure's argument
 */
Interpreter.prototype.inst_get_nil = function() {
	
	if (this.ctx.csm == 'w') {
		this.ctx.cs.push_arg( new Token('nil') );
		this.ctx.cu = true;
		return;
	}

	var cell = this.ctx.cs.get_arg( this.ctx.csi++ );
	
	//console.log("::::: GET_NIL: ",cell,"\n");
	
	var that = this;
	this.ctx.cu = Utils.unify(cell, new Token('nil'), function(t1) {
		that.maybe_add_to_trail(that.ctx.cse.trail, t1);
	} );

	if (!this.ctx.cu)
		this.backtrack();	
};

/**
 *   Instruction "unif_var" $x
 *   
 *   Unify the value at the current variable
 *    being matched in the environment.
 *   
 *   - Token(term)
 *   - Token(number)
 *   - Functor, recursively
 * 
 *   Algorithm:
 *     http://www.dai.ed.ac.uk/groups/ssp/bookpages/quickprolog/node12.html
 * 
 *   NOTE:  Need to manage the trail.
 *   =====
 * 
 */
Interpreter.prototype.inst_unif_var = function(inst) {
	
	var v = inst.get('p');

	if (!v) {
		v = inst.get('x', "$x");
	}
	
	var pv = this.ctx.cse.vars[v];

	/*
	 *  Just a symbol, not even a Var assigned yet
	 */
	if (!pv) {
		pv = new Var(v);
		this.ctx.cse.vars[pv.name] = pv;
	}
	
	
	
	if (this.ctx.csm == 'w') {
		
		//console.log("unif_var (W): ", JSON.stringify(pv));
		
		// We don't accumulate on trail because
		//  there wasn't a binding yet
		this.ctx.cs.push_arg( pv );
		this.ctx.cu = true;
		return;
	}
	
	
	// Get from the structure being worked on
	//
	var value_or_var = this.ctx.cs.get_arg( this.ctx.csi++ );
	
	var that = this;
	this.ctx.cu = Utils.unify(pv, value_or_var, function(t1) {
		
		// In the `head`, accumulate in current environment
		//
		that._add_to_trail(that.ctx.cse.trail, t1);
	});
	
	if (!this.ctx.cu)
		this.backtrack();
	
};// unif_var

/**
 *  Instruction `get_var`
 *  
 *  Used in the `head` when a variable is first encountered.
 *  The variable is at the `root` of the `head` (and thus
 *   not inside a structure in the `head`).
 *  
 *  - Get the variable and place it in the local vars
 * 
 * @param inst
 */
Interpreter.prototype.inst_get_var = function(inst) {
	
	var local_var = inst.get('p') || inst.get('x', "$x");
	
	this.ctx.cu = true;

	if (this.ctx.csm == 'w') {
		var nvar = new Var(local_var);
		this.ctx.cse.vars[local_var] = nvar;
		this.ctx.cs.push_arg( nvar );
		return;
	}
	
	var value_or_var = this.ctx.cs.get_arg( this.ctx.csi++ );

	// We don't need to trail anything here :
	//  we are just using a reference and 
	//  all local variables will get flushed during a subsequent `call`.
	//
	this.ctx.cse.vars[local_var] = value_or_var;

};

/**
 *  Instruction `get_value`
 *  
 *  Used in the `head` when a variable already appeared earlier
 *  
 * @param inst
 */
Interpreter.prototype.inst_get_value = function(inst) {
	
	var p = inst.get('p');
	var pv = this.ctx.cse.vars[p];

	
	if (this.ctx.csm == 'w') {
		this.ctx.cs.push_arg( pv );
		this.ctx.cu = true;
		return;
	}

	
	var value_or_var = this.ctx.cs.get_arg( this.ctx.csi++ );

	var that = this;
	this.ctx.cu = Utils.unify(pv, value_or_var, function(t1) {
		that.maybe_add_to_trail(that.ctx.cse.trail, t1);
	});
	
};




/**
 *   Instruction "get_struct" $f, $a, $x
 *   
 *   Expects a structure of name $f and arity $a 
 *    at the current variable $x being
 *    matched in the environment.
 * 
 */
Interpreter.prototype.inst_get_struct = function(inst) {
	
	var x = inst.get('x', "$x");
	
	// Are we switching argument in the `head` functor?
	//
	//  If this is the case, we need to reset the 'mode'
	//   and associated variable used to construct a 
	//   structure in `write` mode.
	//
	if (x != this.ctx.csx) {
		
		this.ctx.csm = 'r';
		this.ctx.csx = x;
		
	} else {
		/*
		 *  If we are indeed trying to "get_struct"
		 *  on the same argument we were already processing,
		 *  this means something is terribly wrong,
		 *  probably a bug in the compiler.
		 */
		throw new ErrorInternal("Attempting to 'get_struct' again on same argument: " + x, inst);
	}
	
	var fname  = inst.get('f');
	var farity = inst.get('a');
	
	
	// Assume this will fail to be on the safe side
	//
	this.ctx.cu = false;
	
	// Prepare
	this.ctx.cs = null;
	this.ctx.csi = 0;
	

	// Fetch the local value
	var input_node = this.ctx.cse.vars[x];


	var dvar;

	if (input_node instanceof Var) {
		
		dvar = input_node.deref();
		
		if ( !dvar.is_bound() ) {

			/*
			 * We have received a unbound variable ==> "w" mode + trail
			 */
			this._add_to_trail(this.ctx.cse.trail, input_node);
			
			this.ctx.csm = 'w';
			
			var struct = new Functor(fname);
			this.ctx.cs = struct;
			
			dvar.bind( struct );
			
			this.ctx.cu = true;
			return;
		}
		
		
	}
	
	// We can only be in 'r' mode pass this point
	//
	this.ctx.csm = 'r';
	
	var node = input_node; 
	
	if (dvar) {
		
		/*
		 *  We have a bound variable ==> "r" mode, unify
		 */
		node = dvar.get_value();
		
	}
	
	/*
	 *  We have a proper structure
	 *    passed on in the `head`
	 */
	if (node instanceof Functor) {
		
		if (node.get_name() != fname) {
			return this.backtrack();	
		}

		if (node.get_arity() != +farity ) {
			return this.backtrack();
		}
		
		this.ctx.cs = node;
		this.ctx.cu = true;
		return;
	}

	
	
	this.backtrack();
};

/**
 *   Instruction "get_number" $p
 *   
 *   Expects a 'number' $p at the current variable being
 *    matched in the environment.
 * 
 */
Interpreter.prototype.inst_get_number = function(inst) {

	this._get_x(inst, 'number');
	
	if (!this.ctx.cu)
		this.backtrack();
};



/**
 *   Instruction "get_term" $p
 *   
 *   Expects a 'term' $p at the current variable being
 *    matched in the environment.
 * 
 */
Interpreter.prototype.inst_get_term = function(inst) {

	this._get_x(inst, 'term');
	
	if (!this.ctx.cu)
		this.backtrack();
};



Interpreter.prototype._get_x = function(inst, type) {
	
	var p = inst.get('p');
	
	if (this.ctx.csm == 'w') {
		this.ctx.cs.push_arg( new Token(type, p) );
		this.ctx.cu = true;
		return;
	}
	
	var value_or_var = this.ctx.cs.get_arg( this.ctx.csi++ );
	
	/*  Cases:
	 *  A) unbound variable ==> bind to expected number / term
	 *  B) bound variable   ==> unification
	 *  C) token(number) 
	 */

	
	this.ctx.cu = false;
	
	
	// CASE (C)
	//
	if (value_or_var instanceof Token) {
		if (value_or_var.name == type) {
			this.ctx.cu = ( value_or_var.value == p );
			return;
		}
		
		// FAIL
		return;
	}
	
	//  Could this really be happening ???
	//
	if (value_or_var == p) {
		this.ctx.cu = true;
		return;
	}
	
	//  We can't have something like a Functor here!
	//
	if (!(value_or_var instanceof Var)) {
		return; // fail
	}
	
	var variable = value_or_var;
	
	var dvar = variable.deref();
	
	// Case (B)
	//
	if (dvar.is_bound()) {
		
		// Unify
		//
		this.ctx.cu = (dvar.get_value() == p);
		return;
	}
	
	// Case (A)
	//
	dvar.bind(p);
	this._add_to_trail( this.ctx.cse.trail, dvar );
	
	this.ctx.cu = true;	
};




if (typeof module != 'undefined') {
	module.exports.Interpreter = Interpreter;
}


/* global Token, InComment
*/

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
	
	this.offset_in_text = 0;
	
	// Comment processing
	this.comment_start_line = 0;
	this.in_comment = false;
	this.comment_chars = "";
	
	this._tokenRegexp = /[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?|>=|=<|=\\=|=\:=|"""|\[|\]|\||\s.not\s.|\s.is\s.|\s.true\s.|\s.false\s.|\s.fail\s.|\d+(\.\d+)?|[A-Za-z_0-9]+|\?\-|:\-|\\=|=|\+\-|\*|\/|\-\+|[()\.,]|[\n\r]|./gm;
}

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
	':-':   function() { return new Token('op:rule',  ':-',     {is_operator: true}); }
	,'?-':  function() { return new Token('op:query', '?-',     {is_operator: true}); }
	,'=\\=':function() { return new Token('op:equalnot', '=\\=',{is_operator: true}); }
	,'=:=': function() { return new Token('op:equal',    '=:=', {is_operator: true}); }
	,',':   function() { return new Token('op:conj', ',',       {is_operator: true}); }
	,';':   function() { return new Token('op:disj', ';',       {is_operator: true}); }
	,'=':   function() { return new Token('op:unif', '=',       {is_operator: true}); }
	,'\\=': function() { return new Token('op:notunif', '\\=',  {is_operator: true}); }
	,'<':   function() { return new Token('op:lt',   '<',       {is_operator: true}); }
	,'>':   function() { return new Token('op:gt',   '>',       {is_operator: true}); }
	,'=<':  function() { return new Token('op:em',   '=<',      {is_operator: true}); }
	,'>=':  function() { return new Token('op:ge',   '>=',      {is_operator: true}); }
	,'-':   function() { return new Token('op:minus', '-',      {is_operator: true}); }
	,'+':   function() { return new Token('op:plus',  '+',      {is_operator: true}); }
	,'*':   function() { return new Token('op:mult',  '*',      {is_operator: true}); }
	,'/':   function() { return new Token('op:div',   '/',      {is_operator: true}); }
	,'not': function() { return new Token('op:not',   'not',    {is_operator: true}); }
	,'is':  function() { return new Token('op:is',    'is',     {is_operator: true, to_evaluate: true}); }
	,'|':   function() { return new Token('list:tail','|'  ); }
	
	,'\n':  function() { return new Token('newline'); }
	,'.':   function() { return new Token('period'); }
	,'(':   function() { return new Token('parens_open',  null); }
	,')':   function() { return new Token('parens_close', null); }
	
	,'[':   function() { return new Token('list:open',  null); }
	,']':   function() { return new Token('list:close', null); }
};

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
		
		if (t instanceof InComment)
			continue;
		
		if (t && t.name === null || t.name == 'eof')
			break;
		
		if (t !== undefined )
			list.push(t);
	};
	
	return list;
};

Lexer.InComment = new InComment();

Lexer.prototype.process_per_sentence = function() {
	
	var result = [];
	var current = [];
	var t;
	
	for (;;) {
		
		t = this.next();
		
		if (t instanceof InComment)
			continue;

		if ( t === null || t.name == 'eof') {
			if (current.length > 0)
				result.push(current);
			break;
		}
		
		if (t.name == 'newline')
			continue;
		
		if (t.name == 'period') {
			result.push(current);
			current = [];
			continue;
		}
		
		current.push( t );
	}
	
	return result;
};

/**
 *  Retrieve the next token in raw format
 *  
 *  @param {boolean} newline_as_null : emit the newline as a null
 *  
 *  @return Token | null 
 */
Lexer.prototype.step = function() {

	// we reached the end already,
	//  prevent restart
	if (this.at_the_end)
		return null;
	
	// note that regex.exec keeps a context
	//  in the regex variable itself 
	this.current_match = this._tokenRegexp.exec(this.text);
	this.offset_in_text = this._tokenRegexp.lastIndex;
	
	if (this.current_match !== null)
		return this.current_match[0];
	
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
	
	if (maybe_raw_token === null) {
		return new Token('eof');
	}
		
	var raw_token = maybe_raw_token;
	
	var current_index = this._computeIndex( this.current_match.index );
	
	/*  Accumulate comment chars
	*/
	if (this.in_comment && raw_token != '"""') {
		this.comment_chars += raw_token;
		
		if (raw_token == '\n')
			this.current_line ++;
		
		return Lexer.InComment;
	};
	
	/*  Start accumulating comment chars
	*/
	if (raw_token == '"""') {
		
		if (this.in_comment) {
			// end	
			this.in_comment = false;
			
			return_token = new Token('comment', this.comment_chars);
			return_token.col = 0;
			return_token.line = this.comment_start_line;
			return_token.offset = this.offset_in_text;
			return return_token;
			
		} else {
			// start
			this.in_comment = true;
			this.comment_start_line = this.current_line;
			this.comment_chars = "";
		}
		
		return Lexer.InComment;
	}
	
	// If we are dealing with a comment,
	//  skip till the end of the line
	if (raw_token == '%') {
		
		return_token = new Token('comment', null);
		return_token.col  = current_index;
		return_token.line = this.current_line;
		return_token.offset = this.offset_in_text;
		
		this.current_line = this.current_line + 1;
		
		var comment_chars = "";

		for(;;) {
			var char = this.step(Lexer.newline_as_null);
			if (char === null || char == "\n" || char == '\r')
				break;
			
			comment_chars += char;
		}

		return_token.value = comment_chars;
		return return_token;
	}
	
	// are we dealing with a number ?
	if (Lexer.is_number(raw_token)) {
		var number = parseFloat(raw_token);
		return_token = new Token('number', number);
		return_token.is_primitive = true;
		return_token.col = current_index;
		return_token.line = this.current_line;
		return_token.offset = this.offset_in_text;
		return return_token;
	}
	
	// are we dealing with a string ?
	//
	if (this.is_quote(raw_token)) {
		var string = "";
		var t;
		
		for (;;) {
			t = this.step();
			if (this.is_quote(t) | t == '\n' | t === null) {
				return_token = new Token('string', string);
				return_token.is_primitive = true;
				return_token.col = current_index;
				return_token.line = this.current_line;
				return_token.offset = this.offset_in_text;
				return return_token;
			} 
			string = string + t;
		}
		
	}

	function generate_new_term(value) {
		return new Token('term', value);
	}
	
	var fn = Lexer.token_map[maybe_raw_token] || generate_new_term; 
	
	return_token = fn(maybe_raw_token);	
	return_token.col = current_index;
	return_token.line = this.current_line;
	return_token.offset = this.offset_in_text;
	
	if (return_token.name == 'newline')
		this._handleNewline();
	
	return return_token;
};


if (typeof module!= 'undefined') {
	module.exports.Lexer = Lexer;
	module.exports.Token = Token;
}

/* global Eos
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
	this.options = options || default_options;
	
}

/**
 *  Processes the token list 1 by 1
 *  
 *  @return [Token] | Eos | null
 */
ParserL1.prototype.next = function() {
	
	if (this.reached_end)
		return new Eos();
	
	var head;
	
	do {
		head = this.list.shift();
	} while (head === null);
	
	if (head === undefined)
		return new Eos();
		
		
	if (head.name == 'term')
		if (head.value === 'true' || head.value === 'false') {
			head.name = 'boolean';
			head.value = head.value === 'true';
		}
			
		
	// Check for whitespaces and remove
	//
	if (head.name == 'term') {
		var value_without_whitespaces = (head.value || "").replace(/\s/g, '');
		if (value_without_whitespaces.length === 0)
			return null;
	}
		
	var head_plus_one = this.list.shift() || null;
	
	// Maybe it's the end of the stream ...
	//
	if (head_plus_one === null) {
		this.reached_end = true;
	}

	if (head_plus_one && head_plus_one.name == 'list:close') {
		if (head.name == 'list:open') {
			
			//  functor(  ==>  functor
			//
			//  i.e. remove parens_open
			//
			head.name = 'nil';
			return [head];
		}
	}
	
	
	if (head_plus_one && head_plus_one.name == 'parens_open') {
		if (head.name == 'term' || head.name == 'string') {
			
			//  functor(  ==>  functor
			//
			//  i.e. remove parens_open
			//
			head.name = 'functor';
			return [head];
		}
	}
	
	// We must unshift the token
	//  as not to loose the state-machine's context
	//
	this.list.unshift(head_plus_one);

	// check for variables
	if (head.name == 'term' && head.value !== null) {
		var first_character = ""+head.value[0];
		
		if (first_character.toUpperCase() == first_character && ParserL1.isLetter(first_character))
			head.name = 'var';
		
		if (first_character=='_' && head.value.length == 1) {
			head.name = 'var';
			head.value = '_';
		}
			
		
	}
		
		
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

		if (maybe_token === null)
			continue;
		
		if (maybe_token instanceof Eos)
			break;
		
		Array.prototype.push.apply(result, maybe_token);
	}

	return result;
};

if (typeof module!= 'undefined') {
	module.exports.ParserL1 = ParserL1;
}

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

/* global Functor, OpNode, Op
			,ErrorSyntax
*/

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
}

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
						
			// instead of doing object deep copy
			//
			var expression = result[index] || this.expressions[index];
			
			var r = ParserL3.process_expression(opcode, expression);
			
			//console.log("ParserL3.process: ", r);
			
			result[index] = r;
		}
		
	} // ops
	
	ParserL3.check_syntax( result );
	
	return result;
	
};// process



/**
 *  @return [terms]
 */
ParserL3.process_expression = function(opcode, expression){

	//console.log("- process_expression: ",opcode, expression);
	
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
		if (current_count_of_opnodes_processed === 0)
			break;
		
	} //for;;
	
	
	
	return result;
	
};

/**
 *  Check syntax for common errors :
 * 
 *  Functor Functor   --> missing conj or disj between Functors
 *  [ ... ]  [ ... ]  --> same with lists but lists are transformed to cons/2 functors
 *                         so it is just as the first case
 *
 *  
 * 
 * @throws ErrorSyntax
 */
ParserL3.check_syntax = function(expressions_list) {
	
	//console.log(expression);
	
	for (var index=0; index < expressions_list.length; index++) {
		var expression = expressions_list[index];
		
	// there should only be 1 root Functor
	//  because all expressions should amount to having
	//  a root conj or disj.
		if (expression.length > 1)
			throw new ErrorSyntax("Expecting only 1 root Functor", expression[0]);
	}
};




ParserL3._process_expression = function(opcode, expression){
	
	//console.log(">>>> ", opcode, expression);
	
	var result = [];
	var processed_nodes = 0;
	
	for (var node_index=0; node_index < expression.length; node_index++) {
		
		var node = expression[node_index];
		
		
		/*
		 *  Now that we have reduced the sub-expressions
		 *   within parens, let's get rid of the `expr` delimiter.
		 */
		if (node instanceof Functor)
			if (node.name == 'expr' && node.args.length == 1)
				node = node.args[0];
		
		
		// The recursion case first of course
		if (node instanceof Functor) {
			var exp_from_args = node.args;
			var fresult = ParserL3.process_expression(opcode, exp_from_args);
			node.args = fresult; 
		}
		
		if (!(node instanceof OpNode)) {
			result.push(node);
			continue;
		}
			
		
		// Is it the sort of operator we are
		//  interested in at this point?
		
		if (opcode.symbol != node.symbol) {
			result.push(node);
			continue;
		}

		
		// gather 'node left' and 'node right'
		//
		// If `node_left` is undefined, it is marked as `` in the type
		//
		// We use the `result` array because we are replacing `in place`
		//  the nodes of the expression.
		//
		var node_left  = result[node_index - 1 ];
		var node_right = expression[node_index + 1 ];
		
		var iresult = this._process_one(opcode, node_left, node, node_right);

		if (iresult === null) {
			result.push(node);
			continue;
		}
			
		processed_nodes++;

		if (!iresult.is_unary)
			result.pop();
		
		result.push(iresult.result);
		
		node_index++;			

	} // expression	
	
	return [result, processed_nodes];
};


ParserL3._process_one = function(opcode, node_left, node_center, node_right) { 
	
	//console.log(">>>> process_one: ", opcode, node_left, node_center, node_right);
	
	// We need to get the proper precedence
	//  for the operator we which to be processing for
	//
	// The unary operators come with `null` as precedence
	//  because the parser needs to figure out if it's really
	//  used in the unary or infix context.
	//
	var opnode_center = OpNode.create_from_name(opcode.name);

		
	// A good dose of complexity goes on here
	//
	var type   = Op.classify_triplet(node_left, opnode_center, node_right);
	var compat = Op.are_compatible_types(type, opcode.type);
	
	if (!compat) {
		return null;
	}

	// We have compatibility and thus
	//  substitute for a Functor
	// We only have 2 cases:
	//  pattern 1:  `F_`  : a unary operator
	//  pattern 2:  `_F_` : a infix operator
	
	var functor = new Functor(opcode.name);
	functor.col = node_center.col;
	functor.line = node_center.line;
	functor.offset = node_center.offset;
	functor.attrs = opcode.attrs;
	
	var is_unary = Op.is_unary(opcode.type); 
	
	if (is_unary) {
		functor.args = [node_right];
	} else {
		functor.args = [node_left, node_right];
	}

	return { is_unary: is_unary, result: functor };
};


//
// =========================================================== PRIVATE
//



if (typeof module!= 'undefined') {
	module.exports.ParserL3 = ParserL3;
}

/*
  global Var, Token, Functor
*/

function Utils() {}

/**
 * Compare Objects
 * 
 * @param expected
 * @param input
 * 
 * @returns Boolean
 */
Utils.compare_objects = function(expected, input, use_throw){
	
	// ARRAY
	//
	if (expected instanceof Array) {
		
		if (!(input instanceof Array)) {
			if (use_throw)
				throw new Error("Expecting an array");
			
			return false;
		}
			
		
		if (input.length != expected.length) {
			if (use_throw)
				throw new Error("Expecting arrays of same arity");
			return false;
		}
			
		
		for (var index = 0; index<expected.length; index++)
			if (!Utils.compare_objects(expected[index], input[index], use_throw))
				return false;
		
		return true;
	}
	
	// Shortcut
	//
	if (expected === input)
		return true;
	
	
	/*
	 *  Check if we are dealing with the case
	 *   where we have a string representation
	 *   of a function
	 */
	if ((typeof input == 'function') || typeof expected == 'string'){
		
		if (input.inspect) {
			var repr = input.inspect();
			
			//console.log("CHECK, typeof input :     ", typeof input);
			
			//console.log("CHECK, JSON input :     ", JSON.stringify(input));
			//console.log("CHECK, input    repr: ", repr);
			//console.log("CHECK, expected repr: ", expected);
			
			if (repr == expected)
				return true;

			// Trim leading and trailing spaces
			repr = repr.replace(/^\s+|\s+$/g,'');

			if (repr == expected)
				return true;
			
		}
		
	}
	
	
	if (expected && expected.inspect) {
		if (input && !input.inspect) {
			if (use_throw)
				throw new Error("Expecting 'inspect' method on: " + JSON.stringify(input));
			return false;
		}
		
		//console.log("Comparing: expected: ", expected);
		//console.log("Comparing: input:    ", input);
		
		if (expected.inspect() != input.inspect() ) {
			if (use_throw)
				throw new Error("Expecting match using inspect: " + JSON.stringify(expected));
			return false;
		}

	}
	
	
	
	if (typeof expected == 'object') {
		
		if (typeof input != 'object') {
			if (use_throw)
				throw new Error("Expecting "+JSON.stringify(expected)+" object, got: "+JSON.stringify(input));
			return false;
		}
		
		for (var key in expected) {
			
			// don't compare private stuff
			if (key[0] == "_")
				continue;
			
			var e = expected[key];
			var i = input[key];

			if (e == i)
				continue;
			
			if (!e || !i) {
				if (use_throw)
					throw new Error("Expected/Input got undefined: e="+JSON.stringify(e)+", i:"+JSON.stringify(i));
				return false;
			}
				
			
			if (e.hasOwnProperty(key) !== i.hasOwnProperty(key)) {
				if (use_throw)
					throw new Error("Expecting property: " + key);
				
				return false;
			}
			
			if (!Utils.compare_objects(e, i))
				return false;
						
		}// all object keys
		
		return true;
	}// object

	//console.log("Comparing: expected: ", expected);
	//console.log("Comparing: input:    ", JSON.stringify(input));
	
	if (use_throw)
		throw new Error("Unsupported check, expected: " + JSON.stringify(expected));
	
	return false;
};//compare_objects

/*
 * Two terms unify if they can be matched. Two terms can be matched if:
 * 
 * - they are the same term (obviously), or
 * - they contain variables that can be unified so that the two terms without variables are the same.
 * 
 * 
 * term1 and term2 unify whenever:
 * 
 * + If term1 and term2 are constants, then term1 and term2 unify if and only if they are the same atom, or the same number.
 * 
 * + If term1 is a variable and term2 is any type of term, then term1 and term2 unify, and term1 is instantiated to term2. 
 *   (And vice versa.) (If they are both variables, they're both instantiated to each other, and we say that they share values.)
 * 
 * + If term1 and term2 are complex terms, they unify if and only if:
 *   a. They have the same functor and arity. The functor is the "function" name (this functor is foo: foo(X, bar)). The arity is the number of arguments for the functor (the arity for foo(X, bar) is 2).
 *   b. All of their corresponding arguments unify. Recursion!
 *   c. The variable instantiations are compatible (i.e., the same variable is not given two different unifications/values).
 *   
 * + Two terms unify if and only if they unify for one of the above three reasons (there are no reasons left unstated).
 * 
 */
Utils.unify = function(t1, t2, on_bind_or_options) {

	var on_bind = typeof on_bind_or_options == 'function' ? on_bind_or_options:undefined;
	var options = typeof on_bind_or_options == 'object' ? on_bind_or_options : {};
	var no_bind = options.no_bind === true;

	/*
	var t1id, t2id;
	
	if (t1)
		t1id = t1.id ? t1.id : "?";
	
	if (t2)
		t2id = t2.id ? t2.id : "?";
	
	
	console.log("++++ Utils.Unify: ",t1,t1id, t2, t2id);
	*/
	
	//console.log("\n");
	//console.log("++++ Utils.Unify: t1,t2 : ",t1, t2);
	//console.log("++++ Utils.Unify: t2 = ",t2);
	
	/*
	 *  Covers:
	 *    null == null
	 */
	if (t1 == t2) {
		//console.log("Unify t1==t2 : ",t1,t2);
		return true;
	}
		
	
	var t1_is_var = t1 instanceof Var;
	var t2_is_var = t2 instanceof Var;
		
	var t1d, t2d;
	
	if (t1_is_var && t2_is_var) {

		t1d = t1.deref(t2);
		t2d = t2.deref(t1);
		
		// Check for cycle...
		if (t1d === null || t2d === null){
			//console.log("CYCLE AVERTED!");
			return true;
		}
		
		if (t1d.is_bound() && t2d.is_bound()) {
			return Utils.unify( t1d.get_value(), t2d.get_value(), on_bind ); 
		}
		
		if (t1d.is_bound()) {
			if (!no_bind)
				t2.safe_bind(t1, on_bind);
			return true;
		}
		
		if (t2d.is_bound()) {
			if (!no_bind)
				t1.safe_bind(t2, on_bind);
			return true;
		}
		
		// Both unbound
		// ============
		
		if (!no_bind)
			t1d.bind(t2, on_bind);
			
		return true;
	}
	
	if (t1_is_var) {
		t1d = t1d || t1.deref();
		
		if (t1d.is_bound()) {
			return Utils.unify(t1d.get_value(), t2, on_bind);
		}
		
		if (!no_bind)
			t1d.bind(t2, on_bind);
		return true;
	}
	
	if (t2_is_var) {
		t2d = t2d || t2.deref();
		
		if (t2d.is_bound()) {
			return Utils.unify(t2d.get_value(), t1, on_bind);
		}

		if (!no_bind)
			t2d.bind(t1, on_bind);
			
		return true;
	}
	

	
	if (t1 instanceof Functor && t2 instanceof Functor) {

		if (t1.args.length != t2.args.length)
			return false;
		
		for (var index in t1.args)
			if (!Utils.unify(t1.args[index], t2.args[index], on_bind))
				return false;
		
		return true;
	}
	
	//if (t1 instanceof Token && t2 instanceof Token) {
	//	return t1.value == t2.value;
	//};
	
	var t1val, t2val;
	if (t1 instanceof Token)
		t1val = t1.value;
	else 
		t1val = t1;
		
	if (t2 instanceof Token)
		t2val = t2.value;
	else
		t2val = t2;
	
	return t1val == t2val;
}; // unify

Utils.pad = function(string, width, what_char) {
	
	return string + Array(width - string.length).join(what_char || " ");	
};

Utils.isNumeric = function(n) {
	return !isNaN(parseFloat(n)) && isFinite(n);
};

if (typeof module!= 'undefined') {
	module.exports.Utils = Utils;
}

/*
global Functor, ErrorExpectingFunctor, Value
*/

/**
 * ParserL4
 * 
 * @constructor
 *
 * @param exp: the expression to process
 */
function Visitor(exp) {
	this.exp = exp;
	this.cb = null;
}

/**
 * Process the expression, depth-first
 * 
 * 
 * @raise Error
 */
Visitor.prototype.process = function(callback_function) {
	
	if (!(this.exp.args))
		throw new Error("Expecting a rooted tree, got: "+JSON.stringify(this.exp));
	
	this.cb = callback_function;
	
	return this._process_depth(this.exp);
};

/**
 *  Performs the actual processing
 *  
 *  @raise Error
 *  
 */
Visitor.prototype._process_depth = function(node) {
	
	// that should not happen
	if (!node)
		throw new Error("Visitor: got an undefined node.");

	return this.__process_depth(node);
}; // process depth

/**
 * Visitor targeted at processing `head` of a rule.
 * 
 * Depth-First visitor with callback
 * 
 * v: denotes the variable index that should be used
 *    to unify the term
 *    
 * i: index in the arguments list
 * 
 * is_struct
 * 
 * 
 * @param node
 * @returns {Array}
 */
Visitor.prototype.__process_depth = function(node){

	node.is_root = true;
	var stack = [ node ];

	
	var variable_counter = 0;
	var result = [];
	var ctx = {};
	
	
	for (;;) {

		var bnode = stack.pop();
		if (!bnode)
			break;
		
		ctx = {
			 n: bnode
			,v: bnode.v || variable_counter++
			,is_struct: (bnode instanceof Functor)
		};

		var in_cons = (bnode.name == 'cons');
		
		/*
		 *  Announces 'root' node
		 *   and nodes at a 2nd pass
		 */
		this.cb(ctx);
		
		for (var index=0; index<bnode.args.length; index++) {
			
			var n = bnode.args[index];
			
			if (n.args && n.args.length>0) {
				
				// 1st time announce for structures
				//
				n.v = variable_counter++;

				this.cb({ n: n, is_struct: true, i:index, v: n.v, as_param: true, in_cons: in_cons});

				// Schedule for revisiting (i.e. continue down the tree)
				stack.unshift(n);
				
			} else {
				
				// This covers all other node types
				//  e.g. terms such as Numbers and Atoms
				this.cb({ n: n, i: index, root_param: bnode.is_root, in_cons: in_cons });
			}
			
		} // for args
		
	} // for stack

	return result;
};

//============================================================================== VISITOR2

function Visitor2(exp) {
	this.exp = exp;
	this.cb = null;
}

/**
 * Visitor targeted at the processing of individual goals
 *  
 * @param callback
 * @returns
 * 
 * @raise ErrorExpectingFunctor
 */
Visitor2.prototype.process = function(callback) {

	if (!(this.exp instanceof Functor))
		throw new ErrorExpectingFunctor("Expecting a rooted tree, got: "+JSON.stringify(this.exp));
	
	this.exp.root = true;
	
	this.cb = callback;
	this._process(this.exp);
	
};

Visitor2.prototype._process = function(node, variable_counter) {
	
	variable_counter = variable_counter || 1;
	
	if (!node)
		throw new ErrorExpectingFunctor("Visitor2: got an undefined node.");
	
	if (!(node instanceof Functor)) 
		throw new ErrorExpectingFunctor("Visitor2: expecting a Functor, got: ", node);
	
	/*
	 *  Depth-First
	 */
	var args = [];
	
	for (var index=0;index<node.args.length;index++) {
		
		var bnode = node.args[index];
		
		if (bnode instanceof Functor) {
			
			variable_counter = this._process(bnode, variable_counter);
			args.push(new Value(variable_counter++));
			
		} else {
			args.push(bnode);
		}
		
	}// for args
	
	this.cb({ n: node, args: args, vc: variable_counter, root: node.root });
	
	return variable_counter;
}; // _process


// ============================================================================== VISITOR3

/**
 *  Visitor targeted mainly at the `body` of a rule (or a query).
 *  
 *  Each node gets an 'id' upon first encounter.
 *  
 *  Nodes are traversed depth-first.
 *  
 *  A junction:  'conjunction' or 'disjunction'
 */
function Visitor3(exp) {
	this.exp = exp;
	this.cb = null;
}

Visitor3.prototype.process = function(callback) {
	this.cb = callback;
	this._process(this.exp);
};

Visitor3.prototype._process = function(node, vc) {

	var is_root = vc === undefined;
	vc = vc || 0;
	
	// that should happen
	if (!node)
		throw new ErrorExpectingFunctor("Visitor3: got an undefined node.");
	
	if (!(node instanceof Functor)) 
		throw new ErrorExpectingFunctor("Visitor3: expecting a Functor, got: " + JSON.stringify(node));
	
	/*
	 * Since we are only just concerned about Conjunctions and Disjunctions
	 *  and those are of binary arity, we only have to deal with 'left' and 'right' nodes
	 */
	if (!(node.name == 'conj' || (node.name == 'disj'))) {
		
		// vc == 0
		//
		if (is_root)
			return this.cb({type: 'root', vc:vc }, { n: node }, null);
		
		return { vc: vc, n: node, is_junction: false };
	}
		
	var left  = node.args[0];
	var right = node.args[1];
	
	var lctx = this._process(left,  vc+1);
	
	// Start distributing id's on the right-hand side
	//  following the last id distributed on the left-hand side
	//
	var rvc = lctx.vc+1;
	
	var rctx = this._process(right, rvc);

	// Report the id's as they were
	//  attributed on the left node and right node
	//
	rctx.vc = rvc;
	lctx.vc = vc+1;
	
	// Remove extraneous information
	//  so that we don't get tempted to use
	//  it downstream.
	//
	if (rctx.is_junction)
		delete rctx.n;
	
	if (lctx.is_junction)
		delete lctx.n;
	
	delete lctx.is_junction;
	delete rctx.is_junction;

	
	this.cb({type: node.name, vc:vc, root: is_root}, lctx, rctx);
	
	return { vc: rctx.vc, is_junction: true };
};




if (typeof module!= 'undefined') {
	module.exports.Visitor = Visitor;
	module.exports.Visitor2 = Visitor2;
	module.exports.Visitor3 = Visitor3;
}
