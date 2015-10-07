/**
 * Compiler Interface
 * 
 * 
 * @author: jldupont
 */
 
 
/* global mbus, Prolog */

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
      });
      
    }
  });

  function compute_error_locations(parserSummaryList) {
    var locs = [];
    
    for (var index=0; index < parserSummaryList.length; index++) {
      var entry = parserSummaryList[index];
      if (entry && (entry.maybe_error != null))
        locs.push( entry.maybe_error.token.offset);
    }
    
    return locs;
  }

  mbus.sub({
    type: 'parsed'
    ,subscriber: 'compiler'
    ,cb: function(msg) {
        var locs = compute_error_locations(msg.sentences);
        mbus.post('error-locations', locs);
    }
  });


})(document);
