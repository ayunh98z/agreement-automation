const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const out = { errors: [], modal: null, buttons: [], console: [] };
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => out.console.push(msg.text()));

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

    // try login if login form present
    try {
      if (await page.$('#username')) {
        await page.type('#username', 'admin', { delay: 20 });
        await page.type('#password', 'admin123', { delay: 20 });
        await Promise.all([
          page.click('.sign-in-btn'),
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
        ]);
      }
    } catch (e) { /* ignore */ }

    // navigate to UV Agreement via sidebar
    await page.waitForSelector('.sidebar-menu', { timeout: 10000 });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const a = btns.find(b => b.textContent && b.textContent.trim().includes('Agreement'));
      if (a) a.click();
    });
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const uv = btns.find(b => b.textContent && b.textContent.trim().includes('UV Agreement'));
      if (uv) uv.click();
    });
    await new Promise(r => setTimeout(r, 800));

    // list available action buttons
    out.buttons = await page.$$eval('.user-management-actions button', els => els.map(e => e.textContent.trim()));

    // click Add Contract then inspect modal
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.user-management-actions button'));
      const b = btns.find(x => x.textContent && x.textContent.trim() === 'Add Contract');
      if (!b) return false;
      b.click();
      return true;
    });
    await new Promise(r => setTimeout(r, 600));

    // find modal elements
    const modalOverlay = await page.$('.modal-overlay');
    const modalContent = await page.$('.modal-content') || await page.$('.modal');

    if (!modalOverlay && !modalContent) {
      out.modal = { present: false };
    } else {
      // get computed styles and bounding rect
      out.modal = { present: true };
      if (modalOverlay) {
        out.modal.overlay = await page.evaluate(el => {
          const s = window.getComputedStyle(el);
          const r = el.getBoundingClientRect();
          return { display: s.display, visibility: s.visibility, opacity: s.opacity, zIndex: s.zIndex, width: r.width, height: r.height, top: r.top, left: r.left };
        }, modalOverlay);
      }
      if (modalContent) {
        out.modal.content = await page.evaluate(el => {
          const s = window.getComputedStyle(el);
          const r = el.getBoundingClientRect();
          const inViewport = r.top < window.innerHeight && r.bottom > 0 && r.left < window.innerWidth && r.right > 0;
          return { display: s.display, visibility: s.visibility, opacity: s.opacity, zIndex: s.zIndex, width: r.width, height: r.height, top: r.top, left: r.left, inViewport };
        }, modalContent);

        // take screenshot of the modal area
        const clip = await page.evaluate(el => {
          const r = el.getBoundingClientRect();
          return { x: Math.max(0, r.left), y: Math.max(0, r.top), width: Math.min(window.innerWidth, r.width), height: Math.min(window.innerHeight, r.height) };
        }, modalContent);

        try {
          const image = await page.screenshot({ clip, type: 'png' });
          const path = require('path').join(__dirname, 'modal_snapshot.png');
          fs.writeFileSync(path, image);
          out.modal.screenshot = path;
        } catch (e) {
          out.modal.screenshotError = String(e);
        }
      }
    }

  } catch (err) {
    out.errors.push(String(err));
  } finally {
    await browser.close();
    console.log('MODAL_VISIBILITY_RESULT:' + JSON.stringify(out, null, 2));
    process.exit(0);
  }
})();
