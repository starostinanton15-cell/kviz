/* Фон «Ефір на святі» для стилю «Скло-шоу»: прожектори, що гуляють по залу, серпантин і іскри.
   ST.start() / ST.stop() — запускає applyTheme, ST.pulse() — сплеск на святкові моменти (правильна відповідь, переможець). */
window.ST = (() => {
  const COLS = ['212,255,0', '0,178,255', '255,95,162', '255,184,0', '160,120,255'];
  const LCOLS = ['31,107,255', '255,79,109', '255,179,26', '150,205,0'];
  let cv, cx, raf = 0, W = 0, H = 0, sc = .5, on = false, boost = 0, t0 = 0, beams = [], rib = [], sp = [], small = false, light = false;
  const R = (a, b) => a + Math.random() * (b - a);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() { W = cv.width = Math.round(innerWidth * sc); H = cv.height = Math.round(innerHeight * sc); }
  function ribbon(y) {
    return { x: R(0, W), y: y ?? R(-H, H), len: R(.16, .3) * H, w: R(5, 9) * sc * 2, vy: R(.25, .6) * sc * 2, vx: R(-.2, .2) * sc * 2,
      ph: R(0, 6.28), sp: R(1.2, 2.2), amp: R(10, 22) * sc * 2, c: (light ? LCOLS : COLS)[Math.floor(R(0, 4))] };
  }
  function seed() {
    beams = [
      { x: .12, c: COLS[1], a: .3, s: .23, w: .16 }, { x: .38, c: COLS[2], a: .22, s: .17, w: .13 },
      { x: .64, c: COLS[0], a: .2, s: .21, w: .12 }, { x: .9, c: COLS[3], a: .26, s: .19, w: .15 }
    ].map(b => ({ ...b, ph: R(0, 6.28) }));
    rib = Array.from({ length: small ? 5 : 9 }, () => ribbon());
    sp = Array.from({ length: small ? 22 : 46 }, () => ({ x: R(0, 1), y: R(0, 1), r: R(1.5, 4), ph: R(0, 6.28), f: R(.6, 1.6), c: !light && Math.random() < .5 ? '255,255,255' : (light ? LCOLS : COLS)[Math.floor(R(0, 4))] }));
  }
  function star(x, y, r, a, c) {
    cx.fillStyle = `rgba(${c},${a})`; cx.beginPath();
    cx.moveTo(x, y - r * 2.6); cx.quadraticCurveTo(x, y, x + r * 2.6, y); cx.quadraticCurveTo(x, y, x, y + r * 2.6); cx.quadraticCurveTo(x, y, x - r * 2.6, y); cx.quadraticCurveTo(x, y, x, y - r * 2.6); cx.fill();
  }
  function frame(now) {
    if (!on) return;
    const t = (now - t0) / 1000; boost *= .965;
    cx.clearRect(0, 0, W, H);
    cx.globalCompositeOperation = light ? 'source-over' : 'lighter';
    /* прожектори зверху, повільно гуляють */
    if (!light) for (const b of beams) {
      const ang = Math.sin(t * b.s + b.ph) * .5, x0 = b.x * W, len = H * 1.25, hw = len * Math.tan(b.w / 2 + boost * .03);
      const ex = x0 + Math.sin(ang) * len, ey = Math.cos(ang) * len, nx = Math.cos(ang) * hw, ny = -Math.sin(ang) * hw;
      const g = cx.createLinearGradient(x0, 0, ex, ey);
      const a = b.a * (1 + boost * 1.4);
      g.addColorStop(0, `rgba(${b.c},${a})`); g.addColorStop(.55, `rgba(${b.c},${a * .35})`); g.addColorStop(1, `rgba(${b.c},0)`);
      cx.fillStyle = g; cx.beginPath(); cx.moveTo(x0 - 6, 0); cx.lineTo(x0 + 6, 0); cx.lineTo(ex + nx, ey + ny); cx.lineTo(ex - nx, ey - ny); cx.closePath(); cx.fill();
    }
    /* іскри мерехтять */
    for (const s of sp) {
      const a = Math.max(0, Math.sin(t * s.f * 2 + s.ph)) ** 3 * (.7 + boost);
      if (a > .02) star(s.x * W, s.y * H, s.r * sc * 2, a, s.c);
    }
    cx.globalCompositeOperation = 'source-over';
    /* серпантин: стрічки, що кружляють і повільно падають */
    for (const r of rib) {
      r.y += r.vy * (1 + boost * 3); r.x += r.vx + Math.sin(t * .5 + r.ph) * .15;
      if (r.y - r.len > H) Object.assign(r, ribbon(-R(.05, .4) * H));
      const n = 22;
      for (let k = 0; k < n; k++) {
        const u0 = k / n, u1 = (k + 1) / n;
        const px = u => r.x + Math.sin(u * 6 + t * r.sp + r.ph) * r.amp, py = u => r.y - u * r.len;
        const tw = Math.cos(u0 * 7 + t * r.sp * 1.3 + r.ph); /* поворот стрічки: ширина й світло */
        const w = r.w * (.25 + .75 * Math.abs(tw)), l = tw > 0 ? 1 : .62;
        cx.strokeStyle = `rgba(${r.c.split(',').map(v => Math.round(v * l)).join(',')},${.85 * Math.min(1, (1 - u0) * 3)})`;
        cx.lineWidth = w; cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(px(u0), py(u0)); cx.lineTo(px(u1), py(u1)); cx.stroke();
      }
    }
    raf = requestAnimationFrame(frame);
  }
  return {
    get on() { return on; },
    start(o = {}) {
      if (on) this.stop();
      small = !!o.small; sc = o.scale || .5; light = !!o.light;
      cv = document.createElement('canvas'); cv.id = 'stfx';
      cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
      const bg = document.querySelector('.bg'); if (!bg) return;
      bg.appendChild(cv); cx = cv.getContext('2d');
      resize(); seed(); addEventListener('resize', resize);
      on = true; t0 = performance.now(); document.body.classList.add('stfx');
      if (reduce) { frame(t0 + 4000); cancelAnimationFrame(raf); return; }
      raf = requestAnimationFrame(frame);
    },
    stop() { on = false; cancelAnimationFrame(raf); removeEventListener('resize', resize); cv && cv.remove(); cv = null; document.body.classList.remove('stfx'); },
    pulse() { boost = 1; rib.forEach(r => { if (r.y < 0) r.y = R(0, H * .3); }); }
  };
})();
