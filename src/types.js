/**
 *   types.js
 *   
 *   The definition of the types
 *   
 *   @author: jldupont
 */


function Result(term_list, last_index) {
	this.terms = term_list;
	this.index = last_index;
};


/**
 * Operator
 * @constructor
 */
function Op(name, symbol, precedence, type, locked) {
	this.name = name;
	this.symbol = symbol;
	this.precedence = precedence;
	this.type = type;
	
	// by default, operators can not be redefined
	this.locked = locked || true;
};

Op.prototype.inspect = function() {
	return "Op("+this.name+")";
};

//Initialize the operators
/*
 * Precedence is an integer between 0 and 1200. 
 * 
 * Type is one of: xf, yf, xfx, xfy, yfx, fy or fx. 
 * 
 * The `f' indicates the position of the functor, 
 *  while x and y indicate the position of the arguments. 
 *  `y' should be interpreted as 
 *    ``on this position a term with precedence lower or equal 
 *    to the precedence of the functor should occur''. 
 * 
 * For `x' the precedence of the argument must be strictly lower. 
 *  
 * The precedence of a term is 0, unless its principal functor is an operator, 
 *  in which case the precedence is the precedence of this operator. 
 *   
 *   A term enclosed in parentheses ( ... ) has precedence 0.
 */
Op._map = {
	 ':-': new Op("rule",    ':-', 1200, 'xfx')
	,';':  new Op("disj",    ';',  1100, 'xfy')
	,',':  new Op("conj",    ',',  1000, 'xfy')
};

function OpNode(symbol) {
	this.symbol = symbol;
};

OpNode.prototype.inspect = function(){
	return "OpNode("+this.symbol+","+this.get_name()+")";
};

OpNode.prototype.get_name = function(){
	var o = Op._map[this.symbol] || {};
	return o.name || "??";
};

// End of stream
function Eos () {};

Eos.prototype.inspect = function () {
	return "Eos";
};

function Nothing () {};

/**
 *  Functor
 *  @constructor
 */
function Functor(name, maybe_arguments_list) {
	
	this.name = name;
	this.original_token = null;
	
	// remove the first parameter of the constructor
	if (arguments.length > 1)
		this.args = Array.prototype.splice.call(arguments, 1);
	else
		this.args = [];
};

Functor.prototype.inspect = function(){
	return "Functor("+this.name+"/"+this.args.length+this.format_args()+")";
};

Functor.prototype.format_args = function () {
	
	var result = "";
	for (var index in this.args) {
		var arg = this.args[index];
		if (arg.inspect)
			result += ","+arg.inspect();
		else
			result += ","+JSON.stringify(arg);
	};
	
	return result;
};

Functor.prototype.get_args = function(){
	return this.args;
};

Functor.prototype.push_arg = function(arg) {
	this.args.push(arg);
};

/**
 * Either monad
 */
function Either(value_a, value_b) {
	this.name = 'either';
	this.value_a = value_a || null;
	this.value_b = value_b || null;
};

Either.prototype.getA = function() {
	return this.value_a;
};

Either.prototype.getB = function() {
	return this.value_b;
};

function Error(name, maybe_details) {
	this.name = name;
	this.details = maybe_details || null;
};

if (typeof module!= 'undefined') {
	module.exports.Either = Either;
	module.exports.Nothing = Nothing;
	module.exports.Error = Error;
	module.exports.Eos = Eos;
	module.exports.Functor = Functor;
	module.exports.Op = Op;
	module.exports.OpNode = OpNode;
	module.exports.Result = Result;
};