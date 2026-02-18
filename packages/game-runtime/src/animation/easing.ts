/**
 * Easing functions for tween animations.
 * Each function takes a normalized time value t (0 to 1) and returns the eased value.
 */

export type EasingFunction = (t: number) => number;

export const linear: EasingFunction = (t: number): number => t;

export const easeInQuad: EasingFunction = (t: number): number => t * t;

export const easeOutQuad: EasingFunction = (t: number): number => {
  return t * (2 - t);
};

export const easeInOutQuad: EasingFunction = (t: number): number => {
  if (t < 0.5) {
    return 2 * t * t;
  }
  return -1 + (4 - 2 * t) * t;
};

export const easeOutBounce: EasingFunction = (t: number): number => {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (t < 1 / d1) {
    return n1 * t * t;
  }
  if (t < 2 / d1) {
    const tt = t - 1.5 / d1;
    return n1 * tt * tt + 0.75;
  }
  if (t < 2.5 / d1) {
    const tt = t - 2.25 / d1;
    return n1 * tt * tt + 0.9375;
  }
  const tt = t - 2.625 / d1;
  return n1 * tt * tt + 0.984375;
};
