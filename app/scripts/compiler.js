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

  mbus.sub({
    type: 'parsed'
    ,subscriber: 'compiler'
    ,cb: function(msg) {
        console.log(msg);
    }
  });


})(document);
