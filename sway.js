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
  /* Списки елементів кешуємо й оновлюємо раз на ~0.5 с: querySelectorAll щокадру давав мікрофризи */
  let cache = null, fr = 0;
  const grab = () => { cache = LAYERS.map(L => [L, [...document.querySelectorAll(L[0])]]); cache.hero = [...document.querySelectorAll('.hero img.main')]; cache.hero.forEach(el => el.style.transformOrigin = '50% 100%'); };
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    if (!cache || ++fr % 30 === 0) grab();
    const t = (now - t0) / 1000, w = 2 * Math.PI / 6.5;
    const cx = Math.sin(t * w) + .18 * Math.sin(t * w * 3 + 1);
    const cy = Math.sin(t * w * 2 + .6) * .8 + .1 * Math.sin(t * w * 5);
    const cr = Math.sin(t * w + .9);
    for (const [[sel, ax, ay, ar, sc], els] of cache) {
      els.forEach(el => {
        el.style.translate = `${(cx * ax).toFixed(3)}vw ${(cy * ay).toFixed(3)}vh`;
        el.style.rotate = `${(cr * ar).toFixed(3)}deg`;
        if (sc) el.style.scale = String(sc + .03 * Math.sin(t * w * .5));
      });
    }
    // героїня гойдається від стоп, як людина в рефі
    cache.hero.forEach(el => { el.style.rotate = `${(Math.sin(t * w + 2.2) * .7).toFixed(3)}deg`; });
  }
  function clear() { [...LAYERS, ['.hero img.main']].forEach(([s]) => document.querySelectorAll(s).forEach(el => { el.style.translate = el.style.rotate = el.style.scale = ''; })); }
  return {
    start() { if (on) return; on = true; raf = requestAnimationFrame(frame); },
    stop() { on = false; cancelAnimationFrame(raf); clear(); cache = null; },
    get on() { return on; }
  };
})();
