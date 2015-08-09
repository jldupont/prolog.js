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

/**
 * 
 */
it('Types - Functor - simple', function(){

	var f = new Functor('test', 1, 2, 3, 4);
	should.deepEqual(f.args, [1,2,3,4]);
});


