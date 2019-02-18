'use strict';

require('greenlock-express').create({
    email: 'alexdant91@gmail.com' // The email address of the ACME user / hosting provider
        ,
    agreeTos: true // You must accept the ToS as the host which handles the certs
        ,
    configDir: '~/.config/acme/' // Writable directory where certs will be saved
        ,
    communityMember: true // Join the community to get notified of important updates
        ,
    telemetry: true // Contribute telemetry data to the project

        // Using your express app:
        // simply export it as-is, then include it here
        ,
    app: require('./server.js')

    //, debug: true
}).listen(80, 443);