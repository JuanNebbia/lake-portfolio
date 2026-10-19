export type RGB = [number, number, number];

export const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
export const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => v + (b[i]! - v) * t) as RGB;
export const rgba = (c: RGB, a = 1) => `rgba(${c.map(Math.round).join(',')},${a})`;

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** Smoothstep from a to b (a may be greater than b to invert it). */
export const smooth = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

/** Relative luminance (WCAG). */
export const lum = (c: RGB) => {
  const [r, g, b] = c.map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as RGB;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const BLACK: RGB = [0, 0, 0];
export const DARK = hex('#141a2b');
export const LIGHT = hex('#eef1fa');

const contrast = (a: RGB, b: RGB) => {
  const x = lum(a) + 0.05, y = lum(b) + 0.05;
  return Math.max(x, y) / Math.min(x, y);
};
/** Dark or light ink, whichever reads better on `bg`. */
export const pickInk = (bg: RGB) => (contrast(DARK, bg) >= contrast(LIGHT, bg) ? DARK : LIGHT);
