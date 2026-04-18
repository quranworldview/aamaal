/**
 * textScale.js — Text Size Scaling
 * QUR'AN WORLD VIEW · Aamaal
 *
 * Six sizes: xs / sm / md (default) / lg / xl / 2xl
 * Stored in localStorage as 'qwv_text_scale'
 * Applied via data-scale attribute on <html>
 * CSS multipliers defined in design.css
 */

const SCALE_KEY    = 'qwv_text_scale';
const VALID_SCALES = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
const DEFAULT      = 'md';

export function getScale() {
  return localStorage.getItem(SCALE_KEY) || DEFAULT;
}

export function setScale(scale) {
  if (!VALID_SCALES.includes(scale)) return;
  localStorage.setItem(SCALE_KEY, scale);
  document.documentElement.setAttribute('data-scale', scale);
}

export function initScale() {
  setScale(getScale());
}

export function cycleScale() {
  const idx  = VALID_SCALES.indexOf(getScale());
  const next = VALID_SCALES[(idx + 1) % VALID_SCALES.length];
  setScale(next);
  return next;
}

export { VALID_SCALES };
