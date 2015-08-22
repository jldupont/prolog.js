/**
 * parser level 4
 * 
 * 
 * @author jldupont
 **/

/**
 * ParserL4
 * @constructor
 *
 * @param exp: the expression to linearalize
 */
function ParserL4(exp, result_var) {
	this.exp = exp;
	this.result_var = result_var || "?result";
	this.stack = [];
};

/**
 * Process the expression
 * 
 * An expression is obtained by parsing an input string (lexer, parser l1 etc.)
 * 
 * The parser pipeline (the one provided for `facts`
 *  and `rules` populating the database) should be used. 
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
 * The 
 * 
 * @raise Error
 */
ParserL4.prototype.process = function() {
	
	if (!(this.exp instanceof Functor))
		throw new Error("Expecting a rooted tree with a Functor as root, got: "+JSON.stringify(exp));
	
	// By default, the result will be in variable `?result`
	this._process(this.exp);
	
	return this.stack;
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
ParserL4.prototype._process = function(node, variable_counter) {
	
	
	var is_root = variable_counter == undefined;
	variable_counter = variable_counter || 0;
	
	
	// that should happen
	if (!node)
		throw new Error("ParserL4: got an undefined node.");
	
	if (!(node instanceof Functor)) 
		throw new Error("ParserL4: expecting a Functor, got: ", node);

	
	
	
	
	// Go depth first, left first
	//
	var node_left = null, node_left_varname = null;
	
	if (node.args[0]) {
		
		if (node.args[0] instanceof Functor) {
			variable_counter = this._process(node.args[0], variable_counter);
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
			variable_counter = this._process(node.args[1], variable_counter);
			node_right_varname = "?var"+variable_counter;
			variable_counter ++;
		} else
			node_right = node.args[1];
		
	};
	
	
	// CENTER
	// =================
	
	var node_center = node_center = new Functor("call");
	
	if (is_root)
		node_center.args.push(this.result_var);
	else
		node_center.args.push("?var"+variable_counter);
	
	node_center.args.push(node.name);
	
	if (node_left)
		node_center.args.push(node_left);
	else
		if (node_left_varname)
			node_center.args.push(new Var(node_left_varname));

	if (node_right)
		node_center.args.push(node_right);
	else
		if (node_right_varname)
			node_center.args.push(new Var(node_right_varname));
	
	this.stack.push(node_center);
	
	return variable_counter;
}; // _preprocess



if (typeof module!= 'undefined') {
	module.exports.ParserL4 = ParserL4;
};

