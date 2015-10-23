/*
Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

/* global Clipboard, mbus, Debouncer */
/* global Quill */

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
  
  
  window._ftest = function(e) {
      console.log("Test!  ", e);
      
      //e.preventDefault();
      //e.stopPropagation();
      
      return false;
  };
  
  /*  Make some adjustements to quill's linktooltip module
   *
   *  
   *
   */
  Quill.modules['link-tooltip'].DEFAULTS.template = '<span class="title">Visit URL:&nbsp;</span>'
      +'<a href="#" class="url" href="about:blank" onclick="return _ftest(event);"></a>'
      +'<input class="input" type="text">'
      +'<span>&nbsp;&#45;&nbsp;</span>'
      +'<a href="javascript:;" class="change">Change</a>'
      +'<a href="javascript:;" class="remove">Remove</a>'
      +'<a href="javascript:;" class="done">Done</a>';
  
  
  Quill.modules['link-tooltip'].prototype._normalizeURL = function(url) {return url; };
  
  
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
  

    function clear_background() {
      var l = ed.getLength();
      ed.formatText(0, l, 'background', 'rgb(255,255,255)');
    }
    
    function clear() {
      var l = ed.getLength();
      ed.deleteText(0, l);
    }
    
    var current_file;
    
    mbus.sub({
      type: 'file'
      ,subscriber: 'editor'
      ,cb: function(msg) {
        
        var ext = msg.file.split(".")[1];
        
        clear();
        
        current_file = msg.file;
        
        if (ext == 'plq') {
          var delta_object = JSON.parse(msg.text);
          ed.setContents(delta_object);
          
        } else {
          ed.setText( msg. text );
        }
        
      }
    });
    
    var dber = new Debouncer(250, {source: 'editor-text-change'}, function(_, ctx){
        
        // Let's avoid recursion...
        if (ctx.source == 'parser')
          return;
          
        //console.log("Text Change !  source= ", ctx.source);
        
        var text = ed.getText();
        
        mbus.post('file-text', {
          file:  current_file
          ,text: text
          ,ctx: ctx
        });

    });
    
    //console.log(typeof dber.report_event);
    
    ed.on("text-change", function(_delta, source) {
      
      //console.log("Delta: ", delta);
      
      dber.report_event({ source: source });
    });
    
    // TODO remove for release
    window.editor = ed;
    
    function markup_errors(error_list) {
      clear_background();
      
      for (var index=0; index<error_list.length; index++) {
        var loc = error_list[index];
        
        ed.formatText(loc, loc+1, 'background', 'rgb(240, 6, 6)', 'parser');
      }
    }
    
    /**
     *  We don't want to be reflowing the editor contents
     */
    var errors = [ ];

     
    mbus.sub({
      type: 'error-locations'
      ,subscriber: 'editor'
      ,cb : function(locs) {
        
        console.log("Error Locs: ", locs);
        
        var are_errors = locs.length > 0;
        
        if (are_errors) {
          errors = locs;
          clear_background();
          markup_errors(locs);
          return;
        }
        
        var were_errors = errors.length > 0;
        
        if (were_errors) {
          errors = [ ];
          clear_background();
          return;
        }

      }
    });
    
    
    mbus.sub({
      type: 'compilation-errors'
      ,subscriber: 'editor'
      ,cb: function(msg) {
        console.log("Compilation Errors: ", msg.errors);
      }
    });
    
    
  });//dom-change

  
  
})(document);
