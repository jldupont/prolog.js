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

/**
 * 
 */
it('Database - insert 1', function(){

	var db = new Database();
	
	db.insert("f1/3", [new Token("t1")]);

	var result = db.lookup_functor("f1/3");
	
	console.log(result);
	
	should.equal(result[0] instanceof Token, true);
});

it('Database - insert 2', function(){

	var db = new Database();
	
	db.insert("f1/3", [new Token("t1")]);
	db.insert("f1/3", [new Token("t2"), new Token("t3")]);
	
	var result = db.lookup_functor("f1/3");
	
	console.log(result);
	
	should.equal(result.length, 2);
	should.equal(result[0][0] instanceof Token, true);
	should.equal(result[1][0] instanceof Token, true);
});
