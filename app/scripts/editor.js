/*
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

/* global Clipboard */

(function(document) {
  'use strict';

  // Grab a reference to our auto-binding template
  // and give it some initial binding values
  // Learn more about auto-binding templates at http://goo.gl/Dx1u2g
  var app = document.querySelector('#app');

  
  // Listen for template bound event to know when bindings
  // have resolved and content has been stamped to the page
  app.addEventListener('dom-change', function() {
  
    Quill.registerModule("clipboard", function(quill, options) {
      
      var ccb_id = "#"+options.toolbar_id+">.toolbar>.clip-copy";

      /*
      var editor_id = options.editor_id;
      var editor_div_sel = "#"+editor_id + "> .ql-editor";
      var editor_el = document.querySelector(editor_div_sel);
      */
      var target_id = options.target_id;
      var target_el = document.querySelector("#"+target_id);
      
      var cb_el = new Clipboard(ccb_id, {
        text: function(trigger) {
          return target_el.innerHTML;
        }
      });
      /*
      cb_el.on("success", function(e) {
        console.log(e);  
      });*/
      
    });
  
    /* global Quill */
    var ed = new Quill('#editor', {
      modules: {
        'toolbar': { container: '#full-toolbar' }
        ,'link-tooltip': true
        ,"image-tooltip" : true  
        ,"clipboard": {
          'toolbar_id': "full-toolbar"
          ,"target_id": "editor-delta"
        }
      }
      ,theme: 'snow'
      
    });
    
    var el_delta = document.querySelector("#editor-delta");
    
    ed.on('text-change', function(delta, source){
      var delta_in_json = JSON.stringify(ed.getContents());
      el_delta.innerHTML = delta_in_json;
    });
    
    
  });//dom-change

  
  
})(document);
