const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const buttonsHTML = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    return buttons.map((b, i) => `[${i}] ${b.outerHTML.substring(0, 150)}...`).join('\n');
  });
  
  require('fs').writeFileSync('buttons.txt', buttonsHTML || 'empty');
  await browser.close();
})();
