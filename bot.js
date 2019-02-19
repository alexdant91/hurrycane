const puppeteer = require('puppeteer');

async function getPic() {
    const browser = await puppeteer.launch({
        headless: false
    });
    const page = await browser.newPage();
    await page.goto('https://www.eatita.it/it');
    await page.setViewport({
        width: 1680,
        height: 860
    })
    await page.screenshot({
        path: 'google.png'
    });

    await browser.close();
}

getPic();