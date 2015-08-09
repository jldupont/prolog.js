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
	
	var result = l.step();
	
	should.equal(result, 'love', "expecting 'love'");
	
	result = l.step();
	should.equal(result, '(', "expecting '('");
	
	result = l.step();
	should.equal(result, 'julianne', "expecting 'julianne'");

	result = l.step();
	should.equal(result, ')', "expecting ')'");

	result = l.step();
	should.equal(result, '.', "expecting '.'");

	result = l.step();
	should.equal(result, null, "expecting 'null'");

});

it('Lex - simple facts - multiline', function(){

	var text = "love(julianne).\n" + "love(charlot).";
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	
	var result = l.step();
	
	should.equal(result, 'love', "expecting 'love'");
	
	result = l.step();
	should.equal(result, '(', "expecting '('");
	
	result = l.step();
	should.equal(result, 'julianne', "expecting 'julianne'");

	result = l.step();
	should.equal(result, ')', "expecting ')'");

	result = l.step();
	should.equal(result, '.', "expecting '.'");

	result = l.step();
	should.equal(result, '\n', "expecting 'newline'");

	result = l.step();
	should.equal(result, 'love', "expecting 'love'");

	result = l.step();
	should.equal(result, '(', "expecting '('");

	result = l.step();
	should.equal(result, 'charlot', "expecting 'charlot'");
	
});

it('Lex - simple rule', function(){

	var text = "happy(julianne):-listenMusic(julianne).";
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	
	var result = l.step();
	should.equal(result, 'happy');

	result = l.step();
	should.equal(result, '(');

	result = l.step();
	should.equal(result, 'julianne');
	
	result = l.step();
	should.equal(result, ')');

	result = l.step();
	should.equal(result, ':-');
	
});


it('Lex - unknown token', function(){

	var text = "@@love(julianne).";
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	
	var result = l.step();
	
	should.equal(result, '@');
	should.equal(l.step(), '@');
	should.equal(l.step(), 'love');
});

it('Lex - Token class - simple', function(){

	var text = "love(julianne).";
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	var result = undefined;
	
	result = l.next();
	
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'atom');
	should.equal(result.value, 'love');
	
	result = l.next();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'parens_open');

	result = l.next();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'atom');
	should.equal(result.value, 'julianne');
	
	result = l.next();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'parens_close');

	result = l.next();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'end');

	assert.deepEqual(result, new Token('end'));
	
});

it('Lex - Token - string', function(){

	var text = "love('julianne').";
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	var result = undefined;
	
	result = l.next();
	
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'atom');
	should.equal(result.value, 'love');
	
	result = l.next();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'parens_open');

	result = l.next();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'string');
	should.equal(result.value, 'julianne');
	
	result = l.next();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'parens_close');

	result = l.next();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'end');

	assert.deepEqual(result, new Token('end'));
	
});

it('Lex - comment - simple', function(){

	var text = "% some comment";
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	var result = undefined;
	
	result = l.next();
	
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'comment');
		
});

var get_token_list = function(lexer) {
	
	var list = [];
	var t;
	
	for (;;) {
		t = lexer.next();
		
		if (t.name == 'null')
			break;
		
		list.push(t);
	};
	
	return list;
};

it('Lex - comment - trailing', function(){

	var text = "love(charlot).% some comment";
	var elist = [new Token('atom', 'love'), 
	             new Token('parens_open'),
	             new Token('atom', 'charlot'),
	             new Token('parens_close'),
	             new Token('end'),
	             new Token('comment'),
	             ];
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	var list = get_token_list(l);

	var result = Token.check_for_match(list, elist);

	should.equal(result, true);
});
