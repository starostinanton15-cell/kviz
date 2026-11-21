/* Живе рідке скло на WebGL: краплі пливуть, зливаються, заломлюють фон і тікають від курсора.
   LQ.start(opts) — запуск (тільки для стилів show/glass), LQ.stop(), LQ.pulse() — сплеск на святкові моменти. */
window.LQ = (() => {
  /* Палітри фону для темного режиму (стиль show). Вибір: body[data-bg]. */
  /* Світлі палітри для стилю glass (без вибору — стара пастель). */
  const LPALS = {
    sunset: [[1,.70,.72],[1,.82,.60],[.86,.72,1],[1,.62,.82],[1,.90,.78]],
    sky:    [[.70,.84,1],[.80,.74,1],[.66,.95,.96],[.92,.80,1],[.86,.93,1]],
    candy:  [[1,.66,.86],[.72,.86,1],[1,.93,.62],[.78,1,.86],[.90,.74,1]],
  };
  const PALS = {
    old:   { p: [[.04,.08,.22],[0,.22,.45],[.02,.03,.07],[.13,.19,.02],[.03,.06,.16]], ia: [.83,1,0], ib: [0,.7,1] },
    night: { p: [[.42,.07,.50],[.13,.06,.42],[.04,.02,.12],[.62,.16,.30],[.22,.06,.34]], ia: [1,.45,.75], ib: [1,.78,.25] },
    aurora:{ p: [[0,.34,.44],[.28,.09,.56],[.02,.03,.11],[0,.48,.36],[.07,.09,.28]], ia: [.2,1,.9], ib: [.7,.45,1] },
    gold:  { p: [[.46,.26,.08],[.34,.08,.22],[.07,.03,.06],[.58,.38,.12],[.17,.06,.11]], ia: [1,.85,.4], ib: [1,.5,.6] },
  };
  let gl, cv, prog, raf = 0, blobs = [], uni = {}, mouse = { x: -9999, y: -9999 }, t0 = performance.now(), scale = .5, maxN = 9, boost = 0, running = false;

  const VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  const FS = `precision highp float;
uniform vec2 R; uniform float T; uniform vec4 B[10]; uniform int N; uniform float K; uniform float DK; uniform vec3 P[5]; uniform vec3 IA; uniform vec3 IB; uniform vec3 Q[5]; uniform float QL;
vec3 bg(vec2 uv){
  float t = T * .045;
  vec2 p1 = vec2(.18 + .14*sin(t*1.3), .30 + .18*cos(t));
  vec2 p2 = vec2(.82 + .10*cos(t*1.1), .78 + .14*sin(t*.9));
  vec2 p3 = vec2(.70 + .18*sin(t*.7), .12 + .08*cos(t*1.4));
  vec2 p4 = vec2(.30 + .12*cos(t*1.7), .88 + .08*sin(t*1.2));
  vec2 p5 = vec2(.52 + .25*cos(t*.5), .50 + .2*sin(t*.6));
  vec3 c1 = vec3(1., .80, .90), c2 = vec3(.84, .79, 1.), c3 = vec3(.76, .89, 1.), c4 = vec3(.80, .97, .90), c5 = vec3(1., .91, .82);
  if (QL > .5) { c1 = Q[0]; c2 = Q[1]; c3 = Q[2]; c4 = Q[3]; c5 = Q[4]; }
  if (DK > .5) { c1 = P[0]; c2 = P[1]; c3 = P[2]; c4 = P[3]; c5 = P[4]; }
  float w1 = 1./(.015+pow(distance(uv,p1),2.)), w2 = 1./(.015+pow(distance(uv,p2),2.)), w3 = 1./(.015+pow(distance(uv,p3),2.)), w4 = 1./(.015+pow(distance(uv,p4),2.)), w5 = 1./(.02+pow(distance(uv,p5),2.));
  vec3 c = (c1*w1 + c2*w2 + c3*w3 + c4*w4 + c5*w5) / (w1+w2+w3+w4+w5);
  return DK > .5 ? c : mix(c, vec3(1.), .06);
}
void main(){
  vec2 fc = gl_FragCoord.xy; vec2 uv = fc / R;
  float f = 0., fs = 0., hue = 0.; vec2 g = vec2(0.);
  for (int i = 0; i < 10; i++) {
    if (i >= N) break;
    vec2 d = fc - B[i].xy; float r2 = B[i].z * B[i].z;
    float q = r2 / (dot(d, d) + 1.);
    f += q; hue += B[i].w * q;
    g += -2. * q * q / r2 * d;
    vec2 ds = d - vec2(R.x*.006, -R.y*.028);
    fs += r2 / (dot(ds, ds) + 1.);
  }
  hue /= max(f, 1e-3);
  vec3 col = bg(uv);
  /* м'яка тінь під краплями */
  col *= 1. - (DK > .5 ? .35 : .10) * smoothstep(.45, 1.1, fs) * (1. - smoothstep(.9, 1.1, f));
  float aa = fwidth(f) * 1.2 + 1e-4;
  float m = smoothstep(1. - aa, 1. + aa, f);
  if (m > 0.) {
    vec3 n = normalize(vec3(g * K / (f * f), 1.));
    float fr = pow(1. - n.z, 1.6);
    vec3 refr = bg(uv - n.xy * .22 - vec2(0., .03));
    float ca = .012 * fr; refr = vec3(bg(uv - n.xy * (.22 + ca*8.)).r, refr.g, bg(uv - n.xy * (.22 - ca*8.)).b);
    vec3 iri = .5 + .5 * cos(6.2831 * (vec3(0., .33, .67) + fr * 1.3 + hue + T * .03));
    if (DK > .5) iri = mix(IA, IB, .5 + .5 * cos(6.2831 * (fr * 1.1 + hue + T * .03)));
    vec3 L = normalize(vec3(-.45, .6, .75));
    float sp = pow(max(dot(reflect(-L, n), vec3(0., 0., 1.)), 0.), 60.);
    float sp2 = pow(max(dot(reflect(-normalize(vec3(.5,-.4,.8)), n), vec3(0., 0., 1.)), 0.), 18.) * .25;
    vec3 glass = refr * 1.03 + vec3(.02, .02, .04);
    glass = mix(glass, glass * .55 + iri * (DK > .5 ? .45 : .6), smoothstep(.15, .9, fr) * .8);
    if (DK < .5) glass *= mix(1., .78, smoothstep(.55, .95, fr));
    glass += vec3(1.) * (sp * smoothstep(.08, .45, fr) * 1.2 + sp2);
    glass += vec3(1.) * smoothstep(.75, 1., fr) * .35;
    col = mix(col, glass, m);
  }
  gl_FragColor = vec4(col, 1.);
}`;

  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function init() {
    cv = document.createElement('canvas'); cv.id = 'lq';
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }) || cv.getContext('experimental-webgl');
    if (!gl) return false;
    gl.getExtension('OES_standard_derivatives');
    const fsrc = '#extension GL_OES_standard_derivatives : enable\n' + FS;
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fsrc)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['R', 'T', 'B', 'N', 'K', 'DK', 'IA', 'IB'].forEach(k => uni[k] = gl.getUniformLocation(prog, k)); uni.P = gl.getUniformLocation(prog, 'P[0]'); uni.Q = gl.getUniformLocation(prog, 'Q[0]'); uni.QL = gl.getUniformLocation(prog, 'QL');
    addEventListener('pointermove', e => { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });
    addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    addEventListener('resize', resize);
    return true;
  }
  function resize() {
    if (!cv) return;
    const d = Math.min(devicePixelRatio || 1, 2) * scale;
    cv.width = Math.max(2, Math.round(innerWidth * d)); cv.height = Math.max(2, Math.round(innerHeight * d));
    gl.viewport(0, 0, cv.width, cv.height);
  }
  function seed() {
    const W = innerWidth, H = innerHeight, s = Math.min(W, H);
    blobs = Array.from({ length: maxN }, (_, i) => {
      const r = s * (.045 + Math.random() * .07);
      return { x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * 40, vy: (Math.random() - .5) * 40, r, r0: r, ph: Math.random() * 100, hue: Math.random() };
    });
  }
  function step(dt, t) {
    const W = innerWidth, H = innerHeight;
    boost *= Math.pow(.25, dt);
    for (const b of blobs) {
      /* блукання */
      b.vx += Math.sin(t * .31 + b.ph) * 14 * dt; b.vy += Math.cos(t * .27 + b.ph * 1.7) * 14 * dt;
      /* курсор відштовхує */
      const dx = b.x - mouse.x, dy = b.y - mouse.y, dd = Math.hypot(dx, dy), rr = 160 + b.r;
      if (dd < rr && dd > 1) { const k = (1 - dd / rr) * 900 * dt; b.vx += dx / dd * k; b.vy += dy / dd * k; }
      /* легке тяжіння між краплями, щоб інколи зливались */
      for (const o of blobs) if (o !== b) { const ex = o.x - b.x, ey = o.y - b.y, e = Math.hypot(ex, ey); if (e < 420 && e > 1) { b.vx += ex / e * 6 * dt; b.vy += ey / e * 6 * dt; } }
      /* межі екрана */
      const m = b.r * .4;
      if (b.x < -m) b.vx += 60 * dt; if (b.x > W + m) b.vx -= 60 * dt;
      if (b.y < -m) b.vy += 60 * dt; if (b.y > H + m) b.vy -= 60 * dt;
      b.vx *= Math.pow(.55, dt); b.vy *= Math.pow(.55, dt);
      const sp = Math.hypot(b.vx, b.vy); if (sp > 260) { b.vx *= 260 / sp; b.vy *= 260 / sp; }
      b.x += b.vx * dt; b.y += b.vy * dt;
      b.r = b.r0 * (1 + .06 * Math.sin(t * .8 + b.ph) + boost * .35);
    }
  }
  let last = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const t = (now - t0) / 1000, dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    step(dt, t);
    const d = cv.width / innerWidth, arr = new Float32Array(40);
    blobs.forEach((b, i) => { arr[i * 4] = b.x * d; arr[i * 4 + 1] = (innerHeight - b.y) * d; arr[i * 4 + 2] = b.r * d; arr[i * 4 + 3] = b.hue; });
    gl.uniform2f(uni.R, cv.width, cv.height); gl.uniform1f(uni.T, t); gl.uniform4fv(uni.B, arr); gl.uniform1i(uni.N, blobs.length); gl.uniform1f(uni.K, 50 * d); gl.uniform1f(uni.DK, document.body.dataset.theme === 'show' ? 1 : 0); const pl = PALS[document.body.dataset.bg] || PALS.old; gl.uniform3fv(uni.P, pl.p.flat()); gl.uniform3fv(uni.IA, pl.ia); gl.uniform3fv(uni.IB, pl.ib); const lp = LPALS[document.body.dataset.bg]; gl.uniform1f(uni.QL, lp ? 1 : 0); if (lp) gl.uniform3fv(uni.Q, lp.flat());
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  return {
    start(o = {}) {
      if (running) return true;
      scale = o.scale || scale; maxN = Math.min(10, o.count || maxN);
      try { if (!gl && !init()) return false; } catch (e) { console.warn('WebGL off', e); return false; }
      const bg = document.querySelector('.bg'); bg.insertBefore(cv, bg.firstChild);
      document.body.classList.add('webgl'); resize(); seed(); running = true; last = 0; raf = requestAnimationFrame(frame);
      return true;
    },
    stop() { running = false; cancelAnimationFrame(raf); document.body.classList.remove('webgl'); cv && cv.remove(); },
    pulse() {
      boost = 1;
      const cx = innerWidth / 2, cy = innerHeight / 2;
      blobs.forEach(b => { const dx = b.x - cx, dy = b.y - cy, d = Math.hypot(dx, dy) || 1; b.vx += dx / d * 220; b.vy += dy / d * 220; });
    },
    get on() { return running; }
  };
})();
