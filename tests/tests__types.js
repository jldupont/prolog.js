/*
 * prolog.js test cases
 * 
 * @author: jldupont
 */

var should = require('should');
var assert = require('assert');

var pr = require("../prolog.js");

var Token = pr.Token;
var Functor = pr.Functor;
var Op = pr.Op;
var OpNode = pr.OpNode;

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

