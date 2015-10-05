/**
 * Compiler Interface
 * 
 * 
 * @author: jldupont
 */
 
 
/* global mbus, Prolog */

(function(document) {

  mbus.sub({
     type: 'file'
    ,subscriber: "compiler"
    ,cb: function(msg) {
      
      var text = msg.text;
      var file = msg.file;
      
      var code = Prolog.compile(text);
      
      mbus.post('code',{
        code:  code
        ,file: file
      });
      
    }
  });


})(document);
