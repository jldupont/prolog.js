/*
 * prolog.js test cases
 * 
 * @author: jldupont
 */

var should = require('should');
var assert = require('assert');

var pr = require("../prolog.js");

var Database = pr.Database;
var Token = pr.Token;
var Functor = pr.Functor;
var OpNode = pr.OpNode;
var Op = pr.Op;
var DbAccess = pr.DbAccess;

it('DbAccess - compute signature - 1a', function(){

	var dba = new DbAccess();
	
	var result = dba.compute_signature(new Functor("f1"));
	
	//console.log(result);
	
	should.equal(result, 'f1/0');
});

it('DbAccess - compute signature - 1b', function(){

	var dba = new DbAccess();
	
	var result = dba.compute_signature(new Functor("f1",1,2,3));
	
	//console.log(result);
	
	should.equal(result, 'f1/3');
});

it('DbAccess - compute signature - 2a', function(){

	var dba = new DbAccess();
	
	var result = dba.compute_signature(new Functor("rule", new Functor('f1')));
	
	//console.log(result);
	
	should.equal(result, 'f1/0');
});

it('DbAccess - compute signature - 2b', function(){

	var dba = new DbAccess();
	
	var result = dba.compute_signature(new Functor("rule", new Functor('f1',1,2,3)));
	
	//console.log(result);
	
	should.equal(result, 'f1/3');
});

it('DbAccess - extract head of rule - 1', function(){

	var dba = new DbAccess();
	
	var result = dba.extract_head_of_rule(new Functor("rule", new Functor('f1')));
	
	//console.log(result);
	
	should.equal(result.name, 'f1');
});

it('DbAccess - extract head of rule - 2', function(){

	var dba = new DbAccess();
	
	var result = dba.extract_head_of_rule(new Functor("rule", new Functor('f1', 1, 2, 3)));
	
	//console.log(result);
	
	should.equal(result.name, 'f1');
	should.equal(result.args.length, 3);
});


it('Database - insert 1', function(){

	var dba = new DbAccess();
	var db = new Database(dba);
	
	var sig = db.insert(new Functor("rule", new Functor('f1',1,2,3)));

	var result = db.lookup_functor("f1/3");
	
	//console.log(result);
	
	should.equal(result[0] instanceof Functor, true);
	should.equal(result[0].name, 'rule');
	should.equal(result[0].args.length, 1);
});


it('Database - insert 2', function(){

	var dba = new DbAccess();
	var db = new Database(dba);
	
	db.insert(new Functor('rule', new Functor('f1',1,2,3)));
	db.insert(new Functor('rule', new Functor('f1',4,5,6)));
	
	var result = db.lookup_functor("f1/3");
	
	console.log(result);
	
	should.equal(result.length, 2);
	should.equal(result[0] instanceof Functor, true);
	should.equal(result[0].name, 'rule');
	should.equal(result[0].args[0] instanceof Functor, true);
	should.equal(result[0].args[0].name,'f1');
	
	should.equal(result[1] instanceof Functor, true);
	should.equal(result[1].name, 'rule');
	should.equal(result[1].args[0] instanceof Functor, true);
	should.equal(result[1].args[0].name,'f1');
});
