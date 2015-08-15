/**
 *  parser_l3.js
 *  
 *  @author: jldupont
 *  
 *  
 *  Substitute operators for functors
 *  
 *  Start
 *  
 *  
 *  @dependency: types.js
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
};

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
						
			// go around doing object deep copy
			//
			var expression = result[index] || this.expressions[index];
			
			var r = ParserL3.process_expression(opcode, expression);
			result[index] = r;
		};
		
	};// ops
	
	return result;
	
};// process

/**
 *  @return [terms]
 */
ParserL3.process_expression = function(opcode, expression){

	var result;
	var terms;

	for(;;) {

		// Let's bypass the need to perform
		//  deep copy of objects
		//
		var expr = result || expression; 
	
		var tresult = ParserL3._process_expression(opcode, expr);
		var current_count_of_opnodes_processed = tresult[1];
		terms = tresult[0];
		
		result = terms;
		
		// we didn't make any progress... bail out
		//
		if (current_count_of_opnodes_processed == 0)
			break;
		
	}; //for;;
	
	return result;
	
};


ParserL3._process_expression = function(opcode, expression){
	
	var result = [];
	var processed_nodes = 0;
	
	for (var node_index=0; node_index < expression.length; node_index++) {
		
		var node = expression[node_index];
			
		// The recursion case first of course
		if (node instanceof Functor) {
			var exp_from_args = node.args;
			var fresult = ParserL3.process_expression(opcode, exp_from_args);
			node.args = fresult; 
		};
		
		if (!(node instanceof OpNode)) {
			result.push(node);
			continue;
		};
			
		
		// Is it the sort of operator we are
		//  interested in at this point?
		
		if (opcode.symbol != node.symbol) {
			result.push(node);
			continue;
		};
		
		
		// We need to get the proper precedence
		//  for the operator we which to be processing for
		//
		// The unary operators come with `null` as precedence
		//  because the parser needs to figure out if it's really
		//  used in the unary or infix context.
		//
		var opnode_center = OpNode.create_from_name(opcode.name);

		
		// gather 'node left' and 'node right'
		//
		// If `node_left` is undefined, it is marked as `` in the type
		//
		// We use the `result` array because we are replacing `in place`
		//  the nodes of the expression.
		//
		var node_left  = result[node_index - 1 ];
		var node_right = expression[node_index + 1 ];
		
		
		// A good dose of complexity goes on here
		//
		var type   = Op.classify_triplet(node_left, opnode_center, node_right);
		var compat = Op.are_compatible_types(type, opcode.type);
		
		if (!compat) {
			result.push(node);
			continue;
		};

		
		processed_nodes++;
		
		// We have compatibility and thus
		//  substitute for a Functor
		// We only have 2 cases:
		//  pattern 1:  `F_`  : a unary operator
		//  pattern 2:  `_F_` : a infix operator
		
		var functor = new Functor(opcode.name);
		functor.col = node.col;
		functor.line = node.line;
		
		if (Op.is_unary(opcode.type)) {
			functor.args = [node_right];
		} else {
			// we've already pushed node_left... remove it
			result.pop();
			functor.args = [node_left, node_right];
		};

		result.push(functor);
		node_index++;			

	}; // expression	
	
	return [result, processed_nodes];
};

//
// =========================================================== PRIVATE
//



if (typeof module!= 'undefined') {
	module.exports.ParserL3 = ParserL3;
};
