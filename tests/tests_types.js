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
it('Types - Functor - simple', function(){

	var f = new Functor('test', 1, 2, 3, 4);
	should.deepEqual(f.args, [1,2,3,4]);
});

/*
it('Types - OpNode - simple', function(){

	var o = new OpNode(":-");
	should.equal(o.name, "rule");
});
*/
/*
it('Types - OpNode - unknown', function(){

	var o = new OpNode("**");
	should.equal(o.name, "??");
});
*/

it('Types - Op - ordered list by precedence', function(){

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


it('Types - Op - check map by name ', function(){

	should.equal(Op.map_by_name['minus'].symbol,  '-');
	should.equal(Op.map_by_name['uminus'].symbol, '-');

	should.equal(Op.map_by_name['plus'].symbol,  '+');
	should.equal(Op.map_by_name['uplus'].symbol, '+');

});

it('Types - Op - creation by name', function(){

	should.equal(OpNode.create_from_name('minus').symbol,  '-');
	should.equal(OpNode.create_from_name('rule').symbol,  ':-');
	
	should.throws(function(){
		OpNode.create_from_name('WHATEVER')
	});
});


it('Types - Op - check classifier - 1', function(){

	should.throws(function(){
		Op.classify_triplet( new Token('whatever'), new Token(), new Token() );
	}, Error);
});

it('Types - Op - check parts - 1', function(){

	var result = Op.parts('xfx');
	should.deepEqual(result, ['x', 'f', 'x']);
	
});

it('Types - Op - check parts - 2', function(){

	var result = Op.parts('fx');
	should.deepEqual(result, [null, 'f', 'x']);
	
});

it('Types - Op - check parts - 3', function(){

	var result = Op.parts('yf');
	should.deepEqual(result, ['y', 'f', null]);
	
});

it('Types - Op - subtype check - 1', function(){

	var result = Op.is_compatible_subtype(null, null);
	should.equal(result, true);
	
});

it('Types - Op - subtype check - 2', function(){

	var result = Op.is_compatible_subtype(null, 'x');
	should.equal(result, false);
	
});

it('Types - Op - subtype check - 3', function(){

	var result = Op.is_compatible_subtype('y', 'x');
	should.equal(result, false);
	
});

it('Types - Op - subtype check - 4', function(){

	var result = Op.is_compatible_subtype('y', 'y');
	should.equal(result, true);
	
});

it('Types - Op - subtype check - 5', function(){

	var result = Op.is_compatible_subtype('x', 'x');
	should.equal(result, true);
	
});

it('Types - Op - type compatibility check - 1', function(){

	var result = Op.are_compatible_types('xfx', 'yfy');
	should.equal(result, true);
	
});

it('Types - Op - type compatibility check - 2', function(){

	var result = Op.are_compatible_types('yfy', 'xfx');
	should.equal(result, false);
	
});

it('Types - Op - type compatibility check - 3', function(){

	var result = Op.are_compatible_types('fy', 'fx');
	should.equal(result, false);
	
});

it('Types - Op - type compatibility check - 4', function(){

	var result = Op.are_compatible_types('fx', 'fy');
	should.equal(result, true);
	
});

it('Types - Op - type compatibility check - 5', function(){

	var result = Op.are_compatible_types('yf', 'xf');
	should.equal(result, false);
	
});

it('Types - Op - type compatibility check - 6', function(){

	var result = Op.are_compatible_types('xf', 'yf');
	should.equal(result, true);
	
});

it('Types - Op - type compatibility check - 7', function(){

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


it('Types - Op - check classifier - 2', function(){

	var result = Op.classify_triplet(new Token('a'), new OpNode(":-", 1200), new Token('b'));
	should.equal(result, "xfx");
	
});



