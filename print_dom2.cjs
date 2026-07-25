const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:3000');
  
  // Wait for React to mount
  await page.waitForSelector('#root');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const elHTML = await page.evaluate(() => {
    const el = document.querySelector('div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > main#workspace-main-content:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1)');
    return el ? el.outerHTML : 'NOT FOUND IN DASHBOARD';
  });
  
  console.log("DASHBOARD DOM Element:", elHTML);
  
  await browser.close();
})();
