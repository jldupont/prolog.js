function Test(name) {

    this.name = name;

    this.add = require("./others/add");
    this.sub = require("./others/sub");
}


Test.prototype.example = function() {
    console.log("Hey my name is " + this.name);
    console.log("i can add 10 + 5 = " + this.add(10, 5));
    console.log("i can subtract 10 - 5 = " + this.sub(10, 5));
};


module.exports = Test;
