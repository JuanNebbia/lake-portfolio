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
/**
 * Scrolling always carries the clock forward to midnight, so the water under the content ends
 * on the same dark, readable tone whatever the visit time. Closer than this to midnight, it goes
 * round a full extra day so there is still a passage of time to see.
 */
const MIN_SCROLL_HOURS = 3;
const hoursToMidnight = (h: number) => {
  const d = 24 - h;
  return d < MIN_SCROLL_HOURS ? d + 24 : d;
};

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
  const lang = hero.dataset.lang === 'es' ? 'es' : 'en';
  const moon = moonPhase(new Date(), lang);
  // the moment of the day in the corner, in the page's language
  const PHASES: Record<string, string> = lang === 'es'
    ? { dawn: 'alba', sunrise: 'amanecer', morning: 'mañana', noon: 'mediodía', afternoon: 'tarde', sunset: 'atardecer', dusk: 'crepúsculo', night: 'noche' }
    : {};
  const events = new Events();

  let W = 0, H = 0;
  // where the name sits, so the back ridge can rise in front of it
  const name = { base: 0, cap: 0, gap: 0.44, stacked: false };

  // ---------- geometry ----------
  function geo(): Geo {
    const narrow = W < 640, gy = H * (narrow ? 0.7 : 0.8);
    // the arc leans right so the sun and moon stay clear of the copy in the top-left corner;
    // on a phone it runs wider than the screen, rising and setting beyond its edges
    return {
      narrow, gy,
      ax: W * (narrow ? 0.5 : 0.62), rx: W * (narrow ? 0.72 : 0.34), ry: gy * (narrow ? 0.72 : 0.8),
      sunR: narrow ? 30 : 46, moonR: narrow ? 15 : 20,
    };
  }
  const onArc = (g: Geo, s: number): [number, number] =>
    [g.ax - g.rx * Math.cos(s * Math.PI), g.gy - g.ry * Math.sin(s * Math.PI)];

  // The ranges are laid out on a landscape at least this wide; a narrower screen shows its middle
  // instead of squeezing every slope into the width of a phone.
  const LANDSCAPE_MIN = 800;
  const view = () => { const VW = Math.max(W, LANDSCAPE_MIN); return { VW, off: (VW - W) / 2 }; };

  const hillSoft = (L: Hill, g: Geo, x: number) => {
    const { VW, off } = view();
    const u = (x + off) / VW;
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
      // facets sit on the landscape's grid, not the screen's, so they keep their size on a phone
      const { VW, off } = view();
      const seg = VW / L.nodes, vx = x + off, i = Math.floor(vx / seg), t = vx / seg - i;
      const yp = hillSoft(L, g, i * seg - off) * (1 - t) + hillSoft(L, g, (i + 1) * seg - off) * t;
      y = yp + (y - yp) * ROUNDNESS;
    }
    if (L.hump && name.cap && !name.stacked) {   // the hump belongs between the words of a one-line name
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
    // on a phone the name stacks in two lines ("Juan" over "Nebbia") so it can be much bigger
    name.stacked = g.narrow;
    nameEl.classList.toggle('stacked', name.stacked);
    const lines = name.stacked ? 2 : 1;
    nameEl.style.fontSize = '100px';
    const w100 = nameEl.getBoundingClientRect().width;   // the widest line
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
    // centre the hump on the space between "Juan" and "Nebbia" (the text node between the two words)
    const space = [...nameEl.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim() === '');
    if (space && !name.stacked) {
      const r = document.createRange();
      r.selectNodeContents(space);
      const sp = r.getBoundingClientRect(), hr = hero.getBoundingClientRect();
      name.gap = (sp.left + sp.width / 2 - hr.left) / W;
    } else name.gap = 0.44;
    // the baseline that peeks over the ridge is the last line's
    nameEl.style.top = `${name.base - (lines - 1) * F - baseFromTop}px`;
  }

  // ---------- drawing ----------
  let hover = false;
  let drag: 'sun' | 'moon' | null = null;
  let lastSea = Infinity;

  // Water surface: the horizon at rest, rising from the very first pixel of scroll and reaching the
  // top as the following content does. It stays a little ahead of the content's top edge, so the
  // text below always sits under water.
  function water(g: Geo) {
    if (!follower) return { sea: g.gy, rise: 0 };
    const top = follower.getBoundingClientRect().top - hero.getBoundingClientRect().top;
    const rise = clamp(1 - top / H, 0, 1);     // 0 with the content at rest (just below the hero), 1 at the top
    return { sea: g.gy * (1 - rise), rise };
  }
  // Scrolling moves the clock forward: the hour on screen goes from the real (or dragged) hour
  // to midnight at a steady pace (linear in the scroll), then stays put under the water.
  const hourAt = (base: number, rise: number) => (base + hoursToMidnight(base) * clamp(rise, 0, 1)) % 24;
  const shownHour = () => hourAt(state.hour, W ? water(geo()).rise : 0);
  // the inverse, for dragging the sun or moon mid-scroll: which real hour puts `target` on screen?
  function baseFor(target: number, rise: number) {
    if (rise <= 0) return target;
    const dist = (h: number) => { const d = Math.abs(hourAt(h, rise) - target) % 24; return Math.min(d, 24 - d); };
    let best = state.hour;
    for (let h = 0; h < 24; h += 0.05) if (dist(h) < dist(best)) best = h;
    return best;
  }

  let shownText = '';
  let nameDrift = 0;
  let lastDrawAt = -1;
  function draw(t = performance.now()) {
    if (!W) return;
    lastDrawAt = t;
    const g = geo(), { gy } = g;
    const { sea, rise } = water(g);
    const hour = hourAt(state.hour, rise);
    const p = skyAt(hour);
    const ink = pickInk(mix(p.top, p.bot, 0.2));
    lastSea = sea;
    // keep the clock in the corner in step with what the sky shows
    const text = fmtTime(hour);
    if (text !== shownText) { shownText = text; updateUI(hour); }
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
    const waterCol = mix(p.top, p.bot, 0.55);
    f.fillStyle = rgba(waterCol); f.fillRect(0, sea, W, H - sea);
    f.strokeStyle = rgba(ink, 0.7); f.lineWidth = 1.3;
    f.beginPath(); f.moveTo(0, sea); f.lineTo(W, sea); f.stroke();
    // water lines all the way down; the sun / moon reflection only near the surface, fading as the water rises
    const rx = p.day ? sx : mx, refl = p.day ? p.sunCol : p.moonCol, gap = (H - gy - 8) / 7;
    const reflA = Math.max(p.strength, 0.25) * (1 - smooth(0.15, 0.5, rise));
    // the lines stay crisp on the banner's water, then settle into the background behind the content
    const lineA = 0.12 * (1 - 0.5 * smooth(0.2, 0.9, rise));
    for (let k = 0, y = sea + 7; y < H; k++, y += gap) {
      if (k < 7 && reflA > 0.01) {
        const w = (56 - k * 4) * (0.6 + 0.4 * Math.sin(t / 700 + k)) * (g.narrow ? 0.7 : 1);
        f.strokeStyle = rgba(refl, (0.75 - k * 0.08) * reflA); f.lineWidth = 2;
        f.beginPath(); f.moveTo(rx - w / 2, y); f.lineTo(rx + w / 2, y); f.stroke();
      }
      f.strokeStyle = rgba(ink, lineA); f.lineWidth = 1;
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
    const waterInk = pickInk(waterCol), root = document.documentElement.style;
    root.setProperty('--water', rgba(waterCol));
    root.setProperty('--water-ink', rgba(waterInk));
    root.setProperty('--water-ink-soft', rgba(waterInk, 0.72));
    root.setProperty('--water-line', rgba(waterInk, 0.16));
    hero.style.setProperty('--copy-opacity', String(1 - smooth(0.05, 0.4, rise)));
    // the name drifts away as the water comes in: it grows, rises a little, blurs and fades
    const k = Math.round(smooth(0, 0.6, rise) * 1000) / 1000;
    if (k !== nameDrift) {
      nameDrift = k;
      nameEl.style.transform = k ? `scale(${1 + 0.2 * k}) translate(${-50 + 10 * k}%, ${-20 * k}%)` : '';
      nameEl.style.filter = k ? `blur(${5 * k}px)` : '';
      nameEl.style.opacity = k ? String(1 - k) : '';
    }

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
  function updateUI(hour = shownHour()) {
    clockEl.textContent = fmtTime(hour);
    const ph = phaseName(hour);
    const label = PHASES[ph] ?? ph;
    phaseEl.textContent = ph === 'night' || ph === 'dusk' ? `${label} · ${moon.name}` : label;
    hourInput.value = hour.toFixed(2);
    hourInput.setAttribute('aria-valuetext', fmtTime(hour));
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
    const p: Sky = skyAt(shownHour()), g = geo();
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
    // the drag sets the hour on screen; take the scroll offset back out to get the underlying hour
    const target = drag === 'sun' ? (up ? sunHour : moonHour) : up ? moonHour : sunHour;
    setHour(baseFor(target, water(g).rise), 'manual');
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
  hourInput.addEventListener('input', () => { cancelAnimationFrame(tween); setHour(baseFor(+hourInput.value, water(geo()).rise), 'manual'); });
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
    if (t !== lastDrawAt) draw(t);   // the glide may already have drawn this frame
    requestAnimationFrame(frame);
  };
  // ---------- the rising water as one controlled move ----------
  // Between the landscape and the water covering the screen there are no stops: the first
  // gesture down (wheel, touch or keyboard) plays the whole rise at a steady pace, and the first
  // gesture up from the water plays it back. The pace is set in hours of sky per second.
  if (follower) setupWaterGlide();

  function setupWaterGlide() {
    const SECONDS_PER_HOUR = 0.04, MIN_MS = 1200, MAX_MS = 4500;
    // the scroll position where the content's top edge (the water surface) reaches the top of the pinned hero
    // (measured against the hero's parent: a sticky element's own offsetTop moves while it is stuck)
    const target = () => follower!.getBoundingClientRect().top - (hero.parentElement ?? document.body).getBoundingClientRect().top;
    let gliding = 0;

    const glide = (to: number) => {
      cancelAnimationFrame(gliding);
      const from = scrollY;
      if (Math.abs(to - from) < 1) return;
      if (reduce) { scrollTo(0, to); return; }
      // the share of the rise still to cover decides how much sky goes by, and so the duration
      const share = Math.abs(to - from) / Math.max(1, target());
      const dur = clamp(hoursToMidnight(state.hour) * SECONDS_PER_HOUR * 1000, MIN_MS, MAX_MS) * share;
      // starts right away: a short ramp up, a steady middle (so the clock runs evenly), a short ramp down
      const RAMP = 0.12, vmax = 1 / (1 - RAMP);
      const ease = (k: number) =>
        k < RAMP ? (vmax * k * k) / (2 * RAMP)
        : k > 1 - RAMP ? 1 - (vmax * (1 - k) ** 2) / (2 * RAMP)
        : vmax * (k - RAMP / 2);
      let t0 = -1;
      const step = (now: number) => {
        if (t0 < 0) t0 = now - 16;                     // move on the very first frame
        const k = clamp((now - t0) / dur, 0, 1);
        scrollTo(0, from + (to - from) * ease(k));
        draw(now);                                     // same frame as the scroll: the water never lags behind
        gliding = k < 1 ? requestAnimationFrame(step) : 0;
      };
      gliding = requestAnimationFrame(step);
    };

    // which way to go for a gesture, or null if the page should just scroll normally
    const decide = (down: boolean) => {
      const y = scrollY, end = target();
      if (down && y < end - 2) return end;
      if (!down && y > 0 && y <= end + 2) return 0;
      return null;
    };

    addEventListener('wheel', (e) => {
      if (e.ctrlKey) return;                         // pinch-zoom on trackpads
      if (gliding) { e.preventDefault(); return; }
      const to = decide(e.deltaY > 0);
      if (to === null || e.deltaY === 0) return;
      e.preventDefault(); glide(to);
    }, { passive: false });

    let touchY = 0, touchFired = false;
    addEventListener('touchstart', (e) => { touchY = e.touches[0]!.clientY; touchFired = false; }, { passive: true });
    addEventListener('touchmove', (e) => {
      if (gliding) { e.preventDefault(); return; }
      const dy = touchY - e.touches[0]!.clientY;
      const to = decide(dy > 0);
      if (to === null) return;
      e.preventDefault();
      if (!touchFired && Math.abs(dy) > 12) { touchFired = true; glide(to); }
    }, { passive: false });

    addEventListener('keydown', (e) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]')) return;
      const down = ['ArrowDown', 'PageDown', ' ', 'Spacebar'].includes(e.key) && !e.shiftKey;
      const up = ['ArrowUp', 'PageUp', 'Home'].includes(e.key) || (e.key === ' ' && e.shiftKey);
      if (!down && !up) return;
      if (gliding) { e.preventDefault(); return; }
      const to = decide(down);
      if (to === null) return;
      e.preventDefault(); glide(to);
    });
  }

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
