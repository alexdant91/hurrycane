const vhost = (hostname, app) => (req, res, next) => {
    const host = req.headers.host.split('.')[0];
    // console.log('[DEBUG]: ' + host, hostname);
    if (host === hostname) {
        return app(req, res, next);
    } else {
        next();
    }
};

module.exports = vhost;