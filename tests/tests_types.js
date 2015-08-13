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


it('Types - OpNode - simple', function(){

	var o = new OpNode(":-");
	should.equal(o.name, "rule");
});

it('Types - OpNode - unknown', function(){

	var o = new OpNode("**");
	should.equal(o.name, "??");
});


it('Types - Op - ordered list by precedence', function(){

	var liste = Op.ordered_list_by_precedence;
	
	var prec = liste[0].prec;
	
	for (var index in liste) {
		var el = liste[index];
		if (el.prec < prec) {
			throw new Error("Op list precedence error" + JSON.stringify(el));
		prec = el.prec;
		};
	};
	
});
