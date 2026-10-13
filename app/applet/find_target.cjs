const puppeteer = require('puppeteer');
(async () => {
  try {
    const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto('http://localhost:3000');
    // Set logged in and user in localStorage
    await page.evaluate(() => {
      localStorage.setItem('studyweb_is_logged_in', 'true');
      localStorage.setItem('studyweb_onboarding_complete', 'true');
      localStorage.setItem('studyweb_profile_name', 'Alex');
      sessionStorage.setItem('studyweb_welcome_shown_session', 'true');
      sessionStorage.setItem('studyweb_active_task', 'workspaces');
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));
    
    // Evaluate selector
    const selector = 'div#root:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(2) > main#workspace-main-content:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1) > div:nth-of-type(1)';
    const el = await page.$(selector);
    if (el) {
      const info = await page.evaluate(e => ({
        tag: e.tagName,
        className: e.className,
        text: e.innerText ? e.innerText.substring(0, 300) : '',
        html: e.outerHTML ? e.outerHTML.substring(0, 500) : ''
      }), el);
      console.log('FOUND EXACT ELEMENT:\n', JSON.stringify(info, null, 2));
    } else {
      console.log('Element not found directly. Checking main#workspace-main-content...');
      const main = await page.$('main#workspace-main-content');
      console.log('main#workspace-main-content exists:', !!main);
      if (main) {
        const chain = await page.evaluate(m => {
          let curr = m;
          const res = [];
          for (let i = 0; i < 8; i++) {
            if (!curr) break;
            const firstDiv = curr.querySelector(':scope > div');
            if (firstDiv) {
              res.push({
                level: i + 1,
                tag: firstDiv.tagName,
                className: firstDiv.className,
                textSnippet: firstDiv.innerText ? firstDiv.innerText.substring(0, 150).replace(/\n/g, ' ') : ''
              });
              curr = firstDiv;
            } else {
              res.push({ level: i + 1, note: 'no child div' });
              break;
            }
          }
          return res;
        }, main);
        console.log('Chain inside main:\n', JSON.stringify(chain, null, 2));
      }
    }
    await browser.close();
  } catch (err) {
    console.error('Error:', err);
  }
})();
