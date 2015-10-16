/**
 * 
 * 
 */

/* global Prolog, wpr, mbus
*/

(function(document) {
  'use strict';

  // Grab a reference to our auto-binding template
  // and give it some initial binding values
  // Learn more about auto-binding templates at http://goo.gl/Dx1u2g
  var app = document.querySelector('#app');

  var elquery;
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


    elquery = document.querySelector('#query');
    
    elquery.onchange = function(event) {

      var query= elquery.value;
      
      append_line(query, {
        prefix: "?- "
        ,italic: true
        ,nl: true
      });
      
      send_query_to_worker(query);

    };

  
  });//dom-change


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

  function send_query_to_worker(query_text) {
    wpr.postMessage({
      type: 'question'
      ,text: query_text
    });
  }

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
