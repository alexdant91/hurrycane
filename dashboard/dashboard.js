const Config = require('../config/config');
const config = new Config();
const express = require('express');
const db = require('../models/db');
const isUrl = require('is-url');
const router = express.Router();
const PaymentSystem = require('../modules/payment-system/v1')(config.stripe.secretKey);
const uuid = require('uuid/v4');
const bcrypt = require('bcrypt-nodejs');

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

/*
 * 
 * SET THE URLS FUNCTIONALITY
 *  
 * */

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

/*
 * 
 * SET THE SUBSCRITION FUNCTIONALITY
 *  
 * */

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

/*
 * 
 * SET THE SETTINGS FUNCTIONALITY
 *  
 * */

// GET /dashboard/settings
router.get('/settings', (req, res) => {
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
            db.User.find({
                _id: req.session.user._id
            }, (err, user) => {
                if (err) throw err;
                res.render('./dashboard/settings', {
                    session: req.isAuthenticated(),
                    user: user[0],
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
                    page: 'settings',
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

// POST /dashboard/settings/update
router.post('/settings/update', (req, res) => {
    const user_id = req.session.user._id;
    const action = req.query.action != '' && req.query.action != null && req.query.action != undefined ? req.query.action : false;
    if (action) {
        switch (action) {
            case 'UpdateUserInfo':
                const name = req.body.name != '' && req.body.name != null && req.body.name != undefined ? req.body.name : false;
                const last_name = req.body.last_name != '' && req.body.last_name != null && req.body.last_name != undefined ? req.body.last_name : false;
                const email = req.body.email != '' && req.body.email != null && req.body.email != undefined ? req.body.email : false;
                if (name && last_name && email) {
                    db.User.find({
                        email: email
                    }, (err, user) => {
                        if (err) {
                            res.json({
                                'Error': 'Internal server error.',
                                'title': 'Oops!',
                                'text': 'Internal server error.'
                            });
                        } else {
                            if (user.length > 0 && user[0]._id != user_id) {
                                res.json({
                                    'Error': 'Email allready exist.',
                                    'title': 'Oops!',
                                    'text': 'Email allready exist.'
                                });
                            } else {
                                db.User.updateOne({
                                    _id: user_id
                                }, {
                                    name: name,
                                    last_name: last_name,
                                    email: email
                                }, (err, confirm) => {
                                    if (err) {
                                        res.json({
                                            'Error': 'Internal server error.',
                                            'title': 'Oops!',
                                            'text': 'Internal server error.'
                                        });
                                    } else {
                                        if (confirm) {
                                            res.json({
                                                'Status': 'done',
                                                'messages': {
                                                    'title': 'Well!',
                                                    'text': 'User information updated.'
                                                }
                                            });
                                        } else {
                                            res.json({
                                                'Error': 'Internal server error.',
                                                'title': 'Oops!',
                                                'text': 'Internal server error.'
                                            });
                                        }
                                    }
                                });
                            }
                        }
                    });
                } else {
                    res.json({
                        'Error': 'Bad request.',
                        'title': 'Oops!',
                        'text': 'Missing required data.'
                    });
                }
                break;
            case 'UpdateUserPassword':
                const pass1 = req.body.pass1 != '' && req.body.pass1 != null && req.body.pass1 != undefined ? req.body.pass1 : false;
                const pass2 = req.body.pass2 != '' && req.body.pass2 != null && req.body.pass2 != undefined ? req.body.pass2 : false;
                if (pass1 && pass2) {
                    const password = bcrypt.hashSync(pass2);
                    if (pass1 === pass2) {
                        db.User.updateOne({
                            _id: user_id
                        }, {
                            password: password
                        }, (err, confirm) => {
                            if (err) {
                                res.json({
                                    'Error': 'Internal server error.',
                                    'title': 'Oops!',
                                    'text': 'Internal server error.'
                                });
                            } else {
                                if (confirm) {
                                    res.json({
                                        'Status': 'done',
                                        'messages': {
                                            'title': 'Well!',
                                            'text': 'Your password updated.'
                                        }
                                    });
                                } else {
                                    res.json({
                                        'Error': 'Internal server error.',
                                        'title': 'Oops!',
                                        'text': 'Internal server error.'
                                    });
                                }
                            }
                        });
                    } else {
                        res.json({
                            'Error': 'Bad request.',
                            'title': 'Oops!',
                            'text': 'The two password doesn\'t match.'
                        });
                    }
                } else {
                    res.json({
                        'Error': 'Bad request.',
                        'title': 'Oops!',
                        'text': 'Missing required data.'
                    });
                }
                break;
            default:
                res.json({
                    'Error': 'Bad request.',
                    'title': 'Oops!',
                    'text': 'Bad request.'
                })
                break;
        }
    } else {
        res.json({
            'Error': 'Bad request.',
            'title': 'Oops!',
            'text': 'Bad request.'
        })
    }
});

// POST /dashboard/settings/delete
router.post('/settings/delete', (req, res) => {
    const user_id = req.session.user._id != '' && req.session.user._id != null && req.session.user._id != undefined ? req.session.user._id : false;
    if (user_id) {
        db.User.deleteOne({
            _id: user_id
        }, (err, confirm) => {
            console.log(err, confirm);
            if (!err) {
                if (confirm) {
                    res.json({
                        'Status': 'done',
                        'messages': {
                            'title': 'Well!',
                            'text': 'User deleted.'
                        }
                    })
                } else {
                    res.json({
                        'Error': 'Internal server error.',
                        'title': 'Oops!',
                        'text': 'Internal server error 1.'
                    })
                }
            } else {
                res.json({
                    'Error': 'Internal server error.',
                    'title': 'Oops!',
                    'text': 'Internal server error 2.'
                })
            }
        });
    } else {
        res.json({
            'Error': 'Bad request.',
            'title': 'Oops!',
            'text': 'Bad request.'
        })
    }
});

/*
 * 
 * SET THE URLS ANALYTICS FUNCTIONALITY
 *  
 * */

// GET /dashboard/urls/analytics/:id
router.get('/urls/analytics/:id', (req, res) => {
    const url_id = req.params.id != '' && req.params.id != null && req.params.id != undefined ? req.params.id : false;
    const StartTime = req.query._s != '' && req.query._s != undefined && req.query._s != null && req.query._s > 0 ? req.query._s : Math.round(new Date().setHours(23, 59, 59, 999) / 1000);
    const EndTime = req.query._e != '' && req.query._e != undefined && req.query._e != null && req.query._e > 0 ? req.query._e : Math.round(new Date().setHours(23, 59, 59, 999) / 1000);

    if (url_id) {
        db.Plan.find({
            name: req.session.user.subscription
        }, (err, docs) => {
            if (err) throw err;
            // If the avatar is an url (facebook, twitter) remove the directory from path
            let user = req.session.user;
            user.avatar = isUrl(user.avatar) == false ? `/img/avatars/${user._id}/${user.avatar}` : user.avatar;
            db.Url.find({
                _id: url_id,
                user_id: req.session.user._id
            }, (err, urls) => {
                if (err) throw err;
                db.Analytic.find({
                    url_id: url_id
                }, (err, analytics) => {
                    if (err) throw err;
                    let totalClicks = 0;
                    analytics.forEach(e => {
                        totalClicks += e.clicks;
                    });
                    res.render('./dashboard/urls-analytics', {
                        session: req.isAuthenticated(),
                        user: user,
                        localhost: config.host,
                        datas: {
                            plan: {
                                name: docs.name,
                                url_limit: docs[0].url_limit
                            },
                            analytics: analytics,
                            totalClicks: totalClicks,
                            urls: {
                                data: urls[0],
                                count: urls.length
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
            });
        });
    } else {
        res.status(403).json({
            'Error': 'Bad request.'
        })
    }

});

// POST /dashboard/urls/analytics
router.post('/urls/analytics', (req, res) => {
    const url_id = req.body.url_id != '' && req.body.url_id != null && req.body.url_id != undefined ? req.body.url_id : false;
    const StartTime = req.body.startDate != '' && req.body.startDate != undefined && req.body.startDate != null && req.body.startDate > 0 ? req.body.startDate : Math.round(new Date().setHours(0, 0, 0, 0) / 1000);
    const EndTime = req.body.endDate != '' && req.body.endDate != undefined && req.body.endDate != null && req.body.endDate > 0 ? req.body.endDate : Math.round(new Date().setHours(23, 59, 59, 999) / 1000);
    if (url_id) {
        db.Analytic.find({
            user_id: req.session.user._id,
            url_id: url_id,
            timestamp: {
                $gte: StartTime,
                $lte: EndTime
            }
        }, (err, analytics) => {
            let devices = {
                labels: ['Tablet', 'Mobile', 'Desktop', 'Unknown'],
                data: []
            }
            let location = {
                labels: [],
                data: []
            }
            let referer = {
                labels: [],
                data: []
            }

            let tabletData = 0;
            let phoneData = 0;
            let desktopData = 0;
            let unknownData = 0;

            analytics.forEach(array => {
                // Devices
                if (array.device == 'tablet') {
                    tabletData += array.clicks;
                } else if (array.device == 'phone') {
                    phoneData += array.clicks;
                } else if (array.device == 'desktop') {
                    desktopData += array.clicks;
                } else {
                    unknownData += array.clicks;
                }

                // Locations
                if (location.labels.indexOf(array.language) !== -1) {
                    let index = location.labels.indexOf(array.language);
                    location.data[index] = location.data[index] + array.clicks;
                } else {
                    location.labels.push(array.language);
                    let index = location.labels.indexOf(array.language);
                    location.data[index] = array.clicks;
                }

                // Referer
                if (referer.labels.indexOf(array.referer) !== -1) {
                    let index = referer.labels.indexOf(array.referer);
                    referer.data[index] = referer.data[index] + array.clicks;
                } else {
                    referer.labels.push(array.referer);
                    let index = referer.labels.indexOf(array.referer);
                    referer.data[index] = array.clicks;
                }
            });

            // Push data
            devices.data = [tabletData, phoneData, desktopData, unknownData];

            if (err) {
                res.json({
                    'Error': 'Internal server error.',
                    'title': 'Oops!',
                    'text': 'Internal server error.'
                });
            } else {
                res.json({
                    'Status': 'done',
                    'devices': {
                        'labels': devices.labels,
                        'data': devices.data
                    },
                    'locations': {
                        'labels': location.labels,
                        'data': location.data
                    },
                    'referer': {
                        'labels': referer.labels,
                        'data': referer.data
                    }
                });
            }

        });
    } else {
        res.json({
            'Error': 'Missing required datas.',
            'title': 'Oops!',
            'text': 'Missing required datas.'
        });
    }
});

function ArraySameValues(array) {
    array.sort();
    var results = [];
    var current = null;
    var cnt = 0;
    array.forEach(array => {
        if (array != current) {
            if (cnt > 0) {
                results[current] = cnt;
            }
            current = array;
            cnt = 1;
        } else {
            cnt++;
        }
    });
    if (cnt > 0) {
        results[current] = cnt;
    }
    return results;
}

/*
 * 
 * SET THE APPLICATION FUNCTIONALITY
 *  
 * */

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

// POST /dashboard/api/delete
router.post('/api/delete', (req, res) => {
    const user_id = req.isAuthenticated() ? req.session.user._id : false;
    const application_id = req.body.application_id != '' && req.body.application_id != null && req.body.application_id != undefined ? req.body.application_id : false;
    if (application_id && user_id) {
        db.Application.deleteOne({
            _id: application_id,
            user_id: user_id
        }).then(confirm => {
            if (confirm) {
                db.ApplicationEvent.deleteMany({
                    application_id: application_id
                }).then(confirm => {
                    if (confirm) {
                        db.Webhook.deleteMany({
                            application_id: application_id
                        }).then(confirm => {
                            if (confirm) {
                                db.WebhookEvent.deleteMany({
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
                                    } else {
                                        res.json({
                                            'Error': 'Internal server error.',
                                            'title': 'Oops!',
                                            'text': 'Internal server error.'
                                        });
                                    }
                                }).catch(err => {
                                    res.json({
                                        'Error': err,
                                        'title': 'Oops!',
                                        'text': 'We have delete this application but for some reason we can not delete it\'s endpoints events...'
                                    });
                                })
                            } else {
                                res.json({
                                    'Error': 'Internal server error.',
                                    'title': 'Oops!',
                                    'text': 'Internal server error.'
                                });
                            }
                        }).carch(err => {
                            res.json({
                                'Error': err,
                                'title': 'Oops!',
                                'text': 'We have delete this application but for some reason we can not delete it\'s webhook endpoints...'
                            });
                        });
                    } else {
                        res.json({
                            'Error': 'Internal server error.',
                            'title': 'Oops!',
                            'text': 'Internal server error.'
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
                        // Find webhook endpoint
                        db.Webhook.find({
                            user_id: req.session.user._id,
                            application_id: application_id
                        }, (err, webhooks) => {
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
                                    },
                                    webhooks: {
                                        data: webhooks
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

// GET /dashboard/api/protected-requests
router.post('/api/protected-requests', (req, res) => {
    const action = req.body.action != '' && req.body.action != null && req.body.action != undefined ? req.body.action : false;
    const user_id = req.isAuthenticated() ? req.session.user._id : false;
    const application_id = req.body.application_id != '' && req.body.application_id != null && req.body.application_id != undefined ? req.body.application_id : false;
    const webhook_self_id = req.body.webhook_self_id;
    if (action) {
        switch (action) {
            case 'revealSecretKey':
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
            case 'retrieveWebhooks':
                if (application_id && user_id) {
                    db.Webhook.find({
                        _id: webhook_self_id,
                        user_id: user_id,
                        application_id: application_id
                    }).then(docs => {
                        if (docs.length > 0) {
                            res.json({
                                'Status': 'done',
                                'endpoint': docs[0].endpoint,
                                'webhook_self_signature': docs[0].webhook_self_signature
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
    const production = req.body.application_env != '' && req.body.application_env != null && req.body.application_env != undefined ? req.body.application_env : false;

    // Update the other informations
    const allowed_origins = Array.isArray(req.body.allowed_origins) && req.body.allowed_origins != '' && req.body.allowed_origins != null && req.body.allowed_origins != undefined ? req.body.allowed_origins : false;
    const name = req.body.name != '' && req.body.name != null && req.body.name != undefined ? req.body.name : false;

    // Set the case control
    const action = req.query.action != '' & req.query.action != null && req.query.action != undefined ? req.query.action : false;

    if (action) {
        if (action == 'ChangeStatusMode') {
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
                    'Error': 'You are not authorized.',
                    'title': 'Fatal!',
                    'text': 'You are not authorized.'
                })
            }
        } else if (action == 'UpdateApplicationInfo') {
            console.log(allowed_origins);
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
        } else if (action == 'ChangeSandboxStatus') {
            if (application_id && user_id) {
                db.Application.updateOne({
                    _id: application_id,
                    user_id: user_id
                }, {
                    production: production == 'on' ? true : false
                }).then(confirm => {
                    if (confirm) {
                        res.json({
                            'Status': 'done',
                            'messages': {
                                'title': 'Well!',
                                'text': `Application in ${production == 'on' ? 'live' : 'test'} mode.`
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
        }
    } else {
        res.status(500).json({
            'Error': 'Bad request.'
        });
    }
});

// GET /dashboard/api/webhooks/new
router.get('/api/webhooks/:application_id/new', (req, res) => {
    const user_id = req.isAuthenticated() ? req.session.user._id : false;
    const application_id = req.params.application_id != '' && req.params.application_id != null && req.params.application_id != undefined ? req.params.application_id : false;
    if (application_id) {
        db.Application.find({
            user_id: req.session.user._id,
            _id: application_id,
            user_id: user_id
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
                        res.render('./dashboard/webhooks-new', {
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

// POST /dashboard/api/webhooks/new
router.post('/api/webhooks/:application_id/new', (req, res) => {
    const user_id = req.isAuthenticated() ? req.session.user._id : false;
    const application_id = req.params.application_id != '' && req.params.application_id != null && req.params.application_id != undefined ? req.params.application_id : false;
    const endpoint = req.body.endpoint != '' && req.body.endpoint != null && req.body.endpoint != undefined ? req.body.endpoint : false;
    const api_version = req.body.api_version != '' && req.body.api_version != null && req.body.api_version != undefined ? req.body.api_version : false;
    const events = req.body.events != '' && req.body.events != null && req.body.events != undefined && Array.isArray(req.body.events) ? req.body.events : false;
    if (user_id && application_id && endpoint && api_version && events) {
        db.Webhook({
            user_id,
            application_id,
            endpoint,
            api_version,
            events
        }).save(err => {
            if (err) {
                res.json({
                    'Error': 'Error saving data.'
                });
            } else {
                res.json({
                    'Status': 'done'
                });
            }
        });
    } else {
        res.json({
            'Error': 'Missing required data.'
        });
    }
});

// GET /dashboard/api/webhooks/:application_id/details
router.get('/api/webhooks/:application_id/details', (req, res) => {
    const user_id = req.isAuthenticated() ? req.session.user._id : false;
    const application_id = req.params.application_id != '' && req.params.application_id != null && req.params.application_id != undefined ? req.params.application_id : false;
    const webhook_self_id = req.query.webhook_self_id != '' && req.query.webhook_self_id != null && req.query.webhook_self_id != undefined ? req.query.webhook_self_id : false;
    if (user_id && application_id && webhook_self_id) {
        db.Application.find({
            user_id: req.session.user._id,
            _id: application_id,
            user_id: user_id
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
                        db.Webhook.find({
                            _id: webhook_self_id,
                            user_id: user_id,
                            application_id: application_id
                        }, (err, webhooks) => {
                            if (err) throw err;
                            db.WebhookEvent.paginate({
                                webhook_id: webhook_self_id,
                                user_id: user_id,
                                application_id: application_id
                            }, {
                                page: 1,
                                limit: 18,
                                sort: {
                                    creation_time: 'desc'
                                }
                            }).then(response_w => {
                                console.log({
                                    webhookEvents: {
                                        data: response_w.docs,
                                        count: response_w.docs.length
                                    }
                                });
                                res.render('./dashboard/webhooks-details', {
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
                                        },
                                        webhooks: {
                                            data: webhooks[0]
                                        },
                                        webhookEvents: {
                                            data: response_w,
                                            count: response_w.docs.length
                                        },
                                        localLanguage: res.locals.localLanguage
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

// POST /dashboard/api/webhooks/:application_id/details
router.post('/api/webhooks/:application_id/details', (req, res) => {
    const user_id = req.isAuthenticated() ? req.session.user._id : false;
    const application_id = req.params.application_id != '' && req.params.application_id != null && req.params.application_id != undefined ? req.params.application_id : false;
    const webhook_self_id = req.body.webhook_self_id != '' && req.body.webhook_self_id != null && req.body.webhook_self_id != undefined ? req.body.webhook_self_id : false;
    const endpoint = req.body.endpoint != '' && req.body.endpoint != null && req.body.endpoint != undefined ? req.body.endpoint : false;
    const api_version = req.body.api_version != '' && req.body.api_version != null && req.body.api_version != undefined ? req.body.api_version : false;
    const events = req.body.events != '' && req.body.events != null && req.body.events != undefined && Array.isArray(req.body.events) ? req.body.events : false;

    // console.log(user_id, application_id, webhook_self_id, endpoint, api_version, events);

    if (user_id && application_id && webhook_self_id && endpoint && api_version && events) {
        db.Webhook.updateOne({
            _id: webhook_self_id,
            user_id: user_id,
            application_id: application_id
        }, {
            endpoint,
            api_version,
            events
        }, (err => {
            if (err) {
                res.json({
                    'Error': 'Error during data update.',
                    'title': 'Oops!',
                    'text': 'Error during data update.'
                });
            } else {
                res.json({
                    'Status': 'done',
                    'messages': {
                        'title': 'Well!',
                        'text': 'Endpoint specifications updated.'
                    }
                });
            }
        }));
    } else {
        res.json({
            'Error': 'Missing required data.',
            'title': 'Oops!',
            'text': 'Missing required data.'
        });
    }
});

// POST /dashboard/api/webhooks/delete
router.post('/api/webhooks/delete', (req, res) => {
    const user_id = req.isAuthenticated() ? req.session.user._id : false;
    const webhook_id = req.body.webhook_id != '' && req.body.webhook_id != null && req.body.webhook_id != undefined ? req.body.webhook_id : false;
    if (webhook_id && user_id) {
        db.Webhook.deleteOne({
            _id: webhook_id,
            user_id: user_id
        }).then(confirm => {
            if (confirm) {
                db.WebhookEvent.deleteMany({
                    user_id: user_id,
                    webhook_id: webhook_id
                }).then(confirm => {
                    if (confirm) {
                        res.json({
                            'Status': 'done',
                            'messages': {
                                'title': 'Well!',
                                'text': 'Endpoint deleted.'
                            }
                        });
                    }
                }).catch(err => {
                    res.json({
                        'Error': err,
                        'title': 'Oops!',
                        'text': 'We have delete this endpoint but for some reason we can not delete it\'s events...'
                    });
                });
            }
        }).catch(err => {
            res.json({
                'Error': err,
                'title': 'Oops!',
                'text': 'We can not delete this endpoint.'
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

/*
 *   TEST PASSED.
 *   Verify if the license is valid
 */
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

/*
 *   TEST PASSED.
 *   Verify if the license is valid
 */
function verifyLicense(req, res, next) {
    const user_id = req.isAuthenticated() ? req.session.user._id : false;
    const license = user_id ? req.session.user.license_id : false;
    if (user_id && license) {
        db.License.find({
            user_id: user_id,
            license_id: license
        }, (err, license) => {
            if (err) {
                return res.status(500).json(err);
            } else {
                if (license.length > 0) {
                    const license_status = license[0].active;
                    const license_expiration = license[0].expiration_time;
                    const time_now = Math.round(Date.now() / 1000);
                    if (license_status && license_expiration > time_now) {
                        return next();
                    } else {
                        return res.status(500).json({
                            'Error': 'License expired.'
                        });
                    }
                } else {
                    return res.status(500).json({
                        'Error': 'License ID not exist.'
                    });
                }
            }
        });
    } else {
        return res.status(403).json({
            'Error': 'Access denied.'
        });
    }
}

module.exports = router;