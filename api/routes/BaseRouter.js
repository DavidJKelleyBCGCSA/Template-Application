const express = require('express');

class BaseRouter {
    constructor() {
        this.router = express.Router();
        this.addRoutes(this.router);
    }

    addRoutes(router) {
        // Implement in subclass
    }

    getRouter() {
        return this.router;
    }
}

module.exports = BaseRouter;
