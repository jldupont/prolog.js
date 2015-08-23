/**
 * parser.js
 *
 * Various utilities
 * 
 * @author jldupont
 * 
 * 
 **/


function Parser() {
};


Parser.prototype.process = function(input_text){

	var l = new Lexer(text);
	var tokens = l.process();

	var t = new ParserL1(tokens);
	var ttokens = t.process();
	
	var p = new ParserL2(ttokens);
	
	var result = p.process();
	var terms = result.terms;
	
	var p3 = new ParserL3(terms, Op.ordered_list_by_precedence);
	var r3 = p3.process();
	
};


if (typeof module!= 'undefined') {
	module.exports.Parser = Parser;
};

