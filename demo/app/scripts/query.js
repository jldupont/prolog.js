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
  var state_stop = false;
  
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
      clear();
    });

    document.querySelector("#action-stop").addEventListener("click", function(){
      state_stop = true;
    });

    document.querySelector("#action-redo").addEventListener("click", function(){

      wpr.postMessage({
         type: 'redo'
      });

    });

  });//dom-change


  function disable(which, state) {
    var value = state === true ? "disabled": undefined;
    document.querySelector("#"+which).disabled = value;
  }


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
      
      disable("action-stop", false);
      
      issue_run();
    }
  });

  mbus.sub({
     type: 'pr_paused'
    ,cb : function(msg) {

      if (state_stop) {
        disable("action-stop", true);
        
        var count;
        
        if (Number.toLocaleString)
          count = (+msg.step_count).toLocaleString();
        else
          count = msg.step_count;
        
        append_line("Current Instruction Count: " + count, {
          italic: true
          ,nl: true
        });
        
      } else {
        disable("action-stop", false);
        issue_run();
      }

      state_stop = false;

    }
  });

  mbus.sub({
     type: 'pr_redo'
    ,cb : function(msg) {

      disable("action-redo", true);
      console.log("Can redo? ", msg.result);
     
      append_separator();
      
      if (msg.result) 
        issue_run();
      else
        append_line("Cannot redo\n", {
          color: 'rgb(255, 0, 0)'
          ,italic: true
          ,nl: true
        });
        
    }
  });

  mbus.sub({
    type: 'pr_result'
    ,cb: function(msg) {

      console.log("RESULT: ", msg);      
      
      disable("action-redo", false);
      disable("action-stop", true);
      
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
      
      var state = msg.state ? "yes":"no";
      
      append_line(state, {
        bold: true
        ,nl:true
      });
      
      append_separator();
      
    }
  });

  function issue_run() {
      wpr.postMessage({
         type: 'run'
         ,steps: 100000
      });
  }

  function append_separator() {
    append_line("\n");
  }

  /**  Append a line to the "Answers" textarea
   *
   */
  function append_line(line, attrs) {
    
    attrs = attrs || {};
    
    var pos_end = view_answers.getLength();
    
    if (attrs.nl)
      line += '\n';

    if (attrs.prefix)
      line = attrs.prefix + line;
      
    view_answers.insertText(pos_end, line, attrs);
  }
  
  
})(document);
