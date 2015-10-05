/**
 * Message bus
 * 
 * Extremely lightweight message bus
 * 
 * Does not use DOM facilities as those tend to be slow
 * 
 * @author: jldupont
 */
 
 
/* global mbus */

(function(document) {

  function Mbus() {
    
    this.subs = {};
  };

  /*  Subscription
  *
  *   type
  *   source
  *   cb
  */
  
  Mbus.prototype.sub = function(entry) {
    
    var subs = this.subs[entry.type] || [];
    subs.push(entry);
    this.subs[entry.type] = subs;
  };
  
  
  Mbus.prototype.post = function(type, msg) {
    
    var sub_entries = this.subs[type];
    
    if (!sub_entries) {
      console.log("Mbus: no subscribers for: ", type);
      return;
    };
    
    var source;
    
    try {
      for (var index=0; index<sub_entries.length; index++) {
        var entry = sub_entries[index];
        source = entry.subscriber;
        
        var cb = entry.cb;
        cb(msg, type);
      };
    } catch(e) {
      console.error("Mbus: attempted to deliver '",type,"' to '",source,"' got:", e);
    };
    
  };
  
  window.mbus = new Mbus();
  
})(document);
