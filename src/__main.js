/**
 *  Prolog  main file
 * 
 * @author: jldupont
 */

/* global Lexer, ParserL1, ParserL2, ParserL3 */
/* global Op, Compiler
*/
 
var Prolog = {};

/*
 *
 */
Prolog.compile = function(input_text) {

    var tokens = Prolog.parse(input_text);
    
    var ctokens = Prolog._combine(tokens);
    
    var c = new Compiler();

    var result = [];

    for (var index=0; index<ctokens.length; index++) {
        var code = c.process_rule_or_fact(ctokens[index]);    
        
        result.push(code);
    };
    
    return result;
};



Prolog.parse = function(input_text) {

	var l = new Lexer(input_text);
	var tokens = l.process();

	var t = new ParserL1(tokens);
	var ttokens = t.process();
	
	var p = new ParserL2(ttokens);
	
	var result = p.process();
	var terms = result.terms;
	
	var p3 = new ParserL3(terms, Op.ordered_list_by_precedence);
	var r3 = p3.process();
	
	return r3;
};

Prolog._combine = function(tokens_list) {
    
    var result = [];
    
    for (var index = 0; index<tokens_list.length; index++) {
        var list = tokens_list[index];
        
        result = result.concat( list );
    };
    
    return result;
};

/**
 * Compiles a query
 * 
 */
Prolog.compile_query = function(input_text) {
    
};

if (typeof module!= 'undefined') {
	module.exports.Prolog = Prolog;
};