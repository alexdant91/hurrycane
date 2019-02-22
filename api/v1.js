const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// GET /api/
router.get('/', (req, res) => {
    res.json({
        api: 'API'
    });
});

router.get('/token', (req, res) => {

    let secretkey = req.body.secretkey != undefined ? req.body.secretkey : false;

    if (secretkey) {

        let user = {
            id: 1,
            username: 'alexdant91',
            email: 'alexdant91@gmail.com'
        };

        jwt.sign({
            user: user
        }, secretkey, {
            expiresIn: "60m"
        }, (err, token) => {
            res.json({
                token
            });
        });
    } else {
        res.sendStatus(500);
    }
});

router.post('/shorten', verifyToken, (req, res) => {

    let secretkey = req.body.secretkey != undefined ? req.body.secretkey : false;

    jwt.verify(req.token, secretkey, (err, authData) => {
        if (err) res.sendStatus(403);

        let longUrl = req.body.longUrl != undefined ? req.body.longUrl : false;
        let alias = req.body.alias != undefined ? req.body.alias : "randomalias";
        let password = req.body.password != undefined ? req.body.password : null;
        let description = req.body.description != undefined ? req.body.description : null;

        let response = {
            "longUrl": longUrl,
            "shortUrl": "http://localhost:3000/s/" + alias,
            "password": password,
            "description": description,
            "authData": authData
        }

        if (longUrl) {
            res.json(response);
        } else {
            res.sendStatus(500);
        }

    });

});

function verifyToken(req, res, next) {
    // Get the auth header value
    const bearerHeader = req.headers['authorization'];
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

module.exports = router;