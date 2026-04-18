/**
 * app.js — Application Boot & Routing
 * QUR'AN WORLD VIEW · Aamaal
 *
 * Boot order:
 *   1. Init theme, scale, language
 *   2. Init auth listener (onAuthStateChanged)
 *   3. Wait for Firebase to resolve auth state
 *   4. Gate check:
 *      - Not logged in          → renderLogin()
 *      - Logged in, not unlocked → renderLocked()
 *      - Logged in + unlocked   → route to page
 *
 * On auth state change (login/logout), boot() re-evaluates automatically.
 *
 * RULE: No page renders until auth is confirmed.
 * RULE: All auth logic via auth.js.
 */

import { initTheme }                              from './core/theme.js';
import { setLang }                                from './core/i18n.js';
import { initScale }                              from './core/textScale.js';
import { initAuth, waitForAuth, isAamaalUnlocked,
         getUserLang }                            from './core/auth.js';
import { renderLogin, renderLocked }              from './pages/login.js';

// ── Routes ────────────────────────────────────────────────────────────────

const ROUTES = {
  '':        () => import('./pages/home.js'),
  'reflect': () => import('./pages/reflect.js'),
  'archive': () => import('./pages/archive.js'),
};

// ── Boot ──────────────────────────────────────────────────────────────────

async function boot() {
  initTheme();
  initScale();

  const appEl = document.getElementById('app');
  if (!appEl) return;

  // Show spinner while Firebase resolves
  appEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg,#0A0C10);">
      <div class="loading-spinner"></div>
    </div>`;

  // Start auth listener — on login/logout, re-evaluate the gate
  initAuth(
    (user, profile) => {
      // User just logged in — set lang from profile, then re-evaluate
      const lang = profile?.language || localStorage.getItem('qwv_lang') || 'en';
      setLang(lang);
      _evaluateGate(appEl);
    },
    () => {
      // User just logged out — show login screen
      setLang(localStorage.getItem('qwv_lang') || 'en');
      renderLogin(appEl);
    }
  );

  // Wait for the initial auth state resolution
  await waitForAuth();

  // Apply saved language before first render
  setLang(getUserLang());

  // Evaluate and render the correct view
  _evaluateGate(appEl);
}

// ── Gate evaluation ───────────────────────────────────────────────────────

function _evaluateGate(appEl) {
  import('./core/auth.js').then(({ isLoggedIn, isAamaalUnlocked }) => {
    if (!isLoggedIn()) {
      renderLogin(appEl);
    } else if (!isAamaalUnlocked()) {
      renderLocked(appEl);
    } else {
      // Unlocked — wire up routing and render current hash
      window.removeEventListener('hashchange', handleRoute);
      window.addEventListener('hashchange', handleRoute);
      handleRoute();
    }
  });
}

// ── Routing ───────────────────────────────────────────────────────────────

async function handleRoute() {
  const hash   = window.location.hash.replace('#/', '').replace('#', '').trim();
  const route  = hash || '';
  const loader = ROUTES[route] || ROUTES[''];
  const appEl  = document.getElementById('app');
  if (!appEl) return;

  appEl.innerHTML = '<div class="app-loading"><div class="loading-spinner"></div></div>';

  try {
    const module = await loader();
    if (typeof module.render === 'function') {
      appEl.innerHTML = '';
      await module.render(appEl);
    }
  } catch (e) {
    console.error('[app] Route error:', e);
    appEl.innerHTML = `
      <div style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;text-align:center;">
        <div style="font-size:2rem">⚠️</div>
        <p style="color:var(--text-muted)">Something went wrong.</p>
        <button class="btn btn-secondary" onclick="location.reload()">Retry</button>
      </div>`;
  }
}

// ── Navigate (used by page files) ─────────────────────────────────────────

export function navigate(route) {
  window.location.hash = route ? `#/${route}` : '#/';
}

// ── Start ─────────────────────────────────────────────────────────────────

boot();

