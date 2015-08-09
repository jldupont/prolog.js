/**
 *  parser.js
 *  
 *  @author: jldupont
 *  
 */

/**
 *  Parser
 *  
 *  @constructor
 */
function Parser() {
	this.list = [];
	this.index = 0;
	this.state = 'start';
};

/**
 * Processes a list of tokens
 *  May output Term if one is ready 
 * 
 * @param token_list
 * 
 * @return 
 */
Parser.prototype.process_tokens = function(token_list) {
	
	
};

if (typeof module!= 'undefined') {
	module.exports.Parser = Parser;
};
