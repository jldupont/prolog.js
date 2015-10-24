/**
 * Compiler Interface
 * 
 * 
 * @author: jldupont
 */
 
 
/* global mbus, Prolog 
          ,wpr
*/

(function(document) {

  mbus.sub({
     type: 'file-text'
    ,subscriber: "compiler"
    ,cb: function(msg) {
      
      var text = msg.text;
      var file = msg.file;
      
      var parsed_sentences = Prolog.parse_per_sentence(text);
      
      mbus.post('parsed',{
        sentences:  parsed_sentences
        ,file: file
        ,text: text
      });
      
    }
  });

  function compute_error_locations(parserSummaryList) {
    var locs = [];
    
    var sentences = parserSummaryList.sentences;
    
    for (var index=0; index < sentences.length; index++) {
      var entry = sentences[index];
      if (entry && (entry.maybe_error !== null))
        locs.push( entry.maybe_error.token.offset);
    }
    
    return locs;
  }


  function extract_parsed_sentences(entries) {
    
    var result = [];
    for (var index=0; index<entries.length;index++) {
      result.push( entries[index].maybe_token_list );
    }
    
    return result;
  }

  function extract_compilation_errors(entries) {
    
    var result = [];
    for (var index=0; index<entries.length;index++) {
      var entry = entries[index];
      
      if (entry instanceof Error)
        result.push( entry );
    }
    
    return result;
  }
  

  mbus.sub({
    type: 'parsed'
    ,subscriber: 'compiler'
    ,cb: function(msg) {
        var locs = compute_error_locations(msg.sentences);
        mbus.post('error-locations', locs);
        
        if (locs.length === 0)
          mbus.post('parsed-ok', {
             file: msg.file
             ,text: msg.text
            ,sentences: extract_parsed_sentences( msg.sentences.sentences )
          });
    }
  });

  
  mbus.sub({
    type: 'parsed-ok'
    ,subscriber: 'compiler'
    ,cb: function(msg) {
      
      var result = Prolog.compile_per_sentence(msg.sentences);
      
      console.log("Compilation: ", result);
      
      
      var maybe_errors = extract_compilation_errors( result );
      
      if (maybe_errors.length === 0) {
        
        send_code_to_worker("user", msg.text);
        
        /*
        mbus.post('code', {
           file: msg.file
          ,sentences: msg.sentences
          ,code: result
        });
        */
      } else {
        mbus.post('compilation-errors', {
          file: msg.file
          ,errors: maybe_errors
        });
      }
        
    }
  });
  

  function send_code_to_worker(type, code_text) {
    wpr.postMessage({
      type: 'code'
      ,code_text: code_text
      ,code_type: type
    });    
  }

})(document);
