const Config = require('../config/config');
const config = new Config();
const express = require('express');
const db = require('../models/db');
const isUrl = require('is-url');
const router = express.Router();
const PaymentSystem = require('../modules/payment-system/v1')(config.stripe.secretKey);
const uuid = require('uuid/v4');

// GET /dashboard/
router.get('/', (req, res) => {
    db.Url.countDocuments({
        user_id: req.session.user._id
    }, (err, count) => {
        if (err) throw err;
        db.Plan.find({
            name: req.session.user.subscription
        }, (err, docs) => {
            if (err) throw err;
            // If the avatar is an url (facebook, twitter) remove the directory from path
            let user = req.session.user;
            user.avatar = isUrl(user.avatar) == false ? `/img/avatars/${user._id}/${user.avatar}` : user.avatar;
            res.render('./dashboard/index', {
                session: req.isAuthenticated(),
                user: user,
                datas: {
                    plan: {
                        name: docs.name,
                        url_limit: docs[0].url_limit
                    },
                    urls: {
                        data: {},
                        count: count
                    }
                },
                page: 'index',
                messages: {
                    type: null,
                    title: null,
                    text: null
                }
            });
        });
    });
});

// GET /dashboard/archive
router.get('/urls', (req, res) => {
    const page = req.query.page != '' && req.query.page != undefined && req.query.page != null && req.query.page > 0 ? req.query.page : 1;
    db.Url.paginate({
        user_id: req.session.user._id
    }, {
        page: page,
        limit: 18,
        sort: {
            timestamp: 'desc'
        }
    }).then(response => {
        // res.json(response);
        db.Plan.find({
            name: req.session.user.subscription
        }, (err, docs) => {
            if (err) throw err;
            // If the avatar is an url (facebook, twitter) remove the directory from path
            let user = req.session.user;
            user.avatar = isUrl(user.avatar) == false ? `/img/avatars/${user._id}/${user.avatar}` : user.avatar;
            res.render('./dashboard/urls', {
                session: req.isAuthenticated(),
                user: user,
                datas: {
                    plan: {
                        name: docs.name,
                        url_limit: docs[0].url_limit
                    },
                    urls: {
                        data: response,
                        count: response.docs.length
                    }
                },
                page: 'urls',
                messages: {
                    type: null,
                    title: null,
                    text: null
                }
            });
        });
    }).catch(err => {
        res.json(err);
    });
});

// GET /dashboard/subscription
router.get('/subscription', (req, res) => {
    db.Url.countDocuments({
        user_id: req.session.user._id
    }, (err, count) => {
        if (err) throw err;
        db.Plan.find({
            name: req.session.user.subscription
        }, (err, docs) => {
            if (err) throw err;
            // If the avatar is an url (facebook, twitter) remove the directory from path
            let user = req.session.user;
            user.avatar = isUrl(user.avatar) == false ? `/img/avatars/${user._id}/${user.avatar}` : user.avatar;
            db.License.find({
                license_id: req.session.user.license_id
            }, (err, licens) => {
                if (err) throw err;
                PaymentSystem.set({
                    customer_id: req.session.user.customer_id
                }).listAllCards((err, cards) => {
                    if (err) throw err;
                    // Retrieved the card for the payment
                    res.render('./dashboard/subscription', {
                        session: req.isAuthenticated(),
                        user: user,
                        license: licens[0],
                        card: cards.data[0],
                        datas: {
                            plan: {
                                name: docs.name,
                                url_limit: docs[0].url_limit
                            },
                            urls: {
                                data: {},
                                count: count
                            }
                        },
                        page: 'subscription',
                        messages: {
                            type: null,
                            title: null,
                            text: null
                        }
                    });
                });
            });
        });
    });
});

// GET /dashboard/api
router.get('/api', (req, res) => {
    const page = req.query.page != '' && req.query.page != undefined && req.query.page != null && req.query.page > 0 ? req.query.page : 1;
    db.Application.paginate({
        user_id: req.session.user._id
    }, {
        page: page,
        limit: 18,
        sort: {
            creation_time: 'desc'
        }
    }).then(response => {
        // res.json(response);
        db.Plan.find({
            name: req.session.user.subscription
        }, (err, docs) => {
            if (err) throw err;
            // If the avatar is an url (facebook, twitter) remove the directory from path
            let user = req.session.user;
            user.avatar = isUrl(user.avatar) == false ? `/img/avatars/${user._id}/${user.avatar}` : user.avatar;
            db.Url.countDocuments({
                user_id: req.session.user._id
            }, (err, count) => {
                if (err) throw err;
                res.render('./dashboard/api', {
                    session: req.isAuthenticated(),
                    user: user,
                    datas: {
                        plan: {
                            name: docs.name,
                            url_limit: docs[0].url_limit
                        },
                        applications: {
                            data: response,
                            count: response.docs.length
                        },
                        urls: {
                            data: {},
                            count: count
                        }
                    },
                    page: 'api',
                    messages: {
                        type: null,
                        title: null,
                        text: null
                    }
                });
            });
        });
    }).catch(err => {
        res.json(err);
    });

});

// GET /dashboard/api/new
router.get('/api/new', (req, res) => {
    db.Plan.find({
        name: req.session.user.subscription
    }, (err, docs) => {
        if (err) throw err;
        // If the avatar is an url (facebook) remove the directory from path
        let user = req.session.user;
        user.avatar = isUrl(user.avatar) == false ? `/img/avatars/${user._id}/${user.avatar}` : user.avatar;
        db.Url.countDocuments({
            user_id: req.session.user._id
        }, (err, count) => {
            if (err) throw err;
            res.render('./dashboard/api-new', {
                session: req.isAuthenticated(),
                user: user,
                datas: {
                    plan: {
                        name: docs.name,
                        url_limit: docs[0].url_limit
                    },
                    urls: {
                        data: {},
                        count: count
                    }
                },
                page: 'api',
                messages: {
                    type: null,
                    title: null,
                    text: null
                }
            });
        });
    });
});

// POST /dashboard/api/new
router.post('/api/new', (req, res) => {
    const user_id = req.isAuthenticated() ? req.session.user._id : false;
    const secret_key = uuid();
    const allowed_origins = Array.isArray(req.body.allowed_origins) && req.body.allowed_origins != '' && req.body.allowed_origins != null && req.body.allowed_origins != undefined ? req.body.allowed_origins : false;
    const name = req.body.name != '' && req.body.name != null && req.body.name != undefined ? req.body.name : false;
    const creation_time = Math.round(Date.now() / 1000);

    if (user_id && secret_key && allowed_origins && name) {
        let isUrlControl = true;
        for (let i = 0; i < allowed_origins.length; i++) {
            if (!isUrl(allowed_origins[i])) {
                isUrlControl = false;
                break;
            }
        }
        if (isUrlControl) {
            db.Application({
                user_id,
                secret_key,
                allowed_origins,
                name,
                creation_time
            }).save(err => {
                if (err) throw err;
                res.json({
                    'Status': 'done',
                    'messages': {
                        'title': 'Well!',
                        'text': 'New application created.'
                    }
                });
            });
        } else {
            res.json({
                'Error': 'The origins must be valid url.',
                'title': 'Oops!',
                'text': 'The origins must be valid url.'
            });
        }
    } else {
        res.json({
            'Error': 'Missing required data.',
            'messages': {
                'title': 'Oops!',
                'text': 'Missing required data.'
            }
        });
    }
});

// POST /dashboard/api/new
router.post('/api/delete', (req, res) => {
    const user_id = req.isAuthenticated() ? req.session.user._id : false;
    const application_id = req.body.application_id != '' && req.body.application_id != null && req.body.application_id != undefined ? req.body.application_id : false;
    if (application_id && user_id) {
        db.Application.deleteOne({
            _id: application_id,
            user_id: user_id
        }).then(confirm => {
            if (confirm) {
                db.Application.deleteMany({
                    application_id: application_id
                }).then(confirm => {
                    if (confirm) {
                        res.json({
                            'Status': 'done',
                            'messages': {
                                'title': 'Well!',
                                'text': 'Application deleted.'
                            }
                        });
                    }
                }).catch(err => {
                    res.json({
                        'Error': err,
                        'title': 'Oops!',
                        'text': 'We have delete this application but for some reason we can not delete it\'s events...'
                    });
                });
            }
        }).catch(err => {
            res.json({
                'Error': err,
                'title': 'Oops!',
                'text': 'We can not delete this application.'
            });
        });
    } else {
        res.json({
            'Error': err,
            'title': 'Fatal!',
            'text': 'You are not authorized.'
        })
    }
});

// GET /dashboard/api/details/:id
router.get('/api/details/:id', (req, res) => {
    const application_id = req.params.id != '' && req.params.id != null && req.params.id != undefined ? req.params.id : false;
    if (application_id) {
        db.Application.find({
            user_id: req.session.user._id,
            _id: application_id
        }).then(response => {
            if (response.length > 0) {
                // res.json(response);
                db.Plan.find({
                    name: req.session.user.subscription
                }, (err, docs) => {
                    if (err) throw err;
                    // If the avatar is an url (facebook, twitter) remove the directory from path
                    let user = req.session.user;
                    user.avatar = isUrl(user.avatar) == false ? `/img/avatars/${user._id}/${user.avatar}` : user.avatar;
                    db.Url.countDocuments({
                        user_id: req.session.user._id
                    }, (err, count) => {
                        if (err) throw err;
                        res.render('./dashboard/api-details', {
                            session: req.isAuthenticated(),
                            user: user,
                            datas: {
                                plan: {
                                    name: docs.name,
                                    url_limit: docs[0].url_limit
                                },
                                applications: {
                                    data: response[0]
                                },
                                urls: {
                                    data: {},
                                    count: count
                                }
                            },
                            page: 'api',
                            messages: {
                                type: null,
                                title: null,
                                text: null
                            }
                        });
                    });
                });
            } else {
                res.json({
                    'Error': `No application fouded with ${application_id} id.`
                });
            }
        }).catch(err => {
            res.json(err);
        });
    } else {
        res.redirect('/dashboard/api');
    }

});

router.post('/api/protected-requests', (req, res) => {
    const action = req.body.action != '' && req.body.action != null && req.body.action != undefined ? req.body.action : false;
    if (action) {
        switch (action) {
            case 'revealSecretKey':
                const user_id = req.isAuthenticated() ? req.session.user._id : false;
                const application_id = req.body.application_id != '' && req.body.application_id != null && req.body.application_id != undefined ? req.body.application_id : false;
                if (application_id && user_id) {
                    db.Application.find({
                        user_id: user_id,
                        _id: application_id
                    }).then(docs => {
                        if (docs.length > 0) {
                            res.json({
                                'Status': 'done',
                                secret_key: docs[0].secret_key
                            });
                        } else {
                            res.json({
                                'Error': 'No application founded.',
                                'title': 'Oops!',
                                'text': 'No application founded.'
                            })
                        }
                    }).catch(err => {
                        if (err) throw err;
                    });
                } else {
                    res.sendStatus(403);
                }
                break;
            default:
                res.sendStatus(403);
                break;
        }
    } else {
        res.sendStatus(403);
    }
});

// POST /dashboard/api/update
router.post('/api/update', (req, res) => {
    const user_id = req.isAuthenticated() ? req.session.user._id : false;
    const application_id = req.body.application_id != '' && req.body.application_id != null && req.body.application_id != undefined ? req.body.application_id : false;
    const active = req.body.application_status != '' && req.body.application_status != null && req.body.application_status != undefined ? req.body.application_status : false;

    // Update the other informations
    const allowed_origins = Array.isArray(req.body.allowed_origins) && req.body.allowed_origins != '' && req.body.allowed_origins != null && req.body.allowed_origins != undefined ? req.body.allowed_origins : false;
    const name = req.body.name != '' && req.body.name != null && req.body.name != undefined ? req.body.name : false;

    if (active) {
        if (application_id && user_id) {
            db.Application.updateOne({
                _id: application_id,
                user_id: user_id
            }, {
                active: active == 'on' ? true : false
            }).then(confirm => {
                if (confirm) {
                    res.json({
                        'Status': 'done',
                        'messages': {
                            'title': 'Well!',
                            'text': `Application ${active == 'on' ? 'activated' : 'disabled'}.`
                        }
                    });
                }
            }).catch(err => {
                res.json({
                    'Error': err,
                    'title': 'Oops!',
                    'text': 'We can not update this application.'
                });
            });
        } else {
            res.json({
                'Error': err,
                'title': 'Fatal!',
                'text': 'You are not authorized.'
            })
        }
    } else {
        if (application_id && user_id) {
            db.Application.updateOne({
                _id: application_id,
                user_id: user_id
            }, {
                name: name,
                allowed_origins: allowed_origins
            }).then(confirm => {
                if (confirm) {
                    res.json({
                        'Status': 'done',
                        'messages': {
                            'title': 'Well!',
                            'text': `Application info updated.`
                        }
                    });
                }
            }).catch(err => {
                res.json({
                    'Error': err,
                    'title': 'Oops!',
                    'text': 'We can not update this application.'
                });
            });
        } else {
            res.json({
                'Error': true,
                'title': 'Fatal!',
                'text': 'You are not authorized.'
            })
        }
    }
});

module.exports = router;