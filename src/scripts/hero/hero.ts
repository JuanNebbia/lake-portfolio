import { BLACK, LIGHT, clamp, lum, mix, pickInk, rgba, smooth } from './color';
import { DAY, NIGHT, RISE, SET, fmtTime, nightness, phaseName, skyAt, type Sky } from './sky';
import { drawMoon, moonPhase } from './moon';
import { drawBoat, drawCampfire } from './characters';
import { Events } from './events';
import type { Frame } from './scene';

// ---------- settings ----------
const TITLE_FONT = { family: 'Bungee Shade', weight: 400 };
/** 0 = straight facets between sampled nodes, 1 = soft rolling hills. */
const ROUNDNESS = 0.15;

// ---------- seeded scenery ----------
let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const STARS = Array.from({ length: 150 }, () => ({
  x: rnd(), y: rnd(), r: rnd() * 1.1 + 0.35, tw: rnd() * 6.28, cross: rnd() < 0.08,
}));

interface Hill {
  amp: number;      // height as a fraction of the horizon
  lift: number;     // minimum height, so the ridge never touches the water
  f: [number, number];
  ph: [number, number];
  lines: number;    // contour lines inside the hill
  nodes: number;    // facets across the width
  edge?: number;    // rise toward the sides (keeps the middle calm under the name)
  hump?: boolean;   // the hump that half-covers the "n N"
}
// three ranges, back to front, each a sum of two sines
const HILLS: Hill[] = [
  { amp: 0.46, lift: 0.5, f: [1.15, 2.9], ph: [rnd() * 6, rnd() * 6], lines: 5, nodes: 13, edge: 0.55, hump: true },
  { amp: 0.26, lift: 0.3, f: [1.7, 4.1], ph: [rnd() * 6, rnd() * 6], lines: 3, nodes: 13 },
  { amp: 0.12, lift: 0.25, f: [2.6, 6.3], ph: [rnd() * 6, rnd() * 6], lines: 2, nodes: 19 },
];

interface Geo { narrow: boolean; gy: number; ax: number; rx: number; ry: number; sunR: number; moonR: number }

export function initHero(hero: HTMLElement) {
  const q = <T extends Element>(sel: string) => hero.querySelector<T>(sel)!;
  const back = q<HTMLCanvasElement>('[data-hero-back]');
  const front = q<HTMLCanvasElement>('[data-hero-front]');
  const nameEl = q<HTMLElement>('[data-hero-name]');
  const clockEl = q<HTMLElement>('[data-hero-clock]');
  const phaseEl = q<HTMLElement>('[data-hero-phase]');
  const hourInput = q<HTMLInputElement>('[data-hero-hour]');
  const bx = back.getContext('2d')!, fx = front.getContext('2d')!;
  // the content that follows: as it scrolls up over the hero, the water rises with its top edge
  const follower = hero.dataset.heroWater ? document.querySelector<HTMLElement>(hero.dataset.heroWater) : null;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const moon = moonPhase();
  const events = new Events();

  let W = 0, H = 0;
  // where the name sits, so the back ridge can rise in front of it
  const name = { base: 0, cap: 0, gap: 0.44 };

  // ---------- geometry ----------
  function geo(): Geo {
    const narrow = W < 640, gy = H * (narrow ? 0.84 : 0.8);
    // the arc leans right so the sun and moon stay clear of the copy in the top-left corner
    return {
      narrow, gy,
      ax: W * (narrow ? 0.5 : 0.62), rx: W * (narrow ? 0.44 : 0.34), ry: gy * (narrow ? 0.55 : 0.8),
      sunR: narrow ? 30 : 46, moonR: narrow ? 15 : 20,
    };
  }
  const onArc = (g: Geo, s: number): [number, number] =>
    [g.ax - g.rx * Math.cos(s * Math.PI), g.gy - g.ry * Math.sin(s * Math.PI)];

  const hillSoft = (L: Hill, g: Geo, x: number) => {
    const u = x / W;
    let v = 0.5 + 0.32 * Math.sin(u * Math.PI * 2 * L.f[0] + L.ph[0]) + 0.18 * Math.sin(u * Math.PI * 2 * L.f[1] + L.ph[1]);
    if (L.edge) {
      const e = smooth(0.32, 0, u) + smooth(0.68, 1, u);
      v = v * (1 - L.edge) * (1 - 0.5 * e) + L.edge * e;
    }
    return g.gy - g.gy * L.amp * (L.lift + (1 - L.lift) * v);
  };
  // The hump in front of the name: climbs slowly from the left, peaks just right of the gap
  // between "Juan" and "Nebbia", then comes down in two steps. Its own vertices keep it crisp when faceted.
  function humpAt(u: number) {
    const c = name.gap;
    const P = [[c - 0.2, 0], [c - 0.11, 0.5], [c - 0.03, 0.85], [c + 0.05, 1], [c + 0.1, 0.5], [c + 0.16, 0]] as const;
    if (u <= P[0][0] || u >= P[P.length - 1]![0]) return 0;
    let i = 0;
    while (u > P[i + 1]![0]) i++;
    const [u0, v0] = P[i]!, [u1, v1] = P[i + 1]!, t = (u - u0) / (u1 - u0);
    const lin = v0 + (v1 - v0) * t, soft = v0 + (v1 - v0) * t * t * (3 - 2 * t);
    return lin + (soft - lin) * ROUNDNESS;
  }
  // roundness blends the soft curve with straight segments between sampled nodes (faceted peaks)
  function hillY(L: Hill, g: Geo, x: number) {
    let y = hillSoft(L, g, x);
    if (ROUNDNESS < 1) {
      const seg = W / L.nodes, i = Math.floor(x / seg), t = x / seg - i;
      const yp = hillSoft(L, g, i * seg) * (1 - t) + hillSoft(L, g, (i + 1) * seg) * t;
      y = yp + (y - yp) * ROUNDNESS;
    }
    if (L.hump && name.cap) {
      const peakY = name.base - name.cap * 0.36, h = humpAt(x / W);
      if (h > 0 && peakY < y) y -= (y - peakY) * h;
    }
    return y;
  }

  function resize() {
    const r = hero.getBoundingClientRect();
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    for (const [c, x] of [[back, bx], [front, fx]] as const) {
      c.width = W * dpr; c.height = H * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    placeName(); draw();
  }

  // The name sits behind the back range: sized to the width, baseline set so the letters clear the ridge
  function placeName() {
    if (!W) return;
    const g = geo(), L = HILLS[0]!;
    nameEl.style.fontSize = '100px';
    const w100 = nameEl.getBoundingClientRect().width;
    const F = Math.min((W * (g.narrow ? 0.9 : 0.84)) / w100 * 100, g.gy * L.amp * 1.25);
    nameEl.style.fontSize = `${F}px`;
    bx.font = `${TITLE_FONT.weight} ${F}px "${TITLE_FONT.family}", 'Arial Black', sans-serif`;
    const m = bx.measureText('JN');
    const asc = m.fontBoundingBoxAscent ?? F * 0.95, desc = m.fontBoundingBoxDescent ?? F * 0.25;
    const cap = m.actualBoundingBoxAscent ?? F * 0.72;
    const baseFromTop = (F - (asc + desc)) / 2 + asc;
    // highest point of the back ridge under the name: even there ~80% of the letter shows
    const half = (w100 * F) / 200;
    let ridge = Infinity;
    for (let x = W / 2 - half; x <= W / 2 + half; x += 4) ridge = Math.min(ridge, hillSoft(L, g, x));
    name.base = ridge + cap * 0.2;
    name.cap = cap;
    // centre the hump on the space between "Juan" and "Nebbia"
    try {
      const r = document.createRange(), tn = nameEl.firstChild!;
      r.setStart(tn, 4); r.setEnd(tn, 5);
      const sp = r.getBoundingClientRect(), hr = hero.getBoundingClientRect();
      name.gap = (sp.left + sp.width / 2 - hr.left) / W;
    } catch { name.gap = 0.44; }
    nameEl.style.top = `${name.base - baseFromTop}px`;
  }

  // ---------- drawing ----------
  let hover = false;
  let drag: 'sun' | 'moon' | null = null;
  let lastSea = Infinity;

  function draw(t = performance.now()) {
    if (!W) return;
    const p = skyAt(state.hour), g = geo(), { gy } = g;
    const ink = pickInk(mix(p.top, p.bot, 0.2));
    // water surface: the horizon at rest, then the top edge of the following content once it passes it
    let sea = gy;
    if (follower) sea = clamp(follower.getBoundingClientRect().top - hero.getBoundingClientRect().top, 0, gy);
    const rise = 1 - sea / gy;   // 0 at rest, 1 once the water fills the screen
    lastSea = sea;
    const fr: Frame = { W, H, gy, sea, narrow: g.narrow, t, reduce, ink, p };
    const active = hover || drag;

    // ===== back canvas: sky, stars, lines, sun / moon =====
    const c = bx;
    c.clearRect(0, 0, W, H);
    const sg = c.createLinearGradient(0, 0, 0, gy);
    sg.addColorStop(0, rgba(p.top)); sg.addColorStop(1, rgba(p.bot));
    c.fillStyle = sg; c.fillRect(0, 0, W, H);
    if (p.darkness > 0.01) {
      for (const s of STARS) {
        const y = s.y * gy * 0.85, a = p.darkness * (reduce ? 0.8 : 0.55 + 0.45 * Math.sin(t / 900 + s.tw));
        c.fillStyle = c.strokeStyle = rgba(LIGHT, a);
        if (s.cross) {
          const x = s.x * W, k = 3.5;
          c.lineWidth = 1; c.beginPath();
          c.moveTo(x - k, y); c.lineTo(x + k, y); c.moveTo(x, y - k); c.lineTo(x, y + k); c.stroke();
        } else {
          c.beginPath(); c.arc(s.x * W, y, s.r, 0, 7); c.fill();
        }
      }
    }
    events.drawShootingStar(c, fr);
    const lineC = mix(mix(p.top, p.bot, 0.5), ink, 0.22);
    c.lineWidth = 1;
    for (let k = 0; k < 34; k++) {
      const y = gy - gy * 0.95 * Math.pow(k / 34, 1.6);
      c.strokeStyle = rgba(lineC, 0.1 + 0.22 * (1 - k / 34));
      c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }
    const [sx, sy] = onArc(g, p.sp), [mx, my] = onArc(g, p.mp);
    c.setLineDash([2, 6]); c.strokeStyle = rgba(ink, active ? 0.4 : 0.13);
    c.beginPath(); c.ellipse(g.ax, gy, g.rx, g.ry, 0, Math.PI, 0); c.stroke(); c.setLineDash([]);
    if (p.sunAlt > -0.05) {
      const r = g.sunR;
      c.save(); c.beginPath(); c.arc(sx, sy, r, 0, 7); c.clip();
      c.fillStyle = rgba(p.sunCol); c.fillRect(sx - r, sy - r, 2 * r, 2 * r);
      c.strokeStyle = rgba(p.bot, 0.9);
      for (let k = 0; k < 7; k++) {
        const y = sy + r * (0.15 + k * 0.13);
        c.lineWidth = 1 + k * 0.7; c.beginPath(); c.moveTo(sx - r, y); c.lineTo(sx + r, y); c.stroke();
      }
      c.restore();
      c.strokeStyle = rgba(p.sunCol, active ? 0.9 : 0.55); c.lineWidth = 1;
      c.beginPath(); c.arc(sx, sy, r + 10, 0, 7); c.stroke();
    }
    if (p.moonAlt > -0.05) {
      drawMoon(c, mx, my, g.moonR, p, moon);
      if (active) {
        c.strokeStyle = rgba(p.moonCol, 0.5);
        c.beginPath(); c.arc(mx, my, g.moonR + 9, 0, 7); c.stroke();
      }
    }

    // ===== front canvas: hills, water, reflection, characters =====
    const f = fx;
    f.clearRect(0, 0, W, H);
    const step = Math.max(4, W / 160);
    const night = nightness(p);
    HILLS.forEach((L, i) => {
      const fill = mix(mix(p.top, p.bot, 0.55 - i * 0.1), BLACK, 0.06 + i * 0.09 + 0.12 * (1 - lum(p.bot)));
      // `join` continues the current subpath (for the filled shape) instead of starting a new one
      const ridgePath = (off = 0, join = false) => {
        for (let x = 0; x <= W + step; x += step) {
          const y = hillY(L, g, x) + off;
          if (x || join) f.lineTo(x, y); else f.moveTo(x, y);
        }
      };
      const shape = () => { f.beginPath(); f.moveTo(0, gy + 1); ridgePath(0, true); f.lineTo(W, gy + 1); f.closePath(); };
      shape(); f.fillStyle = rgba(fill); f.fill();
      // contour lines that follow the ridge, inside the hill
      f.save(); shape(); f.clip();
      for (let k = 1; k <= L.lines; k++) {
        const off = (k * (g.gy * L.amp * (1 - L.lift))) / (L.lines + 1.5);
        f.strokeStyle = rgba(ink, 0.14 - k * 0.015); f.lineWidth = 1;
        f.beginPath(); ridgePath(off); f.stroke();
      }
      f.restore();
      f.strokeStyle = rgba(ink, 0.35 + i * 0.2); f.lineWidth = 1.3;
      f.beginPath(); ridgePath(); f.stroke();
      // the campfire lives on the middle range and only shows at night
      if (i === 1 && night > 0.01) {
        f.globalAlpha = night;
        drawCampfire(f, (x) => hillY(L, g, x), fr);
        f.globalAlpha = 1;
      }
    });
    const water = mix(p.top, p.bot, 0.55);
    f.fillStyle = rgba(water); f.fillRect(0, sea, W, H - sea);
    f.strokeStyle = rgba(ink, 0.7); f.lineWidth = 1.3;
    f.beginPath(); f.moveTo(0, sea); f.lineTo(W, sea); f.stroke();
    // water lines all the way down; the sun / moon reflection only near the surface, fading as the water rises
    const rx = p.day ? sx : mx, refl = p.day ? p.sunCol : p.moonCol, gap = (H - gy - 8) / 7;
    const reflA = Math.max(p.strength, 0.25) * (1 - smooth(0.15, 0.5, rise));
    for (let k = 0, y = sea + 7; y < H; k++, y += gap) {
      if (k < 7 && reflA > 0.01) {
        const w = (56 - k * 4) * (0.6 + 0.4 * Math.sin(t / 700 + k)) * (g.narrow ? 0.7 : 1);
        f.strokeStyle = rgba(refl, (0.75 - k * 0.08) * reflA); f.lineWidth = 2;
        f.beginPath(); f.moveTo(rx - w / 2, y); f.lineTo(rx + w / 2, y); f.stroke();
      }
      f.strokeStyle = rgba(ink, 0.12); f.lineWidth = 1;
      f.beginPath(); f.moveTo(0, y + 4); f.lineTo(W, y + 4); f.stroke();
    }
    // the boat is out by day, fading as the campfire takes over; it rides the rising water, then drifts off
    const boatA = (1 - night) * (1 - smooth(0.45, 0.8, rise));
    if (boatA > 0.01) {
      f.globalAlpha = boatA;
      drawBoat(f, fr);
      f.globalAlpha = 1;
    }
    if (rise < 0.6) events.drawJumpingFish(f, fr);

    // the page below shares the water: expose its colours to CSS
    const waterInk = pickInk(water), root = document.documentElement.style;
    root.setProperty('--water', rgba(water));
    root.setProperty('--water-ink', rgba(waterInk));
    root.setProperty('--water-ink-soft', rgba(waterInk, 0.72));
    root.setProperty('--water-line', rgba(waterInk, 0.16));
    hero.style.setProperty('--copy-opacity', String(1 - smooth(0.05, 0.4, rise)));

    // text colours: the small copy reads against the upper sky, the name against the sky behind the hills
    const copyInk = pickInk(mix(p.top, p.bot, 0.15));
    hero.style.setProperty('--ink', rgba(copyInk));
    hero.style.setProperty('--ink-soft', rgba(copyInk, 0.72));
    hero.style.setProperty('--name', rgba(pickInk(mix(p.top, p.bot, 0.7)), 0.9));
  }

  // ---------- state ----------
  const state: { mode: 'live' | 'manual' | 'returning'; hour: number } = { mode: 'live', hour: 12 };
  const nowHour = () => {
    const d = new Date();
    return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  };
  function updateUI() {
    clockEl.textContent = fmtTime(state.hour);
    const ph = phaseName(state.hour);
    phaseEl.textContent = ph === 'night' || ph === 'dusk' ? `${ph} · ${moon.name}` : ph;
    hourInput.value = state.hour.toFixed(2);
    hourInput.setAttribute('aria-valuetext', fmtTime(state.hour));
  }
  function setHour(h: number, mode: typeof state.mode) {
    state.hour = ((h % 24) + 24) % 24;
    state.mode = mode;
    updateUI(); draw();
  }

  // glide back to the current time along the shortest way round the clock
  let tween = 0;
  function returnToNow() {
    cancelAnimationFrame(tween);
    const from = state.hour, target = nowHour();
    let diff = (((target - from) % 24) + 24) % 24;
    if (diff > 12) diff -= 24;
    if (reduce || Math.abs(diff) < 1 / 60) return setHour(target, 'live');
    const t0 = performance.now(), dur = clamp(Math.abs(diff) * 160, 600, 1800);
    const stepFn = (now: number) => {
      const k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
      setHour(from + diff * e, k < 1 ? 'returning' : 'live');
      if (k < 1) tween = requestAnimationFrame(stepFn);
    };
    tween = requestAnimationFrame(stepFn);
  }

  // ---------- dragging the sun or the moon ----------
  function hit(x: number, y: number): 'sun' | 'moon' | null {
    const p: Sky = skyAt(state.hour), g = geo();
    if (y > lastSea) return null;   // under water: nothing to grab
    if (p.sunAlt > -0.05) {
      const [sx, sy] = onArc(g, p.sp);
      if (Math.hypot(x - sx, y - sy) < g.sunR + 16) return 'sun';
    }
    if (p.moonAlt > -0.05) {
      const [mx, my] = onArc(g, p.mp);
      if (Math.hypot(x - mx, y - my) < g.moonR + 20) return 'moon';
    }
    return null;
  }
  const local = (e: PointerEvent): [number, number] => {
    const r = front.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  front.addEventListener('pointerdown', (e) => {
    const [x, y] = local(e), h = hit(x, y);
    if (!h) return;
    cancelAnimationFrame(tween); drag = h;
    front.setPointerCapture(e.pointerId); front.classList.add('dragging'); e.preventDefault();
  });
  front.addEventListener('pointermove', (e) => {
    const [x, y] = local(e);
    if (!drag) {
      const h = !!hit(x, y);
      if (h !== hover) { hover = h; front.classList.toggle('grab', h); draw(); }
      return;
    }
    const g = geo();
    // angle around the full ellipse: the upper half belongs to the dragged body, the lower half
    // (pointer below the horizon) is the other body's turn, so dragging keeps turning the whole day
    let a = Math.atan2((g.gy - y) / g.ry, -(x - g.ax) / g.rx);
    if (a < 0) a += Math.PI * 2;
    const up = a <= Math.PI, s = up ? a / Math.PI : (a - Math.PI) / Math.PI;
    const sunHour = RISE + s * DAY, moonHour = SET + s * NIGHT;
    setHour(drag === 'sun' ? (up ? sunHour : moonHour) : up ? moonHour : sunHour, 'manual');
  });
  const end = () => {
    if (!drag) return;
    drag = null; front.classList.remove('dragging'); returnToNow();
  };
  front.addEventListener('pointerup', end);
  front.addEventListener('pointercancel', end);
  front.addEventListener('pointerleave', () => {
    if (hover && !drag) { hover = false; front.classList.remove('grab'); draw(); }
  });

  // keyboard / screen reader: a visually hidden range input; time returns when focus leaves
  hourInput.addEventListener('input', () => { cancelAnimationFrame(tween); setHour(+hourInput.value, 'manual'); });
  hourInput.addEventListener('blur', () => { if (state.mode === 'manual') returnToNow(); });

  // ---------- start ----------
  state.hour = nowHour(); updateUI();
  new ResizeObserver(resize).observe(hero);
  requestAnimationFrame(() => requestAnimationFrame(() => hero.classList.add('is-ready')));
  // re-fit the name once the display face has actually loaded (the fallback has different widths)
  document.fonts?.load(`${TITLE_FONT.weight} 100px "${TITLE_FONT.family}"`).then(() => { placeName(); draw(); }, () => {});

  const frame = (t: number) => {
    if (state.mode === 'live') {
      const h = nowHour();
      if (Math.abs(h - state.hour) > 1 / 120) { state.hour = h; updateUI(); }
    }
    draw(t);
    requestAnimationFrame(frame);
  };
  // redraw on scroll so the water follows even when the animation loop is off (reduced motion)
  let scrollQueued = false;
  addEventListener('scroll', () => {
    if (scrollQueued || !reduce) return;
    scrollQueued = true;
    requestAnimationFrame(() => { scrollQueued = false; draw(); });
  }, { passive: true });

  if (reduce) {
    setInterval(() => {
      if (state.mode === 'live') { state.hour = nowHour(); updateUI(); }
      draw();
    }, 30000);
  } else requestAnimationFrame(frame);
}
