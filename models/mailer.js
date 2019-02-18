class Mailer {

    constructor(config) {
        this.nodemailer = require('nodemailer');
        this.config = config;
        this.message = {};
        this.transporter = this.nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: {
                user: config.auth.user,
                pass: config.auth.pass
            }
        });
    }

    set(param) {
        this.message.from = param.from != '' && param.from != null && param.from != undefined ? param.from : null;
        this.message.to = param.to != '' && param.to != null && param.to != undefined ? param.to : null;
        this.message.subject = param.subject != '' && param.subject != null && param.subject != undefined ? param.subject : null;
        this.message.text = param.text != '' && param.text != null && param.text != undefined ? param.text : null;
        this.message.html = param.html != '' && param.html != null && param.html != undefined ? param.html : null;
        return this;
    }

    async send(done) {
        const from = this.message.from != '' && this.message.from != null && this.message.from != undefined ? this.message.from : false;
        const to = this.message.to != '' && this.message.to != null && this.message.to != undefined ? this.message.to : false;
        const subject = this.message.subject != '' && this.message.subject != null && this.message.subject != undefined ? this.message.subject : false;
        const text = this.message.text != '' && this.message.text != null && this.message.text != undefined ? this.message.text : null;
        const html = this.message.html != '' && this.message.html != null && this.message.html != undefined ? this.message.html : false;
        if (from && to && subject && html) {
            await this.transporter.sendMail({
                from: from,
                to: to,
                subject: subject,
                text: text,
                html: html
            }).then(info => {
                return done(null, info);
            }).catch(err => {
                return done(err);
            });
        } else {
            return await done({
                'Error': 'Missing required parameters.'
            });
        }
    }

}

module.exports = Mailer;