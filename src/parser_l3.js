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
 *  @param operators_map : the map of operators with type, precedence fields
 *  @param maybe_context
 */
function ParserL3(expression_list, operators_map, maybe_context) {
	
	// the resulting terms list
	//
	this.result = [];
	
	this.op_map = operators_map;
	
	this.expressions = expression_list;
	
	// Context defaults
	this.context = {
		// The index of the expression we are processing
		 index_exp:    maybe_context.index_exp    || 0
		 
		 // The index inside the expression we are processing
		,index_in_exp: maybe_context.index_in_exp || 0
	};
};

/**
 * Process the expression list
 *
 * - Order operator list from least to highest precedence
 * - For each operator,
 *
 * @return Result
 */
ParserL3.prototype.process = function(){

};// process



//
// =========================================================== PRIVATE
//



if (typeof module!= 'undefined') {
	module.exports.ParserL3 = ParserL3;
};
