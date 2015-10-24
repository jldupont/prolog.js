/**
 * Interpreter 
 * 
 * 
 * @author: jldupont
 */
 
 
/* global mbus, Prolog */

(function(document) {

  mbus.sub({
     type: 'code'
    ,subscriber: "interpreter"
    ,cb: function(msg) {
      
      console.log("Interpreter: ", msg);

    }//cb
  });


})(document);
