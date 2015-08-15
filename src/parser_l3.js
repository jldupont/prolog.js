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
	
	// the resulting terms list
	//
	this.result = [];
	
	this.op_list = operators_list;
	
	this.expressions = expressions;
	
	/*
	// Context defaults
	this.context = {
		// The index of the expression we are processing
		 index_exp:    maybe_context.index_exp    || 0
		 
		 // The index inside the expression we are processing
		,index_in_exp: maybe_context.index_in_exp || 0
		
		// The index in the operators list
		//,index_in_op:  maybe_context.index_in_op  || 0
	};
	*/
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
		
		//console.log("ParserL3.process: op= ", op);
		
		for (var index_exp in this.expressions) {
			
			var expression = this.expressions[index_exp];
			var r = this.process_expression(opcode, expression);
			result.push( r );
		};
		
	};// ops
	
	return result;
	
};// process

/**
 *  @return [terms]
 */
ParserL3.prototype.process_expression = function(opcode, expression){

	var result = [];

	//console.log("ParserL3.process_expression: ", JSON.stringify(expression));
	
	for(;;) {

		var current_count_of_opnodes_processed = 0;
		
		for (var node_index=0; node_index < expression.length; node_index++) {
			
			var node = expression[node_index];
					
			if (!(node instanceof OpNode))
				continue;
			
			// Is it the sort of operator we are
			//  interested in at this point?
			
			if (opcode.symbol != node.symbol)
				continue;
			
			//console.log("process_expression: opnode: ", node);
			
			// We need to get the proper precedence
			//  for the operator we which to be processing for
			//
			var opnode_center = OpNode.create_from_name(opcode.name);
			
			// gather 'node left' and 'node right'
			var node_left  = expression[node_index - 1 ];
			var node_right = expression[node_index + 1 ];
			
			//console.log(" Nodes: ", node_left, opnode_center, node_right);
			
			var type = Op.classify_triplet(node_left, opnode_center, node_right);
			console.log(type);
			
		}; // expression

		// we didn't make any progress... bail out
		//
		if (current_count_of_opnodes_processed == 0)
			break;

	}; //for;;
	
	
	return result;
	
};


//
// =========================================================== PRIVATE
//



if (typeof module!= 'undefined') {
	module.exports.ParserL3 = ParserL3;
};
