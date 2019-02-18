const request = require('request');
const cheerio = require('cheerio');
const isUrl = require('is-url');
const path = require('path');
const getColors = require('get-image-colors');
var probe = require('probe-image-size');

const url = 'https://microlink.io/';

request(url, (error, response, html) => {
    if (!error && response.statusCode == 200) {
        const $ = cheerio.load(html);
        let parsed = {};
        $('html').each(function (i, element) {
            parsed.lang = $(this).attr('lang');
            parsed.author = $(this).find('meta[name="author"]').attr('content');
            parsed.title = $(this).find('title').text();
            let find_image = $(this).find('meta[property="og:image"]').attr('content');
            parsed.image = {
                url: find_image != undefined ? (isUrl(find_image) ? find_image : url + '/' + find_image) : undefined,
                width: $(this).find('meta[property="og:image:width"]').attr('content'),
                height: $(this).find('meta[property="og:image:height"]').attr('content'),
            };
            parsed.description = $(this).find('meta[name="description"]').attr('content');
            parsed.audio = $(this).find('audio').attr('src');
            parsed.video = $(this).find('video').attr('src');
            let find_logo = $(this).find('link[rel="icon"]').attr('href');
            parsed.logo = {
                url: find_logo != undefined ? (isUrl(find_logo) ? find_logo : url + '/' + find_logo) : undefined
            };
            parsed.url = url;
        });

        parsed.image.url = parsed.image.url != undefined ? parsed.image.url : (parsed.logo.url != undefined ? parsed.logo.url : undefined);
        parsed.logo.url = parsed.logo.url != undefined ? parsed.logo.url : (parsed.image.url != undefined ? parsed.image.url : undefined);

        if (parsed.image.url != undefined && parsed.logo.url != undefined) {

            // Get the colours of cover image
            getColors(parsed.image.url).then(colors => {
                colors = colors.map(color => color.hex());
                parsed.image.colors = colors;

                probe(parsed.image.url, function (err, result) {
                    parsed.image.width = result.width;
                    parsed.image.height = result.height;
                    parsed.image.type = result.type;
                    parsed.image.mime = result.mime;

                    // Get the colours of cover image
                    getColors(parsed.logo.url).then(colors => {
                        colors = colors.map(color => color.hex());
                        parsed.logo.colors = colors;

                        probe(parsed.logo.url, function (err, result) {
                            parsed.logo.width = result.width;
                            parsed.logo.height = result.height;
                            parsed.logo.type = result.type;
                            parsed.logo.mime = result.mime;

                            // Log our finished parse results in the terminal
                            console.log(parsed);
                        });

                    }).catch(err => {
                        console.log(err);
                    });

                });

            }).catch(err => {
                console.log(err);
            });

        } else if (parsed.image.url == undefined && parsed.logo.url != undefined) {
            // Get the colours of cover image
            getColors(parsed.logo.url).then(colors => {
                colors = colors.map(color => color.hex());
                parsed.logo.colors = colors;

                probe(parsed.logo.url, function (err, result) {
                    parsed.logo.width = result.width;
                    parsed.logo.height = result.height;
                    parsed.logo.type = result.type;
                    parsed.logo.mime = result.mime;

                    // Log our finished parse results in the terminal
                    console.log(parsed);
                });

            }).catch(err => {
                console.log(err);
            });
        } else if (parsed.image.url == undefined && parsed.logo.url == undefined) {
            console.log(parsed);
        }

    } else {
        console.log(error);
    }
});