var fnToString = Function.prototype.toString;


function workerify(fn) {
    var blobURL = URL.createObjectURL(
            new Blob([
                "(" + fnToString.call(fn) + "());"
            ], {
                type: "application/javascript"
            })
        ),
        worker = new Worker(blobURL);

    URL.revokeObjectURL(blobURL);

    return worker;
}


module.exports = workerify;
