/* Жива субстанція на фоні стилю «Рідке скло» (WebGL, один шейдер на весь екран).
   Режими (body[data-sub] або SB.start({mode})): silk — перламутровий шовк, що переливається складками;
   pearl — рідкий перламутр (глянцева поверхня, що повільно перетікає); ink — пастельна фарба, що розпливається у воді.
   Курсор закручує субстанцію; SB.pulse() — сплеск на святкові моменти. */
window.SB = (() => {
  let fps = 0, pa = 0, gl, cv, prog, raf = 0, uni = {}, t0 = performance.now(), scale = .5, running = false, boost = 0, mode = 'ink';
  const mouse = { x: .5, y: .5, tx: .5, ty: .5, on: 0, ton: 0 };
  const MODES = { silk: 0, pearl: 1, ink: 2 };
  /* Палітри фарби понад рожеву/синю: фон, далі 4 кольори барвника */
  const INKS = {
    coral: [[1, .98, .95], [1, .76, .66], [.70, .78, 1], [1, .88, .70], [.82, .90, 1]],
    lemon: [[1, .99, .95], [1, .94, .64], [.82, .76, 1], [1, .84, .74], [.80, .96, .88]],
    mint: [[.98, 1, .98], [.72, .95, .86], [1, .74, .70], [1, .92, .78], [.72, .90, .98]],
  };
  let px = 0, ink = INKS.coral.map(c => c.slice());
  const VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  const FS = `precision highp float;
uniform vec2 R; uniform float T; uniform float M; uniform vec3 MS; uniform float BO; uniform float PA; uniform float PX; uniform vec3 C0; uniform vec3 C1; uniform vec3 C2; uniform vec3 C3; uniform vec3 C4;
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
/* Клітинки шуму по модулю 289: інакше за кілька годин роботи сторінки (час росте) хеш втрачав точність —
   у фоні з'являлись трикутники-блоки й зайвий синій. Шум лишається безперервним. */
float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f); vec2 j = mod(i, 289.), k = mod(i + 1., 289.);
  return mix(mix(h21(j), h21(vec2(k.x, j.y)), f.x), mix(h21(vec2(j.x, k.y)), h21(k), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = .5; mat2 r = mat2(.8,.6,-.6,.8); for (int i = 0; i < 5; i++){ s += a*n2(p); p = r*p*2.02 + 3.1; a *= .5; } return s; }
vec3 pal(float t){ /* пастельний перламутр: рожевий → персик → бузок → блакить → м'ята */
  vec3 p = .78 + .22*cos(6.2831*(t + vec3(.0, .18, .38)));
  return mix(p, .74 + .24*cos(6.2831*(t*.6 + vec3(.55, .45, .30))), PA); }
vec2 swirl(vec2 uv){ /* курсор закручує */
  vec2 d = uv - MS.xy; float r = length(d); float a = MS.z * 2.2 * exp(-r*r*7.);
  float c = cos(a), s = sin(a); return MS.xy + mat2(c,-s,s,c)*d; }
void main(){
  vec2 uv = gl_FragCoord.xy / R; float asp = R.x / R.y;
  vec2 p = swirl(uv); p.x *= asp;
  float t = T * (.06 + .05*BO);
  vec3 col;
  if (M < .5) {
    /* ШОВК: великі плавні складки, глянцева смуга на кожному гребені */
    vec2 q = p*.9; q += .35*vec2(fbm(q*.7 + t*.8), fbm(q*.7 - t*.8 + 4.));
    float w = q.x*1.5 + q.y*.7 + 2.6*fbm(q*.5 + t*.6) + t*1.4;
    float ph = w*5.;
    float s = sin(ph), c = cos(ph);
    col = pal(w*.11 + t*.35);
    col = mix(col*.88, col*1.03, .5 + .5*s);              /* світло-тінь складки */
    col += vec3(1.)*pow(max(c, 0.), 10.)*.45;              /* блиск на гребені */
    col += vec3(1.,.95,1.)*pow(max(c, 0.), 60.)*.35;
    col -= vec3(.06,.05,.09)*pow(max(-c, 0.), 4.)*.6;     /* западини */
    col = mix(col, vec3(1.), .1);
  } else if (M < 1.5) {
    /* ПЕРЛАМУТР: висотне поле → нормалі → м'яке студійне світло + веселкові відблиски */
    vec2 q = p*1.1;
    vec2 wq = q + .8*vec2(fbm(q*.9 + t), fbm(q*.9 - t + 7.));
    float h = fbm(wq*1.3 + t*.5);
    float e = .004;
    vec2 wx = (q+vec2(e,0.)) + .8*vec2(fbm((q+vec2(e,0.))*.9 + t), fbm((q+vec2(e,0.))*.9 - t + 7.));
    vec2 wy = (q+vec2(0.,e)) + .8*vec2(fbm((q+vec2(0.,e))*.9 + t), fbm((q+vec2(0.,e))*.9 - t + 7.));
    float hx = fbm(wx*1.3 + t*.5), hy = fbm(wy*1.3 + t*.5);
    vec3 n = normalize(vec3((h-hx)/e*.09, (h-hy)/e*.09, 1.));
    vec3 L = normalize(vec3(-.4, .5, .8));
    float dif = .55 + .45*dot(n, L);
    float spec = pow(max(dot(reflect(-L, n), vec3(0,0,1)), 0.), 40.);
    float fr = pow(1. - n.z, .7);
    col = pal(h*1.4 + fr*.8 + t*.3) * dif;
    col = mix(col, vec3(.98,.96,1.), .25);
    col += spec*.7 + fr*vec3(.25,.2,.35);
  } else {
    /* ФАРБА У ВОДІ: подвійна деформація fbm (хмари барвника), м'які межі */
    vec2 q = p*1.4;
    vec2 a = vec2(fbm(q + vec2(0., t)), fbm(q + vec2(5.2, 1.3) - t*.8));
    vec2 b = vec2(fbm(q + 3.*a + vec2(1.7, 9.2) + t*.6), fbm(q + 3.*a + vec2(8.3, 2.8) - t*.5));
    float f = fbm(q + 3.2*b);
    vec3 c1 = mix(vec3(1., .72, .84), vec3(.62, .78, 1.), PA), c2 = mix(vec3(.74, .80, 1.), vec3(.70, .70, 1.), PA),
         c3 = mix(vec3(1., .86, .70), vec3(.66, .93, 1.), PA), c4 = mix(vec3(.78, .96, .90), vec3(.80, .96, .94), PA);
    /* додаткові палітри (корал / лимон / м'ята): плавно підміняють кольори фарби */
    c1 = mix(c1, C1, PX); c2 = mix(c2, C2, PX); c3 = mix(c3, C3, PX); c4 = mix(c4, C4, PX);
    col = mix(mix(mix(vec3(.99,.97,1.), vec3(.96,.98,1.), PA), C0, PX), c1, smoothstep(.25, .75, f));
    col = mix(col, c2, smoothstep(.35, .9, length(a)*.9));
    col = mix(col, c3, smoothstep(.55, 1., b.x) * .8);
    col = mix(col, c4, smoothstep(.6, 1., b.y) * .6);
    col = mix(col, col*col*1.15, .25);
    col += .06*smoothstep(.6, .95, f);
  }
  /* ледь помітне зерно, щоб градієнти не «смугували» */
  col += (h21(gl_FragCoord.xy + T) - .5) * .012;
  gl_FragColor = vec4(col, 1.);
}`;
  function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; }
  function init() {
    cv = document.createElement('canvas'); cv.id = 'sb';
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
    gl = cv.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'high-performance' }) || cv.getContext('experimental-webgl');
    if (!gl) return false;
    prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return false;
    gl.useProgram(prog);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    ['R', 'T', 'M', 'MS', 'BO', 'PA', 'PX', 'C0', 'C1', 'C2', 'C3', 'C4'].forEach(k => uni[k] = gl.getUniformLocation(prog, k));
    addEventListener('pointermove', e => { mouse.tx = e.clientX / innerWidth; mouse.ty = 1 - e.clientY / innerHeight; mouse.ton = 1; }, { passive: true });
    addEventListener('pointerleave', () => { mouse.ton = 0; });
    addEventListener('resize', resize);
    return true;
  }
  function resize() {
    if (!cv) return;
    const d = Math.min(devicePixelRatio || 1, 2) * scale;
    cv.width = Math.max(2, Math.round(innerWidth * d)); cv.height = Math.max(2, Math.round(innerHeight * d));
    gl.viewport(0, 0, cv.width, cv.height);
  }
  let last = 0;
  function draw(t, dt) {
    boost *= Math.pow(.3, dt);
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 3); mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 3);
    mouse.on += (mouse.ton - mouse.on) * Math.min(1, dt * 2);
    const m = MODES[document.body.dataset.sub] ?? MODES[mode] ?? 0;
    gl.uniform2f(uni.R, cv.width, cv.height); gl.uniform1f(uni.T, t); gl.uniform1f(uni.M, m);
    gl.uniform3f(uni.MS, .5, .5, boost * .6); /* без реакції на мишку — Антон попросив */ gl.uniform1f(uni.BO, boost);
    pa += ((document.body.dataset.pal === 'blue' ? 1 : 0) - pa) * Math.min(1, dt * 2); gl.uniform1f(uni.PA, pa);
    const P = INKS[document.body.dataset.pal], k = Math.min(1, dt * 2);
    px += ((P ? 1 : 0) - px) * k; if (P) ink.forEach((c, j) => c.forEach((v, n) => c[n] += (P[j][n] - v) * k));
    gl.uniform1f(uni.PX, px); ['C0', 'C1', 'C2', 'C3', 'C4'].forEach((u, j) => gl.uniform3fv(uni[u], ink[j]));
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    if (fps && last && now - last < 1000 / fps - 2) return; /* телефон: 30 кадрів досить для повільної фарби */
    const t = (now - t0) / 1000, dt = Math.min(.05, (now - (last || now)) / 1000); last = now;
    draw(t, dt);
  }
  return {
    start(o = {}) {
      if (running) return true;
      scale = o.scale || scale; mode = o.mode || mode; fps = o.fps || 0;
      try { if (!gl && !init()) return false; } catch (e) { console.warn('WebGL off', e); return false; }
      const bg = document.querySelector('.bg'); bg.insertBefore(cv, bg.firstChild);
      document.body.classList.add('webgl'); resize(); running = true; last = 0; raf = requestAnimationFrame(frame);
      return true;
    },
    stop() { running = false; cancelAnimationFrame(raf); document.body.classList.remove('webgl'); cv && cv.remove(); },
    pulse() { boost = 1.2; },
    renderAt(t) { if (running) { cancelAnimationFrame(raf); draw(t, 1 / 30); } }, /* для запису відео */
    get on() { return running; }
  };
})();
