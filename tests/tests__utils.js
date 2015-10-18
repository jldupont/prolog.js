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

var ErrorNotBound = pr.ErrorNotBound;


Functor.inspect_short_version = false;

it('Utils - Unify - simple 1', function(){

	var result = Utils.unify(null, null);

	should.equal(result, true);
});


it('Utils - Unify - simple 2', function(){

	var result = Utils.unify(666, 666);

	should.equal(result, true);
});

it('Utils - Unify - simple 3', function(){

	//console.log("--- Utils - Unify - simple 3");
	
	var x = new Var('x');
	x.bind(666);
	
	var result = Utils.unify(x, 666);

	should.ok(result);
	
	var value = x.get_value();
	
	should.equal(value, 666);
});

it('Utils - Unify - complex 1', function(){

	var x = new Var('x');
	var f = new Functor("f");
	
	var result = Utils.unify(x, f);
	
	should.ok(result);

	var value = x.get_value();
	
	should.equal(value, f);
});

it('Utils - Unify - complex 2', function(){

	var x = new Var('x');
	var y = new Var('y');
	
	var f = new Functor("f");
	y.bind(f);
	
	var result = Utils.unify(x, y);

	should.ok(result);
	
	//console.log(result);
	
	// Var('x', Var('y', f));
	//
	var value = x.get_value().get_value();
	
	should.equal(value, f);

});

it('Utils - Unify - complex 3', function(){

	var f1 = new Functor("f");
	var f2 = new Functor("f");
	
	var result = Utils.unify(f1, f2);

	should.ok(result);
	
	//console.log(result);
	
	// Var('x', Var('y', f));
	//
	should.equal(f1.name, 'f');

});

it('Utils - Unify - number 1', function(){

	var result = Utils.unify(1, 1);
	
	should.ok(result);
	
});

it('Utils - Unify - number 2', function(){

	var result = Utils.unify(new Var("X", 1), 1);
	
	should.ok(result);
	
});

it('Utils - Unify - number 3', function(){

	var result = Utils.unify(1, new Var("X", 1));
	
	should.ok(result);
	
});

it('Utils - Unify - number 4', function(){

	var result = Utils.unify(new Token('number',1), new Var("X", 1));
	
	should.ok(result);
	
});


it('Utils - Unify - number 5', function(){

	var result = Utils.unify(new Var("X", 1),new Token('number',1) );
	
	should.ok(result);
	
});

it('Utils - Unify - number 6', function(){

	var result = Utils.unify(new Token('number',1), new Token("number", 1));
	
	should.ok(result);
	
});


it('Utils - Unify - var 1', function(){

	var v1 = new Var('x');
	var v2 = new Var('y');
	
	var result = Utils.unify(v1, v2);
	
	should.ok(result);
	
	should.equal(v1.name, 'x');

});

it('Utils - Unify - var 2', function(){

	var v1 = new Var('x');
	var v2 = new Var('y');
	
	v2.bind(v1);
	
	var result = Utils.unify(v1, v2);
	
	should.ok(result);
	
	should.equal(v1.name, 'x');

});

it('Utils - Unify - var 3', function(){

	//console.log("~~~~ Utils - Unify - var 3");
	
	var x = new Var('x');
	var y = new Var('y');
	
	// x = y
	x.bind(y);
	
	var result = Utils.unify(x, y);
	
	should.ok(result);
	
	should.equal(x.name, 'x');

});

it('Utils - Unify - anon - 1', function(){

	var _ = new Var('_');
	var y = new Var('y');
	
	// _ = y
	_.bind(y);
	
	var result = Utils.unify(_, y);
	
	should.ok(result);
	
	should.equal(result, true);

});

it('Utils - Unify - anon - 2', function(){

	var x = new Var('_');
	
	should.throws(function(){
		x.get_value();
		
	}, ErrorNotBound);

});

it('Utils - Unify - anon - 3', function(){

	var x = new Var('_');
	
	x.deref();
	
	should.throws(function(){
		x.get_value();
		
	}, ErrorNotBound);

});

it('Utils - Unify - anon - 4a', function(){

	var a1 = new Var('_');
	var a2 = new Token('nil');

	var result = Utils.unify(a1, a2);

	should.equal(result, true);
});


it('Utils - Unify - anon - 4b', function(){

	var a2 = new Var('_');
	var a1 = new Token('nil');

	var result = Utils.unify(a1, a2);

	should.equal(result, true);
});


it('Utils - Unify - deref - 1', function(){

	var x = new Var('x');
	var y = new Var('y');
	
	// y = x
	y.bind(x);
	
	var result = x.deref(x);
	
	should.equal(result, null);
	
});

it('Utils - Unify - deref - 2', function(){

	var x = new Var('x');
	var y = new Var('y');
	
	// y = x
	y.bind(x);
	
	var result = y.deref(x);
	
	should.equal(result, null);
	
});

it('Utils - List - 1', function(){

	var x = new Var('x');
	var nil = new Token('nil');
	
	var result = Utils.unify(x, nil);
	
	should.equal(result, true);
	
});
