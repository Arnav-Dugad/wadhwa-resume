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
      img.src = window.__PORTRAIT__ || 'assets/aditya.jpg';
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
   HALFTONE PORTRAIT
   A dot-matrix re-render of the photo. Dots swell and scatter
   around the pointer — a nod to machine-vision sampling.
   ══════════════════════════════════════════════════════════ */
const Halftone = (() => {
  const cv = $('#halftone');
  if (!cv) return { tick() {} };
  const ctx = cv.getContext('2d', { alpha: true });
  const host = $('#portrait');

  const COLS = 76;                       // dot grid resolution
  const CROP = { x: 50, y: 6, s: 146 };  // square crop framing the subject in the 200px source
  let cells = [], size = 0, cell = 0, dpr = 1, loaded = false, visible = false;
  const pointer = { x: -999, y: -999, tx: -999, ty: -999, strength: 0, tStrength: 0 };
  let t = 0;

  const img = new Image();
  img.onload = () => { loaded = true; build(); };
  img.src = window.__PORTRAIT__ || 'assets/aditya.jpg';

  function build() {
    if (!loaded) return;
    const rect = cv.getBoundingClientRect();
    size = Math.max(1, Math.round(rect.width));
    dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = size * dpr;
    cv.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cell = size / COLS;

    // sample the cropped source at grid resolution
    const off = document.createElement('canvas');
    off.width = off.height = COLS;
    const octx = off.getContext('2d', { willReadFrequently: true });
    octx.drawImage(img, CROP.x, CROP.y, CROP.s, CROP.s, 0, 0, COLS, COLS);

    let data;
    try { data = octx.getImageData(0, 0, COLS, COLS).data; }
    catch (e) { cv.style.backgroundImage = `url(${img.src})`; cv.style.backgroundSize = 'cover'; return; }

    // brightness range, for contrast normalisation
    let lo = 1, hi = 0;
    const lum = new Float32Array(COLS * COLS);
    for (let i = 0; i < COLS * COLS; i++) {
      const p = i * 4;
      const l = (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) / 255;
      lum[i] = l; if (l < lo) lo = l; if (l > hi) hi = l;
    }
    const span = Math.max(0.001, hi - lo);
    const smoothstep = (e0, e1, v) => {
      const t = clamp((v - e0) / (e1 - e0), 0, 1);
      return t * t * (3 - 2 * t);
    };

    cells = [];
    for (let y = 0; y < COLS; y++) {
      for (let x = 0; x < COLS; x++) {
        const i = y * COLS + x;
        const norm = (lum[i] - lo) / span;
        let dark = Math.pow(1 - norm, 1.25);       // 0 = light, 1 = dark

        // Elliptical vignette centred on the face: the room falls away and the
        // subject floats on the paper instead of sitting in a black slab.
        const nx = (x + 0.5) / COLS - 0.5;
        const ny = (y + 0.5) / COLS - 0.46;
        const rad = Math.sqrt(nx * nx + (ny * 0.82) * (ny * 0.82));
        dark *= 1 - smoothstep(0.30, 0.56, rad);

        if (dark < 0.05) continue;                  // skip near-white — keeps the plate airy
        cells.push({
          cx: (x + 0.5) * cell,
          cy: (y + 0.5) * cell,
          r: dark * cell * 0.56,                    // stay under the cell pitch: dots never fuse
          dark,
          ox: 0, oy: 0, rr: 0,
          ph: (x * 0.35 + y * 0.5)
        });
      }
    }
  }

  function draw() {
    if (!cells.length) return;
    ctx.clearRect(0, 0, size, size);

    pointer.x = lerp(pointer.x, pointer.tx, 0.16);
    pointer.y = lerp(pointer.y, pointer.ty, 0.16);
    pointer.strength = lerp(pointer.strength, pointer.tStrength, 0.09);

    const R = size * 0.30, R2 = R * R;
    const s = pointer.strength;

    for (let i = 0; i < cells.length; i++) {
      const c = cells[i];
      let dx = 0, dy = 0, grow = 0, heat = 0;

      if (s > 0.01) {
        const vx = c.cx - pointer.x, vy = c.cy - pointer.y;
        const d2 = vx * vx + vy * vy;
        if (d2 < R2) {
          const d = Math.sqrt(d2) || 0.001;
          const f = (1 - d / R);
          const fe = f * f;
          dx = (vx / d) * fe * cell * 2.6 * s;
          dy = (vy / d) * fe * cell * 2.6 * s;
          grow = fe * cell * 0.42 * s;
          heat = fe * s;
        }
      }

      // idle breathing wave, so the plate is never fully still
      const wave = Math.sin(t * 0.9 + c.ph) * 0.5 + 0.5;
      const wr = wave * cell * 0.045 * c.dark;

      c.ox = lerp(c.ox, dx, 0.18);
      c.oy = lerp(c.oy, dy, 0.18);
      c.rr = lerp(c.rr, grow, 0.18);

      const r = Math.max(0.15, c.r + c.rr + wr);
      if (heat > 0.02) {
        const m = clamp(heat * 1.35, 0, 1);
        ctx.fillStyle = `rgb(${Math.round(20 + 180 * m)},${Math.round(22 + 46 * m)},${Math.round(26 + 16 * m)})`;
      } else {
        ctx.fillStyle = '#14161A';
      }
      ctx.beginPath();
      ctx.arc(c.cx + c.ox, c.cy + c.oy, r, 0, 6.2832);
      ctx.fill();
    }
  }

  function tick(dt) {
    if (!loaded || !visible) return;
    t += dt;
    draw();
  }

  // pointer wiring
  if (host) {
    host.addEventListener('pointermove', e => {
      const r = cv.getBoundingClientRect();
      pointer.tx = e.clientX - r.left;
      pointer.ty = e.clientY - r.top;
      pointer.tStrength = 1;
    });
    host.addEventListener('pointerleave', () => { pointer.tStrength = 0; });
  }

  addEventListener('resize', () => { build(); });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { threshold: 0.01 })
      .observe(cv);
  } else visible = true;

  return { tick, rebuild: build };
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
