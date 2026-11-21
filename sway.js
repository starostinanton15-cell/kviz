/* «Ручна камера» як у рефі Антона: постійне плавне покачування з паралаксом (не від мишки).
   Шари рухаються з різною глибиною; працює через CSS-властивості translate/rotate/scale,
   тож не конфліктує з transform від GSAP. Увімкнено для стилю glass. */
window.SW = (() => {
  let raf = 0, on = false; const t0 = performance.now();
  /* Заміряно з рефа: людина майже нерухома (кілька px), а фон за нею їде на ~7% ширини кадру
     по «вісімці» з періодом ~6 с — справжній 2.5D-паралакс камери. */
  // [селектор, зсув по x (vw), зсув по y (vh), поворот (deg), базовий масштаб]
  const LAYERS = [
    ['#sb', -4.2, -2.6, -1.1, 1.2],
    ['.ticker.lob', .5, .35, .15],
    ['.lobby .qrcard', .9, .6, .35],
    ['.lobby > div:nth-child(2)', 1.1, .7, .3],
    ['.hero', .25, .15, 0],
    ['.stage > :not(.lobby):not(.ticker):not(.hero)', .6, .4, .2]
  ];
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const t = (now - t0) / 1000, w = 2 * Math.PI / 6.5;
    const cx = Math.sin(t * w) + .18 * Math.sin(t * w * 3 + 1);
    const cy = Math.sin(t * w * 2 + .6) * .8 + .1 * Math.sin(t * w * 5);
    const cr = Math.sin(t * w + .9);
    for (const [sel, ax, ay, ar, sc] of LAYERS) {
      document.querySelectorAll(sel).forEach(el => {
        el.style.translate = `${(cx * ax).toFixed(3)}vw ${(cy * ay).toFixed(3)}vh`;
        el.style.rotate = `${(cr * ar).toFixed(3)}deg`;
        if (sc) el.style.scale = String(sc + .03 * Math.sin(t * w * .5));
      });
    }
    // героїня гойдається від стоп, як людина в рефі
    document.querySelectorAll('.hero img.main').forEach(el => { el.style.rotate = `${(Math.sin(t * w + 2.2) * 1.3).toFixed(3)}deg`; el.style.transformOrigin = '50% 100%'; });
  }
  function clear() { [...LAYERS, ['.hero img.main']].forEach(([s]) => document.querySelectorAll(s).forEach(el => { el.style.translate = el.style.rotate = el.style.scale = ''; })); }
  return {
    start() { if (on) return; on = true; raf = requestAnimationFrame(frame); },
    stop() { on = false; cancelAnimationFrame(raf); clear(); },
    get on() { return on; }
  };
})();
