import { hex, mix, smooth, type RGB } from './color';

export const RISE = 6.5;
export const SET = 19.5;
export const DAY = SET - RISE;
export const NIGHT = 24 - DAY;

// Sky colours through the day: [hour, top of the sky, horizon]
const KEYFRAMES: [number, RGB, RGB][] = (
  [
    [0, '#0a0f24', '#1a2142'],
    [4.9, '#0f1534', '#272a52'],
    [5.9, '#2a3468', '#8d6f93'],
    [6.8, '#5f7fbc', '#f2b088'],
    [8.2, '#86b9e3', '#f2e2c8'],
    [12.5, '#5aa2dc', '#d8eaf6'],
    [16.8, '#76a6d2', '#f1d9aa'],
    [18.8, '#55558f', '#f0975f'],
    [19.7, '#2f2c5b', '#bb5f6c'],
    [20.6, '#151a3b', '#3b2f5e'],
    [21.6, '#0a0f24', '#1a2142'],
    [24, '#0a0f24', '#1a2142'],
  ] as [number, string, string][]
).map(([h, a, b]) => [h, hex(a), hex(b)]);

export interface Sky {
  hour: number;
  top: RGB;
  bot: RGB;
  /** Progress of the sun / moon along their arcs, 0..1. */
  sp: number;
  mp: number;
  day: boolean;
  sunAlt: number;
  moonAlt: number;
  /** 0 by day, 1 once the sun is well below the horizon. */
  darkness: number;
  /** How strong the light source is (sun by day, moon by night). */
  strength: number;
  sunCol: RGB;
  moonCol: RGB;
}

const MOON_COLOUR = hex('#eef0fa');

export function skyAt(h: number): Sky {
  let i = 0;
  while (KEYFRAMES[i + 1]![0] < h) i++;
  const [h0, t0, b0] = KEYFRAMES[i]!, [h1, t1, b1] = KEYFRAMES[i + 1]!;
  const t = (h - h0) / (h1 - h0);
  const day = h >= RISE && h <= SET;
  const sp = (h - RISE) / DAY;
  const mp = ((h - SET + 24) % 24) / NIGHT;
  const sunAlt = day ? Math.sin(sp * Math.PI) : -Math.sin(mp * Math.PI) * 0.4;
  const moonAlt = !day ? Math.sin(mp * Math.PI) : -1;
  return {
    hour: h,
    top: mix(t0, t1, t),
    bot: mix(b0, b1, t),
    sp,
    mp,
    day,
    sunAlt,
    moonAlt,
    darkness: 1 - smooth(-0.14, 0, sunAlt),
    strength: day ? smooth(0, 0.12, sunAlt) : 0.4 * smooth(0, 0.15, moonAlt),
    sunCol: mix(hex('#ff8f5a'), hex('#ffe3a1'), smooth(0, 0.55, Math.max(sunAlt, 0))),
    moonCol: MOON_COLOUR,
  };
}

/** 0 by day, 1 by night, cross-fading around sunrise and sunset. */
export const nightness = (p: Sky) => 1 - smooth(-0.06, 0.08, p.sunAlt);

export function phaseName(h: number) {
  if (h >= 5 && h < 6.5) return 'dawn';
  if (h >= 6.5 && h < 8) return 'sunrise';
  if (h >= 8 && h < 11.5) return 'morning';
  if (h >= 11.5 && h < 14) return 'noon';
  if (h >= 14 && h < 18.3) return 'afternoon';
  if (h >= 18.3 && h < 19.9) return 'sunset';
  if (h >= 19.9 && h < 21) return 'dusk';
  return 'night';
}

export const fmtTime = (h: number) => {
  const m = Math.floor((((h % 24) + 24) % 24) * 60 + 1e-6);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
