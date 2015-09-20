/**
 * utils.js
 *
 * Various utilities
 * 
 * @author jldupont
 * 
 * 
 **/

function Utils() {};

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
		};
			
		
		if (input.length != expected.length) {
			if (use_throw)
				throw new Error("Expecting arrays of same arity");
			return false;
		};
			
		
		for (var index = 0; index<expected.length; index++)
			if (!Utils.compare_objects(expected[index], input[index], use_throw))
				return false;
		
		return true;
	};
	
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
			
			//console.log("CHECK, input    repr: ", repr);
			//console.log("CHECK, expected repr: ", expected);
			
			if (repr == expected)
				return true;

			// Trim leading and trailing spaces
			repr = repr.replace(/^\s+|\s+$/g,'');

			if (repr == expected)
				return true;
			
		};
		
	};
	
	
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
		};

	}
	
	
	
	if (typeof expected == 'object') {
		
		if (typeof input != 'object') {
			if (use_throw)
				throw new Error("Expecting "+JSON.stringify(expected)+" object, got: "+JSON.stringify(input));
			return false;
		}
		
		for (var key in expected) {
			
			var e = expected[key];
			var i = input[key];

			if (e == i)
				continue;
			
			if (!e || !i) {
				if (use_throw)
					throw new Error("Expected/Input got undefined: e="+JSON.stringify(e)+", i:"+JSON.stringify(i));
				return false;
			};
				
			
			if (e.hasOwnProperty(key) !== i.hasOwnProperty(key)) {
				if (use_throw)
					throw new Error("Expecting property: " + key);
				
				return false;
			}
			
			if (!Utils.compare_objects(e, i))
				return false;
						
		};// all object keys
		
		return true;
	};// object

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
Utils.unify = function(t1, t2) {

	/*
	var t1id, t2id;
	
	if (t1)
		t1id = t1.id ? t1.id : "?";
	
	if (t2)
		t2id = t2.id ? t2.id : "?";
	
	console.log("++++ Utils.Unify: ",t1,t1id, t2, t2id);
	*/
	
	console.log("++++ Utils.Unify: ",t1, t2);
	
	if (t1 == t2)
		return true;
	
	var v1, v2;
	
	//  Bind to t2 when t1 is unbound
	//
	if (t1 instanceof Var) {
	
		v1 = t1.deref();

		if (!v1.is_bound()) {
			
			if (v1 != t2) {
				v1.bind(t2);
				//console.log(">> unify bound (v1, t2): ",v1, "==>", t2);
			}

			// both are equal ? don't create a cycle !
			//console.log(">> unify: cycle cut, t1: ", t1);
			return true;
		};
		
		v1 = v1.get_value();
	} else
		v1 = t1;
	
	
	
	if (t2 instanceof Var) {
		
		v2 = t2.deref();

		if (!v2.is_bound()) {
			
			if (v1 != v2) {
				v2.bind(v1);
				//console.log(">> unify bound (v2,t1): ",v2, "==>", t1);
			};

			// both are equal ? don't create a cycle !
			return true;
		};
		
		v2 = t2.get_value();
	} else
		v2 = t2;

	
	if (v1 == v2)
		return true;
	

	if (v1 instanceof Functor && v2 instanceof Functor) {

		if (v1.args.length != v2.args.length)
			return false;
		
		for (var index in v1.args)
			if (!this.unify(v1.args[index], v2.args[index]))
				return false;
		
		return true;
	};
	
	
	return false;
}; // unify


if (typeof module!= 'undefined') {
	module.exports.Utils = Utils;
};

