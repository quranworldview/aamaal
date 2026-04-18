/**
 * reflect.js — Reflection Submission Screen
 * QUR'AN WORLD VIEW · Aamaal
 * MILESTONE 3: Live calendar state
 *
 * Flow:
 *   1. Load calendar state → real monthKey + dayOfMonth
 *   2. Load today's task via taskLoader
 *   3. Check if already reflected today (pre-submitted state)
 *   4. Show task recap + soft prompt question
 *   5. Student writes their reflection
 *   6. Submit → saveReflection() → gem awarded → success state
 */

import { t, getLang }          from '../core/i18n.js';
import { buildAyahBlock }       from '../core/ArabicText.js';
import { getResolvedTheme }     from '../core/theme.js';
import { getTodayTask }         from '../services/taskLoader.js';
import { saveReflection,
         getTodayProgress }     from '../services/progress.js';
import { getCalendarState }     from '../services/calendar.js';

let _taskData      = null;
let _calendarState = null;
let _loadError     = null;
let _submitted     = false;
let _submitting    = false;

// ── Entry ─────────────────────────────────────────────────────────────────
export async function render(container) {
  _submitted = false; _submitting = false;
  container.innerHTML = `<div class="aamaal-root" style="display:flex;align-items:center;justify-content:center;min-height:100vh;"><div class="loading-spinner"></div></div>`;
  try {
    _calendarState = await getCalendarState();
    const { monthKey, dayOfMonth, isRamadan } = _calendarState;

    const [taskData, todayProgress] = await Promise.all([
      getTodayTask(monthKey, dayOfMonth),
      getTodayProgress(monthKey, dayOfMonth),
    ]);

    _taskData  = taskData;
    _loadError = null;

    // If already reflected today, show submitted state immediately
    if (todayProgress.reflected) {
      _submitted = true;
    }
  } catch (err) {
    _loadError = err.message;
  }
  container.innerHTML = buildHTML();
  attachListeners(container);
  injectReflectStyles();
}

// ── HTML ──────────────────────────────────────────────────────────────────
function buildHTML() {
  const lang    = getLang();
  const isDark  = getResolvedTheme() === 'dark';
  const dir     = lang === 'ur' ? 'dir="rtl"' : '';
  const logoSrc = isDark ? 'icons/logo-dark.png' : 'icons/logo-light.png';

  if (_loadError) return `
    <div class="aamaal-root" ${dir}>
      ${buildNav(logoSrc, lang)}
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;min-height:60vh;padding:24px;text-align:center;">
        <div style="font-size:2rem">⚠️</div>
        <p style="color:var(--text-muted)">${t('reflect_error')}</p>
        <button class="btn btn-secondary" onclick="location.reload()">Retry</button>
      </div>
      ${buildBottomNav()}
    </div>`;

  const { task, ayah, category } = _taskData;

  return `
  <div class="aamaal-root" ${dir}>

    ${buildNav(logoSrc, lang)}

    <div class="reflect-header fade-in">
      <div class="reflect-header-eyebrow">
        <span class="stage-category-pill">${category}</span>
        <span class="reflect-day-tag">${t('day_label')} ${_calendarState?.dayOfMonth ?? '—'}</span>
      </div>
      <h1 class="reflect-title">${t('reflect_title')}</h1>
    </div>

    <div class="reflect-task-recap fade-up delay-1" ${dir}>
      <div class="reflect-recap-label">${t('todays_task')}</div>
      <div class="reflect-recap-text">${task[lang] || task.en}</div>
    </div>

    <div class="reflect-ayah-wrap fade-up delay-1">
      ${buildAyahBlock(ayah, lang)}
    </div>

    ${_submitted ? buildSuccess(lang) : buildForm(lang, dir)}

  </div>
  ${buildBottomNav()}`;
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

// ── Form ──────────────────────────────────────────────────────────────────
function buildForm(lang, dir) {
  const isRTL = lang === 'ur';
  const taStyle = isRTL
    ? 'text-align:right;font-family:var(--font-nastaliq);font-size:1rem;line-height:2.2;'
    : lang === 'hi'
    ? 'font-family:var(--font-devanagari);'
    : '';

  return `
  <div class="reflect-form-wrap fade-up delay-2">

    <div class="reflect-prompt" ${dir}>
      <span class="reflect-prompt-icon">💭</span>
      <span class="reflect-prompt-text">${t('reflect_prompt')}</span>
    </div>

    <div class="reflect-textarea-wrap">
      <textarea id="reflect-input" class="reflect-textarea"
        placeholder="${t('reflect_placeholder')}"
        rows="5" maxlength="1000"
        ${dir} style="${taStyle}"
        aria-label="${t('reflect_title')}"></textarea>
      <div class="reflect-char-count">
        <span id="char-num">0</span>/1000
      </div>
    </div>

    <div class="reflect-actions">
      <button class="btn btn-primary btn-full" id="btn-submit" disabled>
        💎 &thinsp;${t('reflect_submit')}
      </button>
      <p class="reflect-hint">
        ${lang==='ur' ? 'جمع کرنے پر ۱ جیم ملے گا اور آپ کی سوچ ہمیشہ کے لیے محفوظ ہو جائے گی۔'
          : lang==='hi' ? 'जमा करने पर १ जेम मिलेगा और आपकी सोच हमेशा के लिए महफ़ूज़ हो जाएगी।'
          : 'Submitting earns 1 gem and preserves your reflection forever.'}
      </p>
    </div>

  </div>`;
}

// ── Success ───────────────────────────────────────────────────────────────
function buildSuccess(lang) {
  const dir = lang === 'ur' ? 'dir="rtl"' : '';
  return `
  <div class="reflect-success fade-in" ${dir}>
    <div class="reflect-success-gem">💎</div>
    <div class="reflect-success-title">
      ${lang==='ur' ? 'محفوظ ہو گئی' : lang==='hi' ? 'महफ़ूज़ हो गई' : 'Preserved'}
    </div>
    <p class="reflect-success-body">
      ${lang==='ur' ? 'آپ کی سوچ لکھ لی گئی۔ یہ آپ کا صدقہ جاریہ ہے۔'
        : lang==='hi' ? 'आपकी सोच लिख ली गई। यह आपका सदक़ह जारिया है।'
        : 'Your reflection has been preserved. This is your sadaqah jariyah.'}
    </p>
    <button class="btn btn-secondary" id="btn-go-home">
      ${lang==='ur' ? '← آج کا کام' : lang==='hi' ? '← आज का काम' : '← Today\'s Task'}
    </button>
  </div>`;
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
      <button class="bottom-nav-item ${item.route==='reflect'?'active':''}" data-route="${item.route}" aria-label="${t(item.labelKey)}">
        <span class="bottom-nav-icon">${item.icon}</span>
        <span class="bottom-nav-label">${t(item.labelKey)}</span>
      </button>`).join('')}
  </nav>`;
}

// ── Listeners ─────────────────────────────────────────────────────────────
function attachListeners(container) {
  container.querySelector('#btn-back')?.addEventListener('click', () => {
    window.location.hash = '#/';
  });

  container.querySelector('#btn-go-home')?.addEventListener('click', () => {
    window.location.hash = '#/';
  });

  // Bottom nav + desktop nav links
  container.querySelectorAll('[data-route]').forEach(btn =>
    btn.addEventListener('click', () => {
      const route = btn.dataset.route;
      window.location.hash = route ? `#/${route}` : '#/';
    })
  );

  const textarea  = container.querySelector('#reflect-input');
  const submitBtn = container.querySelector('#btn-submit');
  const charNum   = container.querySelector('#char-num');
  if (!textarea) return;

  textarea.addEventListener('input', () => {
    const len = textarea.value.trim().length;
    if (charNum) charNum.textContent = textarea.value.length;
    if (submitBtn) submitBtn.disabled = len < 10;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  });

  setTimeout(() => textarea.focus(), 300);

  submitBtn?.addEventListener('click', async () => {
    if (_submitting || _submitted) return;
    const text = textarea.value.trim();
    if (text.length < 10) return;

    _submitting = true;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="reflect-spinner"></span> ${t('reflect_submitting')}`;

    const { taskId, stage } = _taskData;
    const { monthKey, dayOfMonth, isRamadan } = _calendarState;
    const lang = getLang();

    const result = await saveReflection(
      monthKey, dayOfMonth, taskId, stage, text, lang, isRamadan
    );

    _submitting = false;

    if (result.success) {
      _submitted = true;
      container.innerHTML = buildHTML();
      attachListeners(container);
      spawnParticles(['#C9A84C','#DFC06A','#E8C060','#F0EBE0']);
    } else {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `💎 &thinsp;${t('reflect_submit')}`;
      const errEl = document.createElement('p');
      errEl.style.cssText = 'color:#E07070;font-size:0.8rem;text-align:center;margin:0;';
      errEl.textContent = t('reflect_error');
      container.querySelector('.reflect-actions')?.prepend(errEl);
      setTimeout(() => errEl.remove(), 4000);
    }
  });
}

function spawnParticles(colors) {
  for (let i=0;i<24;i++) setTimeout(()=>{
    const p=document.createElement('div');p.className='particle';
    const sz=3+Math.random()*4;
    p.style.cssText=`left:${8+Math.random()*84}%;top:-8px;width:${sz}px;height:${sz}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>.4?'50%':'2px'};animation-duration:${1.6+Math.random()*1.8}s;animation-delay:${Math.random()*.4}s;`;
    document.body.appendChild(p);setTimeout(()=>p.remove(),3500);
  },i*30);
}

// ── Styles ────────────────────────────────────────────────────────────────
function injectReflectStyles() {
  if (document.getElementById('reflect-styles')) return;
  const s = document.createElement('style');
  s.id = 'reflect-styles';
  s.textContent = `
    .reflect-header {
      padding: 24px 20px 16px;
      border-bottom: 1px solid var(--border);
    }
    .reflect-header-eyebrow {
      display: flex; align-items: center; gap: 10px; margin-bottom: 8px;
    }
    .reflect-day-tag {
      font-family: var(--font-display); font-size: 0.62rem;
      letter-spacing: 0.1em; text-transform: uppercase; color: var(--text-muted);
    }
    .reflect-title {
      font-family: var(--font-display); font-size: 1.2rem; font-weight: 500;
      letter-spacing: 0.1em; text-transform: uppercase;
      color: var(--gold); margin: 0;
    }
    .reflect-task-recap {
      margin: 20px 16px 0; padding: 16px;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--r-md);
    }
    .reflect-recap-label {
      font-family: var(--font-display); font-size: 0.58rem;
      letter-spacing: 0.12em; text-transform: uppercase;
      color: var(--gold-dim); margin-bottom: 8px;
    }
    .reflect-recap-text {
      font-family: var(--font-body); font-size: 0.9rem;
      color: var(--text); line-height: 1.7;
    }
    .reflect-ayah-wrap { margin: 16px 16px 0; }
    .reflect-form-wrap {
      margin: 20px 16px 40px;
      display: flex; flex-direction: column; gap: 16px;
    }
    .reflect-prompt {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 14px 16px;
      background: rgba(201,168,76,0.06);
      border: 1px solid var(--border-gold);
      border-radius: var(--r-md);
    }
    .reflect-prompt-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 1px; }
    .reflect-prompt-text {
      font-family: var(--font-serif); font-size: 0.95rem;
      font-style: italic; color: var(--text); line-height: 1.65;
    }
    .reflect-textarea-wrap { position: relative; }
    .reflect-textarea {
      width: 100%; box-sizing: border-box;
      background: var(--bg-card); border: 1px solid var(--border);
      border-radius: var(--r-md); color: var(--text);
      font-family: var(--font-body); font-size: 0.95rem; line-height: 1.75;
      padding: 16px; resize: none; outline: none;
      transition: border-color var(--transition), box-shadow var(--transition);
      min-height: 120px;
    }
    .reflect-textarea:focus {
      border-color: var(--border-gold);
      box-shadow: 0 0 0 3px rgba(201,168,76,0.08);
    }
    .reflect-textarea::placeholder { color: var(--text-muted); }
    .reflect-char-count {
      position: absolute; bottom: 10px; right: 14px;
      font-family: var(--font-display); font-size: 0.58rem;
      letter-spacing: 0.06em; color: var(--text-muted); pointer-events: none;
    }
    .reflect-actions { display: flex; flex-direction: column; gap: 10px; }
    #btn-submit:disabled { opacity: 0.38; cursor: not-allowed; }
    .reflect-hint {
      font-family: var(--font-body); font-size: 0.72rem;
      color: var(--text-muted); text-align: center; margin: 0; line-height: 1.5;
    }
    .reflect-spinner {
      display: inline-block; width: 12px; height: 12px;
      border: 2px solid rgba(255,255,255,0.25); border-top-color: var(--off-white);
      border-radius: 50%; animation: spin 0.7s linear infinite;
      vertical-align: middle; margin-right: 4px;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .reflect-success {
      display: flex; flex-direction: column; align-items: center;
      text-align: center; padding: 48px 24px 32px; gap: 14px;
    }
    .reflect-success-gem {
      font-size: 3.5rem;
      animation: celebBounce 0.55s cubic-bezier(0.34,1.56,0.64,1) both;
    }
    .reflect-success-title {
      font-family: var(--font-display); font-size: 1.1rem;
      letter-spacing: 0.15em; text-transform: uppercase; color: var(--gold);
    }
    .reflect-success-body {
      font-family: var(--font-serif); font-size: 1rem; font-style: italic;
      color: var(--text); line-height: 1.7; max-width: 300px; margin: 0;
    }
    .reflect-back-btn {
      display: flex; align-items: center; gap: 6px;
      background: transparent; border: none; color: var(--text-muted);
      font-family: var(--font-display); font-size: 0.65rem;
      letter-spacing: 0.08em; text-transform: uppercase;
      cursor: pointer; padding: 4px 0;
      transition: color var(--transition);
    }
    .reflect-back-btn:hover { color: var(--gold); }
    @media (min-width: 800px) {
      .reflect-header    { padding: 32px 28px 16px; }
      .reflect-task-recap { margin: 24px 24px 0; padding: 20px; }
      .reflect-ayah-wrap { margin: 20px 24px 0; }
      .reflect-form-wrap { margin: 24px 24px 48px; }
      .reflect-textarea  { font-size: 1rem; padding: 18px; }
    }
  `;
  document.head.appendChild(s);
}
