import { mix, rgba } from './color';
import type { Sky } from './sky';

// Moon age in days since a reference new moon (2000-01-06 18:14 UTC); synodic month 29.53 days
const SYNODIC = 29.530588853;
const NAMES = [
  'new moon', 'waxing crescent', 'first quarter', 'waxing gibbous',
  'full moon', 'waning gibbous', 'last quarter', 'waning crescent',
];

export interface MoonPhase {
  /** Fraction of the cycle, 0 = new, 0.5 = full. */
  f: number;
  /** Illuminated fraction of the disc. */
  lit: number;
  name: string;
}

export function moonPhase(date = new Date()): MoonPhase {
  const days = (date.getTime() - Date.UTC(2000, 0, 6, 18, 14)) / 864e5;
  const age = ((days % SYNODIC) + SYNODIC) % SYNODIC;
  const f = age / SYNODIC;
  return { f, lit: (1 - Math.cos(2 * Math.PI * f)) / 2, name: NAMES[Math.round(f * 8) % 8]! };
}

/**
 * Draws the moon with today's illumination. `south` mirrors it as seen from the southern
 * hemisphere (Córdoba), where a waxing moon is lit on the left.
 */
export function drawMoon(c: CanvasRenderingContext2D, x: number, y: number, r: number, p: Sky, phase: MoonPhase, south = true) {
  const k = Math.cos(2 * Math.PI * phase.f); // 1 = new, 0 = quarter, -1 = full
  const waxing = phase.f < 0.5;
  const litRight = south ? !waxing : waxing;
  // the unlit part, faintly visible (earthshine)
  c.fillStyle = rgba(mix(mix(p.top, p.bot, 0.3), p.moonCol, 0.14));
  c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  // lit part: the bright limb as a half circle, closed by the terminator (half an ellipse)
  if (phase.lit > 0.01) {
    c.save(); c.translate(x, y); if (!litRight) c.scale(-1, 1);
    c.beginPath(); c.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    const rx = Math.max(0.01, r * Math.abs(k));
    if (k > 0) c.ellipse(0, 0, rx, r, 0, Math.PI / 2, -Math.PI / 2, true); // crescent: terminator bows toward the lit side
    else c.ellipse(0, 0, rx, r, 0, Math.PI / 2, Math.PI * 1.5, false); // gibbous: it bows the other way
    c.closePath(); c.fillStyle = rgba(p.moonCol); c.fill();
    c.restore();
  }
  c.strokeStyle = rgba(p.moonCol, 0.5); c.lineWidth = 1;
  c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke();
}
