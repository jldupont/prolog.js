/*
 * prolog.js test cases
 * 
 * @author: jldupont
 */

var should = require('should');
//var assert = require('assert');

var pr = require("../prolog.js");

var Types = pr.Types;
var Token = pr.Token;
var Functor = pr.Functor;
var Op = pr.Op;
var Var = pr.Var;
var OpNode = pr.OpNode;
var Utils = pr.Utils;
var Instruction = pr.Instruction;
var ErrorAlreadyBound = pr.ErrorAlreadyBound;
var ErrorNotBound = pr.ErrorNotBound;
var ErrorInvalidValue = pr.ErrorInvalidValue;
var ErrorSyntax = pr.ErrorSyntax;

Functor.inspect_short_version = false;

/**
 * 
 */
it('_Types - Functor - simple', function(){

	var f = new Functor('test', 1, 2, 3, 4);
	should.deepEqual(f.args, [1,2,3,4]);
});

/*
it('_Types - OpNode - simple', function(){

	var o = new OpNode(":-");
	should.equal(o.name, "rule");
});
*/
/*
it('_Types - OpNode - unknown', function(){

	var o = new OpNode("**");
	should.equal(o.name, "??");
});
*/

it('_Types - Op - ordered list by precedence', function(){

	var liste = Op.ordered_list_by_precedence;
	
	//console.log(liste);
	
	var prec = liste[0].prec;
	
	for (var index in liste) {
		var el = liste[index];
		if (el.prec < prec) {
			throw new Error("Op list precedence error" + JSON.stringify(el));
		prec = el.prec;
		};
	};
	
});


it('_Types - Op - check map by name ', function(){

	should.equal(Op.map_by_name['minus'].symbol,  '-');
	should.equal(Op.map_by_name['uminus'].symbol, '-');

	should.equal(Op.map_by_name['plus'].symbol,  '+');
	should.equal(Op.map_by_name['uplus'].symbol, '+');

});

it('_Types - Op - creation by name', function(){

	should.equal(OpNode.create_from_name('minus').symbol,  '-');
	should.equal(OpNode.create_from_name('rule').symbol,  ':-');
	
	should.throws(function(){
		OpNode.create_from_name('WHATEVER')
	});
});


it('_Types - Op - check classifier - 1', function(){

	should.throws(function(){
		Op.classify_triplet( new Token('whatever'), new Token(), new Token() );
	}, Error);
});

it('_Types - Op - check parts - 1', function(){

	var result = Op.parts('xfx');
	should.deepEqual(result, ['x', 'f', 'x']);
	
});

it('_Types - Op - check parts - 2', function(){

	var result = Op.parts('fx');
	should.deepEqual(result, [null, 'f', 'x']);
	
});

it('_Types - Op - check parts - 3', function(){

	var result = Op.parts('yf');
	should.deepEqual(result, ['y', 'f', null]);
	
});

it('_Types - Op - subtype check - 1', function(){

	var result = Op.is_compatible_subtype(null, null);
	should.equal(result, true);
	
});

it('_Types - Op - subtype check - 2', function(){

	var result = Op.is_compatible_subtype(null, 'x');
	should.equal(result, false);
	
});

it('_Types - Op - subtype check - 3', function(){

	var result = Op.is_compatible_subtype('y', 'x');
	should.equal(result, false);
	
});

it('_Types - Op - subtype check - 4', function(){

	var result = Op.is_compatible_subtype('y', 'y');
	should.equal(result, true);
	
});

it('_Types - Op - subtype check - 5', function(){

	var result = Op.is_compatible_subtype('x', 'x');
	should.equal(result, true);
	
});

it('_Types - Op - subtype check - 6', function(){

	var result = Op.is_compatible_subtype('f', 'f');
	should.equal(result, true);
	
});

it('_Types - Op - subtype check - 7', function(){

	var result = Op.is_compatible_subtype('x', null);
	should.equal(result, false);
	
});

it('_Types - Op - subtype check - 8', function(){

	var result = Op.is_compatible_subtype('y', null);
	should.equal(result, false);
	
});

it('_Types - Op - type compatibility check - 1', function(){

	var result = Op.are_compatible_types('xfx', 'yfy');
	should.equal(result, true);
	
});

it('_Types - Op - type compatibility check - 2', function(){

	var result = Op.are_compatible_types('yfy', 'xfx');
	should.equal(result, false);
	
});

it('_Types - Op - type compatibility check - 3', function(){

	var result = Op.are_compatible_types('fy', 'fx');
	should.equal(result, false);
	
});

it('_Types - Op - type compatibility check - 4', function(){

	var result = Op.are_compatible_types('fx', 'fy');
	should.equal(result, true);
	
});

it('_Types - Op - type compatibility check - 5', function(){

	var result = Op.are_compatible_types('yf', 'xf');
	should.equal(result, false);
	
});

it('_Types - Op - type compatibility check - 6', function(){

	var result = Op.are_compatible_types('xf', 'yf');
	should.equal(result, true);
	
});

it('_Types - Op - type compatibility check - 7', function(){

	var result = Op.are_compatible_types('xf', 'xf');
	should.equal(result, true);
	
});

it('_Types - Op - type compatibility check - 8', function(){

	var result = Op.are_compatible_types('xf', 'xfx');
	should.equal(result, false);
	
});

it('_Types - Op - type compatibility check - 9', function(){

	var result = Op.are_compatible_types('xf', 'yfx');
	should.equal(result, false);
	
});

it('_Types - Op - type compatibility check - 10', function(){

	var result = Op.are_compatible_types('fy', 'yfx');
	should.equal(result, false);
	
});

it('_Types - Op - type compatibility check - 11a', function(){

	var result = Op.are_compatible_types('fy', 'xfx');
	should.equal(result, false);
	
});

it('_Types - Op - type compatibility check - 11b', function(){

	var result = Op.are_compatible_types('xfx', 'fy');
	should.equal(result, false);
	
});

it('_Types - Op - type compatibility check - 12', function(){

	var result = Op.are_compatible_types('fy', 'xfy');
	should.equal(result, false);
	
});

/*
 *  `a - -b` ==>  already substituted at parser L2
 *  `a + -b` ==>  already substituted at parser L2
 *  `a - +b` ==>  already substituted at parser L2
 *  `a + +b` ==>  already substituted at parser L2
 * 
 * 
 * 	`a * -b` ==>  tries:
 *                      (a * -) ==> xfy ==> unknown
 */


it('_Types - Op - check classifier - 2', function(){

	var result = Op.classify_triplet(new Token('a'), new OpNode(":-", 1200), new Token('b'));
	should.equal(result, "xfx");
	
});

it('_Types - Op - check classifier - 3', function(){

	var result = Op.classify_triplet(new OpNode('=', 700), new OpNode(":-", 1200), new Token('b'));
	should.equal(result, "xfx");
	
});

it('_Types - Op - check classifier - 4', function(){

	var result = Op.classify_triplet(new OpNode('*'), new OpNode("-", 200), new Token('b'));
	
	// We should be getting a response of 'fx'
	//  but of course this is compatible with an 'fy' pattern
	var is_compat = Op.are_compatible_types( result, 'fy');
	
	should.equal(is_compat, true);
	
});

it('_Types - Op - check classifier - 4', function(){

	var result = Op.classify_triplet(new OpNode('*'), new OpNode("-", 200), new OpNode('*'));

	//console.log(result);
	
	should.equal(result, 'f');
	
});

it('_Types - Op - check unary - 1', function(){

	var result = Op.is_unary("fy");
	should.equal(result, true);
	
});

it('_Types - Op - check unary - 2', function(){

	var result = Op.is_unary("xfy");
	should.equal(result, false);
	
});

it('_Types - Compare Objects - basic 1', function(){

	var result = Utils.compare_objects(new Functor('f'), new Functor('f'), true);
	should.equal(result, true);
	
});

it('_Types - Compare Objects - basic 2', function(){

	var result = Utils.compare_objects('allo', 'allo');
	should.equal(result, true);
	
});

it('_Types - Compare Objects - basic 3', function(){

	var result = Utils.compare_objects(666, 666);
	should.equal(result, true);
	
});

it('_Types - Compare Objects - basic 4', function(){

	var result = Utils.compare_objects(666.666, 666.666);
	should.equal(result, true);
	
});


it('_Types - Compare Objects - list 1', function(){

	var o1 = [1,2,3];
	var o2 = [1,2,3];
	
	var result = Utils.compare_objects(o1, o2, true);
	
	should.equal(result, true);
	
});

it('_Types - Compare Objects - Object 1', function(){

	var o1 = { n: new Functor('f') };
	var o2 = { n: new Functor('f') };
	
	var result = Utils.compare_objects(o1, o2, true);
	
	should.equal(result, true);
	
});

it('_Types - Compare Objects - Object 2', function(){

	var o1 = { n: new Functor('f') };
	var o2 = { n: new Functor('f'), whatever: true };
	
	// Extra attributes in the input do not matter
	
	var result = Utils.compare_objects(o1, o2, true);
	
	should.equal(result, true);
	
});

it('_Types - Compare Objects - Object 3', function(){

	var o1 = { n: new Instruction('allocate') };
	var o2 = { n: new Instruction('allocate'), whatever: true };
	
	// Extra attributes in the input do not matter
	
	var result = Utils.compare_objects(o1, o2, true);
	
	should.equal(result, true);
	
});

it('_Types - Var - Deref - 0', function(){

	var v1 = new Var('X');
	
	should.throws(function(){
		v1.bind(null);
	}, ErrorInvalidValue);
	
});


it('_Types - Var - Deref - 1', function(){

	var v1 = new Var('X');
	
	should.throws(function(){
		v1.get_value();
	}, ErrorNotBound);
	
});

it('_Types - Var - Deref - 2', function(){

	var v1 = new Var('X');
	v1.bind(666);
	
	should.throws(function(){
		v1.bind(777);
	}, ErrorAlreadyBound);
	
});

it('_Types - Var - Deref - 3', function(){

	var v1 = new Var('X');
	var v2 = new Var('Y');
	var v3 = new Var('Z');
	
	// X = Y
	v1.bind( v2 );
	
	// Y = Z
	v2.bind( v3 );
	
	// Z = 666
	v3.bind( 666 );
	
	var var1 = v1.deref();

	should.equal(var1.get_value(), 666);
});

it('_Types - Var - Deref - 4', function(){

	var v1 = new Var('X');
	var v2 = new Var('Y');
	var v3 = new Var('Z');
	
	// X = Y
	v1.bind( v2 );
	
	// Y = Z
	v2.bind( v3 );
	
	//  X = Y = Z  where Z is unbound
	//
	// Var(X, Var(Y, Var(Z) ) )

	var should_be_a_var = v1.deref();
	
	//console.log(should_be_a_var);
	
	should.equal(should_be_a_var.name, "Z");

});


it('_Types - Error Class - 1', function(){

	var e = new ErrorSyntax("test", "token");
	
	var j = JSON.stringify(e);

	should.equal(j, '{"__classname__":"ErrorSyntax","message":"test","token":"token"}');

});


it('_Types - Reviver - 1', function(){

	var e = new Token('term', 666);
	
	var j = JSON.stringify(e);
	
	var obj = JSON.parse(j, Types.ReviveFromJSON);

	//console.log("Reviver: ", obj);

	var result = Utils.compare_objects(obj, new Token('term', 666));

	should.ok(result);

});

it('_Types - Reviver - 2', function(){

	var e = new Token('term', "some:path");
	
	var j = JSON.stringify(e);
	
	var obj = JSON.parse(j, Types.ReviveFromJSON);

	//console.log("Reviver: ", obj);

	var result = Utils.compare_objects(obj, new Token('term', 'some:path'));

	should.ok(result);

});


it('_Types - Reviver - 3', function(){

	var t = new Token('term', "some:path");
	var v = new Var('var');
	v.bind(t);

	var j = JSON.stringify(v);
	
	//console.log("Reviver 3 toJSON: ", j,"\n");
	
	var obj = JSON.parse(j, Types.ReviveFromJSON);

	Var.inspect_compact = false;
	//Var.inspect_extended = true;
	
	//console.log("Reviver 3 fromJSON ORIG: ", v,"\n");
	//console.log("Reviver 3 fromJSON:      ", obj,"\n");

	var result = Utils.compare_objects(obj, v);

	should.ok(result);

});
