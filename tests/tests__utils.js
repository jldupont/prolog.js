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
var Var = pr.Var;
var OpNode = pr.OpNode;
var Utils = pr.Utils;


Functor.inspect_short_version = false;

it('Utils - Unify - simple 1', function(){

	var result = Utils.unify(null, null);

	should.equal(result, null);
});


it('Utils - Unify - simple 2', function(){

	var result = Utils.unify(666, 666);

	should.equal(result, 666);
});

it('Utils - Unify - simple 3', function(){

	//console.log("--- Utils - Unify - simple 3");
	
	var v = new Var('x');
	v.bind(666);
	
	var result = Utils.unify(v, 666);

	
	
	var value = result.get_value();
	
	should.equal(value, 666);
});

it('Utils - Unify - complex 1', function(){

	var v = new Var('x');
	var f = new Functor("f");
	
	var result = Utils.unify(v, f);

	var value = result.get_value();
	
	should.equal(value, f);
});

it('Utils - Unify - complex 2', function(){

	var x = new Var('x');
	var y = new Var('y');
	
	var f = new Functor("f");
	y.bind(f);
	
	var result = Utils.unify(x, y);

	//console.log(result);
	
	// Var('x', Var('y', f));
	//
	var value = result.get_value().get_value();
	
	should.equal(value, f);

});

it('Utils - Unify - complex 3', function(){

	var f1 = new Functor("f");
	var f2 = new Functor("f");
	
	var result = Utils.unify(f1, f2);

	//console.log(result);
	
	// Var('x', Var('y', f));
	//
	should.equal(result.name, 'f');

});

it('Utils - Unify - var 1', function(){

	var v1 = new Var('x');
	var v2 = new Var('y');
	
	var result = Utils.unify(v1, v2);
	
	should.equal(v1.name, 'x');

});

it('Utils - Unify - var 2', function(){

	var v1 = new Var('x');
	var v2 = new Var('y');
	
	v2.bind(v1);
	
	var result = Utils.unify(v1, v2);
	
	should.equal(v1.name, 'x');

});

it('Utils - Unify - var 3', function(){

	//console.log("~~~~ Utils - Unify - var 3");
	
	var x = new Var('x');
	var y = new Var('y');
	
	// x = y
	x.bind(y);
	
	var result = Utils.unify(x, y);
	
	should.equal(x.name, 'x');

});
