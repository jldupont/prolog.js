/*
 * prolog.js test cases
 * 
 * @author: jldupont
 */

var should = require('should');
var assert = require('assert');

var pr = require("../prolog.js");

var Token = pr.Token;
var Lexer = pr.Lexer;


// ----------------------------------------------------------------- TESTS - parsing

it('Lex - number - 1', function(){
	
	var l = new Lexer("66.66");
	
	var result = l.step();
	
	
	should.equal(result, '66.66', "expecting '66.66', got: "+result);
});

it('Lex - number - 2', function(){
	
	var l = new Lexer("a 66.66");
	
	var result = l.step();
	
	should.equal(result, 'a', "expecting 'a', got: "+result);
	
	result = l.step();
	result = l.step();
	should.equal(result, '66.66', "expecting '66.66', got: "+result);
});

it('Lex - number - 3', function(){
	
	var l = new Lexer("66.66.\n");
	
	var result = l.step();
	
	should.equal(result, '66.66', "expecting '66.66', got: "+result);
});


it('Lex - simple fact', function(){

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

it('Lex - simple fact - ambiguity with `is`', function(){

	var l = new Lexer("like(isa).");
	
	var result = l.step();
	
	should.equal(result, 'like', "expecting 'love', got: "+result);
	
	result = l.step();
	should.equal(result, '(', "expecting '('");
	
	result = l.step();
	should.equal(result, 'isa', "expecting 'isa', got: " + result);

	result = l.step();
	should.equal(result, ')', "expecting ')'");

	result = l.step();
	should.equal(result, '.', "expecting '.'");

	result = l.step();
	should.equal(result, null, "expecting 'null'");

});

it('Lex - simple facts - multiline - 1', function(){

	var text = "love(julianne).\n" + "love(charlot).";
	
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

it('Lex - simple facts - multiline - 2', function(){

	var text = ["love(julianne).", "love(charlot)."];
	
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
	
	var l = new Lexer(text);
	
	var result = l.step();
	
	should.equal(result, '@');
	should.equal(l.step(), '@');
	should.equal(l.step(), 'love');
});

it('Lex - Token class - simple', function(){

	var text = "love(julianne).";
	
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
	             new Token('comment', " some comment"),
	             ];
	
	var l = new Lexer(text);
	var list = l.process();

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
	
	var l = new Lexer(text);
	var list = l.process();

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
	
	var l = new Lexer(text);
	var list = l.process();

	var result = Token.check_for_match(list, elist, also_index);

	should.equal(result, true);
});

it('Lex - number - integer', function(){

	var also_index = true;
	
	var text = "1234";
	
	var l = new Lexer(text);
	var result = l.next();

	should.equal(result.name, 'number');
	should.equal(result.value, 1234);
	
});

it('Lex - number - float', function(){

	var also_index = true;
	
	var text = "1234.5678";
	
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
	             new Token('op:rule', ':-', {col: 10}),
	             new Token('term', 'listenMusic', {col: 12}),
	             new Token('parens_open', null, {col: 23}),
	             new Token('term', 'jld', {col: 24}),
	             new Token('parens_close', null, {col: 27}),
	             new Token('period', null, {col: 28}),
	             ];
	
	var l = new Lexer(text);
	var result = l.process();

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
	
	var l = new Lexer(text);
	var list = l.process();
	
	//console.log(JSON.stringify(list));

	var result = Token.check_for_match(list, elist, also_index);

	should.equal(result, true);
});

it('Lex - var - 1', function(){

	var text = "X=1.\n";
	var elist = [new Token('term',     'X'), 
	             new Token('op:unif',  '='),
	             new Token('number',   1),
	             new Token('period',   null),
	             new Token('newline',  null),
	             ];
	
	var l = new Lexer(text);
	var list = l.process();

	//console.log(list);
	
	var result = Token.check_for_match(list, elist);

	
	
	should.equal(result, true);
});

it('Lex - var - 2', function(){

	var text = "X=Y.\n";
	var elist = [new Token('term',     'X'), 
	             new Token('op:unif',  '='),
	             new Token('term',      'Y'),
	             new Token('period',   null),
	             new Token('newline',  null),
	             ];
	
	var l = new Lexer(text);
	var list = l.process();

	//console.log(list);
	
	var result = Token.check_for_match(list, elist);

	
	
	should.equal(result, true);
});

it('Lex - list - 1', function(){

	var text = "[1,2,3]";
	
	var elist = [new Token('list:open', null), 
	             new Token('number',    1),
	             new Token('op:conj',   ','),
	             new Token('number',    2),
	             new Token('op:conj',   ','),
	             new Token('number',    3),
	             new Token('list:close',  null),
	             ];
	
	var l = new Lexer(text);
	var list = l.process();

	//console.log(list);
	
	var result = Token.check_for_match(list, elist);

	should.equal(result, true);
});

it('Lex - list - 2', function(){

	var text = "[H|T]";
	
	var elist = [new Token('list:open', null), 
	             new Token('term',    'H'),
	             new Token('list:tail',  '|'),
	             new Token('term',    'T'),
	             new Token('list:close',  null),
	             ];
	
	var l = new Lexer(text);
	var list = l.process();

	//console.log(list);
	
	var result = Token.check_for_match(list, elist);

	should.equal(result, true);
});

// var text = "X +- Y";

it('Lex - expression - 1', function(){

	var text = "X+-Y";
	
	var elist = [new Token('term', 'X'), 
	             new Token('term', '+-'),
	             new Token('term', 'Y'),
	             ];
	
	var l = new Lexer(text);
	var list = l.process();

	//console.log(list);
	
	var result = Token.check_for_match(list, elist);

	should.equal(result, true);
});

it('Lex - comment triple quote - 1', function(){

	var text = '"""line1\n'
				+'line2\n'
				+'"""';
	
	var elist = [new Token('comment', 'line1\nline2\n'), 
	             ];
	
	var l = new Lexer(text);
	var list = l.process();
	
	//console.log(list);

	var result = Token.check_for_match(list, elist);

	should.equal(result, true);
});

it('Lex - comment triple quote - 2', function(){

	var text = '"""line1'
				+'line2'
				+'"""';
	
	var elist = [new Token('comment', 'line1line2'), 
	             ];
	
	var l = new Lexer(text);
	var list = l.process();

	var result = Token.check_for_match(list, elist);

	should.equal(result, true);
});

/*
it('Lex - comment complex  - 1', function(){

	var text = 'f(X):- %some comment\ng(X).';

	var elist = [
'Token(term,f)',
  'Token(parens_open,null)',
  'Token(term,X)',
  'Token(parens_close,null)',
  'Token(op:rule,:-)',
  'Token(term, )',
  'Token(comment,some comment)',
  'Token(term,g)',
  'Token(parens_open,null)',
  'Token(term,X)',
  'Token(parens_close,null)',
  'Token(period,null)'

	             ];
	
	var l = new Lexer(text);
	var list = l.process();
	
	//console.log(list);

	var result = Token.check_for_match(list, elist);

	should.equal(result, true);
});
*/
it('Lexer - process sentence - 1', function() {
	
	var text =   'f(1).\n'
				+'f(2).\n'
				;
	
	var elist = [
					 [ new Token('term', 'f'), new Token('parens_open'), new Token('number',1), new Token('parens_close')]
					,[ new Token('term', 'f'), new Token('parens_open'), new Token('number',2), new Token('parens_close')]
		
	             ];
	
	var l = new Lexer(text);
	var list = l.process_per_sentence();
	
	var result = Token.check_for_match(list, elist);

	should.equal(result, true);

	
});

it('Lexer - process sentence - 2', function() {
	
	var text =   'f(1).'
				+'f(2).'
				;
	
	var elist = [
					 [ new Token('term', 'f'), new Token('parens_open'), new Token('number',1), new Token('parens_close')]
					,[ new Token('term', 'f'), new Token('parens_open'), new Token('number',2), new Token('parens_close')]
		
	             ];
	
	var l = new Lexer(text);
	var list = l.process_per_sentence();
	
	var result = Token.check_for_match(list, elist);

	should.equal(result, true);

	
});


it('Lexer - other operators - not', function() {
	
	var text =   'not f(X).'
				;
	
	var elist = [
					 [  new Token('op:not','not'),
					    new Token('term'," "),
					    new Token('term','f'),
					    new Token('parens_open'),
					    new Token('term','X'),
					    new Token('parens_close') 
					    ]
	             ];
	
	var l = new Lexer(text);
	var list = l.process_per_sentence();
	
	//console.log(list);
	
	var result = Token.check_for_match(list, elist);

	should.equal(result, true);

	
});

it('Lexer - other functors - true', function() {
	
	var text =   'not true.'
				;
	
	var elist = [
					 [  new Token('op:not','not'),
					    new Token('term'," "),
					    new Token('term','true'),
					    ]
	             ];
	
	var l = new Lexer(text);
	var list = l.process_per_sentence();
	
	//console.log(list);
	
	var result = Token.check_for_match(list, elist);

	should.equal(result, true);

	
});

it('Lexer - other functors - false', function() {
	
	var text =   'not false.'
				;
	
	var elist = [
					 [  new Token('op:not','not'),
					    new Token('term'," "),
					    new Token('term','false'),
					    ]
	             ];
	
	var l = new Lexer(text);
	var list = l.process_per_sentence();
	
	//console.log(list);
	
	var result = Token.check_for_match(list, elist);

	should.equal(result, true);

	
});



/*
it('Lexer - offset - 1', function() {
	
	Token.inspect_compact = false;
	
	var text =   'f(X).'
				;
	
	var elist = [
					[ ]
	             ];
	
	var l = new Lexer(text);
	var list = l.process_per_sentence();
	
	console.log(list[0][2].offset);
	
	var result = Token.check_for_match(list, elist);

	should.equal(result, true);

	
})
*/