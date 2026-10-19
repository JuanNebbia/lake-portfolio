import { BLACK, mix, rgba } from './color';
import type { Frame } from './scene';

type Ctx = CanvasRenderingContext2D;

/**
 * A tiny campfire in the valley right of the big hump on the middle range,
 * with someone sitting beside it. `ridge(x)` gives that range's ridge height.
 */
export function drawCampfire(f: Ctx, ridge: (x: number) => number, fr: Frame) {
  const { W, t, ink, p } = fr;
  let peak = W * 0.6, top = Infinity;
  for (let x = W * 0.4; x <= W * 0.9; x += 2) {
    const y = ridge(x);
    if (y < top) { top = y; peak = x; }
  }
  const k = fr.narrow ? 0.8 : 1;
  // walk down from the peak to the bottom of the valley on its right
  let fx = peak;
  while (fx < W - 20 && ridge(fx + 2) >= ridge(fx)) fx += 2;
  const fy = ridge(fx) + 1;
  const night = 0.25 + 0.75 * p.darkness;
  const still = fr.reduce ? 0 : 1;

  // glow
  const gr = f.createRadialGradient(fx, fy - 4 * k, 1, fx, fy - 4 * k, 46 * k);
  gr.addColorStop(0, `rgba(255,120,60,${0.32 * night})`); gr.addColorStop(1, 'rgba(255,120,60,0)');
  f.fillStyle = gr; f.beginPath(); f.arc(fx, fy - 4 * k, 46 * k, 0, 7); f.fill();
  // logs
  f.strokeStyle = rgba(ink, 0.85); f.lineWidth = 1.4 * k; f.lineCap = 'round';
  f.beginPath();
  f.moveTo(fx - 5 * k, fy); f.lineTo(fx + 4 * k, fy - 2.5 * k);
  f.moveTo(fx + 5 * k, fy); f.lineTo(fx - 4 * k, fy - 2.5 * k);
  f.stroke();
  // flames: red, orange and a yellow core, breathing slowly
  const flame = (w: number, h: number, col: string, ph: number) => {
    const hh = h * (1 + still * 0.05 * Math.sin(t / 420 + ph));
    const lean = still * 0.3 * Math.sin(t / 900 + ph);
    f.fillStyle = col; f.beginPath();
    f.moveTo(fx - w, fy - 2 * k);
    f.quadraticCurveTo(fx - w, fy - hh * 0.55, fx + lean, fy - hh);
    f.quadraticCurveTo(fx + w, fy - hh * 0.55, fx + w, fy - 2 * k);
    f.closePath(); f.fill();
  };
  flame(4.2 * k, 12 * k, '#d9381e', 0);
  flame(3 * k, 8.5 * k, '#ff8a2a', 1.7);
  flame(1.6 * k, 5 * k, '#ffd36b', 3.1);
  // a single ember drifting up now and then
  if (still) {
    const life = (t / 3200) % 1;
    const ex = fx + Math.sin(t / 1200) * 2 * k, ey = fy - 12 * k - life * 16 * k;
    f.fillStyle = `rgba(255,170,80,${Math.sin(Math.PI * life) * 0.6})`;
    f.beginPath(); f.arc(ex, ey, 0.9 * k, 0, 7); f.fill();
  }
  // the person: sitting on the slope to the right of the fire, knees up, facing it (d = -1 mirrors the figure)
  const d = -1, px = fx + 13 * k, py = ridge(px) + 1;
  f.strokeStyle = rgba(ink, 0.9); f.lineWidth = 1.3 * k; f.lineJoin = 'round';
  f.beginPath();
  f.moveTo(px - d * 1 * k, py - 1 * k); f.lineTo(px + d * 1 * k, py - 9 * k);   // back
  f.moveTo(px - d * 1 * k, py - 1 * k); f.lineTo(px + d * 5 * k, py - 5 * k);   // thigh up to the knee
  f.lineTo(px + d * 6.5 * k, py);                                               // shin down to the ground
  f.moveTo(px + d * 0.6 * k, py - 7 * k); f.lineTo(px + d * 5 * k, py - 5.5 * k); // arm resting on the knee
  f.stroke();
  f.fillStyle = rgba(ink, 0.9); f.beginPath(); f.arc(px + d * 1.6 * k, py - 11.5 * k, 2.2 * k, 0, 7); f.fill();
  f.lineCap = 'butt';
}

/** A small boat on the water with someone typing on a laptop, lit by its screen. */
export function drawBoat(f: Ctx, fr: Frame) {
  const { W, H, gy, t, ink, p } = fr;
  const k = fr.narrow ? 0.95 : 1.25;
  const still = fr.reduce ? 0 : 1;
  const bx = W * (fr.narrow ? 0.24 : 0.2);
  // floats at a fixed depth below the surface, so it rides the water up when it rises
  const by = fr.sea + (H - gy) * 0.42 + still * Math.sin(t / 1500);
  const tilt = still * Math.sin(t / 1900) * 0.025;

  // reflection: the hull as two broken lines
  f.strokeStyle = rgba(ink, 0.22); f.lineWidth = 1;
  f.beginPath();
  f.moveTo(bx - 13 * k, by + 8 * k); f.lineTo(bx + 11 * k, by + 8 * k);
  f.moveTo(bx - 9 * k, by + 11.5 * k); f.lineTo(bx + 6 * k, by + 11.5 * k);
  f.stroke();

  f.save(); f.translate(bx, by); f.rotate(tilt);
  // light leaves the screen only toward the person: a wedge from the screen to the face, fading out
  const lg = f.createLinearGradient(3 * k, 0, -8 * k, 0);
  lg.addColorStop(0, 'rgba(205,233,255,.75)'); lg.addColorStop(1, 'rgba(205,233,255,0)');
  f.fillStyle = lg; f.beginPath();
  f.moveTo(3.5 * k, -11.8 * k); f.lineTo(2.1 * k, -6.8 * k); f.lineTo(-2.5 * k, -7.2 * k); f.lineTo(-8.5 * k, -19 * k);
  f.closePath(); f.fill();
  // person, sitting on the stern bench and facing the bow
  f.strokeStyle = rgba(ink, 0.9); f.lineWidth = 1.3 * k; f.lineCap = 'round'; f.lineJoin = 'round';
  f.beginPath();
  f.moveTo(-8 * k, -3 * k); f.lineTo(-7 * k, -13 * k);        // back, a little hunched
  f.moveTo(-8 * k, -3 * k); f.lineTo(-1.5 * k, -5.5 * k);     // thigh to the knee
  f.lineTo(-0.5 * k, -1 * k);                                 // shin
  f.stroke();
  // two arms typing: bursts of quick alternating taps, then a short pause to read
  const typing = still && (t % 2600) / 2600 < 0.65;
  const tap = (i: number) => (typing ? Math.max(0, Math.sin(t / 55 + i * Math.PI)) * 1.1 * k : 0);
  for (const [hx, i] of [[-0.4, 0], [1.1, 1]] as const) {
    f.beginPath();
    f.moveTo(-6.6 * k, -11 * k); f.lineTo((-3.6 + hx * 0.3) * k, -7.6 * k); // upper arm to the elbow
    f.lineTo(hx * k, -6.9 * k - tap(i));                                   // forearm to the keys
    f.stroke();
  }
  f.fillStyle = rgba(ink, 0.9); f.beginPath(); f.arc(-5.6 * k, -15.6 * k, 2.3 * k, 0, 7); f.fill();
  // the face catches the screen light
  f.strokeStyle = 'rgba(205,233,255,.9)'; f.lineWidth = 1.1 * k;
  f.beginPath(); f.arc(-5.6 * k, -15.6 * k, 2.3 * k, -0.9, 0.9); f.stroke();
  // laptop on the knees: dark base and back of the lid, lit face of the screen toward the person
  f.strokeStyle = rgba(ink, 0.9); f.lineWidth = 1.3 * k;
  f.beginPath(); f.moveTo(-3 * k, -6.2 * k); f.lineTo(2.2 * k, -6.2 * k); f.lineTo(4 * k, -12.2 * k); f.stroke();
  f.strokeStyle = '#e4f3ff'; f.lineWidth = 1.2 * k;
  f.beginPath(); f.moveTo(1.7 * k, -6.8 * k); f.lineTo(3.3 * k, -11.8 * k); f.stroke();
  // hull, drawn last so it hides the legs below the gunwale
  f.lineWidth = 1.3 * k; f.strokeStyle = rgba(ink, 0.9);
  f.fillStyle = rgba(mix(mix(p.top, p.bot, 0.5), BLACK, 0.25));
  f.beginPath();
  f.moveTo(-17 * k, -3 * k); f.lineTo(15 * k, -3 * k); f.lineTo(19 * k, -6 * k); // gunwale up to the bow
  f.lineTo(13 * k, 4 * k); f.lineTo(-13 * k, 4 * k); f.closePath();
  f.fill(); f.stroke();
  f.strokeStyle = rgba(ink, 0.35); f.lineWidth = 1;
  f.beginPath(); f.moveTo(-14 * k, 0.5 * k); f.lineTo(15 * k, 0.5 * k); f.stroke(); // plank line
  f.restore(); f.lineCap = 'butt';
}
