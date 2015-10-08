/**
 *  Prolog  main file
 * 
 * @author: jldupont
 */

/* global Lexer, ParserL1, ParserL2, ParserL3 */
/* global Op, Compiler, Code
          ,ParseSummary
          ,ErrorRuleInQuestion, ErrorInvalidFact
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
    }
    
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

/**
 *  Compiles a list of sentences
 *  
 * 
 *  @return [Code | Error]
 */
Prolog.compile_per_sentence = function(parsed_sentences) {
    
    var result=[];
    var c = new Compiler();
    var code_object;
    
    for (var index=0; index<parsed_sentences.length; index++) {
        
        var parsed_sentence = parsed_sentences[index];
        
        try {
            code_object = c.process_rule_or_fact(parsed_sentence);
            result.push( new Code(code_object) );
        } catch(e) {
            result.push(e);
        }
        
        result.push();
    }
    
    return result;
};

/**
 *   Parse sentence by sentence
 *    and return a per-sentence summary of errors, if any.
 * 
 *  @param is_query: true --> indicates the parsing should assume
 *                            the input text constitutes a query
 *
 *  A query cannot take the form of a 'rule' and can only be 1 expression.
 * 
 *  @return [ ParseSummary ]
 * 
 */ 
Prolog.parse_per_sentence = function(input_text, is_query) {

    is_query = is_query || false;

    var result = [];

	var l = new Lexer(input_text);
	var sentences = l.process_per_sentence();
    
    //console.log("Sentences: ", sentences);
    
    var p1, p2, p3;
    var p1t, p2t, p3t;
    
    for (var index = 0; index<sentences.length; index++) {
        var sentence = sentences[index];
     
        //console.log("Sentence: ", sentence);
     
        try {   
            p1  = new ParserL1(sentence);
            p1t = p1.process();
            
            //console.log("Parser L1: ", p1t);
            
            p2  = new ParserL2(p1t);
            p2t = p2.process().terms;
            
            //console.log("ParserL2: ", p2t);
            
            p3  = new ParserL3(p2t, Op.ordered_list_by_precedence);
            p3t = p3.process();

            if (!p3t || !p3t[0])
                continue;
            
            var root_functor = p3t[0][0];
            
            if (!root_functor)
                continue;

            if (is_query)
                if (root_functor.name == 'rule')
                    throw new ErrorRuleInQuestion("Rule in Query", root_functor);
            
            //console.log(root_functor.name);
            
            if (root_functor.name != 'rule')
                if (root_functor.name == 'conj' || root_functor.name == 'disj')
                    throw new ErrorInvalidFact("Can not include conj or disj", root_functor);
            
            // we should only get 1 root Functor per sentence
            if (root_functor)
                result.push( new ParseSummary(null, root_functor) );
                
            
        } catch(e) {
            result.push(new ParseSummary(e));
        }   
        
    }
    
    return result;
};


Prolog._combine = function(tokens_list) {
    
    var result = [];
    
    for (var index = 0; index<tokens_list.length; index++) {
        var list = tokens_list[index];
        
        result = result.concat( list );
    }
    
    return result;
};

/**
 * Compiles a query
 * 
 * @return Code | Error
 */
Prolog.compile_query = function(parsed_sentence) {
    
    var result, code;
    
    var c = new Compiler();
    
    try {
        code = c.process_query(parsed_sentence);
        
        result.push( new Code(code) );
    } catch(e) {
        result.push( e );
    }
    
    return result;
};

if (typeof module!= 'undefined') {
	module.exports.Prolog = Prolog;
};