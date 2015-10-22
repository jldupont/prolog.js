/**
 * 
 * 
 */

/* global wpr, mbus
*/

(function(document) {
  'use strict';

  // Grab a reference to our auto-binding template
  // and give it some initial binding values
  // Learn more about auto-binding templates at http://goo.gl/Dx1u2g
  var app = document.querySelector('#app');

  var view_answers;
  
  // Listen for template bound event to know when bindings
  // have resolved and content has been stamped to the page
  app.addEventListener('dom-change', function() {
  
    /* global Quill */
    view_answers = new Quill('#answers', {
      modules: {
      }
      ,theme: 'snow'
      
    });

    view_answers.editor.disable();

    document.querySelector("#action-clear").addEventListener("click", function(){
      console.log("Clear!");
      clear();
    });


  });//dom-change


  function clear() {
    var len = view_answers.getLength();
    view_answers.deleteText(0, len);
  }

  mbus.sub({
     type: 'pr_error'
    ,cb : function(msg) {

        append_line(msg.error, {
          color: "rgb(255, 0, 0)"
          ,bold: true
          ,nl: true
        });
      
    }
  });

  mbus.sub({
    type: 'pr_question_ok'
    ,cb: function() {
      
      wpr.postMessage({
         type: 'run'
         ,steps: 100000
      });
      
    }
  });

  mbus.sub({
    type: 'pr_result'
    ,cb: function(msg) {

      console.log("RESULT: ", msg);      
      
      append_line('Instruction Count: '+msg.step_count, {
        italic: true
        ,nl: true
      });
      
      for (var vname in msg.vars) {
        
        var value = (msg.vars[vname]).replace(/,/g, ', ');
        
        append_line(vname+'='+value, {
          color: 'rgb(0,0,255)'
          ,nl: true
        });
        
      }// vars
      
    }
  });


  /**  Append a line to the "Answers" textarea
   *
   */
  function append_line(line, attrs) {
    
    var pos_end = view_answers.getLength();
    
    if (attrs.nl)
      line += '\n';

    if (attrs.prefix)
      line = attrs.prefix + line;
      
    view_answers.insertText(pos_end, line, attrs);
  }
  
  
})(document);
