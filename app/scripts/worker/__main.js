/**
 *   Main file for worker.js
 * 
 *   Input Messages:
 *   ===============
 * 
 *   - code     : provide user or builtin code
 *   - run      : execute a number of instructions
 *   - redo     : attempt to find another solution
 *   - question : provide the question/query
 * 
 * 
 *   Output Messages:
 *   ================
 * 
 *   - pr_result   : the interpreter shares a solution
 *   - pr_paused   : the interpreter finished running 
 *                    the specified number of steps
 * 
 *   - pr_error : the compiler / interpreter encountered an error 
 * 
 * 
 *   States:
 *   =======
 * 
 *   - running : the interpreter is running
 *   - paused  : the interpreter is paused
 *   - result  : the interpreter provided a solution
 *   - end     : the query can no longer provide any solution
 *   - error   : the interpreter is in error state
 * 
 *   State "Error"
 *   =============
 * 
 *   Possible causes:
 *   - 
 * 
 */

/* global Database, DbAccess, DatabaseManager, Interpreter, Prolog
*/

addEventListener('message', function(msg_enveloppe) {
    console.debug("Worker message: ", msg_enveloppe);
    
    var msg = msg_enveloppe.data;
    
    if (msg.type == 'code') {
        store_code(msg);
        return;
    }

    if (msg.type == 'question') {
        set_question(msg);
        return;
    }


    if (msg.type == 'run') {
        do_run(msg);
        return;
    }
 
 
   if (msg.type == 'redo') {
        
    }
 
 
});

var db_user     = new Database(DbAccess);
var db_builtins = new Database(DbAccess);

var dbm = new DatabaseManager( db_builtins, db_user );

var interpreter = new Interpreter(db_user, db_builtins);



function store_code(msg) {

    if (msg.code_type == 'user')
        db_user.clear();    
        
    console.debug("Worker: storing code: ", msg.code_type);

    for (var index=0; index<msg.codes.length; index++) {
        var code = msg.codes[index];
        var f = code.code.f;
        var a = code.code.a;
        
        console.debug("Worker: Storing ", msg.code_type," code: f/a: ", f, a);    

        if (msg.code_type == 'user')
            dbm.user_insert_code(f, a, code.code);
        else
            dbm.builtin_insert_code(f, a, code.code);
    }

}


function set_question(msg) {
    
    console.debug("Worker: question: ", msg.text);
    
    var query_text = msg.text;
    
    var parsed_query = Prolog.parse_per_sentence(query_text, true).sentences[0];
    
    if (parsed_query.maybe_error) {
        postMessage({
             type: 'pr_error'
            ,error: parsed_query.maybe_error
        });
        return;
    }
    
    console.debug("Worker: parsed question: ", parsed_query);
    
    var query_code_object = Prolog.compile_query( parsed_query.maybe_token_list  );
    
    if (query_code_object instanceof Error) {

        postMessage({
             type: 'pr_error'
            ,error: query_code_object.classname
        });
        
        return;
    }
    
    console.debug("Worker: query object code: ", query_code_object);
    
    interpreter.set_question(query_code_object.code);
    
    console.debug("Worker: set question: ", query_code_object.code);
}

function do_run(msg) {
    
    var steps   = msg.steps    || 10000;
    var ref     = msg.ref      || 0;

    var result;

    for (var count = 0 ; count<steps; count++)
        try {
            
            result = interpreter.step();
            
        } catch(e) {
            
            console.log(e);
            
            postMessage({
                 type: 'error'
                ,error: JSON.stringify(e)
            });
            return;
        }
    
    if (result) {
        // the end has been reached ... a result should be available

        postMessage({
            type: 'result'
            ,ref: ref
        });

         
    } else {
        
        postMessage({
            type: 'paused'
            ,ref: ref
        });
        
    }
    
}