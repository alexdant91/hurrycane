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
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const sharp = require('sharp');
const fs = require('fs');

// Configurations
const Config = require('../config/config');
const config = new Config();

/* 
 * Now only the 200 OK event are saved both ia
 * applications and webhooks endpoints.
 * 
 * @TODO: Register the error in applications and webhooks events.
 *
 */

// GET /api/
router.get(['/', `/${config.api.version}`], (req, res) => {
    res.json({
        api: 'API',
        headers: req.headers
    });
});

// POST /api/
router.post('/', (req, res) => {
    res.json({
        api: 'API',
        headers: req.headers
    });
});

router.get(['/token', `/${config.api.version}/token`], (req, res) => {
    // All required data:
    // Header -> Authorization: Bearer base64(username:password) [Bearer YWxleGRhbnQ5MUBnbWFpbC5jb206MThHbWdhYTIn]
    // Header -> Secretkey: application-secret-key-value
    // Query  -> GET /api/v1/token?id=application-id
    const secretkey = req.headers.secretkey != '' && req.headers.secretkey != null && req.headers.secretkey != undefined ? req.headers.secretkey : false;
    const authHeader = req.headers.authorization != '' && req.headers.authorization != null && req.headers.authorization != undefined ? req.headers.authorization : false;
    const application_id = req.query.id != '' && req.query.id != null && req.query.id != undefined ? req.query.id : false;
    // Get the host origin for the authorization
    const host = req.hostname != '' && req.hostname != null && req.hostname != undefined ? req.hostname : false;
    const protocol = req.protocol != '' && req.protocol != null && req.protocol != undefined ? req.protocol : false;


    if (secretkey && authHeader && application_id && host && protocol) {
        // Check if secretkey match application id
        db.Application.find({
            _id: application_id,
            secret_key: secretkey
        }, (err, docs) => {
            if (err) {
                res.status(500).json({
                    'Error': 'Bad request.',
                    'Message': err
                });
            } else {
                if (docs.length > 0) {
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
                                    db.Webhook.find({
                                        application_id: application_id
                                    }, (err, webhook) => {
                                        if (webhook.length > 0) {
                                            // Isset webhook so check if the event is registered
                                            const events = webhook[0].events;
                                            if (events.indexOf('auth_token') !== -1) {
                                                db.WebhookEvent({
                                                    user_id: webhook[0].user_id,
                                                    webhook_id: webhook[0]._id,
                                                    application_id: application_id,
                                                    endpoint: `/${config.api.version}/token`,
                                                    request_response: '404 NOT FOUND',
                                                    request_method: 'POST',
                                                    api_version: config.api.version,
                                                    event_type: 'auth_token',
                                                    creation_time: Math.round(Date.now() / 1000)
                                                }).save(err => {
                                                    if (err) console.log(err);
                                                });
                                            }
                                        }
                                    });

                                    res.status(404).json({
                                        'Error': 'User not found.'
                                    });
                                } else {
                                    if (!bcrypt.compareSync(password, user.password)) {
                                        db.Webhook.find({
                                            application_id: application_id
                                        }, (err, webhook) => {
                                            if (webhook.length > 0) {
                                                // Isset webhook so check if the event is registered
                                                const events = webhook[0].events;
                                                if (events.indexOf('auth_token') !== -1) {
                                                    db.WebhookEvent({
                                                        user_id: webhook[0].user_id,
                                                        webhook_id: webhook[0]._id,
                                                        application_id: application_id,
                                                        endpoint: `/${config.api.version}/token`,
                                                        request_response: '403 FORBIDDEN',
                                                        request_method: 'POST',
                                                        api_version: config.api.version,
                                                        event_type: 'auth_token',
                                                        creation_time: Math.round(Date.now() / 1000)
                                                    }).save(err => {
                                                        if (err) console.log(err);
                                                    });
                                                }
                                            }
                                        });

                                        res.status(403).json({
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
                                                    // Check if the application is active or disabled
                                                    if (application[0].active) {
                                                        // Check if the application is in test or live mode
                                                        if (application[0].production) {
                                                            // Set the app id if auth object
                                                            authObj.app = application[0]._id;
                                                            // Check if the origin is authorized
                                                            const allowed_origins = application[0].allowed_origins;
                                                            if (allowed_origins.indexOf(origin) !== -1 || origin == config.host) {
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
                                                                        // All success done 
                                                                        // Register the application event async
                                                                        db.ApplicationEvent({
                                                                            user_id: user._id,
                                                                            application_id: application_id,
                                                                            event_description: 'Access Token request.',
                                                                            event_method: 'GET',
                                                                            event_request: `/${config.api.version}/token`,
                                                                            event_response: '200 OK',
                                                                            request_origin: origin
                                                                        }).save((err, doc) => {});
                                                                        // Return the authorizazion token

                                                                        db.Webhook.find({
                                                                            application_id: application_id,
                                                                            user_id: user._id
                                                                        }, (err, webhook) => {
                                                                            if (webhook.length > 0) {
                                                                                // Isset webhook so check if the event is registered
                                                                                const events = webhook[0].events;
                                                                                if (events.indexOf('auth_token') !== -1) {
                                                                                    // Send webhook async mode
                                                                                    const uri = webhook[0].endpoint;
                                                                                    rp({
                                                                                        method: 'POST',
                                                                                        uri: uri,
                                                                                        body: {
                                                                                            data: {
                                                                                                user_id: user._id,
                                                                                                application_id: application_id,
                                                                                                api_version: config.api.version,
                                                                                                event: 'auth_token',
                                                                                                status: 'success',
                                                                                                created: Math.round(Date.now() / 1000)
                                                                                            },
                                                                                            signature: webhook[0].webhook_self_signature
                                                                                        },
                                                                                        json: true
                                                                                    }).then((parsedBody) => {
                                                                                        // POST succeeded so register the event
                                                                                        db.WebhookEvent({
                                                                                            user_id: user._id,
                                                                                            webhook_id: webhook[0]._id,
                                                                                            application_id: application_id,
                                                                                            endpoint: `/${config.api.version}/token`,
                                                                                            request_response: '200 OK',
                                                                                            request_method: 'POST',
                                                                                            api_version: config.api.version,
                                                                                            event_type: 'auth_token',
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

                                                                                }
                                                                            }
                                                                        });

                                                                        // Send response
                                                                        // Send webhook event async
                                                                        // Registering events async
                                                                        res.status(200).json({
                                                                            token
                                                                        });
                                                                    }
                                                                });
                                                            } else {
                                                                db.Webhook.find({
                                                                    application_id: application_id
                                                                }, (err, webhook) => {
                                                                    if (webhook.length > 0) {
                                                                        // Isset webhook so check if the event is registered
                                                                        const events = webhook[0].events;
                                                                        if (events.indexOf('auth_token') !== -1) {
                                                                            db.WebhookEvent({
                                                                                user_id: webhook[0].user_id,
                                                                                webhook_id: webhook[0]._id,
                                                                                application_id: application_id,
                                                                                endpoint: `/${config.api.version}/token`,
                                                                                request_response: '403 FORBIDDEN',
                                                                                request_method: 'POST',
                                                                                api_version: config.api.version,
                                                                                event_type: 'auth_token',
                                                                                creation_time: Math.round(Date.now() / 1000)
                                                                            }).save(err => {
                                                                                if (err) console.log(err);
                                                                            });
                                                                        }
                                                                    }
                                                                });

                                                                res.status(403).json({
                                                                    'Error': 'The current request origin is not allowed.',
                                                                    'Origin': origin
                                                                });
                                                            }
                                                        } else {
                                                            db.Webhook.find({
                                                                application_id: application_id
                                                            }, (err, webhook) => {
                                                                if (webhook.length > 0) {
                                                                    // Isset webhook so check if the event is registered
                                                                    const events = webhook[0].events;
                                                                    if (events.indexOf('auth_token') !== -1) {
                                                                        db.WebhookEvent({
                                                                            user_id: webhook[0].user_id,
                                                                            webhook_id: webhook[0]._id,
                                                                            application_id: application_id,
                                                                            endpoint: `/${config.api.version}/token`,
                                                                            request_response: '500 BAD REQUEST',
                                                                            request_method: 'POST',
                                                                            api_version: config.api.version,
                                                                            event_type: 'auth_token',
                                                                            creation_time: Math.round(Date.now() / 1000)
                                                                        }).save(err => {
                                                                            if (err) console.log(err);
                                                                        });
                                                                    }
                                                                }
                                                            });

                                                            res.status(500).json({
                                                                'Error': `The application with id(${application_id}) is currently in testing mode. You can't use production endpoint's on testing mode. Go to your dashboard and set the app on live mode before using live API endpoint.`
                                                            });
                                                        }
                                                    } else {
                                                        db.Webhook.find({
                                                            application_id: application_id
                                                        }, (err, webhook) => {
                                                            if (webhook.length > 0) {
                                                                // Isset webhook so check if the event is registered
                                                                const events = webhook[0].events;
                                                                if (events.indexOf('auth_token') !== -1) {
                                                                    db.WebhookEvent({
                                                                        user_id: webhook[0].user_id,
                                                                        webhook_id: webhook[0]._id,
                                                                        application_id: application_id,
                                                                        endpoint: `/${config.api.version}/token`,
                                                                        request_response: '500 BAD REQUEST',
                                                                        request_method: 'POST',
                                                                        api_version: config.api.version,
                                                                        event_type: 'auth_token',
                                                                        creation_time: Math.round(Date.now() / 1000)
                                                                    }).save(err => {
                                                                        if (err) console.log(err);
                                                                    });
                                                                }
                                                            }
                                                        });

                                                        res.status(500).json({
                                                            'Error': `The application with id(${application_id}) is currently disabled. Go to your dashboard and activate this app before using API.`
                                                        });
                                                    }
                                                } else {
                                                    db.Webhook.find({
                                                        application_id: application_id
                                                    }, (err, webhook) => {
                                                        if (webhook.length > 0) {
                                                            // Isset webhook so check if the event is registered
                                                            const events = webhook[0].events;
                                                            if (events.indexOf('auth_token') !== -1) {
                                                                db.WebhookEvent({
                                                                    user_id: webhook[0].user_id,
                                                                    webhook_id: webhook[0]._id,
                                                                    application_id: application_id,
                                                                    endpoint: `/${config.api.version}/token`,
                                                                    request_response: '404 NOT FOUND',
                                                                    request_method: 'POST',
                                                                    api_version: config.api.version,
                                                                    event_type: 'auth_token',
                                                                    creation_time: Math.round(Date.now() / 1000)
                                                                }).save(err => {
                                                                    if (err) console.log(err);
                                                                });
                                                            }
                                                        }
                                                    })

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

                    } else {
                        db.Webhook.find({
                            application_id: application_id
                        }, (err, webhook) => {
                            if (webhook.length > 0) {
                                // Isset webhook so check if the event is registered
                                const events = webhook[0].events;
                                if (events.indexOf('auth_token') !== -1) {
                                    db.WebhookEvent({
                                        user_id: webhook[0].user_id,
                                        webhook_id: webhook[0]._id,
                                        application_id: application_id,
                                        endpoint: `/${config.api.version}/token`,
                                        request_response: '403 FORBIDDEN',
                                        request_method: 'POST',
                                        api_version: config.api.version,
                                        event_type: 'auth_token',
                                        creation_time: Math.round(Date.now() / 1000)
                                    }).save(err => {
                                        if (err) console.log(err);
                                    });
                                }
                            }
                        });

                        res.status(403).json({
                            'Error': 'Failed authentication.',
                            'Authorizzation': authHeader.split(' ')[0]
                        });
                    }
                } else {
                    db.Webhook.find({
                        application_id: application_id
                    }, (err, webhook) => {
                        if (webhook.length > 0) {
                            // Isset webhook so check if the event is registered
                            const events = webhook[0].events;
                            if (events.indexOf('auth_token') !== -1) {
                                db.WebhookEvent({
                                    user_id: webhook[0].user_id,
                                    webhook_id: webhook[0]._id,
                                    application_id: application_id,
                                    endpoint: `/${config.api.version}/token`,
                                    request_response: '403 FORBIDDEN',
                                    request_method: 'POST',
                                    api_version: config.api.version,
                                    event_type: 'auth_token',
                                    creation_time: Math.round(Date.now() / 1000)
                                }).save(err => {
                                    if (err) console.log(err);
                                });
                            }
                        }
                    });

                    res.status(403).json({
                        'Error': 'Secret key doesn\'t match with the given application.'
                    });
                }
            }
        })

    } else {
        db.Webhook.find({
            application_id: application_id,
        }, (err, webhook) => {
            if (webhook.length > 0) {
                // Isset webhook so check if the event is registered
                const events = webhook[0].events;
                if (events.indexOf('auth_token') !== -1) {
                    db.WebhookEvent({
                        user_id: webhook[0].user_id,
                        webhook_id: webhook[0]._id,
                        application_id: application_id,
                        endpoint: `/${config.api.version}/token`,
                        request_response: '403 FORBIDDEN',
                        request_method: 'POST',
                        api_version: config.api.version,
                        event_type: 'auth_token',
                        creation_time: Math.round(Date.now() / 1000)
                    }).save(err => {
                        if (err) console.log(err);
                    });
                }
            }
        });

        res.status(403).json({
            'Error': 'Missing required data.'
        });
    }
});

router.post(['/shorten', `/${config.api.version}/shorten`], (req, res) => {
    // Webhook data
    // Create a link: Webhook event -> link_created

    // Auth data
    // Header -> Token: session.token
    // Header -> Secretkey: application-secret-key-value
    const secretkey = req.headers.secretkey != '' && req.headers.secretkey != null && req.headers.secretkey != undefined ? req.headers.secretkey : false;
    const token = req.headers.token != '' && req.headers.token != null && req.headers.token != undefined ? req.headers.token : false;
    // Get the host origin for the authorization
    const host = req.hostname != '' && req.hostname != null && req.hostname != undefined ? req.hostname : false;
    const protocol = req.protocol != '' && req.protocol != null && req.protocol != undefined ? req.protocol : false;
    const origin = `${protocol}://${host}`;

    jwt.verify(token, secretkey, (err, authData) => {
        if (err) {
            res.status(403).json({
                'Error': 'Authorization required.'
            });
        } else {
            // Now the auth it's ok, let's create the short link
            // Here the basic features
            const long_url = req.body.long_url != '' && req.body.long_url != undefined ? req.body.long_url : false && isUrl(req.body.long_url); // Required
            const alias = req.body.alias != '' && req.body.alias != undefined && req.body.alias != null ? req.body.alias.replace(/\s/g, '-') : uuid().replace("-", "").substring(0, 9);
            const description = req.body.description != '' && req.body.description != undefined && req.body.description != null ? req.body.description : null;
            const password = req.body.password != '' && req.body.password != undefined && req.body.password != null ? bcrypt.hashSync(req.body.password) : null;
            const expiration_time = req.body.expiration_time != '' && req.body.expiration_time != undefined && req.body.expiration_time != null ? Math.round((new Date(req.body.expiration_time).getTime()) / 1000) : null;
            const timestamp = Math.round(Date.now() / 1000);
            const user_id = authData.user.user != undefined && authData.user.user != null ? authData.user.user : null;
            const domain_name = long_url != false ? extractHostname(long_url).hostname : null;
            const domain_protocol = long_url != false ? extractHostname(long_url).protocol : null;
            const page_screenshot = req.body.page_screenshot != '' && req.body.page_screenshot != null && req.body.page_screenshot != undefined && typeof req.body.page_screenshot === "boolean" ? req.body.page_screenshot : true;
            const page_seotags = req.body.page_seotags != '' && req.body.page_seotags != null && req.body.page_seotags != undefined && typeof req.body.page_seotags === "boolean" ? req.body.page_seotags : true;

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
                // Find the application and perform security checks
                db.Application.find({
                    _id: application_id,
                    user_id: user_id,
                }, (err, application) => {
                    if (err) {
                        res.status(500).json({
                            'Error': 'Internal server error.'
                        });
                    } else {
                        if (application[0].active) {
                            if (application[0].production) {
                                const allowed_origins = application[0].allowed_origins;
                                if (allowed_origins.indexOf(origin) !== -1 || origin == config.host) {
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
                                                                getHeadHTML(long_url, (err, html) => {
                                                                    if (err) {
                                                                        res.status(500).json({
                                                                            'Error': 'We can not fetch the provided site, maybe the page need more authorizzation. Try the fast mode instead.',
                                                                        });
                                                                    } else {
                                                                        headHTML(html, (err, head_html) => {
                                                                            if (err) {
                                                                                res.status(500).json({
                                                                                    'Error': 'We can not analyze the provided site html, maybe the page need more authorizzation. Try the fast mode instead.',
                                                                                });
                                                                            } else {
                                                                                head_html = head_html != '' && head_html != null && head_html != undefined ? head_html : null;
                                                                                head_html = head_html.replace(/%domain_name%/ig, domain_name);
                                                                                head_html = head_html.replace(/%protocol%/ig, domain_protocol);
                                                                                new HtmlParser(head_html).getFavicon((err, favicon) => {
                                                                                    if (favicon != undefined && favicon != null) {
                                                                                        sanitizedFavicon = isUrl(favicon) || favicon.charAt(0) == '/' ? favicon : `/${favicon}`;
                                                                                        favicon = isUrl(sanitizedFavicon) ? sanitizedFavicon : `${domain_protocol}://${domain_name}${sanitizedFavicon}`;
                                                                                    }
                                                                                    db.Url({
                                                                                        long_url,
                                                                                        domain_name,
                                                                                        user_id,
                                                                                        application_id,
                                                                                        alias,
                                                                                        description,
                                                                                        password,
                                                                                        expiration_time,
                                                                                        timestamp,
                                                                                        head_html,
                                                                                        favicon,
                                                                                        device_select,
                                                                                        devicetag_url,
                                                                                        page_screenshot,
                                                                                        page_seotags,
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
                                                                                            // Get async pic of the page
                                                                                            if (page_screenshot) {
                                                                                                getPagePic({
                                                                                                    url: long_url,
                                                                                                    live_path: `${__dirname}/../public/img/thumbnails/${urls._id}.png`,
                                                                                                    temp_path: `${__dirname}/../public/img/temp/temp-${urls._id}.png`
                                                                                                });
                                                                                            }
                                                                                            // Register the application event async
                                                                                            db.ApplicationEvent({
                                                                                                user_id: user_id,
                                                                                                application_id: application_id,
                                                                                                param: {
                                                                                                    url_id: urls._id,
                                                                                                },
                                                                                                event_description: 'Create a new short link.',
                                                                                                event_method: 'POST',
                                                                                                event_request: `/${config.api.version}/shorten`,
                                                                                                event_response: '200 OK',
                                                                                                request_origin: origin
                                                                                            }).save((err, doc) => { });
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
                                                                                                                    user_id: user_id,
                                                                                                                    application_id: application_id,
                                                                                                                    long_url: long_url,
                                                                                                                    short_url: `${config.short_host}/${alias}`,
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
    
                                                                                                    }
                                                                                                }
                                                                                            });
    
                                                                                            // Send response
                                                                                            // Send webhook event async
                                                                                            // Registering events async
                                                                                            res.status(200).json({
                                                                                                'Status': 'success',
                                                                                                'url': {
                                                                                                    'id': urls._id,
                                                                                                    'short_url': `${config.short_host}/${alias}`,
                                                                                                    'alias': urls.alias,
                                                                                                }
                                                                                            });
                                                                                        }
                                                                                    });
                                                                                });
                                                                            }
                                                                        });
                                                                    }
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
                                        'Error': 'The current request origin is not allowed.'
                                    });
                                }
                            } else {
                                res.status(500).json({
                                    'Error': `The application with id(${application_id}) is currently in testing mode. You can't use production endpoint's on testing mode. Go to your dashboard and set the app on live mode before using live API endpoint.`
                                });
                            }
                        } else {
                            res.status(500).json({
                                'Error': `The application with id(${application_id}) is currently disabled. Go to your dashboard and activate this app before using API.`
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

router.post(['/shorten/direct', `/${config.api.version}/shorten/direct`], (req, res) => {
    // Webhook data
    // Create a link: Webhook event -> link_created

    // Auth data
    // Header -> Token: session.token
    // Header -> Secretkey: application-secret-key-value
    const secretkey = req.headers.secretkey != '' && req.headers.secretkey != null && req.headers.secretkey != undefined ? req.headers.secretkey : false;
    const token = req.headers.token != '' && req.headers.token != null && req.headers.token != undefined ? req.headers.token : false;
    // Get the host origin for the authorization
    const host = req.hostname != '' && req.hostname != null && req.hostname != undefined ? req.hostname : false;
    const protocol = req.protocol != '' && req.protocol != null && req.protocol != undefined ? req.protocol : false;
    const origin = `${protocol}://${host}`;

    jwt.verify(token, secretkey, (err, authData) => {
        if (err) {
            res.status(403).json({
                'Error': 'Authorization required.'
            });
        } else {
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
            const page_screenshot = false;
            const page_seotags = false;

            // Here the user logged in features
            const user_data = req.isAuthenticated() ? req.session.user : null;
            const user_permissions = user_data != null && user_data != undefined ? user_data.subscription : 'BASIC';
            const device_select = req.body.device_select != '' && req.body.device_select != null && req.body.device_select != undefined && Array.isArray(req.body.device_select) ? req.body.device_select : [];
            const devicetag_url = req.body.devicetag_url != '' && req.body.devicetag_url != null && req.body.devicetag_url != undefined ? req.body.devicetag_url : null;
            const geo_select = req.body.geo_select != '' && req.body.geo_select != null && req.body.geo_select != undefined && Array.isArray(req.body.geo_select) ? req.body.geo_select : [];
            const geotag_url = req.body.geotag_url != '' && req.body.devicetag_url != null && req.body.devicetag_url != undefined ? req.body.geotag_url : null;

            // Now the premium featurs
            const seo_title = user_permissions != 'BASIC' && req.body.seo_title != '' && req.body.seo_title != null && req.body.seo_title != undefined ? req.body.seo_title : null;
            const seo_description = user_permissions != 'BASIC' && req.body.seo_description != '' && req.body.seo_description != null && req.body.seo_description != undefined ? req.body.seo_description : null;

            // The url limiter if isset user session
            const plan = req.isAuthenticated() ? req.session.user.subscription : null;
            const application_id = authData.user.app != '' && authData.user.app != null && authData.user.app != undefined ? authData.user.app : false;

            if (user_id && long_url && application_id) {

                db.Url({
                    long_url,
                    domain_name,
                    application_id,
                    user_id,
                    alias,
                    description,
                    password,
                    expiration_time,
                    timestamp,
                    device_select,
                    devicetag_url,
                    page_screenshot,
                    page_seotags,
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
                        db.ApplicationEvent({
                            user_id: user_id,
                            application_id: application_id,
                            param: {
                                url_id: urls._id,
                            },
                            event_description: 'Create a new short link.',
                            event_method: 'POST',
                            event_request: `/${config.api.version}/shorten/direct`,
                            event_response: '200 OK',
                            request_origin: origin
                        }).save((err, doc) => {});
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
                                                user_id: user_id,
                                                application_id: application_id,
                                                long_url: long_url,
                                                short_url: `${config.short_host}/${alias}`,
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

                                }
                            }
                        });

                        // Send response
                        // Send webhook event async
                        // Registering events async
                        res.status(200).json({
                            'Status': 'success',
                            'url': {
                                'id': urls._id,
                                'short_url': `${config.short_host}/${alias}`,
                                'alias': urls.alias,
                            }
                        });
                    }
                });
            } else {
                res.status(500).json({
                    'Error': 'Missig required data.'
                });
            }
        }
    });
});

router.delete(['/shorten', `/${config.api.version}/shorten`], (req, res) => {
    // Webhook data
    // Delete a link: Webhook event -> link_deleted

    // Auth data
    // Header -> Token: session.token
    // Header -> Secretkey: application-secret-key-value
    // Body   -> url_id = the url id of the link
    const secretkey = req.headers.secretkey != '' && req.headers.secretkey != null && req.headers.secretkey != undefined ? req.headers.secretkey : false;
    const token = req.headers.token != '' && req.headers.token != null && req.headers.token != undefined ? req.headers.token : false;
    // Get the host origin for the authorization
    const host = req.hostname != '' && req.hostname != null && req.hostname != undefined ? req.hostname : false;
    const protocol = req.protocol != '' && req.protocol != null && req.protocol != undefined ? req.protocol : false;
    const origin = `${protocol}://${host}`;

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
                // Find the application and perform security checks
                db.Application.find({
                    _id: application_id,
                    user_id: user_id,
                }, (err, application) => {
                    if (err) {
                        res.status(500).json({
                            'Error': 'Internal server error.'
                        });
                    } else {
                        if (application[0].active) {
                            if (application[0].production) {
                                const allowed_origins = application[0].allowed_origins;
                                if (allowed_origins.indexOf(origin) !== -1 || origin == config.host) {
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
                                                // Delete file async
                                                fs.unlink(`${__dirname}/../public/img/thumbnails/${url_id}.png`, err => {});
                                                // Register the application event async
                                                db.ApplicationEvent({
                                                    user_id: user._id,
                                                    application_id: application_id,
                                                    param: {
                                                        url_id: url_id,
                                                    },
                                                    event_description: 'Delete a short link.',
                                                    event_method: 'DELETE',
                                                    event_request: `/${config.api.version}/shorten`,
                                                    event_response: '200 OK',
                                                    request_origin: origin
                                                }).save((err, doc) => {});
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
                                                                        user_id: user_id,
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

                                                        }
                                                    }
                                                });

                                                // Send response
                                                // Send webhook event async
                                                // Registering events async
                                                res.status(200).json({
                                                    'Status': 'success',
                                                    'Message': `Url id: ${url_id} deleted.`
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
                                        'Error': 'The current request origin is not allowed.'
                                    });
                                }
                            } else {
                                res.status(500).json({
                                    'Error': `The application with id(${application_id}) is currently in testing mode. You can't use production endpoint's on testing mode. Go to your dashboard and set the app on live mode before using live API endpoint.`
                                });
                            }
                        } else {
                            res.status(500).json({
                                'Error': `The application with id(${application_id}) is currently disabled. Go to your dashboard and activate this app before using API.`
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

router.put(['/shorten', `/${config.api.version}/shorten`], (req, res) => {
    // Webhook data
    // Update a link: Webhook event -> link_updated

    // Auth data
    // Header -> Token: session.token
    // Header -> Secretkey: application-secret-key-value
    // Body   -> url_id = the url id of the link
    const secretkey = req.headers.secretkey != '' && req.headers.secretkey != null && req.headers.secretkey != undefined ? req.headers.secretkey : false;
    const token = req.headers.token != '' && req.headers.token != null && req.headers.token != undefined ? req.headers.token : false;
    // Get the host origin for the authorization
    const host = req.hostname != '' && req.hostname != null && req.hostname != undefined ? req.hostname : false;
    const protocol = req.protocol != '' && req.protocol != null && req.protocol != undefined ? req.protocol : false;
    const origin = `${protocol}://${host}`;

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

            // The updates field permitted
            const properties = req.body.properties != null && req.body.properties != undefined && typeof req.body.properties === "object" ? req.body.properties : false;
            const rules = req.body.rules != null && req.body.rules != undefined && typeof req.body.rules === "object" ? req.body.rules : false;
            const seo = req.body.seo != null && req.body.seo != undefined && typeof req.body.seo === "object" ? req.body.seo : false;

            if (properties || rules || seo) {
                const description = properties.description != null && properties.description != undefined ? properties.description : null;
                const password = properties.password != null && properties.password != undefined ? properties.password : null;
                const expiration_time = properties.expires != null && properties.expires != undefined ? properties.expires : null;
                const page_screenshot = properties.page_screenshot != '' && properties.page_screenshot != null && properties.page_screenshot != undefined && typeof properties.page_screenshot === "boolean" ? properties.page_screenshot : null;

                const geo_select = rules.geo_tag != null && rules.geo_tag != undefined && Array.isArray(rules.geo_tag) ? rules.geo_tag : null;
                const geotag_url = rules.geo_tag_url != null && rules.geo_tag_url != undefined ? rules.geo_tag_url : null;
                const device_select = rules.device_tag != null && rules.device_tag != undefined && Array.isArray(rules.device_tag) ? rules.device_tag : null;
                const devicetag_url = rules.device_tag_url != null && rules.device_tag_url != undefined ? rules.device_tag_url : null;

                const seo_title = seo.seo_title != null && seo.seo_title != undefined ? seo.seo_title : null;
                const seo_description = seo.seo_description != null && seo.seo_description != undefined ? seo.seo_description : null;
                const page_seotags = seo.page_seotags != '' && seo.page_seotags != null && seo.page_seotags != undefined && typeof seo.page_seotags === "boolean" ? seo.page_seotags : null;

                const payload = {};
                if (description != null) payload.description = description;
                if (password != null) payload.password = bcrypt.hashSync(password);
                if (expiration_time != null) payload.expiration_time = expiration_time;
                if (geo_select != null) payload.geo_select = geo_select;
                if (geotag_url != null) payload.geotag_url = geotag_url;
                if (device_select != null) payload.device_select = device_select;
                if (devicetag_url != null) payload.devicetag_url = devicetag_url;
                if (seo_title != null) payload.seo_title = seo_title;
                if (seo_description != null) payload.seo_description = seo_description;
                if (page_screenshot != null) payload.page_screenshot = page_screenshot;
                if (page_seotags != null) payload.page_seotags = page_seotags;

                if (url_id && payload) {
                    // Find the application and perform security checks
                    db.Application.find({
                        _id: application_id,
                        user_id: user_id,
                    }, (err, application) => {
                        if (err) {
                            res.status(500).json({
                                'Error': 'Internal server error.'
                            });
                        } else {
                            if (application[0].active) {
                                if (application[0].production) {
                                    const allowed_origins = application[0].allowed_origins;
                                    if (allowed_origins.indexOf(origin) !== -1 || origin == config.host) {
                                        db.Url.updateOne({
                                            _id: url_id,
                                            user_id: user_id
                                        }, payload, (err, confirm) => {
                                            if (err) {
                                                res.status(500).json({
                                                    'Error': 'Internal server error.'
                                                });
                                            } else {
                                                if (confirm.n > 0) {
                                                    // Register the application event async
                                                    db.ApplicationEvent({
                                                        user_id: user._id,
                                                        application_id: application_id,
                                                        param: {
                                                            url_id: url_id,
                                                        },
                                                        event_description: 'Update a new short link.',
                                                        event_method: 'PUT',
                                                        event_request: `/${config.api.version}/shorten`,
                                                        event_response: '200 OK',
                                                        request_origin: origin
                                                    }).save((err, doc) => {});
                                                    // Link updated so find webhooks events if isset
                                                    db.Webhook.find({
                                                        application_id: application_id,
                                                        user_id: user_id
                                                    }, (err, webhook) => {
                                                        if (webhook.length > 0) {
                                                            // Isset webhook so check if the event is registered
                                                            const events = webhook[0].events;
                                                            if (events.indexOf('link_updated') !== -1) {
                                                                // Send webhook async mode
                                                                const uri = webhook[0].endpoint;
                                                                rp({
                                                                    method: 'POST',
                                                                    uri: uri,
                                                                    body: {
                                                                        data: {
                                                                            url_id: url_id,
                                                                            user_id: user_id,
                                                                            application_id: application_id,
                                                                            api_version: config.api.version,
                                                                            event: 'link_updated',
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
                                                                        request_method: 'PUT',
                                                                        api_version: config.api.version,
                                                                        event_type: 'link_updated',
                                                                        creation_time: Math.round(Date.now() / 1000)
                                                                    }).save(err => {
                                                                        if (err) console.log(err);
                                                                    });
                                                                }).catch((err) => {
                                                                    // POST failed...
                                                                    console.log('Failed webhook request')
                                                                    console.log(err);
                                                                });

                                                            }
                                                        }
                                                    });

                                                    // Send response
                                                    // Send webhook event async
                                                    // Registering events async
                                                    res.status(200).json({
                                                        'Status': 'success',
                                                        'Message': `Url id: ${url_id} updated.`
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
                                            'Error': 'The current request origin is not allowed.'
                                        });
                                    }
                                } else {
                                    res.status(500).json({
                                        'Error': `The application with id(${application_id}) is currently in testing mode. You can't use production endpoint's on testing mode. Go to your dashboard and set the app on live mode before using live API endpoint.`
                                    });
                                }
                            } else {
                                res.status(500).json({
                                    'Error': `The application with id(${application_id}) is currently disabled. Go to your dashboard and activate this app before using API.`
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
                    'Error': 'Bad request.'
                });
            }
        }
        // res.status(200).json(authData);
    });
});

router.get(['/link', `/${config.api.version}/link`], (req, res) => {
    // Webhook data
    // Get a link obj: Webhook event -> link_retrieve

    // Auth data
    // Header -> Token: session.token
    // Header -> Secretkey: application-secret-key-value
    // Query  -> ?id=the-url-id-of-the-link
    const secretkey = req.headers.secretkey != '' && req.headers.secretkey != null && req.headers.secretkey != undefined ? req.headers.secretkey : false;
    const token = req.headers.token != '' && req.headers.token != null && req.headers.token != undefined ? req.headers.token : false;
    // Get the host origin for the authorization
    const host = req.hostname != '' && req.hostname != null && req.hostname != undefined ? req.hostname : false;
    const protocol = req.protocol != '' && req.protocol != null && req.protocol != undefined ? req.protocol : false;
    const origin = `${protocol}://${host}`;

    jwt.verify(token, secretkey, (err, authData) => {
        if (err) {
            res.status(403).json({
                'Error': 'Authorization required.'
            });
        } else {
            const url_id = req.query.id != '' & req.query.id != null && req.query.id != undefined ? req.query.id : false; // Required
            const user_id = authData.user.user != undefined && authData.user.user != null ? authData.user.user : null;
            const application_id = authData.user.app;

            if (url_id && user_id && application_id) {
                // Find the application and perform security checks
                db.Application.find({
                    _id: application_id,
                    user_id: user_id,
                }, (err, application) => {
                    if (err) {
                        res.status(500).json({
                            'Error': 'Internal server error.'
                        });
                    } else {
                        if (application[0].active) {
                            if (application[0].production) {
                                const allowed_origins = application[0].allowed_origins;
                                if (allowed_origins.indexOf(origin) !== -1 || origin == config.host) {
                                    db.Url.find({
                                        _id: url_id,
                                        user_id: user_id,
                                        application_id: application_id
                                    }, (err, urls) => {
                                        let url = {
                                            id: urls[0]._id,
                                            user_id: urls[0].user_id,
                                            application_id: urls[0].application_id,
                                            long_url: urls[0].long_url,
                                            domain_name: urls[0].domain_name,
                                            short_url: `${config.short_host}/${urls[0].alias}`,
                                            alias: urls[0].alias,
                                            favicon: urls[0].favicon,
                                            properties: {
                                                description: urls[0].description,
                                                password: urls[0].password != null,
                                                expires: urls[0].expiration_time,
                                            },
                                            rules: {
                                                geo_tag: urls[0].geo_select,
                                                geo_tag_url: urls[0].geotag_url,
                                                device_tag: urls[0].device_select,
                                                device_tag_url: urls[0].devicetag_url
                                            },
                                            seo: {
                                                seo_title: urls[0].seo_title,
                                                seo_description: urls[0].seo_description
                                            },
                                            created: urls[0].timestamp
                                        };

                                        if (err) {
                                            res.status(500).json({
                                                'Error': 'Internal server error.'
                                            });
                                        } else {
                                            // Register the application event async
                                            db.ApplicationEvent({
                                                user_id: user._id,
                                                application_id: application_id,
                                                param: {
                                                    url_id: url_id,
                                                },
                                                event_description: 'Retrieve a short link obj.',
                                                event_method: 'GET',
                                                event_request: `/${config.api.version}/link`,
                                                event_response: '200 OK',
                                                request_origin: origin
                                            }).save((err, doc) => {});
                                            // Link retrieved so find webhooks events if isset
                                            db.Webhook.find({
                                                application_id: application_id,
                                                user_id: user_id
                                            }, (err, webhook) => {
                                                if (webhook.length > 0) {
                                                    // Isset webhook so check if the event is registered
                                                    const events = webhook[0].events;
                                                    if (events.indexOf('link_retrieve') !== -1) {
                                                        // Send webhook async mode
                                                        const uri = webhook[0].endpoint;
                                                        rp({
                                                            method: 'POST',
                                                            uri: uri,
                                                            body: {
                                                                data: {
                                                                    url_id: url_id,
                                                                    user_id: user_id,
                                                                    application_id: application_id,
                                                                    api_version: config.api.version,
                                                                    event: 'link_retrieve',
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
                                                                endpoint: `/${config.api.version}/link`,
                                                                request_response: '200 OK',
                                                                request_method: 'GET',
                                                                api_version: config.api.version,
                                                                event_type: 'link_retrieve',
                                                                creation_time: Math.round(Date.now() / 1000)
                                                            }).save(err => {
                                                                if (err) console.log(err);
                                                            });
                                                        }).catch((err) => {
                                                            // POST failed...
                                                            console.log('Failed webhook request')
                                                            console.log(err);
                                                        });

                                                    }
                                                }
                                            });

                                            // Send response
                                            // Send webhook event async
                                            // Registering events async
                                            res.status(200).json({
                                                'url': url
                                            });
                                        }
                                    });
                                } else {
                                    res.status(403).json({
                                        'Error': 'The current request origin is not allowed.'
                                    });
                                }
                            } else {
                                res.status(500).json({
                                    'Error': `The application with id(${application_id}) is currently in testing mode. You can't use production endpoint's on testing mode. Go to your dashboard and set the app on live mode before using live API endpoint.`
                                });
                            }
                        } else {
                            res.status(500).json({
                                'Error': `The application with id(${application_id}) is currently disabled. Go to your dashboard and activate this app before using API.`
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
    });
});

router.get(['/link/all', `/${config.api.version}/link/all`], (req, res) => {
    // Webhook data
    // Get list of all links obj: Webhook event -> link_list

    // Auth data
    // Header -> Token: session.token
    // Header -> Secretkey: application-secret-key-value
    const secretkey = req.headers.secretkey != '' && req.headers.secretkey != null && req.headers.secretkey != undefined ? req.headers.secretkey : false;
    const token = req.headers.token != '' && req.headers.token != null && req.headers.token != undefined ? req.headers.token : false;
    // Get the host origin for the authorization
    const host = req.hostname != '' && req.hostname != null && req.hostname != undefined ? req.hostname : false;
    const protocol = req.protocol != '' && req.protocol != null && req.protocol != undefined ? req.protocol : false;
    const origin = `${protocol}://${host}`;

    jwt.verify(token, secretkey, (err, authData) => {
        if (err) {
            res.status(403).json({
                'Error': 'Authorization required.'
            });
        } else {
            const user_id = authData.user.user != undefined && authData.user.user != null ? authData.user.user : null;
            const application_id = authData.user.app;

            if (user_id && application_id) {
                // Find the application and perform security checks
                db.Application.find({
                    _id: application_id,
                    user_id: user_id,
                }, (err, application) => {
                    if (err) {
                        res.status(500).json({
                            'Error': 'Internal server error.'
                        });
                    } else {
                        if (application[0].active) {
                            if (application[0].production) {
                                const allowed_origins = application[0].allowed_origins;
                                if (allowed_origins.indexOf(origin) !== -1 || origin == config.host) {
                                    db.Url.find({
                                        user_id: user_id,
                                        application_id: application_id
                                    }, (err, urls) => {
                                        let url = [];
                                        urls.forEach(item => {
                                            url.push({
                                                id: item._id,
                                                user_id: item.user_id,
                                                application_id: item.application_id,
                                                long_url: item.long_url,
                                                domain_name: item.domain_name,
                                                short_url: `${config.short_host}/${item.alias}`,
                                                alias: item.alias,
                                                favicon: item.favicon,
                                                properties: {
                                                    description: item.description,
                                                    password: item.password != null,
                                                    expires: item.expiration_time,
                                                },
                                                rules: {
                                                    geo_tag: item.geo_select,
                                                    geo_tag_url: item.geotag_url,
                                                    device_tag: item.device_select,
                                                    device_tag_url: item.devicetag_url
                                                },
                                                seo: {
                                                    seo_title: item.seo_title,
                                                    seo_description: item.seo_description
                                                },
                                                created: item.timestamp
                                            });
                                        });

                                        if (err) {
                                            res.status(500).json({
                                                'Error': 'Internal server error.'
                                            });
                                        } else {
                                            // Register the application event async
                                            db.ApplicationEvent({
                                                user_id: user_id,
                                                application_id: application_id,
                                                event_description: 'Retrieve all short links objs.',
                                                event_method: 'GET',
                                                event_request: `/${config.api.version}/link/all`,
                                                event_response: '200 OK',
                                                request_origin: origin
                                            }).save((err, doc) => {});
                                            // Link retrieved so find webhooks events if isset
                                            db.Webhook.find({
                                                application_id: application_id,
                                                user_id: user_id
                                            }, (err, webhook) => {
                                                if (webhook.length > 0) {
                                                    // Isset webhook so check if the event is registered
                                                    const events = webhook[0].events;
                                                    if (events.indexOf('link_list') !== -1) {
                                                        // Send webhook async mode
                                                        const uri = webhook[0].endpoint;
                                                        rp({
                                                            method: 'POST',
                                                            uri: uri,
                                                            body: {
                                                                data: {
                                                                    user_id: user_id,
                                                                    application_id: application_id,
                                                                    api_version: config.api.version,
                                                                    event: 'link_list',
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
                                                                endpoint: `/${config.api.version}/link/all`,
                                                                request_response: '200 OK',
                                                                request_method: 'GET',
                                                                api_version: config.api.version,
                                                                event_type: 'link_list',
                                                                creation_time: Math.round(Date.now() / 1000)
                                                            }).save(err => {
                                                                if (err) console.log(err);
                                                            });
                                                        }).catch((err) => {
                                                            // POST failed...
                                                            console.log('Failed webhook request')
                                                            console.log(err);
                                                        });

                                                    }
                                                }
                                            });

                                            // Send response
                                            // Send webhook event async
                                            // Registering events async
                                            res.status(200).json({
                                                'urls': url
                                            });
                                        }
                                    });
                                } else {
                                    res.status(403).json({
                                        'Error': 'The current request origin is not allowed.'
                                    });
                                }
                            } else {
                                res.status(500).json({
                                    'Error': `The application with id(${application_id}) is currently in testing mode. You can't use production endpoint's on testing mode. Go to your dashboard and set the app on live mode before using live API endpoint.`
                                });
                            }
                        } else {
                            res.status(500).json({
                                'Error': `The application with id(${application_id}) is currently disabled. Go to your dashboard and activate this app before using API.`
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
    });
});

router.get(['/link/paginate', `/${config.api.version}/link/paginate`], (req, res) => {
    // Webhook data
    // Get list of all links obj: Webhook event -> link_list

    // Auth data
    // Header -> Token: session.token
    // Header -> Secretkey: application-secret-key-value
    const secretkey = req.headers.secretkey != '' && req.headers.secretkey != null && req.headers.secretkey != undefined ? req.headers.secretkey : false;
    const token = req.headers.token != '' && req.headers.token != null && req.headers.token != undefined ? req.headers.token : false;
    // Get the host origin for the authorization
    const host = req.hostname != '' && req.hostname != null && req.hostname != undefined ? req.hostname : false;
    const protocol = req.protocol != '' && req.protocol != null && req.protocol != undefined ? req.protocol : false;
    const origin = `${protocol}://${host}`;

    jwt.verify(token, secretkey, (err, authData) => {
        if (err) {
            res.status(403).json({
                'Error': 'Authorization required.'
            });
        } else {
            const page = req.body.page != '' && req.body.page != null && req.body.page != undefined ? req.body.page : 1;
            const user_id = authData.user.user != undefined && authData.user.user != null ? authData.user.user : null;
            const application_id = authData.user.app;

            if (user_id && application_id) {
                // Find the application and perform security checks
                db.Application.find({
                    _id: application_id,
                    user_id: user_id,
                }, (err, application) => {
                    if (err) {
                        res.status(500).json({
                            'Error': 'Internal server error.'
                        });
                    } else {
                        if (application[0].active) {
                            if (application[0].production) {
                                const allowed_origins = application[0].allowed_origins;
                                if (allowed_origins.indexOf(origin) !== -1 || origin == config.host) {
                                    db.Url.paginate({
                                        user_id: user_id,
                                        application_id: application_id
                                    }, {
                                        page: page,
                                        limit: limit,
                                        sort: {
                                            creation_time: 'desc'
                                        }
                                    }, (err, urls) => {
                                        let url = [];
                                        urls.docs.forEach(item => {
                                            url.push({
                                                id: item._id,
                                                user_id: item.user_id,
                                                application_id: item.application_id,
                                                long_url: item.long_url,
                                                domain_name: item.domain_name,
                                                short_url: `${config.short_host}/${item.alias}`,
                                                alias: item.alias,
                                                favicon: item.favicon,
                                                properties: {
                                                    description: item.description,
                                                    password: item.password != null,
                                                    expires: item.expiration_time,
                                                },
                                                rules: {
                                                    geo_tag: item.geo_select,
                                                    geo_tag_url: item.geotag_url,
                                                    device_tag: item.device_select,
                                                    device_tag_url: item.devicetag_url
                                                },
                                                seo: {
                                                    seo_title: item.seo_title,
                                                    seo_description: item.seo_description
                                                },
                                                created: item.timestamp
                                            });
                                        });

                                        url.totalDocs = urls.totalDocs;
                                        url.limit = urls.limit;
                                        url.hasPrevPage = urls.hasPrevPage;
                                        url.hasNextPage = urls.hasNextPage;
                                        url.page = urls.page;
                                        url.totalPages = urls.totalPages;
                                        url.pagingCounter = urls.pagingCounter;
                                        url.prevPage = urls.prevPage;
                                        url.nextPage = urls.nextPage;

                                        if (err) {
                                            res.status(500).json({
                                                'Error': 'Internal server error.'
                                            });
                                        } else {
                                            // Register the application event async
                                            db.ApplicationEvent({
                                                user_id: user_id,
                                                application_id: application_id,
                                                event_description: 'Retrieve all short links objs.',
                                                event_method: 'GET',
                                                event_request: `/${config.api.version}/link/paginate`,
                                                event_response: '200 OK',
                                                request_origin: origin
                                            }).save((err, doc) => {});
                                            // Link retrieved so find webhooks events if isset
                                            db.Webhook.find({
                                                application_id: application_id,
                                                user_id: user_id
                                            }, (err, webhook) => {
                                                if (webhook.length > 0) {
                                                    // Isset webhook so check if the event is registered
                                                    const events = webhook[0].events;
                                                    if (events.indexOf('link_paginate') !== -1) {
                                                        // Send webhook async mode
                                                        const uri = webhook[0].endpoint;
                                                        rp({
                                                            method: 'POST',
                                                            uri: uri,
                                                            body: {
                                                                data: {
                                                                    user_id: user_id,
                                                                    application_id: application_id,
                                                                    api_version: config.api.version,
                                                                    event: 'link_paginate',
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
                                                                endpoint: `/${config.api.version}/link/paginate`,
                                                                request_response: '200 OK',
                                                                request_method: 'GET',
                                                                api_version: config.api.version,
                                                                event_type: 'link_paginate',
                                                                creation_time: Math.round(Date.now() / 1000)
                                                            }).save(err => {
                                                                if (err) console.log(err);
                                                            });
                                                        }).catch((err) => {
                                                            // POST failed...
                                                            console.log('Failed webhook request')
                                                            console.log(err);
                                                        });

                                                    }
                                                }
                                            });

                                            // Send response
                                            // Send webhook event async
                                            // Registering events async
                                            res.status(200).json({
                                                'urls': url
                                            });
                                        }
                                    });
                                } else {
                                    res.status(403).json({
                                        'Error': 'The current request origin is not allowed.'
                                    });
                                }
                            } else {
                                res.status(500).json({
                                    'Error': `The application with id(${application_id}) is currently in testing mode. You can't use production endpoint's on testing mode. Go to your dashboard and set the app on live mode before using live API endpoint.`
                                });
                            }
                        } else {
                            res.status(500).json({
                                'Error': `The application with id(${application_id}) is currently disabled. Go to your dashboard and activate this app before using API.`
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

async function getPagePic(param) {
    const url = param.url;
    const path = param.live_path; // './public/img/thumbnails/image.png';
    const temp_path = param.temp_path; // `./public/img/temp/temp-${Date.now()}.png`;
    const browser = await puppeteer.launch({
        'args': [
            '--disable-gpu', '--no-sandbox'
        ]
    });
    const page = await browser.newPage();
    await page.goto(url);
    await page.setViewport({
        width: 1480,
        height: 860
    });
    await page.screenshot({
        //encoding: 'base64'
        path: temp_path
    }).then(image => {
        sharp(temp_path).resize(640, 372).toFile(path, (err) => {
            fs.unlinkSync(temp_path);
        });
    }).catch(err => {
        console.log(err);
    });
    await browser.close();
}

async function getHeadHTML(url, done) {
    rp(url).then(function (html) {
        return done(null, html);
    }).catch(function (err) {
        return done(err);
    });
}

function headHTML(html, done) {
    const $ = cheerio.load(html);
    let data = {
        link: [],
        title: [],
        meta: []
    };
    data.title.push({
        text: $('title').text()
    });
    $('link').each(function (i, elem) {
        if (elem.attribs.rel != '' && elem.attribs.rel != undefined && elem.attribs.rel != null && elem.attribs.rel != 'stylesheet') {
            data.link.push({
                rel: elem.attribs.rel,
                href: elem.attribs.href != undefined ? (elem.attribs.href.charAt(0) == '/' ? `%protocol%://%domain_name%${elem.attribs.href.replace(/"/ig, "'")}` : elem.attribs.href.replace(/"/ig, "'")) : null
            });
        }
    })
    $('meta').each(function (i, elem) {
        //console.log(elem.attribs);
        data.meta.push({
            name: elem.attribs.name != undefined ? elem.attribs.name : null,
            charset: elem.attribs.charset != undefined ? elem.attribs.charset : null,
            property: elem.attribs.property != undefined ? elem.attribs.property : null,
            content: elem.attribs.content != undefined ? elem.attribs.content.replace(/"/ig, "'") : null
        });
    });
    //return done(data);
    let html_head = [];
    html_head.push(`<title>${data.title[0].text}</title>`);
    data.link.forEach(elem => {
        html_head.push(`<link rel="${elem.rel}" href="${elem.href}" />`);
    });
    data.meta.forEach(elem => {
        elem.charset != undefined && elem.charset != null ? html_head.push(`<meta charset="${elem.charset}" />`) : false;
        elem.name != undefined && elem.name != null ? html_head.push(`<meta name="${elem.name}" content="${elem.content}" />`) : false;
        elem.property != undefined && elem.property != null ? html_head.push(`<meta property="${elem.property}" content="${elem.content}" />`) : false;
    });
    html_head = html_head.join("");
    return done(null, html_head);
}

module.exports = router;