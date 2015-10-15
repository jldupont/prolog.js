/**
 * 
 * 
 */

/* global Prolog, wpr
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
      
      var parsed_query = Prolog.parse_per_sentence(query, true).sentences[0];
      
      if (parsed_query.maybe_error) {

        append_line(parsed_query.maybe_error, {
          color: "rgb(255, 0, 0)"
          ,bold: true
          ,nl: true
        });
        
      } else {

        console.log("Parsed Query: ", parsed_query);
        
        var maybe_code = Prolog.compile_query(parsed_query.maybe_token_list);
        
        console.log("Compiled Query: ", maybe_code);
        send_query_to_worker(maybe_code);
      }
      
      
    };

  
  });//dom-change


  function send_query_to_worker(query_code) {
    wpr.postMessage({
      type: 'question'
      ,code: query_code
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
