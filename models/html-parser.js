class HtmlParser {

    constructor(htmlString) {
        this.favicon = undefined;
        const JSDOM = require("jsdom").JSDOM;
        this.dom = new JSDOM(htmlString);
    }

    getFavicon(done) {
        let favicon = undefined;
        let nodeList = this.dom.window.document.getElementsByTagName("link");
        for (var i = 0; i < nodeList.length; i++) {
            if ((nodeList[i].getAttribute("rel") == "icon") || (nodeList[i].getAttribute("rel") == "shortcut icon")) {
                this.favicon = nodeList[i].getAttribute("href");
            }
        }
        return done(null, this.favicon);
    }

}

module.exports = HtmlParser