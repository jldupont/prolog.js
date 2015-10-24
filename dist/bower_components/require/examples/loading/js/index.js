var Test = require("./lib/test"),
    Route = require("../route/"),
    pkg = require("../../../package.json"),
    test = new Test("HAL"),
    utils = require("utils/../Gruntfile.js"),
    workerify = require("./lib/workerify");

// require("fun_stuff")
/* require("fun_stuff") */
test.example();

console.log(angular);

if (process.browser) {
    var worker = workerify(function worker() {

    });
    console.log(worker);
    console.log(pkg);
}

global.utils = utils;
global.Test = Test;

exports.route = new Route("GET:/");
