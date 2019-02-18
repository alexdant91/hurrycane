rp = require('request-promise');
cheerio = require('cheerio');

class ScrapingPage {

    constructor(url) {
        this.url = url != '' && url != null && url != undefined ? url : false;
        if (!this.url) throw new Error("Missing required url.");
        return this;
    }

    async getMetaObjects(done) {
        await rp(this.url).then(function (html) {
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
                        href: elem.attribs.href
                    });
                }
            })
            $('meta').each(function (i, elem) {
                //console.log(elem.attribs);
                data.meta.push({
                    name: elem.attribs.name != undefined ? elem.attribs.name : null,
                    charset: elem.attribs.charset != undefined ? elem.attribs.charset : null,
                    property: elem.attribs.property != undefined ? elem.attribs.property : null,
                    content: elem.attribs.content != undefined ? elem.attribs.content : null
                });
            });
            return done(null, data);
        }).catch(function (err) {
            return done(err);
        });
    }

    async getHeadHTML(done) {
        await this.getMetaObjects((err, data) => {
            if (!err) {
                let html = [];
                html.push(`<title>${data.title[0].text}</title>`);
                data.link.forEach(elem => {
                    html.push(`<link rel="${elem.rel}" href="${elem.href}" />`);
                });
                data.meta.forEach(elem => {
                    elem.charset != undefined && elem.charset != null ? html.push(`<meta charset="${elem.charset}" />`) : false;
                    elem.name != undefined && elem.name != null ? html.push(`<meta name="${elem.name}" content="${elem.content}" />`) : false;
                    elem.property != undefined && elem.property != null ? html.push(`<meta property="${elem.property}" content="${elem.content}" />`) : false;
                });
                html = html.join("");
                return done(null, html);
            } else {
                return done(err);
            }
        });
    }

}

module.exports = ScrapingPage;