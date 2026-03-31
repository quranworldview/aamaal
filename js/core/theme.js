/**
 * theme.js — Theme Management
 * QUR'AN WORLD VIEW · Aamaal
 *
 * Two independent layers:
 *
 * Layer 1 — User preference: Dark / Light / System (three-way toggle)
 *   Stored in localStorage as 'qwv_theme'
 *   Applied via data-theme="dark" | "light" on <html>
 *
 * Layer 2 — Season: Normal / Ramadan
 *   Activated when aamaal_months/{key}.is_ramadan === true
 *   Applied via data-season="ramadan" on <html>
 *   Removed on Eid (when Ramadan month ends)
 *   Never stored in localStorage — always derived from live calendar state
 *
 * RULE: This is the only file that reads/writes theme state.
 *       No other file touches data-theme or data-season on <html>.
 */

const THEME_KEY     = 'qwv_theme';
const VALID_THEMES  = ['dark', 'light', 'system'];

// ─────────────────────────────────────────────
// LAYER 1 — USER THEME PREFERENCE
// ─────────────────────────────────────────────

/** Initialise theme on app boot. Call this once from app.js. */
export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || 'system';
  applyTheme(saved);
  // Watch system preference changes when in 'system' mode
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (getTheme() === 'system') applyTheme('system');
    });
}

/** Returns the stored theme preference: 'dark' | 'light' | 'system' */
export function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'system';
}

/** Sets and applies a theme preference. */
export function setTheme(theme) {
  if (!VALID_THEMES.includes(theme)) return;
  localStorage.setItem(THEME_KEY, theme);
  applyTheme(theme);
}

/** Cycles through Dark → Light → System → Dark */
export function cycleTheme() {
  const current = getTheme();
  const next = current === 'dark'   ? 'light'
             : current === 'light'  ? 'system'
             : 'dark';
  setTheme(next);
  return next;
}

/** Resolves 'system' to the actual applied value for display purposes. */
export function getResolvedTheme() {
  const pref = getTheme();
  if (pref !== 'system') return pref;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.setAttribute('data-theme', resolved);
}

// ─────────────────────────────────────────────
// LAYER 2 — RAMADAN SEASON THEME
// ─────────────────────────────────────────────

/**
 * Activates the Ramadan theme layer.
 * Called by app.js when calendar state confirms is_ramadan === true.
 * Changes: deeper backgrounds, more luminous gold, warm border glow.
 * See Aamaal Architecture v1.3 Section 1 for the full CSS variable set.
 */
export function activateRamadanTheme() {
  document.documentElement.setAttribute('data-season', 'ramadan');
}

/**
 * Removes the Ramadan theme layer.
 * Called by app.js when Sha'ban → Shawwal transition is detected.
 */
export function deactivateRamadanTheme() {
  document.documentElement.removeAttribute('data-season');
}

/** Returns true if the Ramadan season theme is currently active. */
export function isRamadanTheme() {
  return document.documentElement.getAttribute('data-season') === 'ramadan';
}
