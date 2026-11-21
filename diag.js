const { chromium } = require('playwright');
(async () => { const br = await chromium.launch(); const p = await (await br.newContext({ viewport: { width: 1536, height: 700 } })).newPage();
  p.on('console', m => console.log('CONSOLE', m.type(), m.text())); p.on('pageerror', e => console.log('PAGEERROR', e.message));
  p.on('requestfailed', r => console.log('REQFAIL', r.url(), r.failure().errorText));
  p.on('response', r => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
  await p.goto('https://starostinanton15-cell.github.io/kviz/host.html?theme=glass'); await p.waitForTimeout(12000);
  console.log('THEME', await p.evaluate(() => document.body.dataset.theme), 'CONN', await p.textContent('#conn'), 'STAGE', (await p.innerHTML('#stage')).length);
  await p.screenshot({ path: 'shot.png' }); await br.close(); })();
