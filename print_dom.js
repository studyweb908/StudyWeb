const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  
  // Wait for React to mount
  await page.waitForSelector('#root');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const html = await page.evaluate(() => {
    const el = document.querySelector('div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > main#workspace-main-content:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(3) > div:nth-of-type(2) > button:nth-of-type(1)');
    return el ? el.outerHTML : 'NOT FOUND';
  });
  
  console.log(html);
  await browser.close();
})();
