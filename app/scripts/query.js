/**
 * 
 * 
 */

/* global Prolog
*/

(function(document) {
  'use strict';

  // Grab a reference to our auto-binding template
  // and give it some initial binding values
  // Learn more about auto-binding templates at http://goo.gl/Dx1u2g
  var app = document.querySelector('#app');

  var elquery;
  
  // Listen for template bound event to know when bindings
  // have resolved and content has been stamped to the page
  app.addEventListener('dom-change', function() {
  
    /* global Quill */
    var answers_view = new Quill('#answers', {
      modules: {
      }
      ,theme: 'snow'
      
    });

      answers_view.editor.disable();


    elquery = document.querySelector('#query');
    
    elquery.onchange = function(event) {
      //console.log("Query, onchange: ", query.value);
      
      var query= elquery.value;
      
      var parsed_query = Prolog.parse_per_sentence(query, true);
      
      console.log("Parsed Query: ", parsed_query);
      
      var maybe_code = Prolog.compile_per_sentence(parsed_query);
      
      console.log("Compiled Query: ", maybe_code);
      
    };

  
  });//dom-change

  
  
})(document);
