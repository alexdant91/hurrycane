// Config
const Config = require('./config/config');
const config = new Config();
const cluster = require('cluster');

const app = require('./server/app');
const workers = require('./server/cluster');

/**
 * Setup number of worker processes and run init()
 */
const setupWorkerProcesses = () => {
    workers.init();
};

/**
 * Setup the express server and run init()
 */
const setUpExpress = () => {
    app.init();
}

const setupServer = (isClusterRequired) => {

    // if it is a master process then call setting up worker process
    if (isClusterRequired && cluster.isMaster) {
        setupWorkerProcesses();
    } else {
        // to setup server configurations and share port address for incoming requests
        setUpExpress();
    }
};

setupServer(config.cluster);

module.exports = {
    app,
    workers
};