/** Tunables shared by the hero scene modules. World units are roughly 3 m. */
export const SIGNAL = "143, 188, 255";
export const WHITE = "255, 255, 255";
export const ALERT = "255, 106, 61";
export const GROUND = "12, 12, 11";
export const MONO = "'IBM Plex Mono', ui-monospace, monospace";

export const TAU = Math.PI * 2;
export const LOOP_S = 60;
/** Loop time shown on first paint: two levels already stand. */
export const START_T = 17;
/** Loop time of the reduced-motion still frame. */
export const STILL_T = 37.5;
export const INTRO_S = 1.6;
export const NARROW_W = 760;

export const LEVELS = 6;
export const LEVEL_S = 8;
export const LEVEL_H = 0.72;
export const BUILD_END_S = LEVELS * LEVEL_S;
export const DISSOLVE_AT_S = 55;
export const FOOT = { x0: -2.25, x1: 2.25, y0: -1.5, y1: 1.5 } as const;
export const BAYS_X = 3;
export const BAYS_Y = 2;

export const FENCE = { x0: -5.5, x1: 5.5, y0: -4.2, y1: 4.2 } as const;
export const GATE = { y0: 1.2, y1: 2.8 } as const;
export const ROAD_Y = 2;

export const HEADCAM_CAPTURE_S = 2.5;
export const DRONE_ORBIT_S = 20;
