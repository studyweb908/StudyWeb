const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  
  await page.waitForSelector('#workspace-main-content');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const elHTML = await page.evaluate(() => {
    const exactSelector = 'div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > main#workspace-main-content:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > div:nth-of-type(3)';
    const el = document.querySelector(exactSelector);
    if (!el) {
        // Find by fallback just in case
        return 'NOT FOUND';
    }
    return el.outerHTML;
  });
  
  require('fs').writeFileSync('found.txt', elHTML || 'empty');
  await browser.close();
})();
