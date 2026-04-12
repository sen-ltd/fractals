/**
 * i18n.js — Japanese / English translations
 */

export const translations = {
  ja: {
    title: 'フラクタル可視化',
    fractalType: 'フラクタルタイプ',
    mandelbrot: 'マンデルブロ集合',
    julia: 'ジュリア集合',
    burningShip: 'バーニングシップ',
    juliaC: 'ジュリア定数 c',
    palette: 'カラーパレット',
    classic: 'クラシック虹',
    fire: 'ファイア',
    cool: 'クールブルー',
    grayscale: 'グレースケール',
    psychedelic: 'サイケデリック',
    maxIterations: '最大反復回数',
    presets: 'プリセット',
    resetView: 'ビューをリセット',
    exportPng: 'PNG エクスポート',
    coordinates: '座標',
    center: '中心',
    zoom: 'ズーム',
    loading: 'レンダリング中...',
    lang: 'EN',
    helpZoom: 'スクロールでズーム / ドラッグでパン / クリック+ドラッグで選択',
  },
  en: {
    title: 'Fractal Visualizer',
    fractalType: 'Fractal Type',
    mandelbrot: 'Mandelbrot Set',
    julia: 'Julia Set',
    burningShip: 'Burning Ship',
    juliaC: 'Julia constant c',
    palette: 'Color Palette',
    classic: 'Classic Rainbow',
    fire: 'Fire',
    cool: 'Cool Blue',
    grayscale: 'Grayscale',
    psychedelic: 'Psychedelic',
    maxIterations: 'Max Iterations',
    presets: 'Presets',
    resetView: 'Reset View',
    exportPng: 'Export PNG',
    coordinates: 'Coordinates',
    center: 'Center',
    zoom: 'Zoom',
    loading: 'Rendering...',
    lang: '日本語',
    helpZoom: 'Scroll to zoom / Drag to pan / Click+drag to select',
  },
};

let currentLang = 'en';

export function getLang() {
  return currentLang;
}

export function setLang(lang) {
  if (translations[lang]) currentLang = lang;
}

export function t(key) {
  return translations[currentLang][key] ?? key;
}

export function toggleLang() {
  currentLang = currentLang === 'ja' ? 'en' : 'ja';
  return currentLang;
}
