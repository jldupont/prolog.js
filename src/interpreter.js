/**
 * interpreter.js
 * 
 * 
 * 
 * 
 * @author jldupont
 **/

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

