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
	this.db  = db;
	this.env = env;
	this.stack = stack;
	
	// The index in the stack where the
	//  the input expression ends.
	// This is useful during backtracking.
	//
	this.index_of_expression_ending = 0;
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
 */
Interpreter.prototype._preprocess = function() {
	
};


/**
 * Take 1 processing step
 * 
 * @return true | false | null where `null` signifies `not done yet`
 * @raise Error
 */
Interpreter.prototype.next = function() {
	
};


if (typeof module!= 'undefined') {
	module.exports.builtins = builtins;
};

