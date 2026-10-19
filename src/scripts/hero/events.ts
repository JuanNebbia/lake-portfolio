import { LIGHT, mix, rgba } from './color';
import type { Frame } from './scene';

type Ctx = CanvasRenderingContext2D;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

interface Star { t0: number; dur: number; x: number; y: number; dx: number; dy: number }
interface Fish { t0: number; dur: number; x: number; y: number; dir: 1 | -1; span: number; hgt: number }

/** Occasional events: a shooting star at night, a fish jumping by day. */
export class Events {
  private star: Star | null = null;
  private fish: Fish | null = null;
  private nextStar = performance.now() + 4000;
  private nextFish = performance.now() + 3000;

  drawShootingStar(c: Ctx, fr: Frame) {
    const { W, gy, t, p } = fr;
    if (fr.reduce) return;
    if (!this.star && t > this.nextStar && p.darkness > 0.7) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      this.star = {
        t0: t, dur: rand(700, 1100), x: rand(0.15, 0.85) * W, y: rand(0.05, 0.35) * gy,
        dx: dir * rand(0.18, 0.3) * W, dy: rand(0.08, 0.16) * gy,
      };
    }
    const s = this.star;
    if (!s) return;
    const k = (t - s.t0) / s.dur;
    if (k >= 1) { this.star = null; this.nextStar = t + rand(6000, 14000); return; }
    const e = k * k * (3 - 2 * k), tail = 0.35;
    const hx = s.x + s.dx * e, hy = s.y + s.dy * e;
    const tx = s.x + s.dx * Math.max(0, e - tail), ty = s.y + s.dy * Math.max(0, e - tail);
    const fade = Math.sin(Math.PI * k) * p.darkness;
    const gr = c.createLinearGradient(tx, ty, hx, hy);
    gr.addColorStop(0, rgba(LIGHT, 0)); gr.addColorStop(1, rgba(LIGHT, 0.9 * fade));
    c.strokeStyle = gr; c.lineWidth = 1.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(tx, ty); c.lineTo(hx, hy); c.stroke(); c.lineCap = 'butt';
    c.fillStyle = rgba(LIGHT, fade); c.beginPath(); c.arc(hx, hy, 1.6, 0, 7); c.fill();
  }

  drawJumpingFish(f: Ctx, fr: Frame) {
    const { W, H, gy, t, ink, p } = fr;
    if (fr.reduce) return;
    if (!this.fish && t > this.nextFish && p.day && p.sunAlt > 0.12) {
      const s = fr.narrow ? 0.8 : 1;
      this.fish = {
        t0: t, dur: rand(900, 1200), x: rand(0.12, 0.88) * W, y: fr.sea + rand(0.35, 0.7) * (H - gy),
        dir: Math.random() < 0.5 ? 1 : -1, span: rand(48, 72) * s, hgt: rand(18, 30) * s,
      };
    }
    const s = this.fish;
    if (!s) return;
    const k = (t - s.t0) / s.dur;
    if (k >= 1.6) { this.fish = null; this.nextFish = t + rand(7000, 16000); return; }
    const x0 = s.x, x1 = s.x + s.dir * s.span;
    // splash rings: at take-off, then where it dives back in
    const ring = (x: number, age: number) => {
      if (age < 0 || age > 0.6) return;
      const r = 3 + age * 22;
      f.strokeStyle = rgba(ink, (1 - age / 0.6) * 0.6); f.lineWidth = 1;
      f.beginPath(); f.ellipse(x, s.y, r, r * 0.28, 0, 0, 7); f.stroke();
    };
    ring(x0, k * 1.1); ring(x1, (k - 1) * 1.1);
    if (k > 1) return;
    // the body follows a parabola, tilted along its path
    const x = x0 + (x1 - x0) * k, y = s.y - 4 * s.hgt * k * (1 - k);
    const ang = Math.atan2(-4 * s.hgt * (1 - 2 * k), x1 - x0);
    f.save(); f.translate(x, y); f.rotate(ang); if (s.dir < 0) f.scale(1, -1); // keep the back up when jumping left
    const L = 7 * (fr.narrow ? 0.8 : 1);
    f.fillStyle = rgba(mix(p.bot, ink, 0.55)); f.strokeStyle = rgba(ink, 0.9); f.lineWidth = 1.1;
    f.beginPath(); f.ellipse(0, 0, L, L * 0.38, 0, 0, 7); f.fill(); f.stroke();
    f.beginPath(); f.moveTo(-L * 0.9, 0); f.lineTo(-L * 1.6, -L * 0.45); f.lineTo(-L * 1.6, L * 0.45); f.closePath(); f.fill(); f.stroke();
    f.fillStyle = rgba(ink); f.beginPath(); f.arc(L * 0.5, -L * 0.08, 0.9, 0, 7); f.fill();
    f.restore();
    // a couple of droplets trailing behind
    for (let i = 1; i <= 2; i++) {
      const kk = Math.max(0, k - i * 0.08);
      f.fillStyle = rgba(ink, 0.35);
      f.beginPath(); f.arc(x0 + (x1 - x0) * kk, s.y - 4 * s.hgt * kk * (1 - kk) + i * 2, 0.9, 0, 7); f.fill();
    }
  }
}
