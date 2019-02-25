const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const fs = require('fs');

async function getHeadHTML(url, done) {
    const browser = await puppeteer.launch();
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

getHeadHTML('https://stackoverflow.com/questions/21162097/node-js-string-replace-doesnt-work', (html) => {
    headHTML(html, (html_head) => {
        fs.writeFileSync('head.html', html_head);
    });
});





// const puppeteer = require('puppeteer');
// const sharp = require('sharp');
// const fs = require('fs');

// async function getPic(param, done) {
//     let error, confirm;
//     const path = param.live_path; // './public/img/thumbnails/image.png';
//     const temp_path = param.temp_path; // `./public/img/temp/temp-${Date.now()}.png`;
//     const browser = await puppeteer.launch();
//     const page = await browser.newPage();
//     await page.goto('https://www.eatita.it/it');
//     await page.setViewport({
//         width: 1480,
//         height: 860,
//         // width: 640,
//         // height: 372,
//     })
//     await page.screenshot({
//         //encoding: 'base64'
//         path: temp_path
//     }).then(image => {
//         sharp(temp_path).resize(640, 372).toFile(path, (err) => {
//             fs.unlinkSync(temp_path, (err) => {
//                 error = err ? err : null;
//                 confirm = err ? false : true;
//             });
//         });
//     }).catch(err => {
//         error = err ? err : null;
//         confirm = err ? false : true;
//     });
//     await browser.close();
//     return done(error, confirm);
// }

// getPic({
//     live_path: './public/img/thumbnails/image.png',
//     temp_path: `./public/img/temp/temp-${Date.now()}.png`
//     //}, (err, confirm) => {
//     // console.log(err, confirm);
// }, (err, confirm) => {
//     console.log(err, confirm);
// });