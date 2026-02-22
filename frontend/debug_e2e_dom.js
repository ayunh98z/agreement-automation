const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const logs = [];
  page.on('console', msg => logs.push({ type: 'console', text: msg.text() }));
  page.on('pageerror', err => logs.push({ type: 'pageerror', text: String(err && err.stack ? err.stack : err) }));
  try {
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle2', timeout: 60000 });
    await new Promise(r => setTimeout(r, 5000));
    const html = await page.content();
    fs.writeFileSync('page_after_load.html', html);
    fs.writeFileSync('page_console.json', JSON.stringify(logs, null, 2));
    console.log('WROTE page_after_load.html', html.length, 'logs:', logs.length);
  } catch (e) {
    console.error('ERROR', e && e.message);
    try {
      const html = await page.content();
      fs.writeFileSync('page_after_load_error.html', html);
      fs.writeFileSync('page_console_error.json', JSON.stringify(logs, null, 2));
      console.log('WROTE page_after_load_error.html', html.length, 'logs:', logs.length);
    } catch (err) {
      console.error('FAILED WRITE HTML', err && err.message);
    }
  } finally {
    await browser.close();
  }
})();
