const rp = require('request-promise');
const express = require('express');
const app = express();

const {
    google
} = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
    "458098400863-jbv7opdimpo7dvhqdomaj8rnplakkhnd.apps.googleusercontent.com",
    "AuqGbtuV1O5bVGFmA15PIRkK",
    ["http://localhost/auth/adsense"]
);

// generate a url that asks permissions for Blogger and Google Calendar scopes
const scopes = [
    'https://www.googleapis.com/auth/adsense'
];

const url = oauth2Client.generateAuthUrl({
    // 'online' (default) or 'offline' (gets refresh_token)
    access_type: 'offline',

    // If you only need one scope you can pass it as a string
    scope: scopes
});

app.get("/", function (req, res) {
    res.send(`
        <html>
            <body>
                <h1>Authentication using google oAuth</h1>
                <a href=${url}>Login</a>
            </body>
        </html>
    `)
});

// ga:adsenseRevenue

app.get("/auth/adsense", function (req, res) {
    var code = req.query.code;
    oauth2Client.getToken(code, function (err, tokens) {
        console.log("token: ", tokens.access_token);
        // Now tokens contains an access_token and an optional refresh_token. Save them.
        if (!err) {
            oauth2Client.setCredentials(tokens);
            const access_token = tokens.access_token;
            var options = {
                method: 'GET',
                uri: 'https://www.googleapis.com/adsense/v1.4/accounts/pub-9507004480504095/reports?startDate=2019-02-01&endDate=2019-02-15&metric=CLICKS&metric=EARNINGS&metric=IMPRESSIONS&metric=PAGE_VIEWS&dimension=AD_UNIT_CODE',
                json: true, // Automatically stringifies the body to JSON
                headers: {
                    /* 'content-type': 'application/x-www-form-urlencoded' */ // Is set automatically
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${access_token}`
                }
            };

            rp(options)
                .then(body => {
                    // POST succeeded...
                    res.json(body);
                })
                .catch(err => {
                    // POST failed...
                    res.json(err);
                });
        } else {
            res.json(err);
        }
    });
});

app.listen(80);

console.log(url);