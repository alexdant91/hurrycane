const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../models/db');
const bcrypt = require('bcrypt-nodejs');
const uuid = require('uuid/v4');
const ScrapingPage = require('../modules/scraping/v1');
const HtmlParser = require('../models/html-parser');
const isUrl = require('is-url');
const rp = require('request-promise');

// Configurations
const Config = require('../config/config');
const config = new Config();

// GET /api/
router.get('/', (req, res) => {
    res.json({
        api: 'API',
        headers: req.headers
    });
});

router.get('/token', (req, res) => {

    // All required data:
    // Header -> Authorization: Bearer base64(username:password) [Bearer YWxleGRhbnQ5MUBnbWFpbC5jb206MThHbWdhYTIn]
    // Header -> Secretkey: application-secret-key-value
    // Query  -> GET /api/v1/token?id=application-id
    const secretkey = req.headers.secretkey != '' && req.headers.secretkey != null && req.headers.secretkey != undefined ? req.headers.secretkey : false;
    const authHeader = req.headers.authorization != '' && req.headers.authorization != null && req.headers.authorization != undefined ? req.headers.authorization : false;
    const application_id = req.query.id != '' && req.query.id != null && req.query.id != undefined ? req.query.id : false;
    // Get the host origin for the authorization
    const host = req.hostname != '' && req.hostname != null && req.hostname != undefined ? req.hostname : false;
    const protocol = req.protocol != '' && req.protocol != null && req.protocol != undefined ? req.protocol : false;;

    if (secretkey && authHeader && application_id && host && protocol) {
        const origin = `${protocol}://${host}`;
        if (authHeader.split(' ')[0] == 'Bearer') {
            const base64Token = authHeader.split(' ')[1];
            const decodedToken = Buffer.from(base64Token, 'base64').toString('ascii');
            const email = decodedToken.split(':')[0];
            const password = decodedToken.split(':')[1];
            // Find the user and validate the login
            db.User.find({
                email: email
            }, (err, docs) => {
                if (err) {
                    res.status(500).json({
                        'Error': 'Bad request.',
                        'Message': err
                    });
                } else {
                    const user = docs[0];
                    if (!user) {
                        res.status(404).json({
                            'Error': 'User not found.'
                        });
                    } else {
                        if (!bcrypt.compareSync(password, user.password)) {
                            res.status(404).json({
                                'Error': 'Incorrect credentials.'
                            });
                        } else {
                            // User exist and login it's ok
                            const authObj = {
                                user: user._id,
                                plan: user.subscription
                            }
                            // Now find the app
                            db.Application.find({
                                _id: application_id,
                                user_id: user._id
                            }, (err, application) => {
                                if (err) {
                                    res.status(500).json({
                                        'Error': 'Internal server error.'
                                    });
                                } else {
                                    if (application.length > 0) {
                                        // Set the app id if auth object
                                        authObj.app = application[0]._id;
                                        // Check if the origin is authorized
                                        const allowed_origins = application[0].allowed_origins;
                                        if (allowed_origins.indexOf(origin) !== -1) {
                                            // The origin is allowed so insert it in the authObj
                                            authObj.origin = origin;
                                            // Now authorize the client
                                            jwt.sign({
                                                user: authObj
                                            }, secretkey, {
                                                expiresIn: "60m"
                                            }, (err, token) => {
                                                if (err) {
                                                    res.status(500).json({
                                                        'Error': 'Internal server error.'
                                                    });
                                                } else {
                                                    // All success done so return the authorizazion token
                                                    res.json({
                                                        token
                                                    });
                                                }
                                            });
                                        } else {
                                            res.status(404).json({
                                                'Error': 'The current request origin is not allowed.'
                                            });
                                        }
                                    } else {
                                        res.status(404).json({
                                            'Error': 'ID Application not founded.'
                                        });
                                    }
                                }
                            });
                        }
                    }
                }
            });

        }
    } else {
        res.status(403).json({
            'Error': 'Missing required data.'
        });
    }
});

router.post('/shorten', (req, res) => {
    // Webhook data
    // Create a link: Webhook event -> link_created

    // Auth data
    // Header -> Token: session.token
    // Header -> Secretkey: application-secret-key-value
    const secretkey = req.headers.secretkey != '' && req.headers.secretkey != null && req.headers.secretkey != undefined ? req.headers.secretkey : false;
    const token = req.headers.token != '' && req.headers.token != null && req.headers.token != undefined ? req.headers.token : false;

    jwt.verify(token, secretkey, (err, authData) => {
        if (err) {
            res.status(403).json({
                'Error': 'Authorization required.'
            });
        } else {

            // Now the auth it's ok, let's create the short link


            // Here the basic features
            const long_url = req.body.long_url != '' && req.body.long_url != undefined ? req.body.long_url : false; // Required
            const alias = req.body.alias != '' && req.body.alias != undefined && req.body.alias != null ? req.body.alias.replace(/\s/g, '-') : uuid().replace("-", "").substring(0, 9);
            const description = req.body.description != '' && req.body.description != undefined && req.body.description != null ? req.body.description : null;
            const password = req.body.password != '' && req.body.password != undefined && req.body.password != null ? bcrypt.hashSync(req.body.password) : null;
            const expiration_time = req.body.expiration_time != '' && req.body.expiration_time != undefined && req.body.expiration_time != null ? Math.round((new Date(req.body.expiration_time).getTime()) / 1000) : null;
            const timestamp = Math.round(Date.now() / 1000);
            const user_id = authData.user.user != undefined && authData.user.user != null ? authData.user.user : null;
            const domain_name = long_url != false ? extractHostname(long_url).hostname : null;
            const domain_protocol = long_url != false ? extractHostname(long_url).protocol : null;

            // Here the user logged in features
            const user_permissions = authData.user.plan;
            const device_select = req.body['device_select[]'] != '' && req.body['device_select[]'] != null && req.body['device_select[]'] != undefined && Array.isArray(req.body['device_select[]']) ? req.body['device_select[]'] : [];
            const devicetag_url = req.body.devicetag_url != '' && req.body.devicetag_url != null && req.body.devicetag_url != undefined ? req.body.devicetag_url : null;
            const geo_select = req.body['geo_select[]'] != '' && req.body['geo_select[]'] != null && req.body['geo_select[]'] != undefined && Array.isArray(req.body['geo_select[]']) ? req.body['geo_select[]'] : [];
            const geotag_url = req.body.geotag_url != '' && req.body.devicetag_url != null && req.body.devicetag_url != undefined ? req.body.geotag_url : null;

            // Now the premium featurs
            const seo_title = user_permissions != 'BASIC' && req.body.seo_title != '' && req.body.seo_title != null && req.body.seo_title != undefined ? req.body.seo_title : null;
            const seo_description = user_permissions != 'BASIC' && req.body.seo_description != '' && req.body.seo_description != null && req.body.seo_description != undefined ? req.body.seo_description : null;

            // The url limiter if isset user session
            const plan = authData.user.plan;
            const application_id = authData.user.app;

            if (long_url) {
                db.Plan.find({
                    name: plan
                }, (err, plans) => {
                    if (err) throw err;
                    const url_limit = plans[0].url_limit;
                    db.Url.countDocuments({
                        user_id: user_id
                    }, (err, count) => {
                        if (err) throw err;
                        if (count < url_limit || url_limit == 0) {
                            if (long_url) {
                                db.Url.find({
                                    alias: alias
                                }, (err, docs) => {
                                    if (err) {
                                        res.status(500).json({
                                            'Error': 'Internal server error.'
                                        });
                                    } else {
                                        if (docs.length === 0) {
                                            new ScrapingPage(long_url).getHeadHTML((err, head_html) => {
                                                head_html = head_html != '' && head_html != null && head_html != undefined ? head_html : null;
                                                new HtmlParser(head_html).getFavicon((err, favicon) => {
                                                    if (favicon != undefined && favicon != null) {
                                                        sanitizedFavicon = isUrl(favicon) || favicon.charAt(0) == '/' ? favicon : `/${favicon}`;
                                                        favicon = isUrl(sanitizedFavicon) ? sanitizedFavicon : `${domain_protocol}://${domain_name}${sanitizedFavicon}`;
                                                    }
                                                    db.Url({
                                                        long_url,
                                                        domain_name,
                                                        user_id,
                                                        alias,
                                                        description,
                                                        password,
                                                        expiration_time,
                                                        timestamp,
                                                        head_html,
                                                        favicon,
                                                        device_select,
                                                        devicetag_url,
                                                        geo_select,
                                                        geotag_url,
                                                        seo_title,
                                                        seo_description
                                                    }).save((err, urls) => {
                                                        if (err) {
                                                            res.status(500).json({
                                                                'Error': 'Error while data saving.'
                                                            });
                                                        } else {
                                                            // Link created so find webhooks events if isset
                                                            db.Webhook.find({
                                                                application_id: application_id,
                                                                user_id: user_id
                                                            }, (err, webhook) => {
                                                                if (webhook.length > 0) {
                                                                    // Isset webhook so check if the event is registered
                                                                    const events = webhook[0].events;
                                                                    if (events.indexOf('link_created') !== -1) {
                                                                        // Send webhook async mode
                                                                        const uri = webhook[0].endpoint;
                                                                        rp({
                                                                            method: 'POST',
                                                                            uri: uri,
                                                                            body: {
                                                                                data: {
                                                                                    long_url: long_url,
                                                                                    short_url: `${config.host}/s/${alias}`,
                                                                                    application_id: application_id,
                                                                                    api_version: config.api.version,
                                                                                    event: 'link_created',
                                                                                    status: 'success',
                                                                                    created: Math.round(Date.now() / 1000)
                                                                                },
                                                                                signature: webhook[0].webhook_self_signature
                                                                            },
                                                                            json: true
                                                                        }).then((parsedBody) => {
                                                                            // POST succeeded so register the event
                                                                            db.WebhookEvent({
                                                                                url_id: urls._id,
                                                                                user_id: user_id,
                                                                                webhook_id: webhook[0]._id,
                                                                                application_id: application_id,
                                                                                endpoint: `/${config.api.version}/shorten`,
                                                                                request_response: '200 OK',
                                                                                request_method: 'POST',
                                                                                api_version: config.api.version,
                                                                                event_type: 'link_created',
                                                                                creation_time: Math.round(Date.now() / 1000)
                                                                            }).save(err => {
                                                                                if (err) console.log(err);
                                                                            });
                                                                        }).catch((err) => {
                                                                            // POST failed...
                                                                            console.log('Failed webhook request')
                                                                            console.log(err);
                                                                        });
                                                                        // Send the response and close the client connection
                                                                        res.status(200).json({
                                                                            'Status': 'success',
                                                                            'url': {
                                                                                'id': urls._id,
                                                                                'short_url': `${config.host}/s/${alias}`,
                                                                                'alias': urls.alias,
                                                                            }
                                                                        });

                                                                    } else {
                                                                        // The event is not registered to the webhook 
                                                                        // So send the response and close the connection
                                                                        res.status(200).json({
                                                                            'Status': 'success',
                                                                            'url': {
                                                                                'id': urls._id,
                                                                                'short_url': `${config.host}/s/${alias}`,
                                                                                'alias': urls.alias,
                                                                            }
                                                                        });
                                                                    }
                                                                } else {
                                                                    // Webhook not isset so send the response and close the connection
                                                                    res.status(200).json({
                                                                        'Status': 'success',
                                                                        'url': {
                                                                            'id': urls._id,
                                                                            'short_url': `${config.host}/s/${alias}`,
                                                                            'alias': urls.alias,
                                                                        }
                                                                    });
                                                                }
                                                            });
                                                        }
                                                    });
                                                });
                                            });
                                        } else {
                                            res.status(500).json({
                                                'Error': 'Alias not avaiable.'
                                            });
                                        }
                                    }
                                });
                            } else {
                                res.status(403).json({
                                    'Error': 'Missing required data.'
                                });
                            }
                        } else {
                            res.status(500).json({
                                'Error': 'You have already reached your plan\'s urls limit.'
                            });
                        }

                    });
                });
            } else {
                res.status(403).json({
                    'Error': 'Missing required data.'
                });
            }
        }
        // res.status(200).json(authData);
    });

});

router.delete('/shorten', (req, res) => {
    // Webhook data
    // Delete a link: Webhook event -> link_deleted

    // Auth data
    // Header -> Token: session.token
    // Header -> Secretkey: application-secret-key-value
    const secretkey = req.headers.secretkey != '' && req.headers.secretkey != null && req.headers.secretkey != undefined ? req.headers.secretkey : false;
    const token = req.headers.token != '' && req.headers.token != null && req.headers.token != undefined ? req.headers.token : false;

    jwt.verify(token, secretkey, (err, authData) => {
        if (err) {
            res.status(403).json({
                'Error': 'Authorization required.'
            });
        } else {
            // Here the basic data
            const url_id = req.body.url_id != '' & req.body.url_id != null && req.body.url_id != undefined ? req.body.url_id : false; // Required
            const user_id = authData.user.user != undefined && authData.user.user != null ? authData.user.user : null;
            const application_id = authData.user.app;

            if (url_id) {
                db.Url.deleteOne({
                    _id: url_id,
                    user_id: user_id
                }, (err, confirm) => {
                    if (err) {
                        res.status(500).json({
                            'Error': 'Internal server error.'
                        });
                    } else {
                        if (confirm.n > 0) {
                            // Link deleted so find webhooks events if isset
                            db.Webhook.find({
                                application_id: application_id,
                                user_id: user_id
                            }, (err, webhook) => {
                                if (webhook.length > 0) {
                                    // Isset webhook so check if the event is registered
                                    const events = webhook[0].events;
                                    if (events.indexOf('link_deleted') !== -1) {
                                        // Send webhook async mode
                                        const uri = webhook[0].endpoint;
                                        rp({
                                            method: 'POST',
                                            uri: uri,
                                            body: {
                                                data: {
                                                    url_id: url_id,
                                                    application_id: application_id,
                                                    api_version: config.api.version,
                                                    event: 'link_deleted',
                                                    status: 'success',
                                                    created: Math.round(Date.now() / 1000)
                                                },
                                                signature: webhook[0].webhook_self_signature
                                            },
                                            json: true
                                        }).then((parsedBody) => {
                                            // POST succeeded so register the event
                                            db.WebhookEvent({
                                                user_id: user_id,
                                                webhook_id: webhook[0]._id,
                                                application_id: application_id,
                                                endpoint: `/${config.api.version}/shorten`,
                                                request_response: '200 OK',
                                                request_method: 'DELETE',
                                                api_version: config.api.version,
                                                event_type: 'link_deleted',
                                                creation_time: Math.round(Date.now() / 1000)
                                            }).save(err => {
                                                if (err) console.log(err);
                                            });
                                        }).catch((err) => {
                                            // POST failed...
                                            console.log('Failed webhook request')
                                            console.log(err);
                                        });
                                        // Send the response and close the client connection
                                        res.status(200).json({
                                            'Status': 'success',
                                            'Message': `Url id: ${url_id} deleted.`
                                        });

                                    } else {
                                        // The event is not registered to the webhook 
                                        // So send the response and close the connection
                                        res.status(200).json({
                                            'Status': 'success',
                                            'Message': `Url id: ${url_id} deleted.`
                                        });
                                    }
                                } else {
                                    // Webhook not isset so send the response and close the connection
                                    res.status(200).json({
                                        'Status': 'success',
                                        'Message': `Url id: ${url_id} deleted.`
                                    });
                                }
                            });
                        } else {
                            res.status(500).json({
                                'Error': 'No data founded.'
                            });
                        }
                    }
                });
            } else {
                res.status(403).json({
                    'Error': 'Missing required data.'
                });
            }
        }
        // res.status(200).json(authData);
    });
});

function verifyToken(req, res, next) {
    // Get the auth header value
    const bearerHeader = req.headers.authorization;
    // Check if bearer is undefined
    if (bearerHeader != undefined) {
        // Split at the space
        const bearer = bearerHeader.split(' ');
        // Get token from array
        const bearerToken = bearer[1];
        // Set the token
        req.token = bearerToken;
        // Next middleware
        next();
    } else {
        // Forbidden
        res.sendStatus(403)
    }
}

function extractHostname(url) {
    let hostname;
    //find & remove protocol (http, ftp, etc.) and get hostname
    if (url.indexOf("//") > -1) {
        hostname = url.split('/')[2];
    } else {
        hostname = url.split('/')[0];
    }
    //find & remove port number
    hostname = hostname.split(':')[0];
    //find & remove "?"
    hostname = hostname.split('?')[0];
    protocol = url.split('/')[0].replace(":", "");

    return {
        hostname,
        protocol
    };
}

module.exports = router;