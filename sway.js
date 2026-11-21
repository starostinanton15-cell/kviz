/* «Ручна камера» як у рефі Антона: постійне плавне покачування з паралаксом (не від мишки).
   Шари рухаються з різною глибиною; працює через CSS-властивості translate/rotate/scale,
   тож не конфліктує з transform від GSAP. Увімкнено для стилю glass. */
window.SW = (() => {
  let raf = 0, on = false; const t0 = performance.now();
  const LAYERS = [
    ['#sb', -0.5, 1.08],              // фон — у протилежний бік і трохи збільшений, щоб не було країв
    ['.ticker.lob', 0.25],
    ['.lobby .qrcard', 0.7],
    ['.lobby > div:nth-child(2)', 0.95],
    ['.hero', 1.35],
    ['.stage > :not(.lobby):not(.ticker):not(.hero)', 0.45]
  ];
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const t = (now - t0) / 1000;
    // повільна «вісімка» + дихання, як у кадрі з рук
    const cx = Math.sin(t * .45) * 1 + Math.sin(t * 1.13) * .25;
    const cy = Math.sin(t * .9 + .6) * .6 + Math.sin(t * 1.7) * .15;
    const rot = Math.sin(t * .38) * .5;
    for (const [sel, k, sc] of LAYERS) {
      document.querySelectorAll(sel).forEach(el => {
        el.style.translate = `${(cx * k * .9).toFixed(3)}vmin ${(cy * k * .9).toFixed(3)}vmin`;
        el.style.rotate = `${(rot * Math.sign(k) * Math.min(1, Math.abs(k))).toFixed(3)}deg`;
        el.style.scale = sc ? String(sc + .01 * Math.sin(t * .3)) : String(1 + .006 * k * Math.sin(t * .3));
      });
    }
  }
  function clear() { LAYERS.forEach(([s]) => document.querySelectorAll(s).forEach(el => { el.style.translate = el.style.rotate = el.style.scale = ''; })); }
  return {
    start() { if (on) return; on = true; raf = requestAnimationFrame(frame); },
    stop() { on = false; cancelAnimationFrame(raf); clear(); },
    get on() { return on; }
  };
})();
