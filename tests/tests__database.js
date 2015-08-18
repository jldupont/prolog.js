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

it('DbAccess - compute signature - 1', function(){

	var dba = new DbAccess();
	
	var result = dba.compute_signature(new Functor("f1"));
	
	console.log(result);
	
	should.equal(result, 'f1/0');
});

it('DbAccess - compute signature - 2', function(){

	var dba = new DbAccess();
	
	var result = dba.compute_signature(new Functor("rule", new Functor('f1')));
	
	console.log(result);
	
	should.equal(result, 'f1/0');
});


/*
it('Database - insert 1', function(){

	var db = new Database();
	
	db.insert("f1/3", new Token("t1"));

	var result = db.lookup_functor("f1/3");
	
	console.log(result);
	
	should.equal(result[0] instanceof Token, true);
});

it('Database - insert 2', function(){

	var db = new Database();
	
	db.insert("f1/3", new Token("t1"));
	db.insert("f1/3", new Token("t2"));
	
	var result = db.lookup_functor("f1/3");
	
	console.log(result);
	
	should.equal(result.length, 2);
	should.equal(result[0] instanceof Token, true);
	should.equal(result[1] instanceof Token, true);
});
*/