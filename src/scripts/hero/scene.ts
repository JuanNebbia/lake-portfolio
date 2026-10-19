import type { RGB } from './color';
import type { Sky } from './sky';

/** Everything a piece of the landscape needs to draw itself for the current frame. */
export interface Frame {
  W: number;
  H: number;
  /** y of the horizon, where the hills meet the water at rest. */
  gy: number;
  /** y of the water surface: equal to gy at rest, rising toward 0 as the page scrolls. */
  sea: number;
  narrow: boolean;
  /** Animation clock in ms. */
  t: number;
  reduce: boolean;
  /** Line colour that reads against the current sky. */
  ink: RGB;
  p: Sky;
}
