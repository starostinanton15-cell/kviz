/* Фон стилю «Ігровий дудл»: білі «намальовані від руки» каракулі (зірки, серця, спіралі, блискітки, стрілки),
   що повільно пливуть і «кип'ятять» лінію, як у мальованій анімації (перемальовка з тремтінням 8 разів на секунду).
   DD.start(opts) / DD.stop() / DD.pulse(). */
window.DD = (() => {
  const INK = ['255,255,255', '255,255,255', '246,196,50', '255,122,192', '91,124,250'];
  let mode = 'party', cv, cx, raf = 0, W = 0, H = 0, sc = .6, on = false, items = [], boilT = 0, seedN = 0, boost = 0, small = false, last = 0;
  const R = (a, b) => a + Math.random() * (b - a);
  const KINDS = ['star', 'heart', 'spiral', 'spark', 'zig', 'ring', 'cross', 'note'];
  function resize() { W = cv.width = Math.round(innerWidth * sc); H = cv.height = Math.round(innerHeight * sc); }
  const CITY = [['91,124,250', '58,79,192', '157,176,255'], ['240,82,61', '173,47,31', '255,154,138'], ['246,196,50', '191,140,16', '255,224,138'], ['154,108,240', '106,63,196', '200,175,255']];
  function item(y) {
    const city = mode === 'city', pal = CITY[Math.floor(R(0, 4))];
    return { pal, k: city ? ['cube', 'cube', 'coin', 'plus', 'cube'][Math.floor(R(0, 5))] : KINDS[Math.floor(R(0, KINDS.length))], x: R(0, W), y: y ?? R(0, H), s: R(18, 46) * sc * (small ? 1.3 : 1), rot: R(-.5, .5), vr: R(-.15, .15),
      vx: R(-6, 6) * sc, vy: R(-14, -5) * sc, c: mode === 'party' ? '255,255,255' : INK[Math.floor(R(0, INK.length))], a: city ? R(.55, .9) : R(.45, .9), ph: R(0, 6.28) };
  }
  /* «тремтіння» руки: кожна точка трохи зсувається, зсув міняється при кожному кадрі кипіння */
  let rs = 1; const rnd = () => { rs = (rs * 16807) % 2147483647; return rs / 2147483647 - .5; };
  function path(pts, j, close) {
    cx.beginPath();
    pts.forEach(([x, y], i) => { const px = x + rnd() * j, py = y + rnd() * j; i ? cx.lineTo(px, py) : cx.moveTo(px, py); });
    if (close) cx.closePath(); cx.stroke();
  }
  function draw(it) {
    const s = it.s, j = s * .07, P = [];
    cx.save(); cx.translate(it.x, it.y); cx.rotate(it.rot); cx.strokeStyle = `rgba(${it.c},${Math.min(1, it.a + boost * .4)})`; cx.lineWidth = Math.max(1.5, s * .08); cx.lineJoin = cx.lineCap = 'round';
    rs = (it.ph * 1e4 | 0) + boilT * 7919 + 1;
    if (mode === 'city') {
      const [c, d, l] = it.pal; cx.globalAlpha = it.a; cx.strokeStyle = '#170a33'; cx.lineWidth = Math.max(2, s * .09);
      const face = (pts, col) => { cx.fillStyle = `rgb(${col})`; cx.beginPath(); pts.forEach(([x, y], i) => i ? cx.lineTo(x, y) : cx.moveTo(x, y)); cx.closePath(); cx.fill(); cx.stroke(); };
      if (it.k === 'cube') { const e = s * .75, k = e * .866;
        face([[0, -e], [k, -e / 2], [0, 0], [-k, -e / 2]], l); face([[-k, -e / 2], [0, 0], [0, e], [-k, e / 2]], c); face([[k, -e / 2], [0, 0], [0, e], [k, e / 2]], d); }
      if (it.k === 'coin') { cx.fillStyle = 'rgb(191,140,16)'; cx.beginPath(); cx.ellipse(s * .12, 0, s * .55, s * .8, 0, 0, 7); cx.fill(); cx.stroke();
        cx.fillStyle = 'rgb(246,196,50)'; cx.beginPath(); cx.ellipse(0, 0, s * .55, s * .8, 0, 0, 7); cx.fill(); cx.stroke();
        cx.beginPath(); cx.ellipse(0, 0, s * .28, s * .46, 0, 0, 7); cx.stroke(); }
      if (it.k === 'plus') { const a = s * .3, b = s * .85; face([[-a, -b], [a, -b], [a, -a], [b, -a], [b, a], [a, a], [a, b], [-a, b], [-a, a], [-b, a], [-b, -a], [-a, -a]], c); }
      cx.restore(); return;
    }
    if (it.k === 'star') { for (let i = 0; i < 10; i++) { const r = i % 2 ? s * .42 : s; const a = i * Math.PI / 5 - Math.PI / 2; P.push([Math.cos(a) * r, Math.sin(a) * r]); } path(P, j, true); }
    if (it.k === 'heart') { for (let i = 0; i <= 24; i++) { const t = i / 24 * Math.PI * 2; P.push([16 * Math.sin(t) ** 3 * s / 17, -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s / 17]); } path(P, j, true); }
    if (it.k === 'spiral') { for (let i = 0; i <= 40; i++) { const t = i / 40 * Math.PI * 5, r = s * i / 40; P.push([Math.cos(t) * r, Math.sin(t) * r]); } path(P, j * .6); }
    if (it.k === 'spark') { [[0, -1, 0, 1], [-1, 0, 1, 0], [-.6, -.6, .6, .6], [-.6, .6, .6, -.6]].forEach(([a, b, c, d], i) => { const m = i > 1 ? .55 : 1; path([[a * s * m, b * s * m], [c * s * m, d * s * m]], j); }); }
    if (it.k === 'zig') { for (let i = 0; i <= 6; i++) P.push([(i / 6 - .5) * s * 2, i % 2 ? -s * .35 : s * .35]); path(P, j); }
    if (it.k === 'ring') { for (let i = 0; i <= 26; i++) { const t = i / 24 * Math.PI * 2; P.push([Math.cos(t) * s * .8, Math.sin(t) * s * .8]); } path(P, j); }
    if (it.k === 'cross') { path([[-s * .5, -s * .5], [s * .5, s * .5]], j); path([[s * .5, -s * .5], [-s * .5, s * .5]], j); }
    if (it.k === 'note') { path([[-s * .3, s * .5], [-s * .3, -s * .6], [s * .5, -s * .8], [s * .5, s * .3]], j); path([[-s * .3, -s * .3], [s * .5, -s * .5]], j);
      for (const ox of [-s * .5, s * .3]) { const C = []; const oy = ox < 0 ? s * .5 : s * .3; for (let i = 0; i <= 12; i++) { const t = i / 12 * Math.PI * 2; C.push([ox + Math.cos(t) * s * .22, oy + Math.sin(t) * s * .16]); } path(C, j * .5, true); } }
    cx.restore();
  }
  function frame(now) {
    if (!on) return;
    const dt = Math.min(.05, (now - (last || now)) / 1000); last = now; boost *= .96;
    const nb = Math.floor(now / 125); if (nb !== boilT) boilT = nb; if (mode === 'city') boilT = 0; /* 8 кадрів на секунду для лінії */
    cx.clearRect(0, 0, W, H);
    for (const it of items) {
      it.x += it.vx * dt * (1 + boost * 4); it.y += it.vy * dt * (1 + boost * 4); it.rot += it.vr * dt;
      if (it.y < -it.s * 2) Object.assign(it, item(H + it.s * 2));
      if (it.x < -60) it.x = W + 50; if (it.x > W + 60) it.x = -50;
      draw(it);
    }
    raf = requestAnimationFrame(frame);
  }
  return {
    get on() { return on; },
    start(o = {}) {
      if (on) this.stop();
      const bg = document.querySelector('.bg'); if (!bg) return;
      small = !!o.small; sc = o.scale || .6; mode = o.mode || 'party';
      cv = document.createElement('canvas'); cv.id = 'ddfx'; cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
      bg.appendChild(cv); cx = cv.getContext('2d'); resize(); addEventListener('resize', resize);
      items = Array.from({ length: mode === 'city' ? (small ? 8 : 16) : (small ? 10 : 18) }, () => item());
      on = true; last = 0;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { frame(performance.now()); cancelAnimationFrame(raf); return; }
      raf = requestAnimationFrame(frame);
    },
    stop() { on = false; cancelAnimationFrame(raf); removeEventListener('resize', resize); cv && cv.remove(); cv = null; },
    pulse() { boost = 1; }
  };
})();
