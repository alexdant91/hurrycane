const Config = require('../config/config');
const config = new Config();
const Country = require('../config/country');
const country = new Country();
const express = require('express');
const db = require('../models/db');
const isUrl = require('is-url');
const router = express.Router();
const PaymentSystem = require('../modules/payment-system/v1')(config.stripe.secretKey);
const uuid = require('uuid/v4');
const bcrypt = require('bcrypt-nodejs');
const fs = require('fs');

// Languages support
const localLanguage = require('../models/local-language');

router.use(localLanguage({
    default: 'en_EN'
}))

router.get('/', (req, res) => {
    res.render('../view/docs/index', {
        session: req.isAuthenticated(),
        translation: req.translation,
        user: req.session.user,
        premium: config.premium,
        pageActive: 'docs',
        dir: '',
        page: 'index',
        menu: 'index'
    });
});

router.get('/:dir/:page', (req, res) => {
    res.render(`../view/docs/index`, {
        session: req.isAuthenticated(),
        translation: req.translation,
        user: req.session.user,
        premium: config.premium,
        pageActive: 'docs',
        dir: req.params.dir,
        page: req.params.page,
        menu: 'index'
    });
});

module.exports = router;