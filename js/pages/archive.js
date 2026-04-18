/**
 * archive.js — Past Months Archive Screen
 * QUR'AN WORLD VIEW · Aamaal
 * MILESTONE 3: Live Firestore reads — all mock data removed
 *
 * Data flow:
 *   1. Read aamaal_progress/{uid}/months/ subcollection → all months student engaged
 *   2. For each month, enrich from aamaal_months/{monthKey} → theme, total_days, etc.
 *   3. On expand: read aamaal_reflections/{uid}/entries/ filtered by month_key
 *
 * Layout:
 *   - Page header with total stats
 *   - Month cards (one per month engaged)
 *   - Tap month → expanded dot view + reflections
 */

import { t, getLang }            from '../core/i18n.js';
import { getResolvedTheme }       from '../core/theme.js';
import { db, auth, COLLECTIONS } from '../core/firebase.js';

// ── Built-in month meta fallback ──────────────────────────────────────────
// Used when aamaal_months/{monthKey} doc doesn't exist in Firestore yet
const MONTH_META_MAP = {
  'shawwal':         { theme: { en: 'Consistency',        hi: 'निरंतरता',         ur: 'استقامت'       }, theme_arabic: 'اسْتِقَامَة', month_number: 1  },
  'dhul-qadah':      { theme: { en: 'Contentment',        hi: 'क़नाअत',           ur: 'قناعت'         }, theme_arabic: 'قَنَاعَة',    month_number: 2  },
  'dhul-hijjah':     { theme: { en: 'Sacrifice',          hi: 'क़ुर्बानी',        ur: 'قربانی'        }, theme_arabic: 'أُضْحِيَة',  month_number: 3  },
  'muharram':        { theme: { en: 'Tawbah — Return',    hi: 'तौबह — वापसी',    ur: 'توبہ — واپسی' }, theme_arabic: 'تَوْبَة',     month_number: 4  },
  'safar':           { theme: { en: 'Tawakkul',           hi: 'तवक्कुल',          ur: 'توکل'          }, theme_arabic: 'تَوَكُّل',    month_number: 5  },
  'rabi-al-awwal':   { theme: { en: "Love of Prophet ﷺ", hi: 'नबी ﷺ की मोहब्बत', ur: 'محبت نبی ﷺ'  }, theme_arabic: 'مَحَبَّة',    month_number: 6  },
  'rabi-al-thani':   { theme: { en: 'Sabr',               hi: 'सब्र',              ur: 'صبر'           }, theme_arabic: 'صَبْر',        month_number: 7  },
  'jumada-al-ula':   { theme: { en: 'Ikhlas',             hi: 'इख़लास',           ur: 'اخلاص'         }, theme_arabic: 'إخْلَاص',     month_number: 8  },
  'jumada-al-thani': { theme: { en: 'Family',             hi: 'परिवार',           ur: 'خاندان'        }, theme_arabic: 'أُسْرَة',     month_number: 9  },
  'rajab':           { theme: { en: 'Dhikr',              hi: 'ज़िक्र',           ur: 'ذکر'           }, theme_arabic: 'ذِكْر',        month_number: 10 },
  'shaban':          { theme: { en: 'Preparation',        hi: 'तैयारी',           ur: 'تیاری'         }, theme_arabic: 'تَهَيُّؤ',    month_number: 11 },
  'ramadan':         { theme: { en: 'Ibadah',             hi: 'इबादत',            ur: 'عبادت'         }, theme_arabic: 'عِبَادَة',    month_number: 12 },
};

// ── State ─────────────────────────────────────────────────────────────────
let _archiveData   = [];
let _reflections   = {};   // cache: { [monthKey]: [{ day, text, date }] }
let _expandedMonth = null;
let _loadError     = null;

// ── Entry ─────────────────────────────────────────────────────────────────
export async function render(container) {
  _expandedMonth = null;
  _reflections   = {};
  _loadError     = null;

  container.innerHTML = `<div class="aamaal-root" style="min-height:100vh;display:flex;align-items:center;justify-content:center;"><div class="loading-spinner"></div></div>`;

  try {
    _archiveData = await _loadArchiveData();
  } catch (err) {
    console.error('[archive] Load failed:', err);
    _loadError = err.message;
  }

  container.innerHTML = buildHTML();
  attachListeners(container);
  injectArchiveStyles();
}

// ── Data loading ──────────────────────────────────────────────────────────

async function _loadArchiveData() {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];

  // Read all month progress docs for this student, newest first
  const monthsSnap = await db.collection(COLLECTIONS.AAMAAL_PROGRESS).doc(uid)
    .collection('months')
    .orderBy('last_active', 'desc')
    .get();

  if (monthsSnap.empty) return [];

  const monthKeys = monthsSnap.docs.map(d => d.id);

  // Fetch aamaal_months metadata in parallel for theme/total_days/status
  const metaSnaps = await Promise.all(
    monthKeys.map(key => db.collection(COLLECTIONS.AAMAAL_MONTHS).doc(key).get())
  );

  const metaMap = {};
  metaSnaps.forEach((snap, i) => {
    if (snap.exists) metaMap[monthKeys[i]] = snap.data();
  });

  return monthsSnap.docs.map(doc => {
    const progressData  = doc.data();
    const monthKey      = doc.id;
    const firestoreMeta = metaMap[monthKey] || {};
    const builtinMeta   = MONTH_META_MAP[monthKey] || {};

    const totalDays = firestoreMeta.total_days || 30;
    const isRamadan = firestoreMeta.is_ramadan || monthKey === 'ramadan';
    const maxPoints = totalDays * (isRamadan ? 60 : 20);
    const days      = progressData.days || {};
    const daysDone  = Object.values(days).filter(d => d.task_done).length;

    return {
      month_key:    monthKey,
      month_number: firestoreMeta.month_number || builtinMeta.month_number || 0,
      theme:        firestoreMeta.theme        || builtinMeta.theme        || { en: monthKey },
      theme_arabic: firestoreMeta.theme_arabic || builtinMeta.theme_arabic || '',
      total_days:   totalDays,
      days_done:    daysDone,
      total_points: progressData.total_points  || 0,
      max_points:   maxPoints,
      gems:         progressData.total_gems    || 0,
      status:       firestoreMeta.status       || 'complete',
      days,
    };
  });
}

async function _loadReflectionsForMonth(monthKey) {
  const uid = auth.currentUser?.uid;
  if (!uid) return [];
  try {
    const snap = await db.collection('aamaal_reflections').doc(uid)
      .collection('entries')
      .where('month_key', '==', monthKey)
      .orderBy('day', 'asc')
      .get();
    return snap.docs.map(doc => {
      const d = doc.data();
      return { day: d.day, text: d.text, date: doc.id };
    });
  } catch (err) {
    console.error('[archive] Reflections load failed:', err);
    return [];
  }
}

// ── HTML ──────────────────────────────────────────────────────────────────
function buildHTML() {
  const lang    = getLang();
  const isDark  = getResolvedTheme() === 'dark';
  const dir     = lang === 'ur' ? 'dir="rtl"' : '';
  const logoSrc = isDark ? 'icons/logo-dark.png' : 'icons/logo-light.png';

  if (_loadError) {
    return `
    <div class="aamaal-root" ${dir}>
      ${buildNav(logoSrc, lang)}
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;min-height:60vh;padding:24px;text-align:center;">
        <div style="font-size:2rem">⚠️</div>
        <p style="color:var(--text-muted)">${lang==='ur'?'کچھ غلط ہو گیا۔':lang==='hi'?'कुछ ग़लत हो गया।':'Something went wrong.'}</p>
        <button class="btn btn-secondary" onclick="location.reload()">Retry</button>
      </div>
      ${buildBottomNav()}
    </div>`;
  }

  // Aggregate totals across all months
  const totalGems   = _archiveData.reduce((s, m) => s + m.gems, 0);
  const totalPoints = _archiveData.reduce((s, m) => s + m.total_points, 0);

  return `
  <div class="aamaal-root" ${dir}>

    ${buildNav(logoSrc, lang)}

    <!-- ── Page header ───────────────────────────────────────────────── -->
    <div class="archive-header fade-in">
      <h1 class="archive-title">${t('archive_title')}</h1>
      <div class="archive-totals">
        <div class="archive-total-item">
          <span class="archive-total-value">${_archiveData.length}</span>
          <span class="archive-total-label">
            ${lang==='ur' ? 'مہینے' : lang==='hi' ? 'महीने' : 'Months'}
          </span>
        </div>
        <div class="archive-total-divider"></div>
        <div class="archive-total-item">
          <span class="archive-total-value">${totalGems}</span>
          <span class="archive-total-label">${t('gems_label')}</span>
        </div>
        <div class="archive-total-divider"></div>
        <div class="archive-total-item">
          <span class="archive-total-value">${totalPoints}</span>
          <span class="archive-total-label">${t('points_label')}</span>
        </div>
      </div>
    </div>

    <!-- ── Month cards ───────────────────────────────────────────────── -->
    <div class="archive-months fade-up delay-1">
      ${_archiveData.length === 0
        ? `<div class="archive-empty">${t('archive_empty')}</div>`
        : _archiveData.map(m => buildMonthCard(m, lang)).join('')
      }
    </div>

  </div>
  ${buildBottomNav()}`;
}

// ── Month card ────────────────────────────────────────────────────────────
function buildMonthCard(month, lang) {
  const pct      = Math.round((month.total_points / month.max_points) * 100);
  const isExpanded = _expandedMonth === month.month_key;
  const isActive   = month.status === 'active';
  const dir        = lang === 'ur' ? 'dir="rtl"' : '';

  return `
  <div class="archive-month-card ${isExpanded ? 'expanded' : ''} ${isActive ? 'active-month' : ''}"
       data-month="${month.month_key}">

    <!-- Card header — always visible, tap to expand -->
    <div class="archive-card-header" data-toggle="${month.month_key}">
      <div class="archive-card-left">
        <div class="archive-card-arabic" lang="ar">${month.theme_arabic}</div>
        <div class="archive-card-name">
          ${month.month_key.charAt(0).toUpperCase() + month.month_key.slice(1).replace('-', ' ')}
          ${isActive ? `<span class="archive-active-badge">${lang==='ur' ? 'جاری' : lang==='hi' ? 'जारी' : 'Active'}</span>` : ''}
        </div>
        <div class="archive-card-theme" ${dir}>${month.theme[lang] || month.theme.en}</div>
      </div>
      <div class="archive-card-right">
        <div class="archive-card-pct">${pct}%</div>
        <div class="archive-card-gems">💎 ${month.gems}</div>
        <div class="archive-expand-icon">${isExpanded ? '▲' : '▼'}</div>
      </div>
    </div>

    <!-- Progress bar -->
    <div class="archive-progress-bar">
      <div class="archive-progress-fill" style="width:${pct}%"></div>
    </div>

    <!-- Expanded content -->
    ${isExpanded ? buildMonthDetail(month, lang) : ''}

  </div>`;
}

// ── Month detail (expanded) ───────────────────────────────────────────────
function buildMonthDetail(month, lang) {
  const dir         = lang === 'ur' ? 'dir="rtl"' : '';
  const reflections = _reflections[month.month_key] || [];

  // Build dots array from Firestore days map
  const dotDays = [];
  for (let i = 1; i <= month.total_days; i++) {
    const entry = month.days[String(i)];
    if (!entry || !entry.task_done) {
      dotDays.push('missed');
    } else if (entry.task_done && entry.reflected) {
      dotDays.push('full');
    } else {
      dotDays.push('partial');
    }
  }

  return `
  <div class="archive-detail" ${dir}>

    <!-- Dot calendar -->
    <div class="archive-dot-section">
      <div class="archive-dot-label">
        ${lang==='ur' ? 'مہینے کی تصویر' : lang==='hi' ? 'महीने की तस्वीर' : 'Month at a Glance'}
      </div>
      <div class="archive-dots">
        ${dotDays.map((day, i) => {
          const dayNum     = i + 1;
          const reflection = reflections.find(r => r.day === dayNum);
          const cls = day==='full' ? 'dot-full' : day==='partial' ? 'dot-partial' : 'dot-missed';
          return `<div class="archive-dot ${cls} ${reflection?'dot-has-reflection':''}"
                       data-day="${dayNum}"
                       data-month="${month.month_key}"
                       title="Day ${dayNum}${reflection?' · Reflection written':''}">
            ${reflection ? '<span class="dot-gem">💎</span>' : ''}
          </div>`;
        }).join('')}
      </div>
      <div class="archive-dot-legend">
        <span class="dot-legend-item"><span class="dot-full archive-dot-sm"></span> ${lang==='hi'?'पूरा':lang==='ur'?'مکمل':'Full'}</span>
        <span class="dot-legend-item"><span class="dot-partial archive-dot-sm"></span> ${lang==='hi'?'आधा':lang==='ur'?'جزوی':'Partial'}</span>
        <span class="dot-legend-item"><span class="dot-missed archive-dot-sm"></span> ${lang==='hi'?'छूटा':lang==='ur'?'چھوٹا':'Missed'}</span>
      </div>
    </div>

    <!-- Reflections -->
    ${reflections.length > 0 ? `
    <div class="archive-reflections-section">
      <div class="archive-dot-label">
        ${lang==='ur' ? 'آپ کی سوچیں' : lang==='hi' ? 'आपकी सोचें' : 'Your Reflections'}
        <span class="archive-gem-count">💎 ${reflections.length}</span>
      </div>
      ${reflections.map(r => `
        <div class="archive-reflection-entry">
          <div class="archive-reflection-day">
            ${lang==='hi' ? `दिन ${r.day}` : lang==='ur' ? `دن ${r.day}` : `Day ${r.day}`}
          </div>
          <p class="archive-reflection-text">${r.text}</p>
        </div>
      `).join('')}
    </div>` : ''}

    <!-- Stats row -->
    <div class="archive-stats-row">
      <div class="archive-stat-chip">
        <span class="archive-stat-n">${month.days_done}</span>
        <span class="archive-stat-l">
          ${lang==='hi' ? `${month.total_days} में से` : lang==='ur' ? `${month.total_days} میں سے` : `of ${month.total_days} days`}
        </span>
      </div>
      <div class="archive-stat-chip">
        <span class="archive-stat-n">${month.total_points}</span>
        <span class="archive-stat-l">${t('points_label')}</span>
      </div>
      <div class="archive-stat-chip">
        <span class="archive-stat-n">${month.gems}</span>
        <span class="archive-stat-l">${t('gems_label')}</span>
      </div>
    </div>

  </div>`;
}

// ── Nav ───────────────────────────────────────────────────────────────────
function buildNav(logoSrc, lang) {
  const backLabel = lang==='ur' ? 'واپس' : lang==='hi' ? 'वापस' : 'Back';
  return `
  <nav class="aamaal-nav">
    <button class="reflect-back-btn" id="btn-back">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      ${backLabel}
    </button>
    <img src="${logoSrc}" alt="Aamaal" class="nav-logo-mobile" style="margin-left:auto" onerror="this.style.display='none'"/>
  </nav>`;
}

// ── Bottom nav ────────────────────────────────────────────────────────────
function buildBottomNav() {
  const isDark  = getResolvedTheme() === 'dark';
  const logoSrc = isDark ? 'icons/logo-dark.png' : 'icons/logo-light.png';
  const items = [
    { route:'',        labelKey:'nav_home',    icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>` },
    { route:'reflect', labelKey:'nav_reflect', icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>` },
    { route:'archive', labelKey:'nav_archive', icon:`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/></svg>` },
  ];
  return `
  <nav class="bottom-nav" role="navigation" aria-label="Main navigation">
    <div class="bottom-nav-brand">
      <img src="${logoSrc}" alt="Aamaal" class="bottom-nav-logo" onerror="this.style.display='none'"/>
    </div>
    ${items.map(item=>`
      <button class="bottom-nav-item ${item.route==='archive'?'active':''}" data-route="${item.route}" aria-label="${t(item.labelKey)}">
        <span class="bottom-nav-icon">${item.icon}</span>
        <span class="bottom-nav-label">${t(item.labelKey)}</span>
      </button>`).join('')}
  </nav>`;
}

// ── Listeners ─────────────────────────────────────────────────────────────
function attachListeners(container) {
  // Back button
  container.querySelector('#btn-back')?.addEventListener('click', () => {
    window.location.hash = '#/';
  });

  // Bottom nav + desktop nav links — same data-route pattern
  container.querySelectorAll('[data-route]').forEach(btn =>
    btn.addEventListener('click', () => {
      const route = btn.dataset.route;
      window.location.hash = route ? `#/${route}` : '#/';
    })
  );

  // Month card expand/collapse — load reflections from Firestore on first expand
  container.querySelectorAll('[data-toggle]').forEach(el =>
    el.addEventListener('click', async () => {
      const key = el.dataset.toggle;

      if (_expandedMonth === key) {
        // Collapse
        _expandedMonth = null;
        container.innerHTML = buildHTML();
        attachListeners(container);
        return;
      }

      // Expand — load reflections if not already cached
      _expandedMonth = key;

      if (!_reflections[key]) {
        // Show loading indicator in the card while fetching
        container.innerHTML = buildHTML();
        attachListeners(container);

        // Fetch reflections, then re-render with data
        _reflections[key] = await _loadReflectionsForMonth(key);
        container.innerHTML = buildHTML();
        attachListeners(container);
      } else {
        container.innerHTML = buildHTML();
        attachListeners(container);
      }

      // Scroll to expanded card
      setTimeout(() => {
        const newCard = container.querySelector(`[data-month="${key}"]`);
        newCard?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    })
  );
}

// ── Styles ────────────────────────────────────────────────────────────────
function injectArchiveStyles() {
  if (document.getElementById('archive-styles')) return;
  const s = document.createElement('style');
  s.id = 'archive-styles';
  s.textContent = `
    /* Header */
    .archive-header {
      padding: 24px 20px 20px;
      border-bottom: 1px solid var(--border);
    }
    .archive-title {
      font-family: var(--font-display); font-size: 1.2rem; font-weight: 500;
      letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--gold); margin: 0 0 16px;
    }
    .archive-totals {
      display: flex; align-items: center; gap: 0;
    }
    .archive-total-item {
      display: flex; flex-direction: column; align-items: center; gap: 2px;
      flex: 1;
    }
    .archive-total-value {
      font-family: var(--font-display); font-size: 1.4rem;
      color: var(--off-white); letter-spacing: 0.02em;
    }
    .archive-total-label {
      font-family: var(--font-display); font-size: 0.55rem;
      letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted);
    }
    .archive-total-divider {
      width: 1px; height: 32px; background: var(--border); flex-shrink: 0;
    }

    /* Month list */
    .archive-months {
      padding: 16px 16px 40px;
      display: flex; flex-direction: column; gap: 12px;
    }
    .archive-empty {
      text-align: center; padding: 48px 24px;
      color: var(--text-muted); font-family: var(--font-serif);
      font-style: italic; font-size: 0.95rem;
    }

    /* Month card */
    .archive-month-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      overflow: hidden;
      transition: border-color var(--transition);
    }
    .archive-month-card.expanded {
      border-color: var(--border-gold);
    }
    .archive-month-card.active-month {
      border-color: rgba(201,168,76,0.3);
      box-shadow: 0 0 20px rgba(201,168,76,0.06);
    }
    .archive-card-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 16px 18px; cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .archive-card-header:hover { background: rgba(255,255,255,0.02); }
    .archive-card-left { display: flex; flex-direction: column; gap: 3px; flex: 1; }
    .archive-card-arabic {
      font-family: var(--font-arabic); font-size: 1rem;
      color: var(--gold); line-height: 1.4;
    }
    .archive-card-name {
      font-family: var(--font-display); font-size: 0.78rem;
      letter-spacing: 0.06em; text-transform: uppercase;
      color: var(--off-white);
      display: flex; align-items: center; gap: 8px;
    }
    .archive-active-badge {
      font-family: var(--font-display); font-size: 0.52rem;
      letter-spacing: 0.08em; text-transform: uppercase;
      background: rgba(201,168,76,0.15); color: var(--gold);
      border: 1px solid var(--border-gold);
      border-radius: 20px; padding: 2px 7px;
    }
    .archive-card-theme {
      font-family: var(--font-serif); font-style: italic;
      font-size: 0.82rem; color: var(--text-muted);
    }
    .archive-card-right {
      display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
      flex-shrink: 0; padding-left: 12px;
    }
    .archive-card-pct {
      font-family: var(--font-display); font-size: 1rem;
      color: var(--gold); letter-spacing: 0.04em;
    }
    .archive-card-gems {
      font-family: var(--font-display); font-size: 0.65rem;
      color: var(--text-muted);
    }
    .archive-expand-icon {
      font-size: 0.55rem; color: var(--text-muted); margin-top: 2px;
    }

    /* Progress bar */
    .archive-progress-bar {
      height: 3px; background: rgba(255,255,255,0.05); overflow: hidden;
    }
    .archive-progress-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--gold-dim), var(--gold));
      transition: width 0.6s ease;
    }

    /* Detail */
    .archive-detail {
      padding: 16px 18px 20px;
      border-top: 1px solid var(--border);
      display: flex; flex-direction: column; gap: 20px;
    }

    /* Dot calendar */
    .archive-dot-section {}
    .archive-dot-label {
      font-family: var(--font-display); font-size: 0.6rem;
      letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--text-muted); margin-bottom: 10px;
      display: flex; align-items: center; gap: 8px;
    }
    .archive-gem-count { color: var(--gold); }
    .archive-dots {
      display: grid;
      grid-template-columns: repeat(10, 1fr);
      gap: 5px;
    }
    .archive-dot {
      aspect-ratio: 1;
      border-radius: 3px;
      position: relative;
      cursor: default;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.1s ease;
    }
    .archive-dot:hover { transform: scale(1.15); }
    .dot-full    { background: var(--gold); }
    .dot-partial { background: var(--gold-dim); }
    .dot-missed  { background: rgba(255,255,255,0.07); }
    .dot-future  { background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); }
    .dot-gem { font-size: 0.45rem; line-height: 1; }

    .archive-dot-sm {
      display: inline-block; width: 8px; height: 8px;
      border-radius: 2px; vertical-align: middle; margin-right: 3px;
    }
    .archive-dot-legend {
      display: flex; gap: 14px; margin-top: 8px;
      font-family: var(--font-display); font-size: 0.58rem;
      letter-spacing: 0.06em; color: var(--text-muted);
    }
    .dot-legend-item { display: flex; align-items: center; }

    /* Reflections */
    .archive-reflections-section { display: flex; flex-direction: column; gap: 12px; }
    .archive-reflection-entry {
      background: rgba(201,168,76,0.04);
      border: 1px solid var(--border);
      border-left: 2px solid var(--gold-dim);
      border-radius: var(--r-sm);
      padding: 12px 14px;
    }
    .archive-reflection-day {
      font-family: var(--font-display); font-size: 0.6rem;
      letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--gold-dim); margin-bottom: 6px;
    }
    .archive-reflection-text {
      font-family: var(--font-body); font-size: 0.88rem;
      color: var(--text); line-height: 1.7; margin: 0;
    }

    /* Stats row */
    .archive-stats-row {
      display: flex; gap: 8px;
    }
    .archive-stat-chip {
      flex: 1; background: var(--bg-surface);
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      padding: 10px 8px;
      display: flex; flex-direction: column; align-items: center; gap: 3px;
    }
    .archive-stat-n {
      font-family: var(--font-display); font-size: 1rem; color: var(--off-white);
    }
    .archive-stat-l {
      font-family: var(--font-display); font-size: 0.52rem;
      letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted);
      text-align: center;
    }

    /* Desktop */
    @media (min-width: 800px) {
      .archive-header  { padding: 32px 28px 24px; }
      .archive-months  { padding: 20px 24px 48px; gap: 14px; }
      .archive-dots    { grid-template-columns: repeat(15, 1fr); }
      .archive-card-header { padding: 20px 22px; }
    }
  `;
  document.head.appendChild(s);
}
