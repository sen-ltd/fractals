/**
 * fractals.js — Pure math: iteration counts for Mandelbrot, Julia, Burning Ship
 */

/**
 * Mandelbrot set: iterate z = z² + c starting from z=0
 * @param {number} cx - Real part of c
 * @param {number} cy - Imaginary part of c
 * @param {number} maxIter
 * @returns {number} iteration count (maxIter means in set)
 */
export function mandelbrot(cx, cy, maxIter) {
  let x = 0, y = 0;
  let iter = 0;
  while (x * x + y * y < 4 && iter < maxIter) {
    const xt = x * x - y * y + cx;
    y = 2 * x * y + cy;
    x = xt;
    iter++;
  }
  return iter;
}

/**
 * Julia set: iterate z = z² + c starting from z = (zx, zy)
 * c is fixed; the pixel coordinate is the starting z value
 * @param {number} zx - Real part of starting z
 * @param {number} zy - Imaginary part of starting z
 * @param {number} cx - Real part of c (fixed parameter)
 * @param {number} cy - Imaginary part of c (fixed parameter)
 * @param {number} maxIter
 * @returns {number} iteration count
 */
export function julia(zx, zy, cx, cy, maxIter) {
  let x = zx, y = zy;
  let iter = 0;
  while (x * x + y * y < 4 && iter < maxIter) {
    const xt = x * x - y * y + cx;
    y = 2 * x * y + cy;
    x = xt;
    iter++;
  }
  return iter;
}

/**
 * Burning Ship fractal: like Mandelbrot but with abs() on x and y before squaring
 * @param {number} cx - Real part of c
 * @param {number} cy - Imaginary part of c
 * @param {number} maxIter
 * @returns {number} iteration count
 */
export function burningShip(cx, cy, maxIter) {
  let x = 0, y = 0;
  let iter = 0;
  while (x * x + y * y < 4 && iter < maxIter) {
    const xt = x * x - y * y + cx;
    y = Math.abs(2 * x * y) + cy;
    x = Math.abs(xt);
    iter++;
  }
  return iter;
}

/**
 * Compute a field of iteration counts for a given fractal function
 * @param {Function} fractalFn - One of the fractal functions above
 * @param {number} width - Canvas width in pixels
 * @param {number} height - Canvas height in pixels
 * @param {number} xMin - Left edge of viewport in fractal coordinates
 * @param {number} xMax - Right edge of viewport
 * @param {number} yMin - Top edge of viewport
 * @param {number} yMax - Bottom edge of viewport
 * @param {number} maxIter
 * @param {...*} extraArgs - Extra arguments passed to fractalFn after the coordinate args
 * @returns {Uint32Array} Flat array of iteration counts, row-major
 */
export function computeField(fractalFn, width, height, xMin, xMax, yMin, yMax, maxIter, ...extraArgs) {
  const field = new Uint32Array(width * height);
  const dx = (xMax - xMin) / width;
  const dy = (yMax - yMin) / height;
  for (let py = 0; py < height; py++) {
    const cy = yMin + py * dy;
    for (let px = 0; px < width; px++) {
      const cx = xMin + px * dx;
      field[py * width + px] = fractalFn(cx, cy, maxIter, ...extraArgs);
    }
  }
  return field;
}

/**
 * Interesting preset views for the Mandelbrot set (and one Julia)
 */
export const PRESETS = [
  {
    id: 'full',
    name: { ja: '全体表示', en: 'Full View' },
    centerX: -0.5,
    centerY: 0,
    zoom: 1,
    maxIter: 100,
    fractal: 'mandelbrot',
  },
  {
    id: 'seahorse',
    name: { ja: 'シーホース谷', en: 'Seahorse Valley' },
    centerX: -0.745428,
    centerY: 0.113009,
    zoom: 150,
    maxIter: 300,
    fractal: 'mandelbrot',
  },
  {
    id: 'elephant',
    name: { ja: 'エレファント谷', en: 'Elephant Valley' },
    centerX: 0.3245046418497682,
    centerY: 0.04855101129280646,
    zoom: 200,
    maxIter: 300,
    fractal: 'mandelbrot',
  },
  {
    id: 'spiral',
    name: { ja: 'スパイラル', en: 'Spiral' },
    centerX: -0.761574,
    centerY: -0.0847596,
    zoom: 2000,
    maxIter: 500,
    fractal: 'mandelbrot',
  },
  {
    id: 'mini',
    name: { ja: 'ミニ Mandelbrot', en: 'Mini Mandelbrot' },
    centerX: -1.7499899920037608,
    centerY: 0.0,
    zoom: 5000,
    maxIter: 500,
    fractal: 'mandelbrot',
  },
  {
    id: 'julia-classic',
    name: { ja: 'Julia 古典', en: 'Julia Classic' },
    centerX: 0,
    centerY: 0,
    zoom: 1,
    maxIter: 200,
    fractal: 'julia',
    juliaC: { x: -0.7, y: 0.27015 },
  },
  {
    id: 'burning-full',
    name: { ja: 'バーニングシップ全体', en: 'Burning Ship Full' },
    centerX: -0.5,
    centerY: -0.5,
    zoom: 0.8,
    maxIter: 200,
    fractal: 'burningShip',
  },
];
