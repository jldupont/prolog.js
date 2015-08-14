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
function ParserL3(expression, operators_list, maybe_context) {
	
	// the resulting terms list
	//
	this.result = [];
	
	this.op_list = operators_list;
	
	this.expression = expression;
	
	// Context defaults
	this.context = {
		// The index of the expression we are processing
		 index_exp:    maybe_context.index_exp    || 0
		 
		 // The index inside the expression we are processing
		,index_in_exp: maybe_context.index_in_exp || 0
		
		// The index in the operators list
		//,index_in_op:  maybe_context.index_in_op  || 0
	};
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
		var op = this.op_list[op_index]; 
		
		var total_opnodes_in_expression = 0;
		var total_opnodes_processed = 0;
		var total_opnodes_unprocessed = 0;
		
		for (var node_index in this.expression) {
			var node = this.expression[node_index];
			
			if (!(node instanceof OpNode))
				continue;
			
			
			
		}; // nodes
		
		// we didn't find anymore unprocessed OpNode in the last pass
		// in the expression
		if (total_opnodes_processed + total_opnodes_unprocessed == total_opnodes_in_expression)
			break;
		
	};// ops
	
	return result;
	
};// process



//
// =========================================================== PRIVATE
//



if (typeof module!= 'undefined') {
	module.exports.ParserL3 = ParserL3;
};
