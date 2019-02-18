class CombineMiddleware {
    constructor() {
        this.connect = require('connect');
        this.arrayMiddleware = [];
    }

    setMiddlewareFunction(func) {
        this.arrayMiddleware.push(func);
        return this;
    }

    clear() {
        this.arrayMiddleware = [];
        return this;
    }

    combine() {
        let chain = this.connect();
        this.arrayMiddleware.forEach(function (middleware) {
            chain.use(middleware);
        });
        this.clear(); // Clear the middleware functions stored for a new usage.
        console.log(this.arrayMiddleware);
        return chain;
    }
}

module.exports = CombineMiddleware;

// const middleware1 = (req, res, next) => {
//     console.log('middleware1');
//     next();
// }

// const middleware2 = (req, res, next) => {
//     console.log('middleware2');
//     next();
// }

// const middleware3 = (req, res, next) => {
//     console.log('middleware3');
//     next();
// }
// CM.setMiddlewareFunction(middleware1);
// CM.setMiddlewareFunction(middleware2);
// CM.setMiddlewareFunction(middleware3);
// const combinedMiddleware = CM.combine();
// app.get('/test', combinedMiddleware, (req, res) => {
//     // Do stuff here
//     console.log('Final');
// });