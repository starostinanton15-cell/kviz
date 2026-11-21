/* Живий фон стилю «Нердактик»: неонові хвилі-сітки (фіолет, маджента, бірюза), що дихають і переливаються,
   плюс пил-частинки, що мерехтять і пливуть. Хвилі тягнуться за курсором, на святкових моментах NF.pulse() дає сплеск.
   NF.start(opts) / NF.stop() / NF.pulse(). */
window.NF = (() => {
  const WAVES = [
    { c: '138,78,233', y: .72, amp: .09, len: 1.6, sp: .32, lines: 14, gap: .009 },
    { c: '255,42,172', y: .8, amp: .07, len: 2.2, sp: -.24, lines: 11, gap: .008 },
    { c: '46,230,197', y: .64, amp: .05, len: 2.8, sp: .18, lines: 7, gap: .007 }
  ];
  let cv, cx, raf = 0, W = 0, H = 0, sc = .6, on = false, boost = 0, dust = [], mx = .5, my = .5, small = false, t0 = 0;
  const R = (a, b) => a + Math.random() * (b - a);
  function resize() { W = cv.width = Math.round(innerWidth * sc); H = cv.height = Math.round(innerHeight * sc); }
  function onMove(e) { mx = e.clientX / innerWidth; my = e.clientY / innerHeight; }
  function frame(now) {
    if (!on) return;
    const t = (now - t0) / 1000; boost *= .97;
    cx.clearRect(0, 0, W, H);
    cx.globalCompositeOperation = 'lighter';
    const step = Math.max(6, W / (small ? 60 : 110));
    for (const w of WAVES) {
      for (let l = 0; l < w.lines; l++) {
        const k = l / w.lines, a = (.05 + .4 * (1 - Math.abs(k - .5) * 2)) * (1 + boost * 1.5);
        cx.strokeStyle = `rgba(${w.c},${a})`; cx.lineWidth = l === Math.floor(w.lines / 2) ? 2 : 1;
        cx.beginPath();
        for (let x = -step; x <= W + step; x += step) {
          const u = x / W;
          const pull = Math.exp(-((u - mx) ** 2) / .03) * (my - w.y) * .35; /* хвиля тягнеться до курсора */
          const y = (w.y + l * w.gap + pull
            + Math.sin(u * Math.PI * w.len + t * w.sp * 3 + l * .18) * w.amp * (1 + boost * .8)
            + Math.sin(u * Math.PI * w.len * 2.3 - t * w.sp * 2 + l * .1) * w.amp * .35) * H;
          x <= -step + .1 ? cx.moveTo(x, y) : cx.lineTo(x, y);
        }
        cx.stroke();
      }
    }
    for (const d of dust) {
      d.x += d.vx * (1 + boost * 6); d.y += d.vy * (1 + boost * 6);
      if (d.y < -5) { d.y = H + 5; d.x = R(0, W); } if (d.x < -5) d.x = W + 5; if (d.x > W + 5) d.x = -5;
      const a = (.25 + .75 * Math.max(0, Math.sin(t * d.f + d.ph))) * d.a;
      cx.fillStyle = `rgba(${d.c},${a})`; cx.beginPath(); cx.arc(d.x, d.y, d.r, 0, 7); cx.fill();
    }
    cx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(frame);
  }
  return {
    get on() { return on; },
    start(o = {}) {
      if (on) this.stop();
      const bg = document.querySelector('.bg'); if (!bg) return;
      small = !!o.small; sc = o.scale || .6;
      cv = document.createElement('canvas'); cv.id = 'nffx'; cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none';
      bg.appendChild(cv); cx = cv.getContext('2d'); resize(); addEventListener('resize', resize); addEventListener('pointermove', onMove, { passive: true });
      const C = ['255,255,255', '138,78,233', '255,42,172', '46,230,197'];
      dust = Array.from({ length: small ? 40 : 90 }, () => ({ x: R(0, W), y: R(0, H), r: R(.6, 2.2) * sc * 1.6, vx: R(-.15, .15), vy: R(-.45, -.08), f: R(.8, 2.4), ph: R(0, 6.28), a: R(.4, 1), c: C[Math.floor(R(0, 4))] }));
      on = true; t0 = performance.now();
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) { frame(t0 + 3000); cancelAnimationFrame(raf); return; }
      raf = requestAnimationFrame(frame);
    },
    stop() { on = false; cancelAnimationFrame(raf); removeEventListener('resize', resize); removeEventListener('pointermove', onMove); cv && cv.remove(); cv = null; },
    pulse() { boost = 1; }
  };
})();
