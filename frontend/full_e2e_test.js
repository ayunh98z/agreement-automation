const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const out = { errors: [], network: [], actions: [] };
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => out.network.push({ type: 'console', text: msg.text() }));
  page.on('request', req => {
    const url = req.url();
    if (url.includes('/api/')) out.network.push({ type: 'request', method: req.method(), url });
  });
  page.on('response', async res => {
    try {
      const url = res.url();
      if (url.includes('/api/')) {
        const status = res.status();
        let body = '';
        try { body = await res.text(); } catch (e) { body = '' }
        out.network.push({ type: 'response', url, status, body: body && body.length > 500 ? body.slice(0,500) + '...' : body });
      }
    } catch (e) {}
  });

  // generate a stable contract number for this E2E run
  const generatedContract = 'E2E-CON-' + Date.now();

  try {
    await page.goto('http://localhost:3002', { waitUntil: 'networkidle2', timeout: 60000 });
    // Ensure we have a saved token/user so the SPA shows Dashboard without backend login
    await page.evaluate(() => {
      try {
        localStorage.setItem('access_token', 'E2E_FAKE_TOKEN');
        localStorage.setItem('refresh_token', 'E2E_FAKE_REFRESH');
        localStorage.setItem('user_data', JSON.stringify({ username: 'admin', roles: ['admin'] }));
      } catch (e) {}
    });
    await page.reload({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => {});
    // login if shown
    if (await page.$('#username')) {
      await page.type('#username', 'admin', { delay: 30 });
      await page.type('#password', 'admin123', { delay: 30 });
      await Promise.all([
        page.click('.sign-in-btn'),
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }).catch(() => {})
      ]);
      out.actions.push('logged_in');
      await new Promise(r => setTimeout(r, 600));
      // (UI flow) will create contract via UI modal below
    }

    // navigate to Agreement -> BL Agreement
    await page.waitForSelector('.sidebar-menu', { timeout: 60000 });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const a = btns.find(b => b.textContent && b.textContent.trim().includes('Agreement'));
      if (a) a.click();
    });
    await new Promise(r => setTimeout(r, 300));
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find(x => x.textContent && x.textContent.trim().includes('BL Agreement'));
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 800));
    out.actions.push('navigated_to_bl');

    // Click Add Contract (UI flow)
    const addContractClicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.user-management-actions button')).find(b => b.textContent && b.textContent.trim() === 'Add Contract');
      if (!btn) return false; btn.click(); return true;
    });
    out.actions.push({ addContractClicked });
    await new Promise(r => setTimeout(r, 500));

    // fill contract modal via UI; set dates in ISO yyyy-MM-dd to satisfy backend
    await page.evaluate((cnValue) => {
      const modal = document.querySelector('.modal-content'); if (!modal) return false;
      const dispatch = (el, value) => { try { el.focus && el.focus(); el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {} };
      const labels = Array.from(modal.querySelectorAll('label'));
      labels.forEach(lbl => {
        const txt = (lbl.textContent||'').trim().toLowerCase();
        const next = lbl.nextElementSibling; const inp = next && (next.tagName === 'INPUT' ? next : next.querySelector('input'));
        if (!inp) return;
        if (txt.includes('contract')) dispatch(inp, cnValue);
        else if (txt.includes('name of debtor') || txt.includes('debtor') || txt.includes('name')) dispatch(inp, 'E2E Debtor');
        else if (txt.includes('nik')) dispatch(inp, '3200000000000000');
        else if (txt.includes('date') || txt.includes('birth')) dispatch(inp, '1980-01-01');
        else if (txt.includes('place')) dispatch(inp, 'Jakarta');
      });
      return true;
    }, generatedContract);
    await new Promise(r => setTimeout(r, 300));

    // click Save for contract modal
    const saveContract = await page.evaluate(() => {
      const saveBtn = Array.from(document.querySelectorAll('.modal-content .btn-save')).find(b => b.offsetParent !== null && b.textContent && b.textContent.toLowerCase().includes('save'));
      if (saveBtn) { saveBtn.click(); return true; }
      const fallback = Array.from(document.querySelectorAll('.modal-content button')).find(b => b.textContent && b.textContent.trim().toLowerCase() === 'save');
      if (fallback) { fallback.click(); return true; }
      return false;
    });
    out.actions.push({ saveContract });
    await new Promise(r => setTimeout(r, 1200));

    // After saving, wait for network events
    await new Promise(r => setTimeout(r, 800));

    // Click Add Collateral (UI flow)
    const addCollateralClicked = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('.user-management-actions button')).find(b => b.textContent && (b.textContent.trim() === 'Add Collateral' || b.textContent.trim() === 'Add UV Collateral'));
      if (!btn) return false; btn.click(); return true;
    });
    out.actions.push({ addCollateralClicked });
    await new Promise(r => setTimeout(r, 500));

    // fill collateral fields via modal UI
    await page.evaluate((cnValue) => {
      const modal = document.querySelector('.modal-content'); if (!modal) return false;
      const dispatch = (el, value) => { try { el.focus && el.focus(); el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } catch (e) {} };
      const map = {
        'Contract Number': cnValue,
        'Name of Debtor': 'E2E Debtor',
        'Collateral Type': 'SHM',
        'Number of Certificate': 'CERT123',
        'Number of AJB': 'AJB123',
        'Surface Area': '100',
        'Name of Collateral Owner': 'Owner Name',
        'Capacity of Building': 'N/A',
        'Location of Land': 'Jakarta'
      };
      modal.querySelectorAll('label').forEach(lbl => {
        const txt = (lbl.textContent||'').trim();
        const key = Object.keys(map).find(k => txt.includes(k));
        if (!key) return;
        const next = lbl.nextElementSibling; const inp = next && (next.tagName === 'INPUT' ? next : next.querySelector('input'));
        if (inp) dispatch(inp, map[key]);
      });
      return true;
    }, generatedContract);
    await new Promise(r => setTimeout(r, 300));

    // click Save for collateral modal
    const saveCollateral = await page.evaluate(() => {
      const saveBtn = Array.from(document.querySelectorAll('.modal-content .btn-save')).find(b => b.offsetParent !== null && b.textContent && b.textContent.toLowerCase().includes('save'));
      if (saveBtn) { saveBtn.click(); return true; }
      const fallback = Array.from(document.querySelectorAll('.modal-content button')).find(b => b.textContent && b.textContent.trim().toLowerCase() === 'save');
      if (fallback) { fallback.click(); return true; }
      return false;
    });
    out.actions.push({ saveCollateral });
    await new Promise(r => setTimeout(r, 1200));

    // capture full page screenshot
    const p = require('path').join(__dirname, 'e2e_fullpage.png');
    await page.screenshot({ path: p, fullPage: true });
    out.screenshot = p;

  } catch (err) {
    out.errors.push(String(err));
  } finally {
    await browser.close();
    fs.writeFileSync(require('path').join(__dirname, 'e2e_network.json'), JSON.stringify(out.network, null, 2));
    console.log('E2E_RESULT:' + JSON.stringify({ errors: out.errors, actions: out.actions, screenshot: out.screenshot || null }, null, 2));
    process.exit(0);
  }
})();
