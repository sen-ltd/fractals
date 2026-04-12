/**
 * palette.js — Color palette functions for fractal rendering
 * Each palette function takes (iter, maxIter) and returns {r, g, b} (0–255).
 * Points in the set (iter === maxIter) return black.
 */

/**
 * Classic rainbow palette using HSV-style cycling
 */
export function classic(iter, maxIter) {
  if (iter === maxIter) return { r: 0, g: 0, b: 0 };
  const t = iter / maxIter;
  const hue = (t * 360 * 6) % 360;
  return hsvToRgb(hue, 1, 1);
}

/**
 * Fire palette: black → red → orange → yellow → white
 */
export function fire(iter, maxIter) {
  if (iter === maxIter) return { r: 0, g: 0, b: 0 };
  const t = Math.sqrt(iter / maxIter);
  if (t < 0.333) {
    const s = t / 0.333;
    return { r: Math.round(s * 255), g: 0, b: 0 };
  } else if (t < 0.666) {
    const s = (t - 0.333) / 0.333;
    return { r: 255, g: Math.round(s * 165), b: 0 };
  } else {
    const s = (t - 0.666) / 0.334;
    return { r: 255, g: Math.round(165 + s * 90), b: Math.round(s * 255) };
  }
}

/**
 * Cool blue palette: dark navy → blue → cyan → white
 */
export function cool(iter, maxIter) {
  if (iter === maxIter) return { r: 0, g: 0, b: 0 };
  const t = Math.sqrt(iter / maxIter);
  if (t < 0.5) {
    const s = t / 0.5;
    return { r: 0, g: Math.round(s * 100), b: Math.round(50 + s * 205) };
  } else {
    const s = (t - 0.5) / 0.5;
    return { r: Math.round(s * 200), g: Math.round(100 + s * 155), b: 255 };
  }
}

/**
 * Grayscale palette
 */
export function grayscale(iter, maxIter) {
  if (iter === maxIter) return { r: 0, g: 0, b: 0 };
  const v = Math.round(255 * Math.sqrt(iter / maxIter));
  return { r: v, g: v, b: v };
}

/**
 * Psychedelic palette: rapid oscillating colors
 */
export function psychedelic(iter, maxIter) {
  if (iter === maxIter) return { r: 0, g: 0, b: 0 };
  const r = Math.round(127.5 + 127.5 * Math.sin(iter * 0.1));
  const g = Math.round(127.5 + 127.5 * Math.sin(iter * 0.13 + 2.094));
  const b = Math.round(127.5 + 127.5 * Math.sin(iter * 0.16 + 4.189));
  return { r, g, b };
}

/**
 * Convert HSV to RGB
 * @param {number} h - Hue 0–360
 * @param {number} s - Saturation 0–1
 * @param {number} v - Value 0–1
 * @returns {{r: number, g: number, b: number}}
 */
function hsvToRgb(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

/**
 * Convert a field of iteration counts to a flat RGBA Uint8ClampedArray
 * @param {Uint32Array} field - Iteration counts from computeField
 * @param {number} width
 * @param {number} height
 * @param {Function} paletteFn - One of the palette functions above
 * @param {number} maxIter
 * @returns {Uint8ClampedArray} RGBA pixel data
 */
export function applyPalette(field, width, height, paletteFn, maxIter) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < field.length; i++) {
    const { r, g, b } = paletteFn(field[i], maxIter);
    const idx = i * 4;
    data[idx] = r;
    data[idx + 1] = g;
    data[idx + 2] = b;
    data[idx + 3] = 255;
  }
  return data;
}
