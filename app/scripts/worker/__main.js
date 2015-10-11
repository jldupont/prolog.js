/**
 *   Main file for worker.js
 */

/* global Database, DbAccess, DatabaseManager, Interpreter
*/

addEventListener('message', function(msg_enveloppe) {
    console.log("Worker message: ", msg_enveloppe);
    
    var msg = msg_enveloppe.data;
    
    if (msg.type == 'code') {
        store_code(msg);
        return;
    }


    if (msg.type == 'run') {
        
    }
 
 
   if (msg.type == 'redo') {
        
    }
 
 
});

var dba = DbAccess();

var db_user     = new Database(dba);
var db_builtins = new Database(dba);

var dbm = new DatabaseManager( db_builtins, db_user );

var interpreter = new Interpreter(db_user, db_builtins);


(function(){
    
});

function store_code(msg) {
    
    console.log("Worker: Storing ", msg.code_type," code: f/a: ", msg.f, msg.a);

    if (msg.code_type == 'user')
        dbm.user_insert_code(msg.f, msg.a, msg.code);
    else
        dbm.builtin_insert_code(msg.f, msg.a, msg.code);
}
