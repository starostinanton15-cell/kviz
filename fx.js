/* Режисура анімацій на GSAP для стилів «Скло-шоу» і «Рідке скло». Без GSAP або в інших стилях нічого не робить. */
window.FX = (() => {
  const THEMES = ['show', 'glass', 'city', 'nerd', 'party'];
  const active = () => !!window.gsap && THEMES.includes(document.body.dataset.theme);
  const SK = () => document.body.dataset.theme === 'show' ? -9 : 0;
  const boom = () => { if (window.LQ && LQ.on) LQ.pulse(); if (window.SB && SB.on) SB.pulse(); if (window.ST && ST.on) ST.pulse(); if (window.DD && DD.on) DD.pulse(); if (window.NF && NF.on) NF.pulse(); };
  const R = (a, b) => a + Math.random() * (b - a);
  let tiltEls = [], tl = null;

  function prep(els) { gsap.set(els, { skewX: SK(), transformPerspective: 900 }); }

  /* Нахил за курсором: об'єм */
  addEventListener('pointermove', e => {
    if (!active() || document.body.dataset.theme === 'glass') return; /* у glass рух постійний (sway.js), не від мишки */
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
      const win = q('.opt.win'), dim = q('.opt.dim'), pic = !!(root.classList && root.classList.contains('haspic')); /* з фото лічильники мають лишатися читабельними */ prep(q('.opt, .qhead, .answered'));
      tl.to(dim, { y: pic ? '+=8' : '+=36', rotation: () => R(-6, 6) * (pic ? .3 : 1), opacity: pic ? .82 : .28, scale: .94, duration: 1.1, ease: 'bounce.out', stagger: .06 }, .1)
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
        /* 1) рядки влітають зі старими балами; 2) +бали і лічильник (звук count); 3) обгін (звук pass); 4) спалах лідера (звук lead) */
        const S = typeof VQ !== 'undefined' && VQ.Sfx, snd = (n, o) => S && S.buf && S.buf[n] && S.play(n, o);
        const moved = old.some(o => o.k !== o.i && o.prev < 99), T1 = 1.0, T2 = moved ? 2.5 : 2.3, T3 = moved ? 3.5 : 2.4;
        tl.from(rows, { x: innerWidth * .7, skewX: -30, duration: .8, stagger: .07, ease: 'power4.out' })
          .add(() => {
            /* звук рахування лише якщо хтось справді отримав бали */
            if (rows.some(r => { const sc = r.querySelector('.sc'); return sc && +sc.dataset.v > (+r.dataset.old || 0); })) snd('count', { vol: .55 });
            rows.forEach(r => {
              const sc = r.querySelector('.sc'), o = { v: +r.dataset.old || 0 }, g = r.querySelector('.gain');
              if (g) gsap.fromTo(g, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: .5, ease: 'back.out(3)' });
              if (sc && +sc.dataset.v !== o.v) { gsap.to(o, { v: +sc.dataset.v, duration: 1.3, ease: 'power1.inOut', onUpdate: () => sc.textContent = Math.round(o.v) });
                gsap.fromTo(sc, { scale: 1 }, { scale: 1.25, duration: .12, yoyo: true, repeat: 9, ease: 'sine.inOut' }); }
            });
          }, T1)
          .to(rows, { y: 0, opacity: 1, duration: .9, ease: 'power3.inOut', stagger: .04 }, T2)
          .add(() => {
            if (moved) snd('pass', { vol: .7 });
            old.filter(o => o.k > o.i).forEach(o => gsap.fromTo(o.r, { scale: 1 }, { scale: 1.06, yoyo: true, repeat: 1, duration: .3, ease: 'power2.out' }));
          }, T2)
          .add(() => {
            const top = rows[0]; if (!top) return;
            const lsc = top.querySelector('.sc'); if (!lsc || +lsc.dataset.v <= 0) return; /* нуль балів у всіх: без фанфар лідеру */
            snd('lead', { vol: .8 });
            let sh = top.querySelector('.sheen'); if (!sh) { sh = document.createElement('span'); sh.className = 'sheen'; sh.innerHTML = '<i></i>'; top.appendChild(sh); }
            gsap.fromTo(sh.firstChild, { xPercent: -130 }, { xPercent: 260, duration: .9, ease: 'power2.inOut' });
            gsap.fromTo(top, { scale: 1 }, { scale: 1.07, duration: .9, ease: 'elastic.out(1,.35)' });
            gsap.fromTo(top, { filter: 'brightness(1.6)' }, { filter: 'brightness(1)', duration: 1.1, ease: 'power2.out' });
            boom();
          }, T3);
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
    /* легка поява без 3D: на телефонах 3D-обертання скляних кнопок давало ривки */
    if (ph === 'question') gsap.from(q('.opt'), { y: 26, scale: .94, opacity: 0, stagger: .06, duration: .5, ease: 'power3.out', clearProps: 'transform,opacity' });
    if (ph === 'reveal') {
      gsap.from(q('.result'), { scale: .3, rotation: ok === 1 ? -8 : 8, opacity: 0, duration: 1.1, ease: 'elastic.out(1,.45)' });
      if (ok === 0) gsap.fromTo(q('.result'), { x: 0 }, { x: 10, duration: .06, repeat: 7, yoyo: true, delay: .4, clearProps: 'x' });
      if (ok === 1) boom();
    }
  }
  return { enter, podium, phone, active };
})();
