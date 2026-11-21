/* Режисура анімацій на GSAP для стилів «Скло-шоу» і «Рідке скло». Без GSAP або в інших стилях нічого не робить. */
window.FX = (() => {
  const THEMES = ['show', 'glass', 'studio'];
  const active = () => !!window.gsap && THEMES.includes(document.body.dataset.theme);
  const SK = () => document.body.dataset.theme === 'show' ? -9 : 0;
  const boom = () => { if (window.LQ && LQ.on) LQ.pulse(); if (window.ST && ST.on) ST.pulse(); };
  const R = (a, b) => a + Math.random() * (b - a);
  let tiltEls = [], tl = null;

  function prep(els) { gsap.set(els, { skewX: SK(), transformPerspective: 900 }); }

  /* Нахил за курсором: об'єм */
  addEventListener('pointermove', e => {
    if (!active()) return;
    tiltEls = tiltEls.filter(el => el.isConnected);
    for (const el of tiltEls) {
      const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const dx = (e.clientX - cx) / (innerWidth / 2), dy = (e.clientY - cy) / (innerHeight / 2);
      const near = Math.max(0, 1 - Math.hypot((e.clientX - cx) / (r.width * 1.6), (e.clientY - cy) / (r.height * 2.2)));
      gsap.to(el, { rotationY: dx * 10 * (.4 + near), rotationX: -dy * 10 * (.4 + near), duration: .8, ease: 'power3.out', overwrite: 'auto' });
    }
  }, { passive: true });
  function tilt(els) { els.forEach(el => { if (!tiltEls.includes(el)) tiltEls.push(el); }); }

  function enter(ph, root, ctx = {}) {
    if (!active()) { document.body.classList.remove('gs'); return; }
    document.body.classList.add('gs');
    tl && tl.kill();
    const q = s => [...root.querySelectorAll(s)];
    tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    if (ph === 'lobby') {
      prep(q('.ticker.lob')); gsap.set(q('.qrcard'), { transformPerspective: 900 });
      tl.from(q('.ticker.lob'), { y: -80, opacity: 0, duration: .9 })
        .from(q('.qrcard'), { rotationY: -75, rotationX: 15, z: -400, opacity: 0, duration: 1.4, ease: 'elastic.out(1,.65)' }, .1)
        .from(q('.hint, .count'), { y: 30, opacity: 0, stagger: .1, duration: .8 }, .5);
      tilt(q('.qrcard, .bubble'));
    }
    if (ph === 'intro') {
      prep(q('.intro .num'));
      tl.from(q('.intro .num'), { scale: 0, rotation: -12, duration: .9, ease: 'back.out(3)' })
        .from(q('.introbar'), { scaleX: 0, opacity: 0, duration: .6 }, .2);
    }
    if (ph === 'question') {
      const opts = q('.opt'); prep(opts.concat(q('.qhead, .answered')));
      tl.from(q('.qhead'), { x: -innerWidth * .8, skewX: -35, opacity: 0, duration: .9 })
        .from(q('.tline'), { scaleX: 0, transformOrigin: '0 50%', duration: .8, ease: 'power3.out' }, .25)
        .from(q('.timer'), { scale: 0, rotation: -200, duration: 1.1, ease: 'back.out(1.8)' }, .3)
        .from(q('.answered'), { scale: 0, rotation: 20, duration: .8, ease: 'back.out(2.5)' }, .4)
        .from(opts, { rotationX: -95, y: 70, z: -200, opacity: 0, transformOrigin: '50% 0%', stagger: .1, duration: 1.1, ease: 'elastic.out(1,.75)' }, .35);
      tilt(opts);
    }
    if (ph === 'reveal') {
      const win = q('.opt.win'), dim = q('.opt.dim'); prep(q('.opt, .qhead, .answered'));
      tl.to(dim, { y: '+=36', rotation: () => R(-6, 6), opacity: .28, scale: .94, duration: 1.1, ease: 'bounce.out', stagger: .06 }, .1)
        .fromTo(win, { scale: 1 }, { scale: 1.07, duration: 1, ease: 'elastic.out(1,.3)' }, .15)
        .from(q('.bar i'), { scaleY: 0, transformOrigin: '50% 100%', duration: 1.2, ease: 'elastic.out(1,.5)', stagger: .07 }, .2)
        .from(q('.bar b'), { y: 30, opacity: 0, stagger: .07, duration: .6 }, .5);
      setTimeout(boom, 250);
    }
    if (ph === 'board') {
      const rows = q('.row'); prep(rows); prep(q('h2'));
      if (rows.length > 1) {
        const step = rows[1].offsetTop - rows[0].offsetTop;
        const old = rows.map((r, i) => ({ r, i, prev: +r.dataset.prev || 99, olds: +r.dataset.old || 0 }))
          .sort((a, b) => a.prev - b.prev || b.olds - a.olds);
        old.forEach((o, k) => { o.k = o.prev >= 99 ? rows.length + 1 : k; });
        rows.forEach(r => { const sc = r.querySelector('.sc'); if (sc) sc.textContent = r.dataset.old; });
        old.forEach(o => gsap.set(o.r, { y: (o.k - o.i) * step, opacity: o.prev >= 99 ? 0 : 1 }));
        tl.from(rows, { x: innerWidth * .7, skewX: -30, duration: .8, stagger: .07, ease: 'power4.out' })
          .to(rows, { y: 0, opacity: 1, duration: 1.1, ease: 'power3.inOut', stagger: .04 }, 1.3)
          .add(() => {
            rows.forEach(r => {
              const sc = r.querySelector('.sc'), o = { v: +r.dataset.old || 0 };
              if (sc) gsap.to(o, { v: +sc.dataset.v, duration: 1, ease: 'power2.out', onUpdate: () => sc.textContent = Math.round(o.v) });
            });
            old.filter(o => o.k > o.i).forEach(o => gsap.fromTo(o.r, { scale: 1 }, { scale: 1.05, yoyo: true, repeat: 1, duration: .35, ease: 'power2.out' }));
          }, 1.3);
      } else { rows.forEach(r => { const sc = r.querySelector('.sc'); if (sc) sc.textContent = sc.dataset.v; }); tl.from(rows, { x: innerWidth * .7, duration: .8 }); }
    }
  }
  /* П'єдестал: поштовх сцени, коли виїжджає стовпчик */
  function podium(n, stage) {
    if (!active()) return;
    const col = document.getElementById('col' + n); if (!col) return;
    gsap.from(col.querySelector('.who'), { y: -60, scale: .4, opacity: 0, duration: 1, ease: 'elastic.out(1,.5)', delay: .5 });
    gsap.fromTo(stage, { y: 0 }, { y: n === 1 ? 14 : 7, duration: .07, repeat: n === 1 ? 7 : 3, yoyo: true, ease: 'none', clearProps: 'transform', delay: .25 });
    if (n === 1) boom();
  }
  /* Телефон гостя */
  function phone(ph, root, ok) {
    if (!active()) { document.body.classList.remove('gs'); return; }
    document.body.classList.add('gs');
    const q = s => [...root.querySelectorAll(s)];
    if (ph === 'question') gsap.from(q('.opt'), { rotationX: -90, y: 40, opacity: 0, transformPerspective: 700, transformOrigin: '50% 0%', stagger: .08, duration: 1, ease: 'elastic.out(1,.75)' });
    if (ph === 'reveal') {
      gsap.from(q('.result'), { scale: .3, rotation: ok === 1 ? -8 : 8, opacity: 0, duration: 1.1, ease: 'elastic.out(1,.45)' });
      if (ok === 0) gsap.fromTo(q('.result'), { x: 0 }, { x: 10, duration: .06, repeat: 7, yoyo: true, delay: .4, clearProps: 'x' });
      if (ok === 1) boom();
    }
  }
  return { enter, podium, phone, active };
})();
