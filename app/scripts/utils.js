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
};

Debouncer.prototype.report_event = function() {
    
    // We are already debouncing an event
    if (this.in_process)
        return;
        
    this.in_process = true;

    var that = this;
    setTimeout(function(){
        
        try {
            that.cb(that.ctx);
        } catch(e) {
            console.error("Debouncer: ctx(",that.ctx,") error= ",e);
        }
        
        that.in_process = false;
        
    }, this.timeout);
    
};