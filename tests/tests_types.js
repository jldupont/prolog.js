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


it('Types - Op - check classifier - 1', function(){

	should.throws(function(){
		Op.classify_triplet(new Token('whatever', new Token(), new Token()));
	});
});

/*
 *  `a - -b` ==>  tries:
 *                      (a - -) ==> xf ==> unknown
 *                      (- - b) ==> fx ==> fy ==> uminus
 * 
 * 
 * 	`a * -b` ==>  tries:
 *                      (a * -) ==> xfy ==> unknown
 */


it('Types - Op - check classifier - 2', function(){

	var result = Op.classify_triplet(new Token('a'), new OpNode(":-"), new Token('b'));
	
	//should.equal(result, "xfx");
	
});


