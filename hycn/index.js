// Config
const Config = require('../config/config');
const config = new Config();
const Country = require('../config/country');
const country = new Country();
const fs = require('fs');
const db = require('../models/db');
const express = require('express');
const bcrypt = require('bcrypt-nodejs');
const puppeteer = require('puppeteer');
const device = require('express-device');
const sharp = require('sharp');
const router = express.Router();

router.use(device.capture());
router.use(express.static(__dirname + '/../public', {
    dotfiles: 'allow'
}));

// router.get('/', (req, res) => {
//     res.status(200).json({
//         'Page': '/'
//     })
// });

// Shorten link alias retrive logic
router.get('/:alias', (req, res) => {
    const alias = req.params.alias != undefined && req.params.alias != null && req.params.alias != '' ? req.params.alias : false;
    const referer = req.headers.referer != '' && req.headers.referer != null && req.headers.referer != undefined ? req.headers.referer.split('/')[2] : 'unknown';
    const accepted = req.headers['accept-language'] != null && req.headers['accept-language'] != undefined ? req.headers['accept-language'].split(';')[0] : undefined;
    const acceptedLanguage = accepted != undefined ? `${accepted.split(',')[0].replace(/-/ig, '_')}.UTF-8` : undefined;
    const language = acceptedLanguage || (process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || process.env.LC_MESSAGES);
    const location = country.findCounryNameFromCode(language.split('_')[0]);
    if (alias) {
        db.Url.find({
            alias: alias
        }, (err, docs) => {
            if (err) res.redirect('/?error=alias_not_founded');
            const time_now = Math.round(Date.now() / 1000);
            const expiration_time = docs[0].expiration_time;
            if (time_now < expiration_time) {

                // Update the clicks general counter
                // Register the new referer if there's no one
                // Update the referer if there's one
                const clicks = docs[0].clicks + 1;
                db.Url.updateOne({
                    _id: docs[0]._id
                }, {
                    clicks: clicks
                }, (err, confirm) => {
                    if (err) console.log(err);
                    if (confirm) {

                        const password = docs[0].password;
                        if (password != null) {
                            res.render('alias', {
                                // session: req.isAuthenticated(),
                                // user: req.session.user,
                                page: 'alias',
                                alias: alias,
                                messages: {
                                    type: null,
                                    title: null,
                                    text: null
                                }
                            });
                        } else {

                            // First location 
                            const long_url_location = docs[0].geo_select.indexOf(location) !== -1 ? docs[0].geotag_url : docs[0].long_url;
                            // Then device
                            const long_url = docs[0].device_select.indexOf(req.device.type) !== -1 ? docs[0].devicetag_url : long_url_location;

                            res.render('s', {
                                // session: req.isAuthenticated(),
                                // user: req.session.user,
                                page: 's',
                                iframe: `${config.host}/s/${alias}`,
                                alias: alias,
                                long_url: long_url,
                                url: docs[0],
                                messages: {
                                    type: null,
                                    title: null,
                                    text: null
                                }
                            });
                            // res.redirect(docs[0].long_url);
                        }
                    }
                });
            } else {
                let err = new Error('The link was expired yet.');
                throw err;
            }

        });
    } else {
        res.redirect('/?error=empty_alias');
    }
});

// Shorten link password protection verify
router.post('/p/verify', (req, res) => {
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
    const browser = await puppeteer.launch({
        'args': [
            '--disable-gpu', '--disable-dev-shm-usage', '--disable-setuid-sandbox', '--no-first-run', '--no-sandbox', '--no-zygote', '--single-process'
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
    const browser = await puppeteer.launch({
        'args': [
            '--disable-gpu', '--disable-dev-shm-usage', '--disable-setuid-sandbox', '--no-first-run', '--no-sandbox', '--no-zygote', '--single-process'
        ]
    });
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

module.exports = router;