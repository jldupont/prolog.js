/**
 *  parser.js
 *  
 *  @author: jldupont
 *  
 *  In prolog, we have the following tokens:
 *  
 *  :-    a rule
 *  .     fact or rule terminator
 *  ,     conjunction
 *  ;     disjunction
 *  
 * 
 */

/**
 *  Parser constructor
 *  @constructor
 */
function Parser() {
};

/**
 *  Parse the input string
 *  
 *  @param {String} input
 *  
 *  @return Tokens 
 */
Parser.prototype.parse = function(input) {
	
	// step 1: break the input string into [line]
	
	var lines = input.split("\n");
	
};
