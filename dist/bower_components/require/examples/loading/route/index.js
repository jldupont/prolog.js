function Route(name) {

    this.name = name;
    this.path = require.resolve("../js/");
}

module.exports = Route;
