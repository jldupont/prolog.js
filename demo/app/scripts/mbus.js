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
    this.queue = [];
    
    this.in_post = false;
    
    this.debug = true;
  }

  /*  Subscription
  *
  *   type
  *   source
  *   cb
  */
  
  Mbus.prototype.sub = function(entry) {
    
    if (!entry.type)
      throw new Error("MBus: must specify 'type' field");
    
    var subs = this.subs[entry.type] || [];
    subs.push(entry);
    this.subs[entry.type] = subs;
  };
  
  
  Mbus.prototype.post = function(type_or_msg, maybe_msg) {
    
    var type, msg;

    if (type_or_msg instanceof Object) {
      type = type_or_msg.type;
      msg  = type_or_msg;
    } else {
      type = type_or_msg;
      msg  = maybe_msg;
    }

    this.queue.push({ type:type, msg: msg });
    
    if (this.in_post) {
      return;
    }
    
    this.in_post = true;
        
    for (;;) {
      var entry = this.queue.pop();
      if (!entry)
        break;
        
      var t = entry.type;
      var m = entry.msg;

      var sub_entries = this.subs[t];
      
      if (!sub_entries) {
        console.log("Mbus: no subscribers for: ", t);
        continue;
      }
      
      if (this.debug)
        console.debug("*** MBUS: publishing: ",t, m);
      
      this._publish(sub_entries, t, m);
      
    }

    this.in_post = false;
    
  }; //post
  
  Mbus.prototype._publish = function(sub_entries, type, msg) {

    var source;
    try {
      for (var index=0; index<sub_entries.length; index++) {
        var entry = sub_entries[index];
        source = entry.subscriber;
        
        var cb = entry.cb;
        cb(msg, type);
      }
      
    } catch(e) {
      console.error("Mbus: attempted to deliver '",type,"' to '",source,"' got:", e);
      console.log("Mbus Msg: ", msg);
    }
    
  };
  
  window.mbus = new Mbus();
  
})(document);
