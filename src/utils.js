/**
 * utils.js
 *
 * Various utilities
 * 
 * @author jldupont
 * 
 * 
 **/

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
