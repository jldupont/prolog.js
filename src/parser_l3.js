/**
 *  parser_l3.js
 *  
 *  @author: jldupont
 *  
 *  
 *  Substitute operators for functors
 *  
 *  
 *  
 *  @dependency: types.js
 */

/* global Functor, OpNode, Op
			,ErrorSyntax
*/

/**
 *  Parser
 *  
 *  @constructor
 *  
 *  @param expression_list: the list of expressions
 *  @param operators_list : the precedence ordered list of operators
 *  @param maybe_context
 */
function ParserL3(expressions, operators_list, maybe_context) {
	
	this.op_list = operators_list;
	this.expressions = expressions;
}

/**
 * Process the expression list
 *
 * - Order operator list from least to highest precedence
 * - For each operator,
 *
 * @return [result]
 */
ParserL3.prototype.process = function(){

	var result = [];
	
	for (var op_index in this.op_list) {
		
		var opcode = this.op_list[op_index]; 
		
		for (var index=0; index < (this.expressions).length; index++) {
						
			// instead of doing object deep copy
			//
			var expression = result[index] || this.expressions[index];
			
			var r = ParserL3.process_expression(opcode, expression);
			
			//console.log("ParserL3.process: ", r);
			
			result[index] = r;
		}
		
	} // ops
	
	ParserL3.check_syntax( result );
	
	return result;
	
};// process



/**
 *  @return [terms]
 */
ParserL3.process_expression = function(opcode, expression){

	//console.log("- process_expression: ",opcode, expression);
	
	var result;

	for(;;) {

		// Let's bypass the need to perform
		//  deep copy of objects
		//
		var expr = result || expression; 
	
		var tresult = ParserL3._process_expression(opcode, expr);
		var current_count_of_opnodes_processed = tresult[1];
		
		result = tresult[0];
		
		// we didn't make any progress... bail out
		//
		if (current_count_of_opnodes_processed === 0)
			break;
		
	} //for;;
	
	
	
	return result;
	
};

/**
 *  Check syntax for common errors :
 * 
 *  Functor Functor   --> missing conj or disj between Functors
 *  [ ... ]  [ ... ]  --> same with lists but lists are transformed to cons/2 functors
 *                         so it is just as the first case
 *
 *  
 * 
 * @throws ErrorSyntax
 */
ParserL3.check_syntax = function(expressions_list) {
	
	//console.log(expression);
	
	for (var index=0; index < expressions_list.length; index++) {
		var expression = expressions_list[index];
		
	// there should only be 1 root Functor
	//  because all expressions should amount to having
	//  a root conj or disj.
		if (expression.length > 1)
			throw new ErrorSyntax("Expecting only 1 root Functor", expression[0]);
	}
};




ParserL3._process_expression = function(opcode, expression){
	
	//console.log(">>>> ", opcode, expression);
	
	var result = [];
	var processed_nodes = 0;
	
	for (var node_index=0; node_index < expression.length; node_index++) {
		
		var node = expression[node_index];
		
		
		/*
		 *  Now that we have reduced the sub-expressions
		 *   within parens, let's get rid of the `expr` delimiter.
		 */
		if (node instanceof Functor)
			if (node.name == 'expr' && node.args.length == 1)
				node = node.args[0];
		
		
		// The recursion case first of course
		if (node instanceof Functor) {
			var exp_from_args = node.args;
			var fresult = ParserL3.process_expression(opcode, exp_from_args);
			node.args = fresult; 
		}
		
		if (!(node instanceof OpNode)) {
			result.push(node);
			continue;
		}
			
		
		// Is it the sort of operator we are
		//  interested in at this point?
		
		if (opcode.symbol != node.symbol) {
			result.push(node);
			continue;
		}

		
		// gather 'node left' and 'node right'
		//
		// If `node_left` is undefined, it is marked as `` in the type
		//
		// We use the `result` array because we are replacing `in place`
		//  the nodes of the expression.
		//
		var node_left  = result[node_index - 1 ];
		var node_right = expression[node_index + 1 ];
		
		var iresult = this._process_one(opcode, node_left, node, node_right);

		if (iresult === null) {
			result.push(node);
			continue;
		}
			
		processed_nodes++;

		if (!iresult.is_unary)
			result.pop();
		
		result.push(iresult.result);
		
		node_index++;			

	} // expression	
	
	return [result, processed_nodes];
};


ParserL3._process_one = function(opcode, node_left, node_center, node_right) { 
	
	//console.log(">>>> process_one: ", opcode, node_left, node_center, node_right);
	
	// We need to get the proper precedence
	//  for the operator we which to be processing for
	//
	// The unary operators come with `null` as precedence
	//  because the parser needs to figure out if it's really
	//  used in the unary or infix context.
	//
	var opnode_center = OpNode.create_from_name(opcode.name);

		
	// A good dose of complexity goes on here
	//
	var type   = Op.classify_triplet(node_left, opnode_center, node_right);
	var compat = Op.are_compatible_types(type, opcode.type);
	
	if (!compat) {
		return null;
	}

	// We have compatibility and thus
	//  substitute for a Functor
	// We only have 2 cases:
	//  pattern 1:  `F_`  : a unary operator
	//  pattern 2:  `_F_` : a infix operator
	
	var functor = new Functor(opcode.name);
	functor.col = node_center.col;
	functor.line = node_center.line;
	functor.offset = node_center.offset;
	functor.attrs = opcode.attrs;
	
	var is_unary = Op.is_unary(opcode.type); 
	
	if (is_unary) {
		functor.args = [node_right];
	} else {
		functor.args = [node_left, node_right];
	}

	return { is_unary: is_unary, result: functor };
};


//
// =========================================================== PRIVATE
//



if (typeof module!= 'undefined') {
	module.exports.ParserL3 = ParserL3;
}
