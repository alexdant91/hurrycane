const express = require('express');
const db = require('../models/db');
const isUrl = require('is-url');
const router = express.Router();

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

module.exports = router;