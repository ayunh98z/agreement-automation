const puppeteer = require('puppeteer');

(async () => {
  const result = { errors: [], network: [] };
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => {
    try { result.network.push({ type: 'console', text: msg.text() }); } catch (e) {}
  });

  page.on('requestfinished', async req => {
    try {
      const url = req.url();
      if (url.includes('/api/')) {
        const r = { url, method: req.method() };
        try { r.response = { status: req.response().status(), headers: req.response().headers() }; } catch (e) {}
        result.network.push(r);
      }
    } catch (e) {}
  });

  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });

    // If login page present, perform login with test admin credentials
    try {
      if (await page.$('#username')) {
        await page.type('#username', 'admin', { delay: 50 });
        await page.type('#password', 'admin123', { delay: 50 });
        await Promise.all([
          page.click('.sign-in-btn'),
          page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {}),
        ]);
          await new Promise(r => setTimeout(r, 800));
      }
    } catch (e) {
      // ignore login errors; proceed to check if already logged in
    }

    // navigate via sidebar: open Agreement -> UV Agreement
    await page.waitForSelector('.sidebar-menu', { timeout: 10000 });
    // click Agreement menu item (by text) and UV Agreement submenu
    const clickByText = async (text, root = 'document') => {
      return await page.evaluate((t) => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(el => el.textContent && el.textContent.trim().includes(t));
        if (!b) return false;
        b.click();
        return true;
      }, text);
    };

    await clickByText('Agreement');
      await new Promise(r => setTimeout(r, 300));
    await clickByText('UV Agreement');
      await new Promise(r => setTimeout(r, 800));

    // wait for user actions area
    await page.waitForSelector('.user-management-actions', { timeout: 10000 });

    // helper to click button by text
    async function clickButtonWithText(text) {
      return await page.evaluate((t) => {
        const btns = Array.from(document.querySelectorAll('.user-management-actions button'));
        const b = btns.find(el => el.textContent && el.textContent.trim() === t);
        if (!b) return false;
        b.click();
        return true;
      }, text);
    }

    // check buttons
    const buttons = await page.$$eval('.user-management-actions button', els => els.map(e => e.textContent.trim()));
    result.buttons = buttons;

    // Click Add Contract
    const addedContract = await clickButtonWithText('Add Contract');
      await new Promise(r => setTimeout(r, 800));
      const overlayAfterContract = (await page.$('.modal-overlay')) !== null;
    result.addContract = { clicked: addedContract, modalShown: overlayAfterContract };
    // close modal if open
    if (overlayAfterContract) {
      await page.click('.modal-close-btn');
        await new Promise(r => setTimeout(r, 300));
    }

    // Click Add UV Collateral
    const addedCollateral = await clickButtonWithText('Add UV Collateral') || await clickButtonWithText('Add Collateral');
      await new Promise(r => setTimeout(r, 800));
      const overlayAfterCollateral = (await page.$('.modal-overlay')) !== null;
    result.addCollateral = { clicked: addedCollateral, modalShown: overlayAfterCollateral };
    if (overlayAfterCollateral) {
      await page.click('.modal-close-btn');
        await new Promise(r => setTimeout(r, 300));
    }

    // Click Create Document
    const createDoc = await clickButtonWithText('Create Document');
      await new Promise(r => setTimeout(r, 800));
      const overlayAfterCreate = (await page.$('.modal-overlay')) !== null;
    result.createDocument = { clicked: createDoc, modalShown: overlayAfterCreate };
    if (overlayAfterCreate) {
      await page.click('.modal-close-btn');
        await new Promise(r => setTimeout(r, 300));
    }

    // collect any JS errors
    const errors = await page.evaluate(() => window.__puppeteer_errors || []);
    result.pageErrors = errors;

  } catch (err) {
    result.errors.push(String(err));
  } finally {
    await browser.close();
    console.log('SMOKE_TEST_RESULT:' + JSON.stringify(result, null, 2));
    process.exit(0);
  }
})();
