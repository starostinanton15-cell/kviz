/* Спільний код: з'єднання, звуки, конфеті */
const VQ = (() => {
  const BROKERS = [
    'wss://broker.emqx.io:8084/mqtt',
    'wss://broker.hivemq.com:8884/mqtt',
    'wss://test.mosquitto.org:8081/mqtt'
  ];
  const params = new URLSearchParams(location.search);
  const override = params.get('broker'); // для тестів

  const enc = new TextEncoder(), dec = new TextDecoder();
  const rid = (n = 10) => Array.from(crypto.getRandomValues(new Uint8Array(n)), b => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const topic = room => 'vedquiz/v1/' + room;

  // Підключення. idx = номер брокера; tryAll = перебирати брокери, поки не вийде
  function connect({ idx = 0, tryAll = false, onConnect, onMessage, onStatus, subs = [] }) {
    let cur = idx, client = null, done = false, timer = null;
    const open = () => {
      const url = override || BROKERS[cur] || BROKERS[0];
      onStatus && onStatus('connecting');
      client = mqtt.connect(url, {
        clientId: 'vq_' + rid(12), keepalive: 20, reconnectPeriod: 1500,
        connectTimeout: 7000, clean: true, protocolVersion: 4
      });
      api.client = client;
      if (tryAll && !override) {
        timer = setTimeout(() => {
          if (done) return;
          client.end(true);
          cur = (cur + 1) % BROKERS.length;
          open();
        }, 7000);
      }
      client.on('connect', () => {
        done = true; clearTimeout(timer);
        api.idx = cur;
        if (subs.length) client.subscribe(subs, { qos: 1 });
        onStatus && onStatus('online');
        onConnect && onConnect(cur);
      });
      client.on('reconnect', () => onStatus && onStatus('connecting'));
      client.on('offline', () => onStatus && onStatus('offline'));
      client.on('close', () => onStatus && onStatus('offline'));
      client.on('message', (t, buf) => {
        if (!buf || !buf.length) { onMessage && onMessage(t, null); return; }
        let m; try { m = JSON.parse(dec.decode(buf)); } catch (e) { return; }
        onMessage && onMessage(t, m);
      });
    };
    const api = {
      idx: cur, client: null,
      pub(t, obj, opts = {}) {
        if (!client) return;
        client.publish(t, obj == null ? '' : JSON.stringify(obj), { qos: 1, retain: !!opts.retain });
      },
      get online() { return !!(client && client.connected); }
    };
    open();
    return api;
  }

  /* ---------- Звуки (синтез, без файлів) ---------- */
  const Sfx = {
    ctx: null, out: null, muted: false, loopTimer: null, loopKind: null, step: 0, nextT: 0, tempo: 1,
    init() {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.out = this.ctx.createGain();
        this.out.gain.value = this.muted ? 0 : 0.55;
        const comp = this.ctx.createDynamicsCompressor();
        this.out.connect(comp); comp.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    },
    setMuted(m) { this.muted = m; if (this.out) this.out.gain.value = m ? 0 : 0.55; },
    get t() { return this.ctx ? this.ctx.currentTime : 0; },
    tone(f, t0, dur, type = 'sine', vol = 0.25, f2) {
      if (!this.ctx) return;
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t0);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.out); o.start(t0); o.stop(t0 + dur + 0.05);
    },
    noise(t0, dur, vol = 0.2, freq = 1200, q = 0.8) {
      if (!this.ctx) return;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const s = this.ctx.createBufferSource(); s.buffer = b;
      const f = this.ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f); f.connect(g); g.connect(this.out); s.start(t0); s.stop(t0 + dur + 0.02);
    },
    kick(t, v = 0.5) { this.tone(140, t, 0.25, 'sine', v, 40); },
    hat(t, v = 0.06) { this.noise(t, 0.05, v, 8000, 1); },
    snare(t, v = 0.18) { this.noise(t, 0.16, v, 1800, 0.6); this.tone(190, t, 0.08, 'triangle', v * 0.6); },
    pop() { this.init(); const t = this.t; this.tone(660, t, 0.12, 'sine', 0.3, 1320); this.tone(990, t + 0.05, 0.1, 'sine', 0.15); },
    tick(hi) { this.init(); const t = this.t; this.tone(hi ? 1400 : 950, t, 0.06, 'square', hi ? 0.12 : 0.07); },
    whoosh() { this.init(); const t = this.t; this.noise(t, 0.45, 0.25, 900, 0.5); this.tone(220, t, 0.4, 'sine', 0.12, 880); },
    gong() { this.init(); const t = this.t; [196, 247, 294].forEach((f, i) => this.tone(f, t, 1.6, 'triangle', 0.18 - i * 0.03)); this.noise(t, 0.4, 0.15, 400, 0.4); },
    correct() { this.init(); const t = this.t; [523, 659, 784, 1047].forEach((f, i) => this.tone(f, t + i * 0.09, 0.35, 'triangle', 0.22)); },
    wrong() { this.init(); const t = this.t; this.tone(330, t, 0.25, 'sawtooth', 0.12, 220); this.tone(262, t + 0.2, 0.4, 'sawtooth', 0.12, 160); },
    drumroll(dur = 2.5) {
      this.init(); const t = this.t;
      for (let x = 0; x < dur; x += 0.045) this.snare(t + x, 0.05 + 0.18 * (x / dur));
      return dur;
    },
    cymbal() { this.init(); const t = this.t; this.noise(t, 1.4, 0.3, 6000, 0.3); this.kick(t, 0.6); },
    fanfare() {
      this.init(); const t = this.t;
      const n = [[523, 0, .18], [523, .18, .18], [523, .36, .18], [659, .54, .5], [587, .95, .18], [659, 1.13, .18], [784, 1.31, 1.1]];
      n.forEach(([f, s, d]) => { this.tone(f, t + s, d, 'sawtooth', 0.12); this.tone(f * 2, t + s, d, 'triangle', 0.08); });
      [262, 330, 392].forEach(f => this.tone(f, t + 1.31, 1.2, 'triangle', 0.1));
      this.cymbalAt(t + 1.31);
    },
    cymbalAt(t) { this.noise(t, 1.3, 0.25, 6000, 0.3); this.kick(t, 0.6); },
    /* Музичні петлі: 'lobby' (легка) і 'think' (напружена) */
    loop(kind) {
      this.init(); if (!this.ctx) return;
      if (this.loopKind === kind) return;
      this.stopLoop(); this.loopKind = kind; this.step = 0; this.nextT = this.t + 0.08; this.tempo = 1;
      this.loopTimer = setInterval(() => this._sched(), 25);
    },
    stopLoop() { clearInterval(this.loopTimer); this.loopTimer = null; this.loopKind = null; },
    _sched() {
      const bpm = (this.loopKind === 'think' ? 128 : 112) * this.tempo, st = 60 / bpm / 4;
      while (this.nextT < this.t + 0.12) { this._play(this.step, this.nextT, st); this.step++; this.nextT += st; }
    },
    _play(s, t, st) {
      const i = s % 16, bar = Math.floor(s / 16) % 4;
      if (this.loopKind === 'lobby') {
        const chords = [[261.6, 329.6, 392], [196, 246.9, 293.7], [220, 261.6, 329.6], [174.6, 220, 261.6]];
        const c = chords[bar];
        if (i % 4 === 0) this.kick(t, 0.32);
        if (i % 4 === 2) this.hat(t, 0.05);
        if (i === 4 || i === 12) this.snare(t, 0.08);
        if (i % 8 === 0) this.tone(c[0] / 2, t, st * 7, 'triangle', 0.16);
        if (i % 2 === 0) this.tone(c[(i / 2) % 3] * 2, t, st * 1.6, 'sine', 0.06);
        if (i === 6 || i === 14) this.tone(c[2] * 2, t, st * 2, 'triangle', 0.04);
      } else {
        const root = [110, 110, 98, 116.5][bar];
        if (i % 4 === 0) this.kick(t, 0.36);
        this.hat(t, i % 2 ? 0.025 : 0.05);
        if (i === 4 || i === 12) this.snare(t, 0.07);
        if (i % 2 === 0) this.tone(root * (i % 4 === 0 ? 1 : 1.5), t, st * 1.5, 'sawtooth', 0.05);
        if (i === 0 || i === 10) this.tone(root * 4, t, st * 2, 'square', 0.025);
      }
    }
  };

  /* ---------- Конфеті ---------- */
  function confetti(ms = 5000, count = 220) {
    const c = document.createElement('canvas');
    c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:999';
    document.body.appendChild(c);
    const x = c.getContext('2d'), dpr = devicePixelRatio || 1;
    const rs = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; };
    rs(); addEventListener('resize', rs);
    const cols = ['#ffd166', '#ff6b8b', '#8f7bff', '#2ad4a0', '#ffffff', '#ffb020'];
    const P = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth, y: -20 - Math.random() * innerHeight * 0.6,
      vx: (Math.random() - .5) * 3, vy: 2 + Math.random() * 4, r: Math.random() * 6.28, vr: (Math.random() - .5) * .3,
      w: 6 + Math.random() * 8, h: 4 + Math.random() * 6, c: cols[Math.random() * cols.length | 0]
    }));
    const t0 = performance.now();
    (function f(now) {
      const el = now - t0; x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, innerWidth, innerHeight);
      P.forEach(p => {
        p.x += p.vx + Math.sin((now + p.w * 99) / 400); p.y += p.vy; p.r += p.vr;
        if (p.y > innerHeight + 20 && el < ms - 1500) { p.y = -20; p.x = Math.random() * innerWidth; }
        x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore();
      });
      if (el < ms) requestAnimationFrame(f); else { removeEventListener('resize', rs); c.remove(); }
    })(t0);
  }

  /* ---------- Стилі ---------- */
  const THEMES = {
    nerd: { name: 'Нердактик', fonts: 'Fira+Sans+Extra+Condensed:ital,wght@0,700;0,800;0,900;1,800&family=Montserrat:wght@500;600;700;800' },
    city: { name: 'Ігрове місто', fonts: 'Rubik:wght@500;700;800;900' },
    party: { name: 'Паті-постер', fonts: 'Neucha&family=Caveat:wght@600;700&family=Montserrat:wght@500;700;800' },
    show: { name: 'Скло-шоу', fonts: 'Exo+2:ital,wght@0,600;0,800;0,900;1,700;1,800;1,900&family=Inter:wght@500;600;700;800' },
    glass: { name: 'Рідке скло', fonts: 'Inter:wght@400;500;600;700;800;900' },
    edit: { name: 'Журнал', fonts: 'Inter+Tight:ital,wght@0,500;0,700;0,800;0,900;1,900&family=Cormorant+Garamond:ital,wght@1,500;1,600' },
    live: { name: 'Трансляція', fonts: 'Exo+2:ital,wght@0,600;0,800;0,900;1,700;1,800;1,900' },
    neon: { name: 'Неон-шоу', fonts: 'Unbounded:wght@500;700;900&family=Manrope:wght@500;700;800' },
    gold: { name: 'Чорне золото', fonts: 'Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=Manrope:wght@500;700;800' },
    pop: { name: 'Поп-арт', fonts: 'Dela+Gothic+One&family=Manrope:wght@500;700;800' }
  };
  function applyTheme(t) {
    if (!THEMES[t]) t = 'glass';
    if (document.body.dataset.theme === t) return t;
    document.body.dataset.theme = t;
    const qbg = new URLSearchParams(location.search).get('bg'); if (qbg) document.body.dataset.bg = qbg;
    document.getElementById('tf').href = 'https://fonts.googleapis.com/css2?family=' + THEMES[t].fonts + '&display=swap';
    document.getElementById('tc').href = 'theme-' + t + '.css?v=' + (window.VQ_V || '');
    const bg = document.querySelector('.bg');
    bg && bg.querySelectorAll('.bubbles').forEach(e => e.remove());
    if (bg && t === 'show') {
      const b = document.createElement('div'); b.className = 'bubbles';
      for (let k = 0; k < 18; k++) {
        const sz = 14 + Math.random() * 90, sp = document.createElement('span');
        sp.style.cssText = `width:${sz}px;height:${sz}px;left:${Math.random() * 100}%;animation-duration:${14 + Math.random() * 18}s,${3 + Math.random() * 3}s;animation-delay:${-Math.random() * 30}s,${-Math.random() * 3}s`;
        b.appendChild(sp);
      }
      bg.appendChild(b);
    }
    if (window.LQ) {
      const phone = !document.getElementById('stage');
      if (t === 'show') LQ.start({ scale: phone ? .4 : .55, count: phone ? 6 : 9 }); else LQ.stop();
    }
    if (window.NF) {
      const phone = !document.getElementById('stage');
      if (t === 'nerd') NF.start({ scale: phone ? .7 : .6, small: phone }); else NF.stop();
    }
    if (window.DD) {
      const phone = !document.getElementById('stage');
      if (t === 'city' || t === 'party') DD.start({ scale: phone ? .7 : .6, small: phone, mode: t }); else DD.stop();
    }
    if (window.SB) {
      const phone = !document.getElementById('stage');
      const qs = new URLSearchParams(location.search).get('sub'); if (qs) document.body.dataset.sub = qs;
      if (t === 'glass') SB.start(phone ? { scale: .25, fps: 30 } : { scale: .5 }); else SB.stop();
    }
    if (window.SW) { if (t === 'glass' && document.getElementById('stage')) SW.start(); else SW.stop(); }
    if (window.ST) {
      const phone = !document.getElementById('stage');
      if (false) ST.start({ scale: phone ? .5 : .6, small: phone }); else ST.stop();
    }
    return t;
  }
  /* Кінетичний текст: кожна літера вилітає окремо */
  function kin(text, cls = '') {
    let i = 0;
    return `<span class="kin ${cls}">` + String(text ?? '').split(/(\s+)/).map(w => /^\s+$/.test(w) ? ' ' :
      `<span class="w">${[...w].map(ch => `<span class="c" style="--i:${i++}">${esc(ch)}</span>`).join('')}</span>`).join('') + '</span>';
  }
  /* Перехід між екранами */
  function wipe() {
    let w = document.getElementById('wipe');
    if (!w) { w = document.createElement('div'); w.id = 'wipe'; w.innerHTML = '<i></i><i></i><i></i>'; document.body.appendChild(w); }
    w.classList.remove('go'); void w.offsetWidth; w.classList.add('go');
  }

  return { connect, Sfx, confetti, rid, esc, topic, params, BROKERS, THEMES, applyTheme, kin, wipe };
})();
