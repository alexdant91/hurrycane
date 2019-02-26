const Config = require('./config/config');
const config = new Config();
const https = require('https');
const fs = require('fs');
const ejs = require('ejs');
const db = require('./models/db');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const socketio = require('socket.io');
const PaymentSystem = require('./modules/payment-system/v1')(config.stripe.secretKey);
const app = express();

const isUrl = require('is-url');
const uuid = require('uuid/v4');
const session = require('express-session');
const passport = require('./models/sessions');
const bcrypt = require('bcrypt-nodejs');
const MongoStore = require('connect-mongo')(session);
const ScrapingPage = require('./modules/scraping/v1');
const HtmlParser = require('./models/html-parser');
const puppeteer = require('puppeteer');
const sharp = require('sharp');

// Security
const helmet = require('helmet');
const csp = require('helmet-csp');
const crypto = require('crypto');

// Server utility for performance
const minify = require('express-minify');
const compression = require('compression');
const minifyHTML = require('express-minify-html');

// Combine middleware class model
const CombineMiddleware = require('./models/combine-middleware');
const CM = new CombineMiddleware();

// Routers for api and dashboard
const api = require(`./api/${config.api.version}`);
const dashboard = require('./dashboard/dashboard');

// Protect functions with CORS
const cors = require('cors');
const osLocale = require('os-locale');

// Mongoose connection for session storage in Atlas
const mongoose = require('mongoose');
const url_connection = config.NODE_ENV === 'staging' ? 'mongodb://localhost:27017/url_shortner' : `mongodb+srv://${config.mongoDbAtlas.user.username}:${config.mongoDbAtlas.user.password}@clusterhurrycane-nebin.mongodb.net/url_shortner`;
mongoose.connect(url_connection, {
    useNewUrlParser: true
});

// Limit the request from the same ip address
// The limit is set and stored for all rout, the counter not start from 0 if it is used on more then one rout
const rateLimit = require("express-rate-limit");
const apiLimiter = rateLimit({
    windowMs: config.api.requestTimeLimitRange, // 60 minutes
    max: config.api.requestNumberLimit // process.env.REQUEST_NUMBER_LIMIT || 1000
});

app.use(function (req, res, next) {
    const env = process.env;
    const language = env.LANG || env.LANGUAGE || env.LC_ALL || env.LC_MESSAGES;
    res.locals.localLanguage = language;
    res.locals.host = config.host;
    next();
});

// Subdomain virtual host
// Set a subdomain for serving routers like api
// app.use((req, res, next) => {
//     const host = req.headers.host.split('.')[0];
//     const origin = req.headers.origin;
//     console.log(host, req.headers);
//     next()
// });
// const vhost = (hostname, app) => (req, res, next) => {
//     const host = req.headers.host.split('.')[0];
//     console.log('[DEBUG]: ' + host, hostname);
//     if (host === hostname) {
//         return app(req, res, next);
//     } else {
//         next();
//     }
// };
// app.use(vhost('api', api));
// End api subdomain

ejs.delimiter = '?';
app.use(bodyParser.urlencoded({
    extended: false
}))
app.use(bodyParser.json({
    type: ['json', 'application/csp-report']
}));
app.use(cookieParser());
app.use(function setUniqVisitor(req, res, next) {
    // check if client sent cookie
    let cookie = req.cookies.uniqueVisitor;
    if (cookie === undefined) {
        const expires = Math.round(new Date().setHours(23, 59, 59) / 1000);
        res.cookie('uniqueVisitor', uuid(), {
            maxAge: expires,
            httpOnly: true
        });
    } else {
        const expired = req.cookies.uniqueVisitor;
        if (Math.round(Date.now() / 1000) > expired) {
            // Expired
            const expires = Math.round(new Date().setHours(23, 59, 59) / 1000);
            res.clearCookie('uniqueVisitor');
            res.cookie('uniqueVisitor', uuid(), {
                maxAge: expires,
                httpOnly: true
            });
        }
    }
    next();
});
// Set the nonce CPS Security protection
// app.use((req, res, next) => {
//     res.locals.nonce = uuid().toString('base64');; //uuid();
//     next();
// });
app.use(helmet());
app.use(csp({
    directives: {
        defaultSrc: ["'self'", 'localhost', 'data:', '*.stripe.com', 'stripe.com', '*.fontawesome.com', 'fontawesome.com', '*.cloudflare.com', 'cloudflare.com', '*.googleapis.com', '*.jquery.com', '*.jsdelivr.net', '*.gstatic.com', '*.facebook.net', '*.facebook.com'], // (req, res) => `'nonce-${res.locals.nonce}'`],
        scriptSrc: ["'self'", "'unsafe-inline'", 'localhost', '*.stripe.com', 'stripe.com', '*.fontawesome.com', 'fontawesome.com', '*.cloudflare.com', 'cloudflare.com', '*.googleapis.com', '*.jquery.com', '*.jsdelivr.net', '*.gstatic.com', '*.facebook.net', '*.facebook.com'], // (req, res) => `'nonce-${res.locals.nonce}'`],
        styleSrc: ["'self'", "'unsafe-inline'", '*.stripe.com', 'stripe.com', '*.fontawesome.com', 'fontawesome.com', '*.cloudflare.com', 'cloudflare.com', '*.googleapis.com', '*.jquery.com', '*.jsdelivr.net', '*.gstatic.com', '*.facebook.net', '*.facebook.com'],
        frameSrc: ["'self'", '*.facebook.net', '*.stripe.com', 'stripe.com', '*.facebook.com', 'https://*.facebook.com/'],
        imgSrc: ['*', "'self'", 'data:'],
        //sandbox: ['allow-forms', 'allow-scripts'],
        //reportUri: '/report-violation',
        objectSrc: ["'none'"],
        upgradeInsecureRequests: true,
        workerSrc: false
    }
}));
app.use(session({
    genid: (req) => {
        return uuid() // use UUIDs for session IDs
    },
    // Store il localhost
    // store: new MongoStore({
    //     url: 'mongodb://localhost:27017/url_shortner'
    // }),
    // Store il MongoDB Atlas
    store: new MongoStore({
        mongooseConnection: mongoose.connection
    }),
    secret: process.env.SESSION_SECRET || config.sessionSecretKey, // SESSION_SECRET=sessionsecretkey npm start
    resave: false,
    saveUninitialized: true
}));
app.use(minifyHTML({
    override: true,
    exception_url: false,
    htmlMinifier: {
        removeComments: true,
        collapseWhitespace: true,
        collapseBooleanAttributes: true,
        removeAttributeQuotes: true,
        removeEmptyAttributes: true,
        minifyJS: true
    }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(compression());
app.use(minify());
app.use(express.static(__dirname + '/public'));
app.set('views', __dirname + '/view');
app.set('view engine', 'ejs');

// Mailer configuration
const Mailer = require('./models/mailer');
const mailer = new Mailer({
    host: "mail.eatita.it",
    port: 465,
    secure: true,
    auth: {
        user: "info@eatita.it",
        pass: "D&dgroupsrls18"
    }
});

// const io = socketio(expressServer, {
//     transports: ['websocket'],
//     pingTimeout: 60000
// });

app.post('/report-violation', (req, res) => {
    if (req.body) {
        console.log('CSP Violation: ', req.body)
    } else {
        console.log('CSP Violation: No data received!')
    }

    res.status(204).end()
});

// The live API logic
app.use(`/api/${config.api.version}`, api);
// The test API logic
app.use(`/test/api/${config.api.version}`, api);

// The dashboard logic
app.use('/dashboard', verifySession, dashboard);

// The test webhook endpoint callback
app.post('/test/wh', (req, res) => {
    console.log(req.body);
    res.sendStatus(200);
});

// The public logic
app.get('/', (req, res) => {
    res.render('index', {
        session: req.isAuthenticated(),
        user: req.session.user,
        page: 'index',
        messages: {
            type: null,
            title: null,
            text: null
        }
    });
});

// io.on('connection', (socket) => {
//     // Socket staff
// });

// create the login get and post routes
app.get('/login', verifySessionInverse, (req, res) => {
    res.render('login', {
        session: req.isAuthenticated(),
        user: req.session.user,
        page: 'login',
        messages: {
            type: null,
            title: null,
            text: null
        },
        query: {
            ref: req.query.ref != '' && req.query.ref != undefined && req.query.ref != null ? req.query.ref : undefined
        }
    });
});

app.post('/login', (req, res, next) => {
    const ref = req.body.ref != '' && req.body.ref != null && req.body.ref != undefined ? req.body.ref : undefined;
    passport.authenticate('local', (err, user, info) => {
        if (info) {
            return res.send(info.message)
        }
        if (err) {
            return next(err);
        }
        if (!user) {
            return res.json({
                'Error': 'Required field missing.'
            });
        }
        req.login(user, (err) => {
            if (err) return next(err);
            req.session.user = user;
            return res.json({
                'Status': 'done',
                'ref': ref
            });
        })
    })(req, res, next);
});

// create the register get and post routes
app.get('/register', verifySessionInverse, (req, res) => {
    res.render('register', {
        session: req.isAuthenticated(),
        user: req.session.user,
        page: 'register',
        messages: {
            type: null,
            title: null,
            text: null
        },
        query: {
            ref: req.query.ref != '' && req.query.ref != undefined && req.query.ref != null ? req.query.ref : undefined
        }
    });
});

app.post('/auth/facebook', (req, res) => {
    const facebook_id = req.body.facebook_id != '' && req.body.facebook_id != null && req.body.facebook_id != undefined ? req.body.facebook_id : null;
    const name = req.body.name != '' && req.body.name != undefined ? req.body.name : false;
    const last_name = req.body.last_name != '' && req.body.last_name != undefined ? req.body.last_name : null;
    const email = req.body.email != '' && req.body.email != undefined ? req.body.email : false;
    const password = req.body.password != '' && req.body.password != undefined ? bcrypt.hashSync(req.body.password) : uuid().replace(/-/i, "").substring(0, 9);
    const subscription = req.body.subscription != '' && req.body.subscription != null && req.body.subscription != undefined ? req.body.subscription : 'BASIC';
    const avatar = req.body.avatar != '' && req.body.avatar != null && req.body.avatar != undefined ? req.body.avatar : null;
    const ref = req.body.ref != '' && req.body.ref != null && req.body.ref != undefined ? req.body.ref : undefined;
    const secretKey = uuid();
    db.User.countDocuments({
        email: email
    }, (err, count) => {
        if (count > 0) {
            // User exist
            db.User.updateOne({
                email: email
            }, {
                facebook_id: facebook_id
            }, err => {
                if (err) {
                    res.json({
                        'Error': 'Error during data updating.'
                    });
                }
                db.User.find({
                    email: email
                }, (err, user) => {
                    req.login(user[0], (err) => {
                        if (err) res.json({
                            'Error': 'Error during user login.'
                        });;
                        req.session.user = user[0];
                        return res.json({
                            'Status': 'done',
                            'ref': ref
                        });
                    })
                });
            });
        } else {
            // New user so register him
            if (name && email && password && secretKey) {
                db.User({
                    name: name,
                    last_name: last_name,
                    facebook_id: facebook_id,
                    email: email,
                    password: password,
                    secret_key: secretKey,
                    subscription: subscription,
                    avatar: avatar
                }).save(err => {
                    if (err) res.json({
                        'Error': 'Error during data saving.'
                    });
                    // Create the customer for Stripe payment system
                    // new PaymentSystem(config.stripe.secretKey).createCustomer({
                    PaymentSystem.createCustomer({
                        email: email
                    }, (err, customer) => {
                        if (err) {
                            res.json({
                                'Error': 'Error during customer creation.'
                            });
                        } else {
                            // Update the customer id in user schema
                            db.User.updateOne({
                                email: email
                            }, {
                                customer_id: customer.id
                            }, err => {
                                if (err) {
                                    res.json({
                                        'Error': 'Error during data updating.'
                                    });
                                } else {
                                    // Async Send confirmation email
                                    mailer.set({
                                        from: 'info@eatita.it',
                                        to: email,
                                        subject: 'Welcome Alessandro!',
                                        text: 'Hi Alessandro, welcome to hurrycane.io',
                                        html: `<p>Hi ${name}, welcome to hurrycane.io</p>`,
                                    }).send((err, info) => {
                                        console.log(err);
                                    });
                                    // END Async Send confirmation email
                                    db.User.find({
                                        email: email
                                    }, (err, user) => {
                                        req.login(user[0], (err) => {
                                            if (err) res.json({
                                                'Error': 'Error during user login.'
                                            });;
                                            req.session.user = user[0];
                                            return res.json({
                                                'Status': 'done',
                                                'ref': ref
                                            });
                                        })
                                    });
                                }

                            });
                        }
                    });
                });
            } else {
                res.json({
                    'Error': 'Missing required fields.'
                });
            }
        }
    });
});

app.post('/register', (req, res) => {
    const name = req.body.name != '' && req.body.name != undefined ? req.body.name : false;
    const email = req.body.email != '' && req.body.email != undefined ? req.body.email : false;
    const password = req.body.password != '' && req.body.password != undefined ? bcrypt.hashSync(req.body.password) : false;
    const subscription = req.body.subscription != '' && req.body.subscription != null && req.body.subscription != undefined ? req.body.subscription : 'BASIC';
    const avatar = req.body.avatar != '' && req.body.avatar != null && req.body.avatar != undefined ? req.body.avatar : null;
    const ref = req.body.ref != '' && req.body.ref != null && req.body.ref != undefined ? req.body.ref : undefined;
    const secretKey = uuid();
    if (name && email && password && secretKey) {
        db.User.find({
            email: email
        }, (err, docs) => {
            if (err) {
                res.json({
                    'Error': 'Error during data saving.'
                });
            } else {
                if (docs.length == 0) {
                    db.User({
                        name: name,
                        email: email,
                        password: password,
                        secret_key: secretKey,
                        subscription: subscription,
                        avatar: avatar
                    }).save(err => {
                        if (err) res.json({
                            'Error': 'Error during data saving.'
                        });
                        // Create the customer for Stripe payment system
                        // new PaymentSystem(config.stripe.secretKey).createCustomer({
                        PaymentSystem.createCustomer({
                            email: email
                        }, (err, customer) => {
                            if (err) {
                                res.json({
                                    'Error': 'Error during data saving.'
                                });
                            } else {
                                // Update the customer id in user schema
                                db.User.updateOne({
                                    email: email
                                }, {
                                    customer_id: customer.id
                                }, err => {
                                    if (err) {
                                        res.json({
                                            'Error': 'Error during data saving.'
                                        });
                                    } else {
                                        // Async Send confirmation email
                                        mailer.set({
                                            from: 'info@eatita.it',
                                            to: email,
                                            subject: 'Welcome Alessandro!',
                                            text: 'Hi Alessandro, welcome to hurrycane.io',
                                            html: `<p>Hi ${name}, welcome to hurrycane.io</p>`,
                                        }).send((err, info) => {
                                            console.log(err);
                                        });
                                        // END Async Send confirmation email
                                        res.json({
                                            'Status': 'done',
                                            'ref': ref
                                        });
                                    }

                                });
                            }
                        });
                    });
                } else {
                    res.json({
                        'Error': 'User already registered.'
                    });
                }
            }
        });
    } else {
        res.json({
            'Error': 'Missing required fields.'
        });
    }
});

// Shorten logic for the index form
app.post('/shorten', (req, res) => {
    // Here the basic features
    const long_url = req.body.long_url != '' && req.body.long_url != undefined ? req.body.long_url : false; // Required
    const alias = req.body.alias != '' && req.body.alias != undefined && req.body.alias != null ? req.body.alias.replace(/\s/g, '-') : uuid().replace("-", "").substring(0, 9);
    const description = req.body.description != '' && req.body.description != undefined && req.body.description != null ? req.body.description : null;
    const password = req.body.password != '' && req.body.password != undefined && req.body.password != null ? bcrypt.hashSync(req.body.password) : null;
    const expiration_time = req.body.expiration_time != '' && req.body.expiration_time != undefined && req.body.expiration_time != null ? Math.round((new Date(req.body.expiration_time).getTime()) / 1000) : null;
    const timestamp = Math.round(Date.now() / 1000);
    const user_id = req.session.user != undefined && req.session.user != null ? req.session.user._id : null;
    const domain_name = long_url != false ? extractHostname(long_url).hostname : null;
    const domain_protocol = long_url != false ? extractHostname(long_url).protocol : null;

    // Here the user logged in features
    const user_data = req.isAuthenticated() ? req.session.user : null;
    const user_permissions = user_data != null && user_data != undefined ? user_data.subscription : 'BASIC';
    const device_select = req.body['device_select[]'] != '' && req.body['device_select[]'] != null && req.body['device_select[]'] != undefined && Array.isArray(req.body['device_select[]']) ? req.body['device_select[]'] : [];
    const devicetag_url = req.body.devicetag_url != '' && req.body.devicetag_url != null && req.body.devicetag_url != undefined ? req.body.devicetag_url : null;
    const geo_select = req.body['geo_select[]'] != '' && req.body['geo_select[]'] != null && req.body['geo_select[]'] != undefined && Array.isArray(req.body['geo_select[]']) ? req.body['geo_select[]'] : [];
    const geotag_url = req.body.geotag_url != '' && req.body.devicetag_url != null && req.body.devicetag_url != undefined ? req.body.geotag_url : null;

    // Now the premium featurs
    const seo_title = user_permissions != 'BASIC' && req.body.seo_title != '' && req.body.seo_title != null && req.body.seo_title != undefined ? req.body.seo_title : null;
    const seo_description = user_permissions != 'BASIC' && req.body.seo_description != '' && req.body.seo_description != null && req.body.seo_description != undefined ? req.body.seo_description : null;

    // The url limiter if isset user session
    const plan = req.isAuthenticated() ? req.session.user.subscription : null;
    const application_id = null;

    if (user_id) {
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
                                res.json({
                                    'Error': 'Alias not avaiable.'
                                });
                            } else {
                                if (docs.length === 0) {
                                    getHeadHTML(long_url, (html) => {
                                        headHTML(html, (head_html) => {
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
                                                    application_id,
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
                                                }).save((err, newUrl) => {
                                                    if (err) {
                                                        res.json({
                                                            'Error': 'Error while data saving.'
                                                        });
                                                    } else {
                                                        // Get async screenshot of the page
                                                        getPagePic({
                                                            url: long_url,
                                                            live_path: `./public/img/thumbnails/${newUrl._id}.png`,
                                                            temp_path: `./public/img/temp/temp-${newUrl._id}.png`
                                                        });
                                                        // Get the response
                                                        res.json({
                                                            'Status': 'done',
                                                            'short_url': `${config.host}/s/${alias}`,
                                                            'messages': {
                                                                type: 'success',
                                                                title: 'Well!',
                                                                text: 'Your shorten link it\s ready :)',
                                                            }
                                                        });
                                                    }
                                                });
                                            });
                                        });
                                    });
                                } else {
                                    res.json({
                                        'Error': 'Alias not avaiable.'
                                    });
                                }
                            }
                        });
                    } else {
                        res.json({
                            'Error': 'Missing required data.'
                        });
                    }
                } else {
                    res.json({
                        'Error': 'You have already reached your plan\'s urls limit.'
                    });
                }

            });
        });
    } else {
        if (long_url) {
            db.Url.find({
                alias: alias
            }, (err, docs) => {
                if (err) {
                    res.json({
                        'Error': 'Alias not avaiable.'
                    });
                } else {
                    if (docs.length === 0) {
                        getHeadHTML(long_url, (html) => {
                            headHTML(html, (head_html) => {
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
                                    }).save((err, newUrl) => {
                                        if (err) {
                                            res.json({
                                                'Error': 'Error while data saving.'
                                            });
                                        } else {
                                            // Get async screenshot of the page
                                            getPagePic({
                                                url: long_url,
                                                live_path: `./public/img/thumbnails/${newUrl._id}.png`,
                                                temp_path: `./public/img/temp/temp-${newUrl._id}.png`
                                            });
                                            // Get the response
                                            res.json({
                                                'Status': 'done',
                                                'short_url': `${config.host}/s/${alias}`,
                                                'messages': {
                                                    type: 'success',
                                                    title: 'Well!',
                                                    text: 'Your shorten link it\s ready :)',
                                                }
                                            });
                                        }
                                    });
                                });
                            });
                        });
                    } else {
                        res.json({
                            'Error': 'Alias not avaiable.'
                        });
                    }
                }
            });
        } else {
            res.json({
                'Error': 'Missing required data.'
            });
        }
    }
});

// Shorten url delete
app.post('/shorten/delete', (req, res) => {
    const url_id = req.body.url_id != '' && req.body.url_id != null && req.body.url_id != undefined ? req.body.url_id : false;
    const session = req.isAuthenticated();
    if (url_id && session) {
        db.Url.deleteOne({
            _id: url_id
        }).then(confirm => {
            if (confirm) {
                fs.unlink(`${__dirname}/public/img/thumbnails/${url_id}.png`, (err) => {
                    if (err) {
                        console.log(err);
                    } else {
                        res.json({
                            'Status': 'done',
                            'messages': {
                                'title': 'Well!',
                                'text': 'URL deleted.'
                            }
                        });
                    }
                });
            } else {
                res.json({
                    'Error': err,
                    'title': 'Oops!',
                    'text': 'Internal server error.'
                })
            }
        }).catch(err => {
            res.json({
                'Error': err,
                'title': 'Oops!',
                'text': 'We can not delete this url.'
            })
        });
    }
});

// Shorten link alias retrive logic
app.get('/s/:alias', (req, res) => {
    const alias = req.params.alias != undefined && req.params.alias != null && req.params.alias != '' ? req.params.alias : false;
    if (alias) {
        db.Url.find({
            alias: alias
        }, (err, docs) => {
            if (err) res.redirect('/?error=alias_not_founded');
            const password = docs[0].password;
            if (password != null) {
                res.render('alias', {
                    session: req.isAuthenticated(),
                    user: req.session.user,
                    page: 'alias',
                    alias: alias,
                    messages: {
                        type: null,
                        title: null,
                        text: null
                    }
                });
            } else {
                res.render('s', {
                    session: req.isAuthenticated(),
                    user: req.session.user,
                    page: 's',
                    alias: alias,
                    long_url: docs[0].long_url,
                    url: docs[0],
                    messages: {
                        type: null,
                        title: null,
                        text: null
                    }
                });
                // res.redirect(docs[0].long_url);
            }
        });
    } else {
        res.redirect('/?error=empty_alias');
    }
});

// Shorten link password protection verify
app.post('/p/verify', (req, res) => {
    const alias = req.body.alias != undefined && req.body.alias != null && req.body.alias != '' ? req.body.alias : false;
    const password = req.body.password != undefined && req.body.password != null && req.body.password != '' ? req.body.password : false;
    if (alias && password) {
        db.Url.find({
            alias: alias
        }, (err, docs) => {
            if (err) res.json({
                'Error': 'Missing required fiends.'
            });
            if (!bcrypt.compareSync(password, docs[0].password)) {
                res.json({
                    'Error': 'Incorrect password.'
                });
            } else {
                res.redirect(docs[0].long_url);
            }
        });
    } else {
        res.json({
            'Error': 'Missing required fiends.'
        });
    }
});

// GET /pricing with the plan table
app.get('/pricing', (req, res) => {
    const session = req.isAuthenticated();
    if (session) {
        const license = req.session.user.license_id != '' && req.session.user.license_id != null && req.session.user.license_id != undefined ? req.session.user.license_id : false;
        verifyLicenseMiddleware(license, (err, validLicense) => {
            if (err) {
                res.json(err);
            } else {
                res.render('upgrade', {
                    session: req.isAuthenticated(),
                    user: req.session.user,
                    page: 'pricing',
                    license: {
                        valid: validLicense
                    },
                    messages: {
                        type: null,
                        title: null,
                        text: null
                    }
                });
            }
        });
    } else {
        res.render('upgrade', {
            session: req.isAuthenticated(),
            user: req.session.user,
            page: 'pricing',
            license: {
                valid: false
            },
            messages: {
                type: null,
                title: null,
                text: null
            }
        });
    }
});

// GET /upgrade with the plan table
app.get('/upgrade', (req, res) => {
    const session = req.isAuthenticated();
    if (session) {
        const license = req.session.user.license_id != '' && req.session.user.license_id != null && req.session.user.license_id != undefined ? req.session.user.license_id : false;
        verifyLicenseMiddleware(license, (err, validLicense) => {
            if (err) {
                res.json(err);
            } else {
                res.render('upgrade', {
                    session: req.isAuthenticated(),
                    user: req.session.user,
                    page: 'pricing',
                    license: {
                        valid: validLicense
                    },
                    messages: {
                        type: null,
                        title: null,
                        text: null
                    }
                });
            }
        });
    } else {
        res.render('upgrade', {
            session: req.isAuthenticated(),
            user: req.session.user,
            page: 'pricing',
            license: {
                valid: false
            },
            messages: {
                type: null,
                title: null,
                text: null
            }
        });
    }
    // if (license) {
    //     db.License.find({
    //         license_id: license
    //     }, (err, license) => {
    //         const license_status = license[0].active;
    //         const license_expiration = license[0].expiration_time;
    //         const time_now = Math.round(Date.now() / 1000);
    //         const validLicense = license_status && license_expiration > time_now ? true : false;
    //         res.render('upgrade', {
    //             session: req.isAuthenticated(),
    //             user: req.session.user,
    //             page: 'pricing',
    //             license: {
    //                 valid: validLicense
    //             },
    //             messages: {
    //                 type: null,
    //                 title: null,
    //                 text: null
    //             }
    //         });
    //     });
    // }
});

// GET /upgrade premium
app.get('/upgrade/premium', verifySessionUpgrade, (req, res) => {
    // Block the access if the user have a regular license
    const license = req.session.user.license_id != '' && req.session.user.license_id != null && req.session.user.license_id != undefined ? req.session.user.license_id : false;
    verifyLicenseMiddleware(license, (err, validLicense) => {
        if (err) throw err;
        if (validLicense) {
            res.redirect('/upgrade');
        } else {
            res.render('upgrade-premium', {
                session: req.isAuthenticated(),
                user: req.session.user,
                page: 'login',
                messages: {
                    type: null,
                    title: null,
                    text: null
                }
            });
        }
    });
});

// POST the subscriptio
app.post('/upgrade/premium', verifySessionUpgrade, (req, res) => {
    const license = req.session.user.license_id != '' && req.session.user.license_id != null && req.session.user.license_id != undefined ? req.session.user.license_id : false;
    const user_id = req.session.user._id;
    const customer_id = req.session.user.customer_id;
    const token = req.body.token_id != '' && req.body.token_id != null && req.body.token_id != undefined ? req.body.token_id : false;
    const ref = req.body.ref != '' && req.body.ref != null && req.body.ref != undefined ? req.body.ref : undefined;
    const plan_id = 'plan_EYF7etS9d0ieWA';
    const plan = 'PREMIUM';
    const active = true;

    verifyLicenseMiddleware(license, (err, validLicense) => {
        if (err) throw err;
        if (validLicense) {
            res.json({
                'Error': 'Your license is still valid.'
            });
        } else {
            // License not exist, expired or invalid
            if (token) {
                // Create a card with the token provided by stripe elements
                // new PaymentSystem(config.stripe.secretKey).set({
                PaymentSystem.set({
                    customer_id: customer_id
                }).createCard({
                    source: token // Required source parameter, it's a token retrieved by Stripe.js elements
                }, (err, card) => {
                    if (err) {
                        res.json({
                            'Error': 'Error during the confirmation of the provided credit card.'
                        });
                    } else if (card) {
                        // Init the subscription
                        // new PaymentSystem(config.stripe.secretKey).set({
                        PaymentSystem.set({
                            customer_id: customer_id
                        }).createSubscription({
                            plan: plan_id
                        }, (err, subscription) => {
                            if (err) {
                                res.json({
                                    'Error': 'Error during the payment.'
                                });
                            } else {
                                // Payment is ok
                                const license_id = subscription.id != '' && subscription.id != null && subscription.id != undefined ? subscription.id : false;
                                const last_update = subscription.current_period_start;
                                const expiration_time = subscription.current_period_end;
                                const creation_time = subscription.created;
                                if (license_id) {
                                    // Register a new premium license for the user
                                    db.License({
                                        user_id,
                                        license_id,
                                        plan,
                                        active,
                                        expiration_time,
                                        last_update,
                                        creation_time
                                    }).save(err => {
                                        if (err) {
                                            res.json({
                                                'Error': 'Error during the creation of a new premium license.'
                                            });
                                        } else {
                                            // We have just create a new premium license for the current user
                                            // Update the permissions in user schema
                                            db.User.updateOne({
                                                _id: user_id
                                            }, {
                                                subscription: plan,
                                                license_id: license_id,
                                                license_expiration: expiration_time
                                            }, (err) => {
                                                if (err) {
                                                    res.json({
                                                        'Error': 'Error during the activation of a new premium license.'
                                                    });
                                                } else {
                                                    db.User.find({
                                                        _id: user_id
                                                    }, (err, user) => {
                                                        req.login(user[0], (err) => {
                                                            if (err) res.json({
                                                                'Error': 'Error during user login.'
                                                            });;
                                                            req.session.user = user[0];
                                                            return res.json({
                                                                'Status': 'done',
                                                                'ref': ref
                                                            });
                                                        })
                                                    });
                                                }
                                            });
                                        }
                                    });
                                } else {
                                    res.json({
                                        'Error': 'Error during the registration of your\'s premium license.'
                                    });
                                }
                            }
                        });
                    }
                });

            } else {
                res.json({
                    'Error': 'No one card provided.'
                });
            }
        }
    });

});

app.get('/logout', verifySession, function (req, res) {
    req.session.destroy(function (err) {
        req.logout();
        res.redirect('/');
    });
});

/*
 *
 *   DEFINE THE LAST ROOT AS 404
 *
 */

app.get('*', function (req, res) {
    res.status(404).send('<h1>ERROR 404</h1><p>Page not fouded.</p>');
});

// Combine the limiter and the origin middleware controls for api requests
// CM.setMiddlewareFunction(apiLimiter);
// CM.setMiddlewareFunction(ValidateOrigin);
// const combinedMiddleware = CM.combine();

// app.post('/origin', combinedMiddleware, (req, res) => {
//     res.json('Success');
// });

// CM.setMiddlewareFunction(apiLimiter);
// CM.setMiddlewareFunction(ValidateOrigin);
// const combinedMiddleware1 = CM.combine();

// app.post('/origin1', combinedMiddleware1, (req, res) => {
//     res.json('Success');
// });

// Get the https required modules
// const sslOptions = {
//     cert: fs.readFileSync('./ssl/cert.pem'),
//     key: fs.readFileSync('./ssl/key.pem')
// };

// const servers = https.createServer(sslOptions, app).listen(443, () => {
//     console.log('Server https is listening on port 443...');
// });
// End get the https required modules

app.listen(process.env.PORT || config.port, () => {
    console.log(`Server http is listening on port ${config.port}...`);
});

/*
 *
 *   ALL UTILS FUNCTIONS
 *
 */

// Verify the session to protect private routers
function verifySession(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        // Forbidden
        // res.sendStatus(403)
        res.redirect('/');
    }
}

// Verify the session to protect private routers
function verifySessionInverse(req, res, next) {
    if (req.isAuthenticated()) {
        res.redirect('/');
    } else {
        next();
    }
}

// Verify the session to protect upgrade routers
function verifySessionUpgrade(req, res, next) {
    if (!req.isAuthenticated()) {
        res.redirect('/login?ref=/upgrade/premium');
    } else {
        next();
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

function ValidURL(str) {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return pattern.test(str);
}

// Protect root with cors
function ValidateOrigin(req, res, next) {
    const origin = req.origin != '' && req.origin != null && req.origin != undefined ? req.origin.replace("https://", "").replace("http://", "") : false;
    const hostname = req.hostname != '' && req.hostname != null && req.hostname != undefined ? req.hostname.replace("https://", "").replace("http://", "") : false;
    const protocol = req.protocol != '' && req.protocol != null && req.protocol != undefined ? req.protocol : false;
    const host = origin == hostname ? origin : hostname;
    const secret_key = req.body.secretKey != '' && req.body.secretKey != null && req.body.secretKey != undefined ? req.body.secretKey : false;
    if (secret_key && protocol && host) {
        // Retrieve the allowed source by the secretkey
        db.User.find({
            secret_key: secret_key
        }).then(docs => {
            // Get the array of whitelisted domain name
            const whitelist = docs[0].allowed_origins;
            // Check if the host is allowed
            if (whitelist.indexOf(host) !== -1) {
                return next();
            } else {
                return res.status(500).send('Host not allowed.');
            }

        }).catch(err => {
            return res.status(500).send('Error during fetching data.');
        });
    } else {
        return res.status(500).send('Bad request.');
    }
}

// Verify if the license is valid
function verifyLicenseMiddleware(license, done) {
    if (license) {
        db.License.find({
            license_id: license
        }, (err, license) => {
            if (err) return done(err, false);
            const license_status = license[0].active;
            const license_expiration = license[0].expiration_time;
            const time_now = Math.round(Date.now() / 1000);
            return done(null, license_status && license_expiration > time_now ? true : false);
        });
    } else {
        return done(null, false);
    }
}

async function getPagePic(param) {
    const url = param.url;
    const path = param.live_path; // './public/img/thumbnails/image.png';
    const temp_path = param.temp_path; // `./public/img/temp/temp-${Date.now()}.png`;
    const browser = await puppeteer.launch();
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
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.goto(url);
    const headHandle = await page.$('head');
    const html = await page.evaluate(head => head.innerHTML, headHandle);
    await browser.close();
    return await done(html)
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
    return done(html_head);
}