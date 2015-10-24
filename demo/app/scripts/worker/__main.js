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
 *   - pr_question_ok
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
            Functor, Var, Token
*/

addEventListener('message', function(msg_enveloppe) {
    console.debug("Worker message: ", msg_enveloppe);
    
    var msg = msg_enveloppe.data;
    
    if (msg.type == 'code') {
        store_code(msg);
        return;
    }


    if (msg.type == 'run') {
        do_run(msg);
        return;
    }
 
 
   if (msg.type == 'redo') {
        do_redo();
        return;
    }
 
 
});






var db_user     = new Database(DbAccess);
var db_builtins = new Database(DbAccess);

var dbm = new DatabaseManager( db_builtins, db_user );

var interpreter = new Interpreter(db_user, db_builtins);


/**
 *  Receive 'text code' from the main thread
 *  Compile
 *  Put in db
 */
function store_code(msg) {

    Functor.inspect_compact_version = true;
    Functor.inspect_cons = true;
    Var.inspect_compact = true;
    Token.inspect_compact = true;


    if (msg.code_type == 'user')
        db_user.clear();    
        
    //console.debug("Worker: storing code: ", msg.code_type);
    
    var parsed_text = Prolog.parse_per_sentence(msg.code_text);

    //console.log("Worker, parsed: ", parsed_text);

    // there should not be any errors
    //  because checks are performed on the main thread side
    
    
    var codes = Prolog.compile_per_sentence(parsed_text);
    
    //console.log("Worker, codes: ", codes);
    
    put_code_in_db(msg.code_type, codes);

}


function put_code_in_db(code_type, codes) {

    for (var index=0; index<codes.length; index++) {
        var code = codes[index];
        var f = code.code.f;
        var a = code.code.a;
        
        if (code.code.is_query) {
            interpreter.set_question(code.code);
            
            postMessage({
                type: 'pr_question_ok'
            });
            return;
        }
        
        
        //console.debug("Worker: Storing ", code_type," code: f/a: ", f, a);    

        if (code_type == 'user')
            dbm.user_insert_code(f, a, code.code);
        else
            dbm.builtin_insert_code(f, a, code.code);
    }
    
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
                 type: 'pr_error'
                ,error: JSON.stringify(e)
            });
            return;
        }
    
    if (result) {
        // the end has been reached ... a result should be available

        //console.log("Worker Stack:   ", interpreter.get_stack());
        //console.log("Worker Context: ", interpreter.ctx);

        var vars = interpreter.get_query_vars();
        var varss = {};
        
        for (var key in vars) {
            
            var value = vars[key];
            
            varss[key] = value.inspect ? value.inspect() : JSON.stringify(value);
        }
            

        postMessage({
            type: 'pr_result'
            ,ref: ref
            ,state: interpreter.get_context().cu
            ,step_count: interpreter.ctx.step_counter
            ,vars: varss
        });

         
    } else {
        
        postMessage({
            type: 'pr_paused'
            ,ref:  ref
            ,step_count: interpreter.ctx.step_counter
        });
        
    }
    
}


function do_redo() {
    
    var result = interpreter.backtrack();
    
    postMessage({
         type:   'pr_redo'
        ,result: result
    });
    
}