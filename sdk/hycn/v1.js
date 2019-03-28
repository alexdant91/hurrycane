class Hycn {    
    constructor(application_id, secret_key) {
        this.rp = require('request-promise');
        this.host = "localhost" //"hurrycane.it"
        this.application_id = application_id;
        this.secret_key = secret_key;
        this.token;

        this.link = {
            shorten: (token, long_url, done) => {
                return this.getShortLink(token, long_url, done)
            },
            direct: (token, long_url, done) => {
                return this.getShortLinkDirect(token, long_url, done)
            },
            update: (token, body, done) => {
                return this.updateShortLink(token, body, done)
            },
            delete: (token, url_id, done) => {
                return this.deleteShortLink(token, url_id, done)
            },
            retrieve: (token, url_id, done) => {
                return this.retrieveShortLink(token, url_id, done)
            },
            all: (token, done) => {
                return this.retrieveAllShortLink(token, done)
            },
            paginate: (token, param, done) => {
                return this.paginateAllShortLink(token, param, done)
            }
        };
    }

    token(email, password, done) {
        email = email != '' && email != null && email != undefined && typeof email === "string" ? email : false;
        password = password != '' && password != null && password != undefined && typeof password === "string" ? password : false;
        if (email && password) {
            this.rp({
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${Buffer.from(`${email}:${password}`).toString('base64')}`,
                    'Secretkey': this.secret_key
                },
                uri: `http://api.${this.host}/v1/token?id=${this.application_id}`,
                json: true
            }).then(token => {
                return done(null, token);
            }).catch(err => {
                return done(err.error);
            });
        } else {
            return done({
                'Error': 'Missing required data (email or/and password).'
            });
        }
    }

    getShortLink(token, long_url, done) {
        token = token != '' && token != null && token != undefined && typeof token === "string" ? token : false;
        long_url = long_url != '' && long_url != null && long_url != undefined && typeof long_url === "string" ? long_url : false;
        if (token && long_url) {
            this.rp({
                method: 'POST',
                headers: {
                    "Token": token,
                    "Secretkey": this.secret_key,
                    "Connection": "keep-alive",
                    "Content-Type": 'application/json'
                },
                body: {
                    "long_url": long_url
                },
                uri: `http://api.${this.host}/v1/shorten?id=${this.application_id}`,
                json: true
            }).then(response => {
                return done(null, response);
            }).catch(err => {
                return done(err.error);
            });
        } else {
            return done({
                'Error': 'Missing required data (token or/and long_url).'
            });
        }
    }

    getShortLinkDirect(token, long_url, done) {
        token = token != '' && token != null && token != undefined && typeof token === "string" ? token : false;
        long_url = long_url != '' && long_url != null && long_url != undefined && typeof long_url === "string" ? long_url : false;
        if (token && long_url) {
            this.rp({
                method: 'POST',
                headers: {
                    "Token": token,
                    "Secretkey": this.secret_key,
                    "Connection": "keep-alive",
                    "Content-Type": 'application/json'
                },
                body: {
                    "long_url": long_url
                },
                uri: `http://api.${this.host}/v1/shorten/direct?id=${this.application_id}`,
                json: true
            }).then(response => {
                return done(null, response);
            }).catch(err => {
                return done(err.error);
            });
        } else {
            return done({
                'Error': 'Missing required data (token or/and long_url).'
            });
        }
    }

    updateShortLink(token, body, done) {
        token = token != '' && token != null && token != undefined && typeof token === "string" ? token : false;
        if (token) {
            this.rp({
                method: 'PUT',
                headers: {
                    "Token": token,
                    "Secretkey": this.secret_key,
                    "Connection": "keep-alive",
                    "Content-Type": 'application/json'
                },
                body: body,
                uri: `http://api.${this.host}/v1/shorten`,
                json: true
            }).then(response => {
                return done(null, response);
            }).catch(err => {
                return done(err.error);
            });
        } else {
            return done({
                'Error': 'Missing required data (token).'
            });
        }
    }

    deleteShortLink(token, url_id, done) {
        token = token != '' && token != null && token != undefined && typeof token === "string" ? token : false;
        url_id = url_id != '' && url_id != null && url_id != undefined && typeof url_id === "string" ? url_id : false;
        if (token && url_id) {
            this.rp({
                method: 'DELETE',
                headers: {
                    "Token": token,
                    "Secretkey": this.secret_key,
                    "Connection": "keep-alive",
                    "Content-Type": 'application/json'
                },
                body: {
                    "url_id": url_id
                },
                uri: `http://api.${this.host}/v1/shorten`,
                json: true
            }).then(response => {
                return done(null, response);
            }).catch(err => {
                return done(err.error);
            });
        } else {
            return done({
                'Error': 'Missing required data (token or/and url_id).'
            });
        }
    }

    retrieveShortLink(token, url_id, done) {
        token = token != '' && token != null && token != undefined && typeof token === "string" ? token : false;
        url_id = url_id != '' && url_id != null && url_id != undefined && typeof url_id === "string" ? url_id : false;
        if (token && url_id) {
            this.rp({
                method: 'GET',
                headers: {
                    "Token": token,
                    "Secretkey": this.secret_key,
                    "Connection": "keep-alive",
                    "Content-Type": 'application/json'
                },
                uri: `http://api.${this.host}/v1/link?id=${url_id}`,
                json: true
            }).then(response => {
                return done(null, response);
            }).catch(err => {
                return done(err.error);
            });
        } else {
            return done({
                'Error': 'Missing required data (token or/and url_id).'
            });
        }
    }

    retrieveAllShortLink(token, done) {
        token = token != '' && token != null && token != undefined && typeof token === "string" ? token : false;
        if (token) {
            this.rp({
                method: 'GET',
                headers: {
                    "Token": token,
                    "Secretkey": this.secret_key,
                    "Connection": "keep-alive",
                    "Content-Type": 'application/json'
                },
                uri: `http://api.${this.host}/v1/link/all`,
                json: true
            }).then(response => {
                return done(null, response);
            }).catch(err => {
                return done(err.error);
            });
        } else {
            return done({
                'Error': 'Missing required data (token).'
            });
        }
    }

    paginateAllShortLink(token, param, done) {
        token = token != '' && token != null && token != undefined && typeof token === "string" ? token : false;
        if (token) {
            const page = param.page != '' && param.page != null && param.page != undefined ? param.page : 1;
            const limit = param.limit != '' && param.limit != null && param.limit != undefined ? param.limit : 18;
            this.rp({
                method: 'GET',
                headers: {
                    "Token": token,
                    "Secretkey": this.secret_key,
                    "Connection": "keep-alive",
                    "Content-Type": 'application/json'
                },
                uri: `http://api.${this.host}/v1/link/paginate?page=${page}&limit=${limit}`,
                json: true
            }).then(response => {
                return done(null, response);
            }).catch(err => {
                return done(err.error);
            });
        } else {
            return done({
                'Error': 'Missing required data (token).'
            });
        }
    }

}

module.exports = Hycn;

// const hycn = new Hycn('5c74e68c198689170305a334', '6075cf3c-85d5-43d0-9ef1-d1cf7cd937d8');

// hycn.token("alexdant91@gmail.com", "18Gmgaa2'", (err, token) => {
//     console.log(token);
// });

// hycn.link.direct('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InVzZXIiOiI1YzczMTMyMDZhZTI4YjcwNzZiOTBjZDgiLCJwbGFuIjoiUFJFTUlVTSIsImFwcCI6IjVjNzRlNjhjMTk4Njg5MTcwMzA1YTMzNCIsIm9yaWdpbiI6Imh0dHA6Ly9hcGkubG9jYWxob3N0In0sImlhdCI6MTU1Mzc2MzM0NiwiZXhwIjoxNTUzNzY2OTQ2fQ.aTqXWb6clQAE2rOhfLtc-pjLA9ad6WjkEyupRY0J51o', 'https://www.uplabs.com/posts/software-testing-illustration', (err, response) => {
//     console.log(err, response);
// });

// hycn.link.delete('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InVzZXIiOiI1YzczMTMyMDZhZTI4YjcwNzZiOTBjZDgiLCJwbGFuIjoiUFJFTUlVTSIsImFwcCI6IjVjNzRlNjhjMTk4Njg5MTcwMzA1YTMzNCIsIm9yaWdpbiI6Imh0dHA6Ly9hcGkubG9jYWxob3N0In0sImlhdCI6MTU1Mzc2MzM0NiwiZXhwIjoxNTUzNzY2OTQ2fQ.aTqXWb6clQAE2rOhfLtc-pjLA9ad6WjkEyupRY0J51o', '5c9c95d80405b0398fb60c7e', (err, response) => {
//     console.log(err, response);
// });

// hycn.link.update('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InVzZXIiOiI1YzczMTMyMDZhZTI4YjcwNzZiOTBjZDgiLCJwbGFuIjoiUFJFTUlVTSIsImFwcCI6IjVjNzRlNjhjMTk4Njg5MTcwMzA1YTMzNCIsIm9yaWdpbiI6Imh0dHA6Ly9hcGkubG9jYWxob3N0In0sImlhdCI6MTU1Mzc2MzM0NiwiZXhwIjoxNTUzNzY2OTQ2fQ.aTqXWb6clQAE2rOhfLtc-pjLA9ad6WjkEyupRY0J51o', {
//     "url_id": "5c9c9739ac9a3539c71e6c0c",
//     "properties": {
//         "description": "A brand new description",
//         "password": "123456",
//         "expires": "1551095793"
//     },
//     "rules": {
//         "geo_tag": ["Italy", "France"],
//         "geo_tag_url": "https://www.google.it",
//         "device_tag": ["smartphone", "tablet"],
//         "device_tag_url": "https://www.google.it"
//     },
//     "seo": {
//         "seo_title": "Brand new seo title",
//         "seo_description": "Brand new seo description"
//     }
// }, (err, response) => {
//     console.log(err, response);
// });

// hycn.link.retrieve('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InVzZXIiOiI1YzczMTMyMDZhZTI4YjcwNzZiOTBjZDgiLCJwbGFuIjoiUFJFTUlVTSIsImFwcCI6IjVjNzRlNjhjMTk4Njg5MTcwMzA1YTMzNCIsIm9yaWdpbiI6Imh0dHA6Ly9hcGkubG9jYWxob3N0In0sImlhdCI6MTU1Mzc2NzAzMywiZXhwIjoxNTUzNzcwNjMzfQ.XeKBD7xv6E65TyxP36dmlEdfvNGZS6ekga3nFWYelNQ',
// '5c9c9739ac9a3539c71e6c0c', (err, response) => {
//     console.log(err, response);
// });

// hycn.link.all('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InVzZXIiOiI1YzczMTMyMDZhZTI4YjcwNzZiOTBjZDgiLCJwbGFuIjoiUFJFTUlVTSIsImFwcCI6IjVjNzRlNjhjMTk4Njg5MTcwMzA1YTMzNCIsIm9yaWdpbiI6Imh0dHA6Ly9hcGkubG9jYWxob3N0In0sImlhdCI6MTU1Mzc2NzAzMywiZXhwIjoxNTUzNzcwNjMzfQ.XeKBD7xv6E65TyxP36dmlEdfvNGZS6ekga3nFWYelNQ', (err, response) => {
//     console.log(err, response);
// });

// hycn.link.paginate('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7InVzZXIiOiI1YzczMTMyMDZhZTI4YjcwNzZiOTBjZDgiLCJwbGFuIjoiUFJFTUlVTSIsImFwcCI6IjVjNzRlNjhjMTk4Njg5MTcwMzA1YTMzNCIsIm9yaWdpbiI6Imh0dHA6Ly9hcGkubG9jYWxob3N0In0sImlhdCI6MTU1Mzc2NzAzMywiZXhwIjoxNTUzNzcwNjMzfQ.XeKBD7xv6E65TyxP36dmlEdfvNGZS6ekga3nFWYelNQ',
//     {
//         page: 1,
//         limit: 18
//     }, (err, response) => {
//     console.log(err, response);
// });