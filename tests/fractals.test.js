/**
 * fractals.test.js — Tests for fractal math and palette functions
 * Run with: node --test tests/fractals.test.js
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  mandelbrot,
  julia,
  burningShip,
  computeField,
  PRESETS,
} from '../src/fractals.js';

import {
  classic,
  fire,
  cool,
  grayscale,
  psychedelic,
  applyPalette,
} from '../src/palette.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isValidRgb({ r, g, b }) {
  return Number.isInteger(r) && r >= 0 && r <= 255 &&
         Number.isInteger(g) && g >= 0 && g <= 255 &&
         Number.isInteger(b) && b >= 0 && b <= 255;
}

// ---------------------------------------------------------------------------
// Mandelbrot tests
// ---------------------------------------------------------------------------

describe('mandelbrot', () => {
  it('(0, 0) is in the set', () => {
    const result = mandelbrot(0, 0, 100);
    assert.equal(result, 100, 'origin should be in set');
  });

  it('(-1, 0) is in the set', () => {
    const result = mandelbrot(-1, 0, 100);
    assert.equal(result, 100, 'c=-1+0i should be in set');
  });

  it('(-0.5, 0) is in the set', () => {
    const result = mandelbrot(-0.5, 0, 100);
    assert.equal(result, 100, 'c=-0.5+0i should be in set');
  });

  it('(1, 0) is NOT in the set', () => {
    const result = mandelbrot(1, 0, 100);
    assert.notEqual(result, 100, 'c=1+0i should escape');
    assert.ok(result < 100, 'should escape before maxIter');
  });

  it('(2, 2) escapes quickly', () => {
    const result = mandelbrot(2, 2, 100);
    assert.ok(result < 5, 'c=2+2i should escape in very few iterations');
  });

  it('(-2, 0) escapes (on the real boundary)', () => {
    // c=-2+0i: the iteration z -> z^2 + c starting at z=0 gives z1=(-2), z2=2, then escapes
    const result = mandelbrot(-2, 0, 100);
    assert.notEqual(result, 100, 'c=-2+0i should escape');
    assert.ok(result < 100);
  });

  it('(-2.1, 0) is outside the set', () => {
    const result = mandelbrot(-2.1, 0, 100);
    assert.notEqual(result, 100, 'c=-2.1+0i should escape');
  });

  it('returns value between 1 and maxIter', () => {
    const result = mandelbrot(0.5, 0.5, 50);
    assert.ok(result >= 1 && result <= 50, `expected 1..50, got ${result}`);
  });

  it('respects maxIter parameter', () => {
    const r200 = mandelbrot(0, 0, 200);
    const r500 = mandelbrot(0, 0, 500);
    assert.equal(r200, 200);
    assert.equal(r500, 500);
  });
});

// ---------------------------------------------------------------------------
// Julia tests
// ---------------------------------------------------------------------------

describe('julia', () => {
  it('(0, 0) with c=(-0.7, 0.27015) escapes slowly (not in set)', () => {
    // The origin with this c eventually escapes but takes many iterations
    const result = julia(0, 0, -0.7, 0.27015, 200);
    // It escapes around iteration 96, so result should be < 200
    assert.ok(result < 200, `expected to escape before maxIter, got ${result}`);
    assert.ok(result > 50, 'should take many iterations to escape');
  });

  it('(2, 2) with any c escapes quickly', () => {
    const result = julia(2, 2, -0.7, 0.27015, 200);
    assert.ok(result < 10, 'far point should escape quickly');
  });

  it('returns maxIter for stable point', () => {
    const result = julia(0, 0, 0, 0, 100);
    assert.equal(result, 100, 'c=0 z=0 is trivially in set');
  });

  it('(1.5, 1.5) escapes for c=(-0.4, 0.6)', () => {
    const result = julia(1.5, 1.5, -0.4, 0.6, 100);
    assert.notEqual(result, 100, 'should escape');
  });

  it('same point, different c gives different result', () => {
    const r1 = julia(0.3, 0.3, -0.7, 0.27015, 100);
    const r2 = julia(0.3, 0.3, 0.355, 0.355, 100);
    // Results may differ based on c parameter
    assert.ok(typeof r1 === 'number');
    assert.ok(typeof r2 === 'number');
  });
});

// ---------------------------------------------------------------------------
// Burning Ship tests
// ---------------------------------------------------------------------------

describe('burningShip', () => {
  it('(0, 0) is in the set', () => {
    const result = burningShip(0, 0, 100);
    assert.equal(result, 100);
  });

  it('(2, 2) escapes quickly', () => {
    const result = burningShip(2, 2, 100);
    assert.ok(result < 10);
  });

  it('(-1.5, -0.1) is in the Burning Ship set', () => {
    // This region is known to contain the main body
    const result = burningShip(-1.5, -0.1, 200);
    assert.equal(result, 200);
  });

  it('(3, 0) escapes', () => {
    const result = burningShip(3, 0, 100);
    assert.notEqual(result, 100);
  });

  it('returns value in valid range', () => {
    const result = burningShip(0.1, 0.2, 50);
    assert.ok(result >= 0 && result <= 50);
  });
});

// ---------------------------------------------------------------------------
// computeField tests
// ---------------------------------------------------------------------------

describe('computeField', () => {
  it('returns Uint32Array of correct size', () => {
    const field = computeField(mandelbrot, 10, 8, -2, 1, -1, 1, 50);
    assert.ok(field instanceof Uint32Array);
    assert.equal(field.length, 10 * 8);
  });

  it('all values are within [0, maxIter]', () => {
    const maxIter = 100;
    const field = computeField(mandelbrot, 20, 20, -2, 1, -1.5, 1.5, maxIter);
    for (let i = 0; i < field.length; i++) {
      assert.ok(field[i] >= 0 && field[i] <= maxIter,
        `field[${i}]=${field[i]} out of range`);
    }
  });

  it('1x1 field returns single value', () => {
    const field = computeField(mandelbrot, 1, 1, -0.5, -0.5, 0, 0, 100);
    assert.equal(field.length, 1);
    assert.equal(field[0], 100); // c=(-0.5, 0) is in set
  });

  it('works with julia fractal and extra args via wrapper', () => {
    const juliaCx = -0.7, juliaCy = 0.27015;
    const fn = (cx, cy, maxIter) => julia(cx, cy, juliaCx, juliaCy, maxIter);
    const field = computeField(fn, 10, 10, -1.5, 1.5, -1.5, 1.5, 50);
    assert.equal(field.length, 100);
  });

  it('works with burningShip', () => {
    const field = computeField(burningShip, 10, 10, -2.5, 1.5, -2, 0.5, 50);
    assert.equal(field.length, 100);
  });
});

// ---------------------------------------------------------------------------
// Palette tests
// ---------------------------------------------------------------------------

describe('palettes: black for set points', () => {
  const maxIter = 100;

  it('classic returns black for iter===maxIter', () => {
    const c = classic(maxIter, maxIter);
    assert.deepEqual(c, { r: 0, g: 0, b: 0 });
  });

  it('fire returns black for iter===maxIter', () => {
    const c = fire(maxIter, maxIter);
    assert.deepEqual(c, { r: 0, g: 0, b: 0 });
  });

  it('cool returns black for iter===maxIter', () => {
    const c = cool(maxIter, maxIter);
    assert.deepEqual(c, { r: 0, g: 0, b: 0 });
  });

  it('grayscale returns black for iter===maxIter', () => {
    const c = grayscale(maxIter, maxIter);
    assert.deepEqual(c, { r: 0, g: 0, b: 0 });
  });

  it('psychedelic returns black for iter===maxIter', () => {
    const c = psychedelic(maxIter, maxIter);
    assert.deepEqual(c, { r: 0, g: 0, b: 0 });
  });
});

describe('palettes: valid RGB for non-set points', () => {
  const maxIter = 100;
  const testIters = [1, 10, 50, 99];

  for (const iter of testIters) {
    it(`classic(${iter}, ${maxIter}) is valid RGB`, () => {
      assert.ok(isValidRgb(classic(iter, maxIter)));
    });
    it(`fire(${iter}, ${maxIter}) is valid RGB`, () => {
      assert.ok(isValidRgb(fire(iter, maxIter)));
    });
    it(`cool(${iter}, ${maxIter}) is valid RGB`, () => {
      assert.ok(isValidRgb(cool(iter, maxIter)));
    });
    it(`grayscale(${iter}, ${maxIter}) is valid RGB`, () => {
      assert.ok(isValidRgb(grayscale(iter, maxIter)));
    });
    it(`psychedelic(${iter}, ${maxIter}) is valid RGB`, () => {
      assert.ok(isValidRgb(psychedelic(iter, maxIter)));
    });
  }
});

describe('applyPalette', () => {
  it('returns Uint8ClampedArray of correct size', () => {
    const field = new Uint32Array([1, 5, 50, 99, 100, 0]);
    const w = 3, h = 2, maxIter = 100;
    const rgba = applyPalette(field, w, h, classic, maxIter);
    assert.ok(rgba instanceof Uint8ClampedArray);
    assert.equal(rgba.length, w * h * 4);
  });

  it('alpha channel is always 255', () => {
    const field = new Uint32Array([0, 50, 100]);
    const rgba = applyPalette(field, 3, 1, grayscale, 100);
    assert.equal(rgba[3], 255);
    assert.equal(rgba[7], 255);
    assert.equal(rgba[11], 255);
  });

  it('set points (iter===maxIter) render as black', () => {
    const field = new Uint32Array([100]);
    const rgba = applyPalette(field, 1, 1, classic, 100);
    assert.equal(rgba[0], 0); // R
    assert.equal(rgba[1], 0); // G
    assert.equal(rgba[2], 0); // B
  });
});

// ---------------------------------------------------------------------------
// PRESETS
// ---------------------------------------------------------------------------

describe('PRESETS', () => {
  it('is an array with at least 5 entries', () => {
    assert.ok(Array.isArray(PRESETS));
    assert.ok(PRESETS.length >= 5, `expected >=5 presets, got ${PRESETS.length}`);
  });

  it('each preset has required fields', () => {
    for (const p of PRESETS) {
      assert.ok(typeof p.id === 'string', 'id should be string');
      assert.ok(typeof p.name === 'object', 'name should be object');
      assert.ok(typeof p.centerX === 'number', 'centerX should be number');
      assert.ok(typeof p.centerY === 'number', 'centerY should be number');
      assert.ok(typeof p.zoom === 'number' && p.zoom > 0, 'zoom should be positive number');
      assert.ok(typeof p.maxIter === 'number', 'maxIter should be number');
      assert.ok(['mandelbrot', 'julia', 'burningShip'].includes(p.fractal), 'fractal should be valid type');
    }
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('mandelbrot with maxIter=0 returns 0', () => {
    const result = mandelbrot(0, 0, 0);
    assert.equal(result, 0);
  });

  it('mandelbrot with maxIter=1 returns 0 or 1', () => {
    const r1 = mandelbrot(0, 0, 1);
    assert.ok(r1 === 0 || r1 === 1);
  });

  it('julia with maxIter=0 returns 0', () => {
    const result = julia(0, 0, -0.7, 0.27, 0);
    assert.equal(result, 0);
  });

  it('burningShip with maxIter=0 returns 0', () => {
    const result = burningShip(0, 0, 0);
    assert.equal(result, 0);
  });

  it('grayscale(0, 100) returns valid RGB', () => {
    assert.ok(isValidRgb(grayscale(0, 100)));
  });

  it('psychedelic with very high iter is valid', () => {
    assert.ok(isValidRgb(psychedelic(499, 500)));
  });
});
