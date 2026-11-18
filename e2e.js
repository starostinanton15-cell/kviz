const { chromium } = require('playwright');
const BASE = 'https://starostinanton15-cell.github.io/kviz/';
const Q = `Назва: Перевірка\nЧас: 6\n\n1. Тест?\n- Ні\n+ Так\n\n2. Ще тест?\n+ Так\n- Ні\n- Може\n`;
(async () => {
  const br = await chromium.launch();
  const hctx = await br.newContext({ viewport: { width: 1600, height: 900 } });
  await hctx.addInitScript(q => localStorage.setItem('vq_questions', q), Q);
  const host = await hctx.newPage(); const errs = [];
  host.on('pageerror', e => errs.push('host ' + e.message)); host.on('dialog', d => d.accept());
  await host.goto(BASE + 'host.html'); await host.waitForSelector('.dot.online', { timeout: 30000 });
  await host.click('#bNew'); await host.waitForSelector('.dot.online', { timeout: 30000 });
  const url = 'https://' + (await host.textContent('.qrcard .url')); console.log('player url', url);
  const ps = [];
  for (const n of ['Оля', 'Тарас', 'Галя']) {
    const c = await br.newContext({ viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true });
    const p = await c.newPage(); p.on('pageerror', e => errs.push(n + ' ' + e.message));
    await p.goto(url); await p.waitForSelector('#nm', { timeout: 30000 }); await p.fill('#nm', n); await p.click('#go'); ps.push(p);
  }
  await host.waitForFunction(() => document.querySelectorAll('.chip').length === 3, null, { timeout: 30000 });
  console.log('3 joined'); await host.click('#bStart');
  for (let qi = 0; qi < 2; qi++) {
    for (const p of ps) await p.waitForSelector('.opt', { timeout: 15000 });
    for (let k = 0; k < 3; k++) { await ps[k].click(`.opt[data-i="${(k + qi) % 2}"]`); await host.waitForTimeout(300); }
    await host.waitForSelector('.bars', { timeout: 15000 }); console.log('q' + qi, 'answers', await host.textContent('#ansN'));
    await host.waitForTimeout(800); await host.click('#bNext');
    if (qi === 0) { await host.waitForTimeout(800); await host.click('#bNext'); }
  }
  await host.waitForTimeout(10500);
  console.log('podium', await host.$$eval('.col .nm', e => e.map(x => x.textContent)));
  for (const p of ps) console.log('phone', (await p.textContent('#scr')).replace(/\s+/g, ' ').trim());
  console.log('errors', JSON.stringify(errs)); await br.close();
})().catch(e => { console.error('FAILED', e); process.exit(1); });
