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


Utils.unify = function(t1, t2) {

	//console.log("Utils.Unify: ",t1, t2);
	
	if (t1 == t2)
		return t1;
	
	var v1, v2;
	
	//  Bind to t2 when t1 is unbound
	//
	if (t1 instanceof Var) {
	
		v1 = t1.deref();

		if (v1.is_anon()) {
			return t1;
		};
		
		if (!v1.is_bound()) {
			
			if (v1 != t2)
				v1.bind(t2);
			return t1;
		};
		
		v1 = v1.get_value();
	} else
		v1 = t1;
	
	if (t2 instanceof Var) {
		
		v2 = t2.deref();

		if (v2.is_anon()) {
			return t2;
		};
		
		if (!v2.is_bound()) {
			if (v1 != v2) {
				v2.bind(t1);
				return t2;
			};
		};
		
		v2 = t2.get_value();
	} else
		v2 = t2;

	if (v1 == v2)
		return t1;
	

	if (v1 instanceof Functor && v2 instanceof Functor) {

		if (v1.args.length != v2.args.length)
			return null;
		
		for (var index in v1.args) {
			var r = this._unify(v1.args[index], v2.args[index]);
			if (r == null)
				return null;
		};
		
		return t1;
	};
	
	
	return null;
}; // unify


if (typeof module!= 'undefined') {
	module.exports.Utils = Utils;
};

