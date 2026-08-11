/* ════════════════════════════════════════════════════════════
   A. S. WADHWA — interaction engine
   No dependencies. One rAF loop. Everything degrades gracefully.
   ════════════════════════════════════════════════════════════ */
(() => {
'use strict';

/* ── helpers ─────────────────────────────────────────────── */
const $  = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp  = (a, b, t) => a + (b - a) * t;
const easeOutQuint = t => 1 - Math.pow(1 - t, 5);
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE    = matchMedia('(pointer: fine)').matches;

/* ══════════════════════════════════════════════════════════
   SMOOTH SCROLL — transform-based, lerped
   Fixed-position chrome lives outside <main>, so it is unaffected.
   ══════════════════════════════════════════════════════════ */
const Scroll = (() => {
  const root = $('[data-scroll-root]');
  const on = FINE && !REDUCED;
  let target = 0, current = 0, max = 0, spacer = null, velocity = 0;

  function measure() {
    if (!on) { max = document.documentElement.scrollHeight - innerHeight; return; }
    const h = root.offsetHeight;
    spacer.style.height = h + 'px';
    max = Math.max(0, h - innerHeight);
  }

  function init() {
    if (!on) {
      max = document.documentElement.scrollHeight - innerHeight;
      current = target = scrollY;
      addEventListener('scroll', () => { current = target = scrollY; }, { passive: true });
      addEventListener('resize', measure);
      return;
    }
    Object.assign(root.style, {
      position: 'fixed', top: '0', left: '0', width: '100%',
      willChange: 'transform'
    });
    spacer = document.createElement('div');
    spacer.setAttribute('aria-hidden', 'true');
    spacer.style.pointerEvents = 'none';
    document.body.appendChild(spacer);
    measure();

    addEventListener('scroll', () => { target = clamp(scrollY, 0, max); }, { passive: true });
    addEventListener('resize', measure);
    if ('ResizeObserver' in window) new ResizeObserver(measure).observe(root);

    // Keyboard focus must still bring elements into view inside the fixed layer.
    root.addEventListener('focusin', e => {
      const r = e.target.getBoundingClientRect();
      if (r.top < 90 || r.bottom > innerHeight - 40) to(r.top + current - innerHeight * 0.35, false);
    });
  }

  function tick() {
    if (!on) { velocity = 0; return; }
    const prev = current;
    current = lerp(current, target, 0.088);
    if (Math.abs(target - current) < 0.06) current = target;
    velocity = current - prev;
    root.style.transform = `translate3d(0, ${-current.toFixed(2)}px, 0)`;
  }

  function to(y, smooth = true) {
    const dest = clamp(y, 0, max);
    if (!on || !smooth) { scrollTo(0, dest); if (!on) current = target = dest; else target = dest; return; }
    scrollTo(0, dest);
    target = dest;
  }

  return {
    init, tick, to, measure,
    get y() { return on ? current : scrollY; },
    get max() { return max; },
    get v() { return velocity; },
    get enabled() { return on; }
  };
})();

/* ══════════════════════════════════════════════════════════
   PRELOADER
   ══════════════════════════════════════════════════════════ */
const Loader = (() => {
  const el = $('#loader'), bar = $('#loadBar'), pct = $('#loadPct');
  let val = 0, done = false, ready = false, raf;

  // Never let a slow webfont or a blocked image trap the visitor behind the
  // curtain: whichever settles first — the assets or a 2.6s deadline — wins.
  const assets = Promise.all([
    document.fonts ? document.fonts.ready : Promise.resolve(),
    new Promise(res => {
      const img = new Image();
      img.onload = img.onerror = res;
      img.src = window.__PORTRAIT__ || 'assets/portrait.jpg';
    })
  ]);
  Promise.race([assets, new Promise(res => setTimeout(res, 2600))])
    .then(() => { ready = true; });

  function loop() {
    const ceiling = ready ? 100 : 92;
    val = lerp(val, ceiling, ready ? 0.16 : 0.045);
    if (ready && val > 99.4) val = 100;
    bar.style.width = val + '%';
    pct.textContent = String(Math.round(val)).padStart(3, '0');
    if (val >= 100 && !done) { done = true; finish(); return; }
    raf = requestAnimationFrame(loop);
  }

  function finish() {
    cancelAnimationFrame(raf);
    setTimeout(() => {
      el.classList.add('is-done');
      document.body.classList.remove('is-locked');
      document.dispatchEvent(new Event('site:ready'));
      setTimeout(() => { el.style.display = 'none'; }, 1500);
    }, 380);
  }

  function start() {
    if (REDUCED) {
      el.style.display = 'none';
      document.body.classList.remove('is-locked');
      requestAnimationFrame(() => document.dispatchEvent(new Event('site:ready')));
      return;
    }
    document.body.classList.add('is-locked');
    loop();
  }
  return { start };
})();

/* ══════════════════════════════════════════════════════════
   TEXT SPLITTING
   ══════════════════════════════════════════════════════════ */
function splitHeroName() {
  $$('[data-split]').forEach((word, lineIdx) => {
    const text = word.textContent;
    word.textContent = '';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.textContent = ch;
      s.style.setProperty('--i', i);
      s.style.setProperty('--lo', lineIdx);
      word.appendChild(s);
    });
  });
}

function splitStatement() {
  const el = $('[data-words]');
  if (!el) return;
  const words = el.textContent.trim().split(/\s+/);
  el.textContent = '';
  words.forEach((w, i) => {
    const s = document.createElement('span');
    s.className = 'wd';
    s.textContent = w;
    el.appendChild(s);
    if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
  });
}

function splitFooterChars() {
  const el = $('[data-split-chars]');
  if (!el) return;
  const text = el.textContent;
  el.textContent = '';
  [...text].forEach(ch => {
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = ch === ' ' ? ' ' : ch;
    el.appendChild(s);
  });
}

/* ══════════════════════════════════════════════════════════
   HALFTONE PORTRAIT — WebGL CMYK process screen

   The photo is separated into cyan / magenta / yellow / black and
   each separation is screened on its own classic offset angle
   (15° / 75° / 0° / 45°), then recombined subtractively over the
   paper. That is how the plate keeps the photograph's real colour
   while still reading as printed matter rather than a JPEG.

   The pointer drives a displacement field — radial push, tangential
   swirl and a travelling ripple — plus per-separation chromatic
   aberration and a local increase in screen frequency.

   Falls back to a 2D canvas colour screen where WebGL is missing.
   ══════════════════════════════════════════════════════════ */
const Halftone = (() => {
  const cv = $('#halftone');
  if (!cv) return { tick() {}, rebuild() {} };
  const host = $('#portrait');
  const SRC = window.__PORTRAIT__ || 'assets/portrait.jpg';

  const ptr = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, amt: 0, tAmt: 0 };
  let impl = null, visible = false, t = 0, size = 0, dpr = 1;

  const img = new Image();
  img.onload = () => { impl = initGL() || init2D(); resize(); };
  img.src = SRC;

  function resize() {
    const r = cv.getBoundingClientRect();
    size = Math.max(1, Math.round(r.width));
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(size * dpr);
    cv.height = Math.round(size * dpr);
    impl && impl.resize();
  }

  /* ── screen frequency: ~118 dots across the plate ── */
  const pitchFor = () => Math.max(2.5, size / 118);

  /* ────────────────────────── WebGL ────────────────────────── */
  function initGL() {
    let gl;
    try {
      gl = cv.getContext('webgl', { alpha: false, antialias: false, premultipliedAlpha: false })
        || cv.getContext('experimental-webgl', { alpha: false, antialias: false });
    } catch (e) { return null; }
    if (!gl) return null;

    const VERT = `
      attribute vec2 aPos;
      varying vec2 vUv;
      void main(){ vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }`;

    const FRAG = `
      precision highp float;
      varying vec2 vUv;
      uniform sampler2D uTex;
      uniform vec2  uRes;     // plate size, CSS px
      uniform vec2  uPtr;     // pointer, CSS px, y down
      uniform float uAmt;     // pointer influence 0..1
      uniform float uTime;
      uniform float uPitch;   // screen pitch, CSS px

      const vec3 PAPER = vec3(0.9569, 0.9451, 0.9255);
      const vec3 INK_C = vec3(0.00, 0.66, 0.93);
      const vec3 INK_M = vec3(0.92, 0.11, 0.54);
      const vec3 INK_Y = vec3(1.00, 0.93, 0.11);
      const vec3 INK_K = vec3(0.07, 0.08, 0.09);

      vec2 rot(vec2 p, float a){
        float c = cos(a), s = sin(a);
        return vec2(c * p.x - s * p.y, s * p.x + c * p.y);
      }

      // elliptical vignette so the room dissolves into the paper
      float vign(vec2 uv){
        vec2 q = uv - vec2(0.5, 0.44);
        q.y *= 0.88;
        return 1.0 - smoothstep(0.29, 0.52, length(q));
      }

      vec4 toCMYK(vec3 rgb){
        float k = 1.0 - max(max(rgb.r, rgb.g), rgb.b);
        float d = 1.0 - k;
        vec3 cmy = d > 0.001 ? (vec3(1.0) - rgb - k) / d : vec3(0.0);
        return vec4(clamp(cmy, 0.0, 1.0), k);
      }

      // the press look: a little more contrast, a little more ink
      vec3 press(vec3 rgb){
        rgb = clamp((rgb - 0.5) * 1.09 + 0.5, 0.0, 1.0);
        float l = dot(rgb, vec3(0.299, 0.587, 0.114));
        return clamp(mix(vec3(l), rgb, 1.16), 0.0, 1.0);
      }

      // one separation: snap to its rotated grid, size the dot from the
      // ink value sampled at that cell's centre, return coverage 0..1
      float screenDot(vec2 px, float angle, float pitch, int idx, vec2 aberr){
        vec2 rp   = rot(px, angle) / pitch;
        vec2 cell = floor(rp) + 0.5;
        vec2 uv   = (rot(cell * pitch, -angle) + aberr) / uRes;
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;

        vec4 cmyk = toCMYK(press(texture2D(uTex, uv).rgb));
        float v = idx == 0 ? cmyk.x : idx == 1 ? cmyk.y : idx == 2 ? cmyk.z : cmyk.w;
        v *= vign(uv);
        if (v <= 0.002) return 0.0;

        float r  = sqrt(v) * 0.78;          // area-proportional dot
        float d  = length(rp - cell);
        float aa = 0.85 / pitch;
        return smoothstep(r + aa, r - aa, d);
      }

      void main(){
        vec2 sc = vec2(vUv.x, 1.0 - vUv.y);   // y down
        vec2 px = sc * uRes;

        // ── displacement field around the pointer ──
        vec2  d     = px - uPtr;
        float dist  = length(d);
        vec2  dir   = dist > 0.001 ? d / dist : vec2(0.0);
        // A tight lens, not a global warp: the falloff has to bottom out well
        // inside the plate so the portrait stays legible everywhere else.
        float sigma = uRes.x * 0.155;
        float infl  = exp(-(dist * dist) / (2.0 * sigma * sigma)) * uAmt;
        float ripple = sin(dist * 0.085 - uTime * 3.2) * infl;

        px += dir * (infl * uRes.x * 0.020 + ripple * uRes.x * 0.007)
            + vec2(-dir.y, dir.x) * infl * uRes.x * 0.009;

        // breathing so the plate is never perfectly still
        px += vec2(sin(uTime * 0.6 + sc.y * 6.0), cos(uTime * 0.5 + sc.x * 6.0)) * 0.6;

        float pitch = uPitch * (1.0 - infl * 0.22);
        vec2  ab    = dir * infl * 4.5;      // chromatic aberration, px

        vec2  duv = clamp(px / uRes, 0.0, 1.0);
        float vg  = vign(duv);

        // ── continuous tone: the plate at rest ──
        vec3 tone = mix(PAPER, press(texture2D(uTex, duv).rgb), vg);

        // ── screened: the plate under the loupe ──
        float c = screenDot(px, 0.2618, pitch, 0,  ab);
        float m = screenDot(px, 1.3090, pitch, 1, -ab * 0.60);
        float y = screenDot(px, 0.0,    pitch, 2,  ab * 0.28);
        float k = screenDot(px, 0.7854, pitch, 3, -ab * 0.16);

        vec3 dots = PAPER;
        dots *= mix(vec3(1.0), INK_C, c);
        dots *= mix(vec3(1.0), INK_M, m);
        dots *= mix(vec3(1.0), INK_Y, y);
        dots *= mix(vec3(1.0), INK_K, k);

        // The screen blooms outward from the pointer rather than cross-fading
        // flat, so it reads as a loupe travelling over the stock. At uAmt = 1
        // the radius clears the far corner and the whole plate is screened.
        float radius  = uAmt * uRes.x * 2.10;
        float feather = uRes.x * 0.38;
        float reveal  = smoothstep(radius, radius - feather, dist);

        gl_FragColor = vec4(mix(tone, dots, reveal), 1.0);
      }`;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.warn('halftone shader:', gl.getShaderInfoLog(s)); return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); }
    catch (e) { return null; }                       // tainted canvas → fall back

    const U = n => gl.getUniformLocation(prog, n);
    const uRes = U('uRes'), uPtr = U('uPtr'), uAmt = U('uAmt'),
          uTime = U('uTime'), uPitch = U('uPitch');
    gl.uniform1i(U('uTex'), 0);

    return {
      kind: 'webgl',
      resize() { gl.viewport(0, 0, cv.width, cv.height); },
      draw(time) {
        gl.uniform2f(uRes, size, size);
        gl.uniform2f(uPtr, ptr.x, ptr.y);
        gl.uniform1f(uAmt, ptr.amt);
        gl.uniform1f(uTime, time);
        gl.uniform1f(uPitch, pitchFor());
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
    };
  }

  /* ──────────────────── 2D colour fallback ──────────────────── */
  function init2D() {
    const ctx = cv.getContext('2d');
    let cells = [], cell = 0;

    function build() {
      const COLS = Math.max(24, Math.round(size / 5.2));
      cell = size / COLS;
      const off = document.createElement('canvas');
      off.width = off.height = COLS;
      const octx = off.getContext('2d', { willReadFrequently: true });
      octx.drawImage(img, 0, 0, COLS, COLS);
      let data;
      try { data = octx.getImageData(0, 0, COLS, COLS).data; }
      catch (e) { cv.style.cssText += `background:url(${SRC}) center/cover`; return; }

      const smooth = (a, b, v) => { const x = clamp((v - a) / (b - a), 0, 1); return x * x * (3 - 2 * x); };
      cells = [];
      for (let y = 0; y < COLS; y++) for (let x = 0; x < COLS; x++) {
        const p = (y * COLS + x) * 4;
        const r = data[p], g = data[p + 1], b = data[p + 2];
        const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        const nx = (x + 0.5) / COLS - 0.5, ny = (y + 0.5) / COLS - 0.44;
        const vig = 1 - smooth(0.30, 0.55, Math.hypot(nx, ny * 0.88));
        const ink = Math.pow(1 - lum, 1.1) * vig;
        if (ink < 0.04) continue;
        cells.push({ cx: (x + 0.5) * cell, cy: (y + 0.5) * cell, r: ink * cell * 0.60,
                     col: `rgb(${r},${g},${b})`, ox: 0, oy: 0 });
      }
    }

    return {
      kind: '2d',
      resize() { build(); },
      draw() {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#F4F1EC';
        ctx.fillRect(0, 0, size, size);

        // continuous tone at rest, vignetted into the paper
        ctx.drawImage(img, 0, 0, size, size);
        const vg = ctx.createRadialGradient(size * 0.5, size * 0.44, size * 0.26,
                                            size * 0.5, size * 0.44, size * 0.54);
        vg.addColorStop(0, 'rgba(244,241,236,0)');
        vg.addColorStop(1, 'rgba(244,241,236,1)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, size, size);
        if (ptr.amt <= 0.01) return;

        // screen blooms out from the pointer, matching the WebGL path
        const radius = ptr.amt * size * 2.10, feather = size * 0.38;

        // wash the paper back over the revealed region so the dots read as a
        // screen rather than as specks scattered on top of a photograph
        const wash = ctx.createRadialGradient(ptr.x, ptr.y, Math.max(0, radius - feather),
                                              ptr.x, ptr.y, Math.max(1, radius));
        wash.addColorStop(0, 'rgba(244,241,236,1)');
        wash.addColorStop(1, 'rgba(244,241,236,0)');
        ctx.fillStyle = wash;
        ctx.fillRect(0, 0, size, size);

        const R = size * 0.30, R2 = R * R;
        for (const c of cells) {
          const ex = c.cx - ptr.x, ey = c.cy - ptr.y;
          const dist = Math.hypot(ex, ey);
          const reveal = clamp((radius - dist) / feather, 0, 1);
          if (reveal <= 0.01) { c.ox = lerp(c.ox, 0, 0.18); c.oy = lerp(c.oy, 0, 0.18); continue; }

          let dx = 0, dy = 0;
          const d2 = ex * ex + ey * ey;
          if (d2 < R2) {
            const d = dist || 0.001, f = (1 - d / R) ** 2;
            dx = (ex / d) * f * cell * 2.4 * ptr.amt;
            dy = (ey / d) * f * cell * 2.4 * ptr.amt;
          }
          c.ox = lerp(c.ox, dx, 0.18); c.oy = lerp(c.oy, dy, 0.18);

          ctx.globalAlpha = reveal * reveal * (3 - 2 * reveal);
          ctx.fillStyle = c.col;
          ctx.beginPath();
          ctx.arc(c.cx + c.ox, c.cy + c.oy, c.r, 0, 6.2832);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    };
  }

  /* ──────────────────────── driver ──────────────────────── */
  function tick(dt) {
    if (!impl || !visible) return;
    t += dt;
    ptr.x = lerp(ptr.x, ptr.tx, 0.14);
    ptr.y = lerp(ptr.y, ptr.ty, 0.14);
    ptr.amt = lerp(ptr.amt, ptr.tAmt, 0.075);
    impl.draw(t);
  }

  /* The screen is hover-revealed, which would make it invisible on touch and
     easy to miss on desktop. So the plate demonstrates itself once, the first
     time it is seen, then hands control back to the pointer. */
  let hovering = false, demoed = false, demoTimer = null;
  function demo() {
    if (demoed || REDUCED || !impl) return;
    demoed = true;
    demoTimer = setTimeout(() => {
      if (hovering) return;
      ptr.x = ptr.tx = size * 0.5;
      ptr.y = ptr.ty = size * 0.42;
      ptr.tAmt = 1;
      setTimeout(() => { if (!hovering) ptr.tAmt = 0; }, 1900);
    }, 850);
  }

  if (host) {
    const at = e => {
      const r = cv.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    host.addEventListener('pointermove', e => {
      if (e.pointerType === 'touch') return;          // touch uses tap-to-toggle
      const [x, y] = at(e);
      if (!hovering) { ptr.x = ptr.tx = x; ptr.y = ptr.ty = y; }
      hovering = true;
      clearTimeout(demoTimer);
      ptr.tx = x; ptr.ty = y; ptr.tAmt = 1;
    });
    host.addEventListener('pointerleave', e => {
      if (e.pointerType === 'touch') return;
      hovering = false; ptr.tAmt = 0;
    });
    // tap toggles the screen on touch devices
    host.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch') return;
      const [x, y] = at(e);
      ptr.tx = x; ptr.ty = y;
      if (ptr.tAmt === 0) { ptr.x = x; ptr.y = y; }
      ptr.tAmt = ptr.tAmt > 0.5 ? 0 : 1;
    }, { passive: true });
  }
  addEventListener('resize', resize);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => {
      visible = es[0].isIntersecting;
      if (visible) demo();
    }, { threshold: 0.35 }).observe(cv);
  } else { visible = true; }

  return { tick, rebuild: resize, get mode() { return impl ? impl.kind : 'none'; } };
})();

/* ══════════════════════════════════════════════════════════
   BLUEPRINT CANVAS — hero backdrop
   ══════════════════════════════════════════════════════════ */
const Blueprint = (() => {
  const cv = $('#blueprint');
  if (!cv) return { tick() {} };
  const ctx = cv.getContext('2d');
  let w = 0, h = 0, dpr = 1, visible = true, t = 0;
  const m = { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5 };

  function size() {
    const r = cv.getBoundingClientRect();
    w = r.width; h = r.height;
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = w * dpr; cv.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    m.x = lerp(m.x, m.tx, 0.05);
    m.y = lerp(m.y, m.ty, 0.05);

    const px = (m.x - 0.5), py = (m.y - 0.5);
    const G = 46;
    const offX = -px * 26 + (t * 2) % G;
    const offY = -py * 26;

    // fine grid
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(20,22,26,0.045)';
    ctx.beginPath();
    for (let x = (offX % G) - G; x < w + G; x += G) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = (offY % G) - G; y < h + G; y += G) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();

    // heavier every 5th
    ctx.strokeStyle = 'rgba(20,22,26,0.055)';
    ctx.beginPath();
    for (let x = (offX % (G * 5)) - G * 5; x < w + G * 5; x += G * 5) { ctx.moveTo(x, 0); ctx.lineTo(x, h); }
    for (let y = (offY % (G * 5)) - G * 5; y < h + G * 5; y += G * 5) { ctx.moveTo(0, y); ctx.lineTo(w, y); }
    ctx.stroke();

    // drifting construction circles
    const cx = w * 0.74 - px * 40, cy = h * 0.42 - py * 40;
    ctx.strokeStyle = 'rgba(22,57,75,0.10)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      const rr = 120 + i * 92 + Math.sin(t * 0.5 + i) * 8;
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 6.2832); ctx.stroke();
    }

    // rotating radius line + tick
    const a = t * 0.22;
    ctx.strokeStyle = 'rgba(200,68,42,0.16)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * 304, cy + Math.sin(a) * 304);
    ctx.stroke();
    ctx.fillStyle = 'rgba(200,68,42,0.30)';
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * 304, cy + Math.sin(a) * 304, 3, 0, 6.2832);
    ctx.fill();

    // corner datum
    ctx.strokeStyle = 'rgba(20,22,26,0.14)';
    ctx.beginPath();
    ctx.moveTo(24, h - 52); ctx.lineTo(24, h - 24); ctx.lineTo(52, h - 24);
    ctx.stroke();
  }

  function tick(dt) { if (!visible) return; t += dt; draw(); }

  size();
  addEventListener('resize', size);
  addEventListener('pointermove', e => { m.tx = e.clientX / innerWidth; m.ty = e.clientY / innerHeight; }, { passive: true });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0 }).observe(cv);
  }
  return { tick };
})();

/* ══════════════════════════════════════════════════════════
   REVEALS
   ══════════════════════════════════════════════════════════ */
function initReveals() {
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      obs.unobserve(en.target);
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

  $$('[data-reveal]').forEach(el => {
    el.style.setProperty('--d', el.dataset.delay || 0);
    io.observe(el);
  });
  $$('[data-draw], [data-station], [data-proj], .edu, .statement__sig').forEach(el => io.observe(el));

  // staggered children
  $$('[data-panel]').forEach(col => {
    $$('li', col).forEach((li, i) => li.style.setProperty('--i', i));
    io.observe(col);
  });
  $$('[data-cert]').forEach((li, i) => { li.style.setProperty('--i', i); io.observe(li); });

  // hero fires as soon as the loader clears
  document.addEventListener('site:ready', () => {
    requestAnimationFrame(() => {
      $('.hero__name')?.classList.add('is-in');
      $('.hero__rule')?.classList.add('is-in');
      $('#portrait')?.classList.add('is-in');
      $$('.hero [data-reveal]').forEach(el => el.classList.add('is-in'));
    });
  });
}

/* ══════════════════════════════════════════════════════════
   NUMBER COUNTERS
   ══════════════════════════════════════════════════════════ */
function initCounters() {
  const io = new IntersectionObserver((entries, obs) => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      const from = parseFloat(el.dataset.countFrom || 0);
      const to   = parseFloat(el.dataset.countTo);
      const dec  = parseInt(el.dataset.dec || 0, 10);
      const dur  = 1500;
      const t0   = performance.now();
      (function step(now) {
        const p = clamp((now - t0) / dur, 0, 1);
        const v = from + (to - from) * easeOutQuint(p);
        el.textContent = dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-IN');
        if (p < 1) requestAnimationFrame(step);
      })(t0);
      obs.unobserve(el);
    });
  }, { threshold: 0.6 });
  $$('[data-count-to]').forEach(el => io.observe(el));
}

/* ══════════════════════════════════════════════════════════
   GAUGE — 280 → 410 UPH
   ══════════════════════════════════════════════════════════ */
function initGauge() {
  const svg = $('#gauge'); if (!svg) return;
  const MAXV = 500, START = 280, END = 410;
  const valPath = $('#gaugeVal'), basePath = $('#gaugeBase'),
        needle  = $('#gaugeNeedle'), out = $('#uph'), ticks = $('#gaugeTicks');

  // build the dial
  const CX = 200, CY = 200, R = 160;
  for (let v = 0; v <= MAXV; v += 50) {
    const frac = v / MAXV;
    const th = (180 - 180 * frac) * Math.PI / 180;
    const major = v % 100 === 0;
    const r1 = major ? 136 : 142, r2 = 149;
    const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    ln.setAttribute('x1', CX + Math.cos(th) * r1); ln.setAttribute('y1', CY - Math.sin(th) * r1);
    ln.setAttribute('x2', CX + Math.cos(th) * r2); ln.setAttribute('y2', CY - Math.sin(th) * r2);
    if (!major) ln.setAttribute('opacity', '.45');
    ticks.appendChild(ln);
    if (major) {
      const tx = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tx.setAttribute('x', CX + Math.cos(th) * 121);
      tx.setAttribute('y', CY - Math.sin(th) * 121 + 3.5);
      tx.textContent = v;
      ticks.appendChild(tx);
    }
  }

  basePath.style.strokeDashoffset = 1 - START / MAXV;

  const io = new IntersectionObserver((es, obs) => {
    if (!es[0].isIntersecting) return;
    obs.disconnect();
    const dur = 2200, t0 = performance.now();
    (function step(now) {
      const p = clamp((now - t0) / dur, 0, 1);
      const e = easeOutQuint(p);
      const v = END * e;
      const frac = v / MAXV;
      valPath.style.strokeDashoffset = 1 - frac;
      needle.style.transform = `rotate(${-90 + 180 * frac}deg)`;
      out.textContent = Math.round(v);
      if (p < 1) requestAnimationFrame(step);
      else out.textContent = END;
    })(t0);
  }, { threshold: 0.45 });
  io.observe($('#metricBlock'));
}

/* ══════════════════════════════════════════════════════════
   SCROLL-DRIVEN: statement words, assembly rail, axis, nav
   ══════════════════════════════════════════════════════════ */
const ScrollFX = (() => {
  let words = [], statementEl, lineEl, lineFill, lineCarrier, stations = [];
  let nav, axis, axisFill, axisPct, lastY = 0, navHidden = false;
  const navLinks = new Map();
  let ticksEls = [], axisSections = [];

  function init() {
    statementEl = $('[data-words]');
    words = $$('.wd', statementEl || document);
    lineEl = $('#line'); lineFill = $('#lineFill'); lineCarrier = $('#lineCarrier');
    stations = $$('[data-station]');
    nav = $('#nav'); axis = $('#axis'); axisFill = $('#axisFill'); axisPct = $('#axisPct');

    // axis ticks from sections
    const tickHost = $('#axisTicks');
    axisSections = $$('[data-axis]');
    axisSections.forEach(sec => {
      const s = document.createElement('span');
      s.textContent = sec.dataset.axis;
      s.dataset.for = sec.id;
      tickHost.appendChild(s);
    });
    ticksEls = $$('span', tickHost);

    $$('.nav__links a').forEach(a => navLinks.set(a.getAttribute('href').slice(1), a));
    setTimeout(() => axis.classList.add('is-on'), 1200);
  }

  function frame() {
    const y = Scroll.y, vh = innerHeight;

    /* progress rail */
    const p = Scroll.max > 0 ? clamp(y / Scroll.max, 0, 1) : 0;
    if (axisFill) axisFill.style.height = (p * 100).toFixed(2) + '%';
    if (axisPct)  axisPct.textContent = String(Math.round(p * 100)).padStart(2, '0');

    /* nav: stick + hide on scroll-down */
    if (nav) {
      nav.classList.toggle('is-stuck', y > 40);
      const dy = y - lastY;
      if (y > 260 && dy > 2 && !navHidden) { nav.classList.add('is-up'); navHidden = true; }
      else if ((dy < -2 || y < 260) && navHidden) { nav.classList.remove('is-up'); navHidden = false; }
      lastY = y;
    }

    /* statement — words ignite as the block crosses the viewport */
    if (words.length && statementEl) {
      const r = statementEl.getBoundingClientRect();
      const prog = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.22), 0, 1);
      const lit = Math.round(prog * words.length * 1.12);
      for (let i = 0; i < words.length; i++) words[i].classList.toggle('on', i < lit);
    }

    /* assembly rail — fill follows the viewport centre line */
    if (lineEl) {
      const r = lineEl.getBoundingClientRect();
      const prog = clamp((vh * 0.56 - r.top) / r.height, 0, 1);
      if (lineFill) lineFill.style.height = (prog * 100).toFixed(2) + '%';
      if (lineCarrier) lineCarrier.style.top = (prog * 100).toFixed(2) + '%';
      stations.forEach(st => {
        const sr = st.getBoundingClientRect();
        st.classList.toggle('is-lit', sr.top < vh * 0.58 && sr.bottom > vh * 0.12);
      });
    }

    /* active section for nav + axis */
    let activeId = '';
    for (const sec of axisSections) {
      const r = sec.getBoundingClientRect();
      if (r.top < vh * 0.42 && r.bottom > vh * 0.42) { activeId = sec.id; break; }
    }
    navLinks.forEach((a, id) => a.classList.toggle('on', id === activeId));
    ticksEls.forEach(s => s.classList.toggle('on', s.dataset.for === activeId));
  }

  return { init, frame };
})();

/* ══════════════════════════════════════════════════════════
   TICKER — velocity-reactive marquee
   ══════════════════════════════════════════════════════════ */
const Ticker = (() => {
  const row = $('#tickerRow');
  if (!row) return { tick() {} };
  const set = $('.ticker__set', row);
  let x = 0, setW = 0;

  function build() {
    // duplicate until we cover 2 viewports
    while (row.children.length > 1) row.removeChild(row.lastChild);
    setW = set.getBoundingClientRect().width;
    if (!setW) return;
    const need = Math.ceil((innerWidth * 2) / setW) + 1;
    for (let i = 0; i < need; i++) row.appendChild(set.cloneNode(true));
  }

  function tick(dt) {
    if (!setW) { build(); return; }
    x -= (34 + Math.abs(Scroll.v) * 5.5) * dt;
    if (x <= -setW) x += setW;
    row.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
  }

  addEventListener('resize', () => { x = 0; build(); });
  setTimeout(build, 60);
  if (document.fonts) document.fonts.ready.then(build);
  return { tick };
})();

/* ══════════════════════════════════════════════════════════
   CUSTOM CURSOR
   ══════════════════════════════════════════════════════════ */
function initCursor() {
  if (!FINE || REDUCED) return;
  const cur = $('#cursor'), dot = $('.cursor__dot', cur),
        ring = $('.cursor__ring', cur), label = $('.cursor__label', cur);
  const LABELS = {
    top: 'TOP', open: 'OPEN', pdf: 'PDF', mail: 'WRITE',
    call: 'CALL', scroll: 'SCROLL', expand: 'READ', explode: 'VIEW'
  };
  let mx = innerWidth / 2, my = innerHeight / 2;
  let dx = mx, dy = my, rx = mx, ry = my;

  addEventListener('pointermove', e => {
    mx = e.clientX; my = e.clientY;
    cur.classList.remove('is-hidden');
  }, { passive: true });
  document.addEventListener('pointerleave', () => cur.classList.add('is-hidden'));

  (function loop() {
    dx = lerp(dx, mx, 0.62); dy = lerp(dy, my, 0.62);
    rx = lerp(rx, mx, 0.17);  ry = lerp(ry, my, 0.17);
    dot.style.transform  = `translate3d(${dx}px, ${dy}px, 0) translate(-50%,-50%)`;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();

  document.addEventListener('pointerover', e => {
    const t = e.target.closest('[data-cursor]');
    if (t) {
      label.textContent = LABELS[t.dataset.cursor] || t.dataset.cursor.toUpperCase();
      cur.classList.add('is-active');
    } else if (e.target.closest('a, button, input, [role="button"]')) {
      label.textContent = '';
      cur.classList.add('is-active');
    } else {
      cur.classList.remove('is-active');
    }
  });
}

/* ══════════════════════════════════════════════════════════
   MAGNETIC COURSEWORK FIELD
   ══════════════════════════════════════════════════════════ */
function initMagnets() {
  if (!FINE || REDUCED) return;
  const field = $('#courseField'); if (!field) return;
  const tags = $$('[data-mag]', field).map(el => ({ el, x: 0, y: 0, tx: 0, ty: 0 }));
  let active = false;

  field.addEventListener('pointermove', e => {
    active = true;
    const R = 190;
    tags.forEach(t => {
      const r = t.el.getBoundingClientRect();
      const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      const vx = cx - e.clientX, vy = cy - e.clientY;
      const d = Math.hypot(vx, vy);
      if (d < R) {
        const f = Math.pow(1 - d / R, 2) * 22;
        t.tx = (vx / (d || 1)) * f;
        t.ty = (vy / (d || 1)) * f;
      } else { t.tx = 0; t.ty = 0; }
    });
  });
  field.addEventListener('pointerleave', () => { tags.forEach(t => { t.tx = 0; t.ty = 0; }); });

  (function loop() {
    if (active) {
      let moving = false;
      tags.forEach(t => {
        t.x = lerp(t.x, t.tx, 0.14); t.y = lerp(t.y, t.ty, 0.14);
        if (Math.abs(t.x - t.tx) > 0.05 || Math.abs(t.y - t.ty) > 0.05) moving = true;
        t.el.style.transform = `translate3d(${t.x.toFixed(2)}px, ${t.y.toFixed(2)}px, 0)`;
      });
      if (!moving && tags.every(t => t.tx === 0 && t.ty === 0)) active = false;
    }
    requestAnimationFrame(loop);
  })();
}

/* ══════════════════════════════════════════════════════════
   PORTRAIT TILT
   ══════════════════════════════════════════════════════════ */
function initTilt() {
  if (!FINE || REDUCED) return;
  const host = $('#portrait'); if (!host) return;
  const frame = $('.portrait__frame', host);
  let rx = 0, ry = 0, trx = 0, try_ = 0;

  host.addEventListener('pointermove', e => {
    const r = host.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    try_ = px * 9; trx = -py * 9;
  });
  host.addEventListener('pointerleave', () => { trx = 0; try_ = 0; });

  (function loop() {
    rx = lerp(rx, trx, 0.09); ry = lerp(ry, try_, 0.09);
    frame.style.transform = `perspective(1100px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
    requestAnimationFrame(loop);
  })();
}

/* ══════════════════════════════════════════════════════════
   FOOTER WORDMARK — per-character proximity lift
   ══════════════════════════════════════════════════════════ */
function initFooterType() {
  if (!FINE || REDUCED) return;
  const host = $('.foot__mail'); if (!host) return;
  const chars = $$('.ch', host);
  const state = chars.map(() => ({ v: 0, t: 0 }));

  host.addEventListener('pointermove', e => {
    chars.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      const d = Math.abs(r.left + r.width / 2 - e.clientX);
      state[i].t = clamp(1 - d / 190, 0, 1);
    });
  });
  host.addEventListener('pointerleave', () => state.forEach(s => { s.t = 0; }));

  (function loop() {
    chars.forEach((c, i) => {
      state[i].v = lerp(state[i].v, state[i].t, 0.13);
      const v = state[i].v;
      if (v > 0.002) c.style.transform = `translateY(${(-v * 22).toFixed(2)}px) scale(${(1 + v * 0.06).toFixed(3)})`;
      else c.style.transform = '';
    });
    requestAnimationFrame(loop);
  })();
}

/* ══════════════════════════════════════════════════════════
   COMMAND PALETTE
   ══════════════════════════════════════════════════════════ */
function initPalette() {
  const pal = $('#palette'), input = $('#paletteInput'), list = $('#paletteList');
  const openBtn = $('#paletteOpen');
  let idx = 0, filtered = [];

  const ITEMS = [
    { k: '01', label: 'Work — stations on the line', hint: 'Section', act: () => goTo('#work') },
    { k: '02', label: 'Impact — 280 → 410 UPH',      hint: 'Section', act: () => goTo('#metric') },
    { k: '03', label: 'Projects',                     hint: 'Section', act: () => goTo('#projects') },
    { k: '04', label: 'Stack & toolchain',            hint: 'Section', act: () => goTo('#stack') },
    { k: '05', label: 'Education & credentials',      hint: 'Section', act: () => goTo('#credentials') },
    { k: '↑',  label: 'Back to top',                  hint: 'Section', act: () => goTo('#top') },
    { k: '@',  label: 'Email adityaswadhwa@gmail.com', hint: 'Action', act: () => location.href = 'mailto:adityaswadhwa@gmail.com' },
    { k: '☏',  label: 'Call +91 98184 38350',          hint: 'Action', act: () => location.href = 'tel:+919818438350' },
    { k: 'in', label: 'Open LinkedIn profile',         hint: 'Action', act: () => open('https://linkedin.com/in/adityaswadhwa', '_blank', 'noopener') },
    { k: '↓',  label: 'Download résumé (PDF)',         hint: 'Action', act: () => { const a = document.createElement('a'); a.href = 'assets/AdityaShankarWadhwa_Resume.pdf'; a.download = ''; a.click(); } },
    { k: '⎙',  label: 'Print this page',               hint: 'Action', act: () => print() },
    { k: '⧉',  label: 'Copy email address',            hint: 'Action', act: () => navigator.clipboard?.writeText('adityaswadhwa@gmail.com') }
  ];

  function render(q = '') {
    const t = q.trim().toLowerCase();
    filtered = t ? ITEMS.filter(i => i.label.toLowerCase().includes(t) || i.hint.toLowerCase().includes(t)) : ITEMS;
    idx = 0;
    list.innerHTML = filtered.length
      ? filtered.map((i, n) =>
          `<li role="option" data-n="${n}" class="${n === 0 ? 'on' : ''}">
             <span class="pi">${i.k}</span><b>${i.label}</b><em>${i.hint}</em>
           </li>`).join('')
      : `<li class="empty">Nothing matches “${q}”.</li>`;
  }

  function move(d) {
    if (!filtered.length) return;
    idx = (idx + d + filtered.length) % filtered.length;
    $$('li', list).forEach((li, n) => li.classList.toggle('on', n === idx));
    $$('li', list)[idx]?.scrollIntoView({ block: 'nearest' });
  }

  function run() { const it = filtered[idx]; if (it) { close(); setTimeout(it.act, 130); } }

  function open_() {
    pal.hidden = false;
    requestAnimationFrame(() => pal.classList.add('is-open'));
    render(''); input.value = ''; setTimeout(() => input.focus(), 60);
  }
  function close() {
    pal.classList.remove('is-open');
    setTimeout(() => { pal.hidden = true; }, 320);
  }

  openBtn?.addEventListener('click', open_);
  $$('[data-palette-close]').forEach(el => el.addEventListener('click', close));
  input.addEventListener('input', e => render(e.target.value));
  list.addEventListener('click', e => {
    const li = e.target.closest('li[data-n]');
    if (li) { idx = +li.dataset.n; run(); }
  });
  list.addEventListener('pointermove', e => {
    const li = e.target.closest('li[data-n]');
    if (li && +li.dataset.n !== idx) { idx = +li.dataset.n; $$('li', list).forEach((l, n) => l.classList.toggle('on', n === idx)); }
  });

  addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && k === 'k') { e.preventDefault(); pal.hidden ? open_() : close(); return; }
    if (pal.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); move(-1); }
    else if (e.key === 'Enter')     { e.preventDefault(); run(); }
  });
}

/* ══════════════════════════════════════════════════════════
   ANCHOR NAVIGATION
   ══════════════════════════════════════════════════════════ */
function goTo(hash) {
  const el = hash === '#top' ? null : $(hash);
  if (hash === '#top' || !el) { Scroll.to(0); return; }
  const y = el.getBoundingClientRect().top + Scroll.y - 54;
  Scroll.to(y);
}

function initAnchors() {
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const h = a.getAttribute('href');
      if (h.length < 2) return;
      e.preventDefault();
      goTo(h);
      history.replaceState(null, '', h);
    });
  });
  $('#toTop')?.addEventListener('click', () => Scroll.to(0));
}

/* ══════════════════════════════════════════════════════════
   LOCAL CLOCK (IST)
   ══════════════════════════════════════════════════════════ */
function initClock() {
  const el = $('#clock'); if (!el) return;
  $('#yr').textContent = new Date().getFullYear();
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });
  const upd = () => { el.textContent = `UDUPI, IN — ${fmt.format(new Date())} IST`; };
  upd(); setInterval(upd, 1000);
}

/* ══════════════════════════════════════════════════════════
   MASTER LOOP
   ══════════════════════════════════════════════════════════ */
let last = performance.now();
function raf(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  Scroll.tick();
  ScrollFX.frame();
  Ticker.tick(dt);
  Halftone.tick(dt);
  Blueprint.tick(dt);
  requestAnimationFrame(raf);
}

/* ══════════════════════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════════════════════ */
function boot() {
  splitHeroName();
  splitStatement();
  splitFooterChars();

  Scroll.init();
  ScrollFX.init();

  initReveals();
  initCounters();
  initGauge();
  initCursor();
  initMagnets();
  initTilt();
  initFooterType();
  initPalette();
  initAnchors();
  initClock();

  requestAnimationFrame(raf);
  Loader.start();

  // settle layout once webfonts land
  if (document.fonts) document.fonts.ready.then(() => { Scroll.measure(); Halftone.rebuild?.(); });
  addEventListener('load', () => { Scroll.measure(); Halftone.rebuild?.(); });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();

})();
