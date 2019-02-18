class BrowserlessUtils {
    constructor(param) {
        this.browserless = require('browserless')();
        this.fs = require('fs');
        this.url = param.url != '' && param.url != null && param.url != undefined ? param.url : false;
        this.savepath = param.savepath != '' && param.savepath != null && param.savepath != undefined ? param.savepath : `./file-${Date.now()}`;
        this.device = param.device != '' && param.device != null && param.device != undefined ? param.device : 'Macbook Pro 15';
        if (!this.url) {
            const err = new Error('Missing required paramenters.');
            throw (err);
        }
    }

    async screenshot(done) {
        await this.browserless.screenshot(this.url, {
            device: this.device
        }).then(buffer => {
            this.fs.writeFile(`${this.savepath}.jpeg`, buffer, 'binary', err => {
                if (err) return done(err);
                return done(null, true);
            });
        }).catch(err => {
            return done(err);
        });
    }

    async html(done) {
        await this.browserless.html(this.url, {}).then(html => {
            return done(null, html)
        }).catch(err => {
            return done(err);
        });
    }

    async pdf(done) {
        await this.browserless.pdf(this.url, {}).then(pdf => {
            this.fs.writeFile(`${this.savepath}.pdf`, pdf, 'binary', err => {
                if (err) return done(err);
                return done(null, true);
            });
        }).catch(err => {
            return done(err);
        });
    }
}

module.exports = BrowserlessUtils;

// new BrowserlessUtils({
//     url: 'https://github.com/Kikobeats/browserless/blob/master/packages/examples/src/devices.js'
// }).pdf((err, confirm) => {
//     console.log(err, confirm);
// });