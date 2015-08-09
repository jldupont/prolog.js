/*
 * prolog.js test cases
 * 
 * @author: jldupont
 */

var should = require('should');
var assert = require('assert');

var lexer = require("../src/lexer.js");

var Token = lexer.Token;

// ----------------------------------------------------------------- TESTS - parsing

it('Lex - simple fact', function(){

	var Lexer = lexer.Lexer;
	
	var l = new Lexer("love(julianne).");
	
	var result = l.next();
	
	should.equal(result, 'love', "expecting 'love'");
	
	result = l.next();
	should.equal(result, '(', "expecting '('");
	
	result = l.next();
	should.equal(result, 'julianne', "expecting 'julianne'");

	result = l.next();
	should.equal(result, ')', "expecting ')'");

	result = l.next();
	should.equal(result, '.', "expecting '.'");

	result = l.next();
	should.equal(result, null, "expecting 'null'");

});

it('Lex - simple facts - multiline', function(){

	var text = "love(julianne).\n" + "love(charlot).";
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	
	var result = l.next();
	
	should.equal(result, 'love', "expecting 'love'");
	
	result = l.next();
	should.equal(result, '(', "expecting '('");
	
	result = l.next();
	should.equal(result, 'julianne', "expecting 'julianne'");

	result = l.next();
	should.equal(result, ')', "expecting ')'");

	result = l.next();
	should.equal(result, '.', "expecting '.'");

	result = l.next();
	should.equal(result, '\n', "expecting 'newline'");

	result = l.next();
	should.equal(result, 'love', "expecting 'love'");

	result = l.next();
	should.equal(result, '(', "expecting '('");

	result = l.next();
	should.equal(result, 'charlot', "expecting 'charlot'");
	
});

it('Lex - simple rule', function(){

	var text = "happy(julianne):-listenMusic(julianne).";
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	
	var result = l.next();
	should.equal(result, 'happy');

	result = l.next();
	should.equal(result, '(');

	result = l.next();
	should.equal(result, 'julianne');
	
	result = l.next();
	should.equal(result, ')');

	result = l.next();
	should.equal(result, ':-');
	
});


it('Lex - unknown token', function(){

	var text = "@@love(julianne).";
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	
	var result = l.next();
	
	should.equal(result, '@');
	should.equal(l.next(), '@');
	should.equal(l.next(), 'love');
});

it('Lex - Token class - simple', function(){

	var text = "love(julianne).";
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	var result = undefined;
	
	result = l.next_token();
	
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'atom');
	should.equal(result.value, 'love');
	
	result = l.next_token();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'parens_open');

	result = l.next_token();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'atom');
	should.equal(result.value, 'julianne');
	
	result = l.next_token();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'parens_close');

	result = l.next_token();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'end');

	assert.deepEqual(result, new Token('end'));
	
});

it('Lex - Token - string', function(){

	var text = "love('julianne').";
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	var result = undefined;
	
	result = l.next_token();
	
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'atom');
	should.equal(result.value, 'love');
	
	result = l.next_token();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'parens_open');

	result = l.next_token();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'string');
	should.equal(result.value, 'julianne');
	
	result = l.next_token();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'parens_close');

	result = l.next_token();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'end');

	assert.deepEqual(result, new Token('end'));
	
});
