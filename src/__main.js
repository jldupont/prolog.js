/**
 *  main.js
 * 
 *  @author: jldupont
 * 
 */
 
 /* global Op */
 /* global Lexer, ParserL1, ParserL2, ParserL3, Compiler */
 
 
 var Prolog = {};
 
  /**
  *  Compiles the input text to instructions
  *   for the Interpreter
  * 
  * @return Object
  * @throws
  */
  
 Prolog.compile = function(text) {
     
     var parsed = Prolog.parse(text);
     
     var combined = Prolog._combine(parsed);
     
     var compiled = Prolog.compile_rules_and_facts(combined);
     
     return compiled;
 };
 
 /**
  *  Compiles a query input text to
  *   instructions for the interpreter
  * 
  *  There should only be 1 `body` expression
  *   in the input text. No multi-line input
  *   nor multi expressions.
  * 
  * @return Object
  * @throws
  */
 Prolog.compile_query = function(text) {
   
    var parsed = Prolog.parse(text);
 
    var c = new Compiler();
    
    return c.process_query(parsed[0][0]);
     
 };
 
 /**
  *  There could have been multiple \n terminated
  *   lines per input entry
  */
 Prolog._combine = function(list) {
     
     var result = [];
     
     for (var index = 0; index < list.length; index ++) {
        var entries = list[index];
        result = result.concat( entries );
     }

     return result;
 };
 
 
 Prolog.parse = function(text) {
     
	var l = new Lexer(text);
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
 
Prolog.compile_rules_and_facts = function(parsed_nodes) {

	var c = new Compiler();

    var results = [];
	
	for (var index = 0; index<parsed_nodes.length; index++) {
		
		var expression = parsed_nodes[index];
		
		var result = c.process_rule_or_fact(expression);
		
		results.push(result);
	};
	
	return results;
};


if (typeof module!= 'undefined') {
	module.exports.Prolog = Prolog;
};
