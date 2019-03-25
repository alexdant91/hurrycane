const fs = require('fs');

const LocalLanguage = (options) => (req, res, next) => {
    const accepted = req.headers['accept-language'] != null && req.headers['accept-language'] != undefined ? req.headers['accept-language'].split(';')[0] : undefined;
    const acceptedLanguage = accepted != undefined ? `${accepted.split(',')[0].replace(/-/ig, '_')}.UTF-8` : undefined;
    const clientBrowserLanguage = acceptedLanguage || (process.env.LANG || process.env.LANGUAGE || process.env.LC_ALL || process.env.LC_MESSAGES);
    const browser_language = options.browserLanguage != '' && options.browserLanguage != null && options.browserLanguage != undefined ? options.browserLanguage : false;
    const clang_query = req.query.clang != '' && req.query.clang != null && req.query.clang != undefined ? req.query.clang : false;
    const settings = JSON.parse(fs.readFileSync(`${__dirname}/../public/languages/settings.json`, 'utf8'));
    const default_language = !browser_language ? (options.default != '' && options.default != null && options.default != undefined ? options.default : settings.default) : clientBrowserLanguage;
    const supported_languages = settings.supported_languages;
    const languages = settings.languages;
    const current_lang = !clang_query ? (req.cookies.clang != '' && req.cookies.clang != null && req.cookies.clang != undefined ? req.cookies.clang : default_language) : clang_query;
    
    // Check for the supported languages
    const current_language = supported_languages.indexOf(current_lang) !== -1 ? current_lang : 'en_EN';
    
    const translationsPath = options.translationsPath != undefined && options.translationsPath != null ? options.translationsPath : `${__dirname}/../public/languages/${current_language}.json`;

    if (req.cookies.clang == null || req.cookies.clang == undefined || clang_query) {
        res.cookie('clang', current_language, {
            httpOnly: true
        });
    } 
    
    req.translation = JSON.parse(fs.readFileSync(translationsPath, 'utf8'));
    req.clang = current_language;
    req.languages = languages;
    next();
}

module.exports = LocalLanguage;
