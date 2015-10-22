/**
 *  Prolog  main file
 * 
 * @author: jldupont
 */

/* global Lexer, ParserL1, ParserL2, ParserL3 */
/* global Op, Compiler, Code, Functor
          ,ParseSummary
          ,ErrorRuleInQuestion, ErrorInvalidFact
*/
 
var Prolog = {};



/**
 *   Parse sentence by sentence
 *    and return a per-sentence summary of errors, if any.
 * 
 *  @param is_query: true --> indicates the parsing should assume
 *                            the input text constitutes a query
 *
 *  A query cannot take the form of a 'rule' and can only be 1 expression.
 * 
 *  @return { sentences: [ ParseSummary ] , is_error: true|false }
 * 
 */ 
Prolog.parse_per_sentence = function(input_text, is_query) {

    is_query = is_query || false;

    var result = { 
                    // ParseSummary items
                    sentences: [ ], 
                    
                    // Is there at least 1 error in ParseSummary entries?
                    is_error: false
    };

	var l = new Lexer(input_text);
	var sentences = l.process_per_sentence();
    
    var p1, p2, p3;
    var p1t, p2t, p3t;
    
    for (var index = 0; index<sentences.length; index++) {
        var sentence = sentences[index];
     
        try {   
            p1  = new ParserL1(sentence);
            p1t = p1.process();
            
            p2  = new ParserL2(p1t);
            p2t = p2.process().terms;
            
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
            
            if (root_functor.name != 'rule')
                if (root_functor.name == 'conj' || root_functor.name == 'disj')
                    throw new ErrorInvalidFact("Can not include conj or disj", root_functor);
            
            // we should only get 1 root Functor per sentence
            if (root_functor)
                result.sentences.push( new ParseSummary(null, root_functor) );
                
            
        } catch(e) {
            result.sentences.push(new ParseSummary(e));
            result.is_error = true;
        }   
        
    }
    
    return result;
};

/**
 *  Compiles a list of sentences
 *  
 *  `sentence` is really an object Functor
 * 
 *  @param parsed_sentences: [ sentence ] | [ ParseSummary ]
 *  @return [Code | Error]
 */
Prolog.compile_per_sentence = function(parsed_sentences) {
    
    if (parsed_sentences.is_error)
        throw new Error("Attempt to compile erroneous sentences");
    
    //if (!(parsed_sentences instanceof Array))
    //   throw new Error("Expecting Array");
    
    var result=[];
    var c = new Compiler();
    var code_object;
    var parsed_sentence;
    var sentences = parsed_sentences.sentences || parsed_sentences; 
    
    for (var index=0; index<sentences.length; index++) {
            
        parsed_sentence = sentences[index];
         
        if (parsed_sentence instanceof ParseSummary)
            parsed_sentence = parsed_sentence.maybe_token_list;
            
        try {
            
            if (parsed_sentence instanceof Functor && parsed_sentence.name == 'query') {
                code_object = c.process_query( parsed_sentence.args[0] );
            } else {
                code_object = c.process_rule_or_fact(parsed_sentence);
            }
            
            result.push( new Code(code_object) );
            
        } catch(e) {
            result.push(e);
        }
        
        result.push();
    }
    
    return result;
};

/**
 * Compiles a query
 * 
 * @param functor : an object Functor
 * @return Code | Error
 */
Prolog.compile_query = function(functor) {
    
    var result, code;
    
    var c = new Compiler();
    
    try {
        code = c.process_query(functor);
        
        result = new Code(code) ;
    } catch(e) {
        result = e;
    }
    
    return result;
};

if (typeof module != 'undefined') {
	module.exports.Prolog = Prolog;
}