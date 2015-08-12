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
	
	should.equal(result, 'love', "expecting 'love', got: "+result);
	
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
	should.equal(result.name, 'term');
	should.equal(result.value, 'love');
	
	result = l.next();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'parens_open');

	result = l.next();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'term');
	should.equal(result.value, 'julianne');
	
	result = l.next();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'parens_close');

	result = l.next();
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'period');

});

it('Lex - Token - string', function(){

	var text = "love('julianne').";
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	var result = undefined;
	
	result = l.next();
	
	should.equal(result.constructor.name, 'Token');
	should.equal(result.name, 'term');
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
	should.equal(result.name, 'period');

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

it('Lex - comment - trailing', function(){

	var text = "love(charlot).% some comment";
	var elist = [new Token('term', 'love'), 
	             new Token('parens_open'),
	             new Token('term', 'charlot'),
	             new Token('parens_close'),
	             new Token('period'),
	             new Token('comment'),
	             ];
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	var list = l.get_token_list();

	var result = Token.check_for_match(list, elist);

	should.equal(result, true);
});

it('Lex - with newline', function(){

	var text = "love(charlot).\n";
	var elist = [new Token('term', 'love'), 
	             new Token('parens_open'),
	             new Token('term', 'charlot'),
	             new Token('parens_close'),
	             new Token('period'),
	             new Token('newline'),
	             ];
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	var list = l.get_token_list();

	var result = Token.check_for_match(list, elist);

	should.equal(result, true);
});

it('Lex - check index', function(){

	var also_index = true;
	
	var text = "love(charlot).\n";
	var elist = [new Token('term', 'love', {col: 0}), 
	             new Token('parens_open', null, {col: 4}),
	             new Token('term', 'charlot', {col: 5}),
	             new Token('parens_close', null, {col: 12}),
	             new Token('period', null, {col: 13}),
	             new Token('newline', null, {col: 14}),
	             ];
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	var list = l.get_token_list();

	var result = Token.check_for_match(list, elist, also_index);

	should.equal(result, true);
});

it('Lex - number - integer', function(){

	var also_index = true;
	
	var text = "1234";
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	var result = l.next();

	should.equal(result.name, 'number');
	should.equal(result.value, 1234);
	
});

it('Lex - number - float', function(){

	var also_index = true;
	
	var text = "1234.5678";
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	var result = l.next();

	should.equal(result.name, 'number');
	should.equal(result.value, 1234.5678);
});

it('Lex - rule - simple', function(){

	var text = "happy(jld):-listenMusic(jld).";

	var elist = [new Token('term', 'happy', {col: 0}), 
	             new Token('parens_open', null, {col: 5}),
	             new Token('term', 'jld', {col: 6}),
	             new Token('parens_close', null, {col: 9}),
	             new Token('op:rule', null, {col: 10}),
	             new Token('term', 'listenMusic', {col: 12}),
	             new Token('parens_open', null, {col: 23}),
	             new Token('term', 'jld', {col: 24}),
	             new Token('parens_close', null, {col: 27}),
	             new Token('period', null, {col: 28}),
	             ];
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	var result = l.get_token_list();

	var result = Token.check_for_match(result, elist, true);
	should.equal(result, true);
	
});


it('Lex - multiline', function(){

	var also_index = true;
	
	var text = "love(charlot).\n"+"love(julianne).";
	var elist = [
	             new Token('term',        'love',    {col: 0, line: 0}), 
	             new Token('parens_open', null,      {col: 4, line: 0}),
	             new Token('term',        'charlot', {col: 5, line: 0}),
	             new Token('parens_close', null,     {col: 12, line: 0}),
	             
	             new Token('period',       null,     {col: 13, line: 0}),
	             new Token('newline',      null,     {col: 14, line: 0}),
	             
	             new Token('term',         'love',     {col: 0, line: 1}), 
	             new Token('parens_open',   null,      {col: 4, line: 1}),
	             new Token('term',         'julianne', {col: 5, line: 1}),
	             new Token('parens_close',  null,      {col: 13, line: 1}),	             
	             new Token('period',        null,      {col: 14, line: 1}),
	             ];
	
	var Lexer = lexer.Lexer;
	
	var l = new Lexer(text);
	var list = l.get_token_list();
	
	//console.log(JSON.stringify(list));

	var result = Token.check_for_match(list, elist, also_index);

	should.equal(result, true);
});
