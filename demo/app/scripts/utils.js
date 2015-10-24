/**
*   Various utilities
* 
*   @author: jldupont
* 
*/

var Debouncer = function(timeout, ctx, cb) {
    
    this.timeout = timeout;
    this.cb = cb;
    this.ctx = ctx;
    
    this.in_process = false;
    this.current_timer = null;
};

Debouncer.prototype.report_event = function(ctx) {
    
    // We are already debouncing an event
    if (this.in_process) {
        if (this.current_timer)
            clearTimeout(this.current_timer);
    }
        
        
    this.in_process = true;

    var that = this;
    this.current_timer = setTimeout(function(){
        
        try {
            that.cb(that.ctx, ctx);
        } catch(e) {
            console.error("Debouncer: ctx(",that.ctx,") error= ",e);
        }
        
        that.in_process = false;
        
    }, this.timeout);
    
};