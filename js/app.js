/**
 * app.js — Application Boot & Routing
 * QUR'AN WORLD VIEW · Aamaal
 *
 * Responsibilities:
 * - Initialise theme and auth on load
 * - Listen to hash-based routing (#/, #/reflect, #/archive)
 * - Gate check: redirect to QWV Dashboard if Aamaal is locked
 * - Apply Ramadan season theme if current month is Ramadan
 * - Render the correct page module into #app
 *
 * Routing: hash-based (#/route) — works on Cloudflare Pages without _redirects config
 */

import { initTheme, activateRamadanTheme, deactivateRamadanTheme } from './core/theme.js';
import { initAuth, waitForAuth, isLoggedIn, isAamaalUnlocked, getUserLang } from './core/auth.js';
import { setLang } from './core/i18n.js';
import { getCalendarState } from './services/calendar.js';

// ─────────────────────────────────────────────
// ROUTES
// All routes are auth-gated — no guest access in Aamaal
// ─────────────────────────────────────────────

const ROUTES = {
  '':         () => import('./pages/home.js'),
  'reflect':  () => import('./pages/reflect.js'),
  'archive':  () => import('./pages/archive.js'),
};

// QWV Dashboard URL — redirect here if not logged in or gate locked
const DASHBOARD_URL = '/';

// ─────────────────────────────────────────────
// BOOT
// ─────────────────────────────────────────────

async function boot() {
  // 1. Theme — apply before anything renders (prevents flash)
  initTheme();

  // 2. Show loading state
  showLoading();

  // 3. Init auth listener
  initAuth(
    (user, profile) => {
      // Apply user's language preference
      const lang = profile?.language || localStorage.getItem('qwv_lang') || 'en';
      setLang(lang);
    },
    () => {
      // Logged out — redirect to dashboard/login
      window.location.href = DASHBOARD_URL;
    }
  );

  // 4. Wait for auth to resolve before rendering anything
  const user = await waitForAuth();

  // 5. Not logged in — send to dashboard
  if (!user) {
    window.location.href = DASHBOARD_URL;
    return;
  }

  // 6. Gate check — Aamaal must be unlocked
  if (!isAamaalUnlocked()) {
    renderGateLocked();
    return;
  }

  // 7. Calendar state — check if Ramadan is active
  try {
    const calState = await getCalendarState();
    if (calState.isRamadan) {
      activateRamadanTheme();
    } else {
      deactivateRamadanTheme();
    }
    // Store on window for other modules to read without re-fetching
    window.__aamaalCalendar = calState;
  } catch (e) {
    console.warn('[app] Calendar state unavailable:', e.message);
    window.__aamaalCalendar = null;
  }

  // 8. Start routing
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}

// ─────────────────────────────────────────────
// ROUTING
// ─────────────────────────────────────────────

async function handleRoute() {
  const hash    = window.location.hash.replace('#/', '').replace('#', '').trim();
  const route   = hash || '';
  const loader  = ROUTES[route];

  if (!loader) {
    // Unknown route → home
    navigate('');
    return;
  }

  showLoading();

  try {
    const module = await loader();
    const appEl  = document.getElementById('app');
    if (appEl && typeof module.render === 'function') {
      appEl.innerHTML = '';
      await module.render(appEl);
    }
  } catch (e) {
    console.error('[app] Route render failed:', e);
    showError();
  }
}

/** Navigate to a route by name. */
export function navigate(route) {
  window.location.hash = route ? `#/${route}` : '#/';
}

// ─────────────────────────────────────────────
// GATE LOCKED SCREEN
// ─────────────────────────────────────────────

function renderGateLocked() {
  // Import t() inline to avoid circular dependency risk at boot
  import('./core/i18n.js').then(({ t }) => {
    const appEl = document.getElementById('app');
    if (!appEl) return;
    appEl.innerHTML = `
      <div class="gate-locked-screen">
        <div class="gate-locked-card">
          <div class="gate-icon">🔒</div>
          <h2 class="gate-title">${t('not_unlocked_title')}</h2>
          <p class="gate-body">${t('not_unlocked_body')}</p>
          <a href="${DASHBOARD_URL}" class="btn btn-primary">
            ${t('go_to_dashboard')}
          </a>
        </div>
      </div>
    `;
  });
}

// ─────────────────────────────────────────────
// LOADING & ERROR STATES
// ─────────────────────────────────────────────

function showLoading() {
  const appEl = document.getElementById('app');
  if (!appEl) return;
  appEl.innerHTML = `
    <div class="app-loading">
      <div class="loading-spinner"></div>
    </div>
  `;
}

function showError() {
  import('./core/i18n.js').then(({ t }) => {
    const appEl = document.getElementById('app');
    if (!appEl) return;
    appEl.innerHTML = `
      <div class="app-error">
        <p>${t('error_generic')}</p>
        <button onclick="window.location.reload()" class="btn btn-secondary">
          ${t('retry')}
        </button>
      </div>
    `;
  });
}

// ─────────────────────────────────────────────
// START
// ─────────────────────────────────────────────

boot();
