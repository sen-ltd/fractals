/**
 * main.js — DOM setup, canvas events, rendering pipeline
 */

import { mandelbrot, julia, burningShip, computeField, PRESETS } from './fractals.js';
import { classic, fire, cool, grayscale, psychedelic, applyPalette } from './palette.js';
import { t, toggleLang, getLang } from './i18n.js';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state = {
  fractal: 'mandelbrot',
  palette: 'classic',
  maxIter: 100,
  centerX: -0.5,
  centerY: 0,
  zoom: 1,        // fractal units per half-height
  juliaC: { x: -0.7, y: 0.27015 },
  renderToken: 0, // incremented on each render request to cancel stale ones
};

// ---------------------------------------------------------------------------
// Palette map
// ---------------------------------------------------------------------------

const PALETTES = { classic, fire, cool, grayscale, psychedelic };

// ---------------------------------------------------------------------------
// DOM references
// ---------------------------------------------------------------------------

let canvas, ctx, sidebar;
let selectFractal, selectPalette, sliderIter, labelIter;
let inputJuliaCx, inputJuliaCy, juliaCRow;
let btnReset, btnExport, btnLang;
let coordCenter, coordZoom;
let loadingOverlay;
let presetsContainer;

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

export function init() {
  canvas = document.getElementById('canvas');
  ctx = canvas.getContext('2d');
  sidebar = document.getElementById('sidebar');

  selectFractal = document.getElementById('select-fractal');
  selectPalette = document.getElementById('select-palette');
  sliderIter = document.getElementById('slider-iter');
  labelIter = document.getElementById('label-iter');
  inputJuliaCx = document.getElementById('julia-cx');
  inputJuliaCy = document.getElementById('julia-cy');
  juliaCRow = document.getElementById('julia-c-row');

  btnReset = document.getElementById('btn-reset');
  btnExport = document.getElementById('btn-export');
  btnLang = document.getElementById('btn-lang');

  coordCenter = document.getElementById('coord-center');
  coordZoom = document.getElementById('coord-zoom');
  loadingOverlay = document.getElementById('loading');
  presetsContainer = document.getElementById('presets');

  setupEvents();
  setupPresets();
  updateI18n();
  resize();
  scheduleRender();
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

function setupEvents() {
  window.addEventListener('resize', () => { resize(); scheduleRender(); });

  selectFractal.addEventListener('change', () => {
    state.fractal = selectFractal.value;
    juliaCRow.style.display = state.fractal === 'julia' ? 'flex' : 'none';
    scheduleRender();
  });

  selectPalette.addEventListener('change', () => {
    state.palette = selectPalette.value;
    scheduleRender();
  });

  sliderIter.addEventListener('input', () => {
    state.maxIter = parseInt(sliderIter.value, 10);
    labelIter.textContent = state.maxIter;
    scheduleRender();
  });

  inputJuliaCx.addEventListener('input', () => {
    const v = parseFloat(inputJuliaCx.value);
    if (!isNaN(v)) { state.juliaC.x = v; scheduleRender(); }
  });

  inputJuliaCy.addEventListener('input', () => {
    const v = parseFloat(inputJuliaCy.value);
    if (!isNaN(v)) { state.juliaC.y = v; scheduleRender(); }
  });

  btnReset.addEventListener('click', () => {
    state.centerX = -0.5;
    state.centerY = 0;
    state.zoom = 1;
    scheduleRender();
  });

  btnExport.addEventListener('click', exportPng);

  btnLang.addEventListener('click', () => {
    toggleLang();
    updateI18n();
  });

  setupCanvasEvents();
}

// ---------------------------------------------------------------------------
// Canvas interaction: zoom + pan
// ---------------------------------------------------------------------------

let dragStart = null;
let dragMode = null; // 'pan' | 'select'
let selectionRect = null;

function setupCanvasEvents() {
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseleave', onMouseUp);

  // Touch support
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);
}

function onWheel(e) {
  e.preventDefault();
  const factor = e.deltaY > 0 ? 1.3 : 1 / 1.3;
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;

  // Keep the point under cursor fixed
  const fx = pixelToFractalX(px);
  const fy = pixelToFractalY(py);
  state.zoom /= factor;
  // Adjust center so fx/fy stays under cursor
  state.centerX = fx - (px / canvas.width - 0.5) * viewWidth();
  state.centerY = fy - (py / canvas.height - 0.5) * viewHeight();

  updateCoords();
  scheduleRender();
}

function onMouseDown(e) {
  dragStart = { x: e.clientX, y: e.clientY };
  dragMode = e.shiftKey ? 'select' : 'pan';
  selectionRect = null;
}

function onMouseMove(e) {
  if (!dragStart) return;
  const dx = e.clientX - dragStart.x;
  const dy = e.clientY - dragStart.y;

  if (dragMode === 'pan') {
    const scaleX = viewWidth() / canvas.width;
    const scaleY = viewHeight() / canvas.height;
    state.centerX -= dx * scaleX;
    state.centerY -= dy * scaleY;
    dragStart = { x: e.clientX, y: e.clientY };
    updateCoords();
    scheduleRender();
  } else if (dragMode === 'select') {
    const rect = canvas.getBoundingClientRect();
    selectionRect = {
      x: Math.min(dragStart.x, e.clientX) - rect.left,
      y: Math.min(dragStart.y, e.clientY) - rect.top,
      w: Math.abs(dx),
      h: Math.abs(dy),
    };
    drawSelectionRect();
  }
}

function onMouseUp(e) {
  if (!dragStart) return;
  if (dragMode === 'select' && selectionRect && selectionRect.w > 5 && selectionRect.h > 5) {
    zoomToSelection(selectionRect);
  }
  dragStart = null;
  dragMode = null;
  selectionRect = null;
}

// Touch: single-finger pan, two-finger pinch
let lastTouches = null;

function onTouchStart(e) {
  e.preventDefault();
  lastTouches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
}

function onTouchMove(e) {
  e.preventDefault();
  const touches = Array.from(e.touches).map(t => ({ x: t.clientX, y: t.clientY }));
  if (touches.length === 1 && lastTouches.length === 1) {
    const dx = touches[0].x - lastTouches[0].x;
    const dy = touches[0].y - lastTouches[0].y;
    const scaleX = viewWidth() / canvas.width;
    const scaleY = viewHeight() / canvas.height;
    state.centerX -= dx * scaleX;
    state.centerY -= dy * scaleY;
    updateCoords();
    scheduleRender();
  } else if (touches.length === 2 && lastTouches.length === 2) {
    const d0 = dist(lastTouches[0], lastTouches[1]);
    const d1 = dist(touches[0], touches[1]);
    if (d0 > 0) {
      const factor = d0 / d1;
      state.zoom /= factor;
      updateCoords();
      scheduleRender();
    }
  }
  lastTouches = touches;
}

function onTouchEnd() {
  lastTouches = null;
}

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function zoomToSelection(sel) {
  const cx = pixelToFractalX(sel.x + sel.w / 2);
  const cy = pixelToFractalY(sel.y + sel.h / 2);
  const wFrac = sel.w / canvas.width * viewWidth();
  const hFrac = sel.h / canvas.height * viewHeight();
  const aspect = canvas.width / canvas.height;
  // Maintain aspect ratio by using the tighter constraint
  const newHalfH = Math.min(wFrac / aspect, hFrac) / 2;
  state.centerX = cx;
  state.centerY = cy;
  state.zoom = newHalfH;
  updateCoords();
  scheduleRender();
}

// ---------------------------------------------------------------------------
// Coordinate helpers
// ---------------------------------------------------------------------------

function viewHeight() {
  return state.zoom * 2;
}

function viewWidth() {
  return viewHeight() * (canvas.width / canvas.height);
}

function pixelToFractalX(px) {
  return state.centerX + (px / canvas.width - 0.5) * viewWidth();
}

function pixelToFractalY(py) {
  return state.centerY + (py / canvas.height - 0.5) * viewHeight();
}

function updateCoords() {
  coordCenter.textContent = `(${state.centerX.toFixed(6)}, ${state.centerY.toFixed(6)})`;
  coordZoom.textContent = (1 / state.zoom).toExponential(3);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

let renderScheduled = false;

function scheduleRender() {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;
    render();
  });
}

async function render() {
  const token = ++state.renderToken;
  loadingOverlay.style.display = 'flex';

  const w = canvas.width;
  const h = canvas.height;
  const xMin = state.centerX - viewWidth() / 2;
  const xMax = state.centerX + viewWidth() / 2;
  const yMin = state.centerY - viewHeight() / 2;
  const yMax = state.centerY + viewHeight() / 2;

  // --- Pass 1: low-res preview (1/4 scale) ---
  const scaleDown = 4;
  const lw = Math.ceil(w / scaleDown);
  const lh = Math.ceil(h / scaleDown);
  const lowField = computeField(
    getFractalFn(), lw, lh, xMin, xMax, yMin, yMax, Math.min(state.maxIter, 50),
    ...getExtraArgs()
  );
  if (token !== state.renderToken) return;
  const lowRgba = applyPalette(lowField, lw, lh, PALETTES[state.palette], Math.min(state.maxIter, 50));
  const lowImgData = new ImageData(lowRgba, lw, lh);

  // Draw upscaled preview
  const offscreen = new OffscreenCanvas(lw, lh);
  const offCtx = offscreen.getContext('2d');
  offCtx.putImageData(lowImgData, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(offscreen, 0, 0, w, h);
  ctx.restore();

  // --- Pass 2: full resolution (chunked for responsiveness) ---
  const chunkH = 64;
  const fullRgba = new Uint8ClampedArray(w * h * 4);

  for (let startY = 0; startY < h; startY += chunkH) {
    if (token !== state.renderToken) return; // cancelled

    const endY = Math.min(startY + chunkH, h);
    const stripH = endY - startY;
    const stripYMin = yMin + (startY / h) * (yMax - yMin);
    const stripYMax = yMin + (endY / h) * (yMax - yMin);

    const stripField = computeField(
      getFractalFn(), w, stripH, xMin, xMax, stripYMin, stripYMax, state.maxIter,
      ...getExtraArgs()
    );
    const stripRgba = applyPalette(stripField, w, stripH, PALETTES[state.palette], state.maxIter);

    // Copy strip into fullRgba
    fullRgba.set(stripRgba, startY * w * 4);

    // Blit the strip
    const stripImgData = new ImageData(stripRgba, w, stripH);
    ctx.putImageData(stripImgData, 0, startY);

    // Yield to browser event loop
    await yieldToMain();
  }

  if (token !== state.renderToken) return;
  loadingOverlay.style.display = 'none';
  updateCoords();
}

function yieldToMain() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

function getFractalFn() {
  switch (state.fractal) {
    case 'julia': return (cx, cy, maxIter) => julia(cx, cy, state.juliaC.x, state.juliaC.y, maxIter);
    case 'burningShip': return burningShip;
    default: return mandelbrot;
  }
}

function getExtraArgs() {
  return [];
}

// ---------------------------------------------------------------------------
// Selection rectangle overlay
// ---------------------------------------------------------------------------

function drawSelectionRect() {
  scheduleRender(); // re-render base, then overlay
  if (!selectionRect) return;
  requestAnimationFrame(() => {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.fillRect(selectionRect.x, selectionRect.y, selectionRect.w, selectionRect.h);
    ctx.restore();
  });
}

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

function setupPresets() {
  presetsContainer.innerHTML = '';
  PRESETS.forEach(preset => {
    const btn = document.createElement('button');
    btn.className = 'preset-btn';
    btn.dataset.presetId = preset.id;
    btn.textContent = preset.name[getLang()] ?? preset.name.en;
    btn.addEventListener('click', () => applyPreset(preset));
    presetsContainer.appendChild(btn);
  });
}

function applyPreset(preset) {
  state.fractal = preset.fractal;
  state.centerX = preset.centerX;
  state.centerY = preset.centerY;
  state.zoom = 1 / preset.zoom;
  state.maxIter = preset.maxIter;
  if (preset.juliaC) {
    state.juliaC = { x: preset.juliaC.x, y: preset.juliaC.y };
    inputJuliaCx.value = state.juliaC.x;
    inputJuliaCy.value = state.juliaC.y;
  }

  // Sync controls
  selectFractal.value = state.fractal;
  sliderIter.value = state.maxIter;
  labelIter.textContent = state.maxIter;
  juliaCRow.style.display = state.fractal === 'julia' ? 'flex' : 'none';

  scheduleRender();
}

// ---------------------------------------------------------------------------
// Export PNG
// ---------------------------------------------------------------------------

function exportPng() {
  const link = document.createElement('a');
  link.download = `fractal-${state.fractal}-${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------

function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}

// ---------------------------------------------------------------------------
// i18n
// ---------------------------------------------------------------------------

function updateI18n() {
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  // Update preset button labels
  presetsContainer.querySelectorAll('.preset-btn').forEach(btn => {
    const preset = PRESETS.find(p => p.id === btn.dataset.presetId);
    if (preset) btn.textContent = preset.name[getLang()] ?? preset.name.en;
  });
  btnLang.textContent = t('lang');
}
