/*
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

/* global Clipboard, mbus, Debouncer */

(function(document) {
  'use strict';

  // Grab a reference to our auto-binding template
  // and give it some initial binding values
  // Learn more about auto-binding templates at http://goo.gl/Dx1u2g
  var app = document.querySelector('#app');

  
  // Listen for template bound event to know when bindings
  // have resolved and content has been stamped to the page
  app.addEventListener('dom-change', function() {
  
    var ed;
  
    Quill.registerModule("clipboard", function(quill, options) {
      
      
      var ccb_id = "#"+options.toolbar_id+">.toolbar>.clip-copy";

      new Clipboard(ccb_id, {
        text: function(trigger) {
          return JSON.stringify(ed.getContents());
        }
      });
      /* 
      cb_el.on("success", function(e) {
        console.log(e);  
      });*/
      
    });
  
    /* global Quill */
    ed = new Quill('#editor', {
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
    
    function clear() {
      var l = ed.getLength();
      ed.deleteText(0, l);
    }
    
    var current_file;
    
    mbus.sub({
      type: 'file'
      ,subscriber: 'editor'
      ,cb: function(msg) {
        
        clear();
        
        current_file = msg.file;
        
        var delta_object = JSON.parse(msg.text);
        ed.setContents(delta_object);
        
      }
    });
    
    var dber = new Debouncer(1000, {source: 'editor-text-change'}, function(){
        
        //console.log("Text Change !");
        
        var text = ed.getText();
        
        mbus.post('file-text', {
          file:  current_file
          ,text: text
        });

    });
    
    //console.log(typeof dber.report_event);
    
    ed.on("text-change", function() {
      dber.report_event();
    });
    
    // TODO remove for release
    window.editor = ed;
    
  });//dom-change

  
  
})(document);
