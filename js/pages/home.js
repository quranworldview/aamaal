/**
 * home.js — Aamaal Home Screen
 * QUR'AN WORLD VIEW · Aamaal
 * MILESTONE 3: Live calendar + live Firestore progress
 */

import { t, getLang, setLang }              from '../core/i18n.js';
import { buildAyahBlock }                    from '../core/ArabicText.js';
import { cycleTheme, getResolvedTheme, getTheme, setTheme } from '../core/theme.js';
import { getScale, setScale, VALID_SCALES }  from '../core/textScale.js';
import { getTodayTask }                      from '../services/taskLoader.js';
import { saveTaskDone, saveReflection,
         getTodayProgress, getMonthProgress } from '../services/progress.js';
import { getCalendarState }                  from '../services/calendar.js';
import { signOut }                           from '../core/auth.js';

// ── Module state ──────────────────────────────────────────────────────────
let _taskData     = null;
let _loadError    = null;
let _calendarState = null;
let _monthProgress = null;

let state = {
  taskDone: false, reflected: false,
  points: 0, gems: 0,
  showSettings: false, saving: false,
};

// ── Entry ─────────────────────────────────────────────────────────────────
export async function render(container) {
  container.innerHTML = `<div class="aamaal-root" style="min-height:100vh;display:flex;align-items:center;justify-content:center;"><div class="loading-spinner"></div></div>`;
  try {
    // 1. Get real Islamic calendar state (3-layer failsafe)
    _calendarState = await getCalendarState();
    const { monthKey, dayOfMonth, isRamadan } = _calendarState;

    // 2. Load task JSON + Firestore progress in parallel
    const [taskData, todayProgress, monthProgress] = await Promise.all([
      getTodayTask(monthKey, dayOfMonth),
      getTodayProgress(monthKey, dayOfMonth),
      getMonthProgress(monthKey, 30, isRamadan),
    ]);

    _taskData      = taskData;
    _monthProgress = monthProgress;

    // 3. Pre-populate state from Firestore (student may have already done today's task)
    state.taskDone  = todayProgress.taskDone;
    state.reflected = todayProgress.reflected;
    state.points    = monthProgress.totalPoints;
    state.gems      = monthProgress.totalGems;

    _loadError = null;
  } catch (err) {
    console.error('[home] Failed to load:', err);
    _loadError = err.message;
  }
  container.innerHTML = buildHTML();
  attachListeners(container);
  requestAnimationFrame(() => animateRing(container));
}

// ── HTML ──────────────────────────────────────────────────────────────────
function buildHTML() {
  if (_loadError) {
    const lang = getLang();
    const msg = lang==='hi' ? 'कुछ ग़लत हो गया। दोबारा कोशिश करो।'
              : lang==='ur' ? 'کچھ غلط ہو گیا۔ دوبارہ کوشش کرو۔'
              : "Something went wrong loading today's task.";
    return `<div class="aamaal-root" style="min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px"><div style="font-size:2rem">⚠️</div><div style="color:var(--text);text-align:center">${msg}</div><button class="btn btn-secondary" onclick="location.reload()">Retry</button></div>`;
  }

  const lang      = getLang();
  const isDark    = getResolvedTheme() === 'dark';
  const bothDone  = state.taskDone && state.reflected;
  const scale     = getScale();
  const logoSrc   = isDark ? 'icons/logo-dark.png' : 'icons/logo-light.png';

  // Live calendar values
  const { dayOfMonth, isRamadan } = _calendarState;
  const { monthMeta, stage, stageLabel, taskName, category } = _taskData;

  // Live ring data — build dots array from Firestore days object
  const totalDays  = _monthProgress.totalDays;
  const maxPoints  = _monthProgress.maxPoints;
  const ringDays   = _buildRingDays(_monthProgress.days, dayOfMonth, totalDays);
  const doneCount  = ringDays.filter(d => d==='full' || d==='partial').length;

  return `
  <div class="aamaal-root">

    <!-- ── Navbar ────────────────────────────────────────────────────── -->
    <nav class="aamaal-nav">
      <img src="${logoSrc}" alt="Aamaal" class="nav-logo-mobile"
           onerror="this.style.display='none';this.nextElementSibling.style.display='block'"/>
      <span class="aamaal-nav-logo" style="display:none">أعمال · AAMAAL</span>
      <div class="nav-settings-wrap">
        <button class="settings-btn" id="settings-btn" aria-label="Settings" title="Settings">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
        ${state.showSettings ? buildSettingsPanel(lang, scale) : ''}
      </div>
    </nav>

    <!-- ── Month banner — full width ────────────────────────────────── -->
    <div class="month-banner fade-in">
      <div class="banner-eyebrow">${t('month_label')} ${monthMeta.month_number} · ${t('this_month')}</div>
      <div class="month-name">${monthMeta.month_key.charAt(0).toUpperCase()+monthMeta.month_key.slice(1)}</div>
      <div class="month-theme">${monthMeta.theme[lang]||monthMeta.theme.en}</div>
    </div>

    <!-- ── Two-column layout on desktop, single on mobile ───────────── -->
    <div class="desktop-layout">

      <!-- LEFT: ring + stats (sticky on desktop) -->
      <div class="desktop-left">
        <div class="ring-section fade-up delay-1">
          <div class="ring-wrapper" id="ring-wrapper">
            <svg class="ring-svg" viewBox="0 0 200 200" id="ring-svg">${buildRingSVG(ringDays, totalDays, dayOfMonth)}</svg>
            <div class="ring-center">
              <div class="ring-center-arabic" lang="ar">${monthMeta.theme_arabic||''}</div>
              <div class="ring-center-daynum">${dayOfMonth}</div>
              <div class="ring-center-day">of ${totalDays}</div>
            </div>
          </div>
          <div class="ring-stats">
            <div class="ring-stat">
              <div class="ring-stat-value" id="stat-streak">${_monthProgress.streak}</div>
              <div class="ring-stat-label">${t('streak_label')}</div>
            </div>
            <div class="ring-stat">
              <div class="ring-stat-value" id="stat-pts">${state.points}<span style="font-size:0.7em;color:var(--text-muted)">/${maxPoints}</span></div>
              <div class="ring-stat-label">${t('points_label')}</div>
            </div>
            <div class="ring-stat">
              <div class="ring-stat-value" id="stat-gems">${state.gems}</div>
              <div class="ring-stat-label">${t('gems_label')}</div>
            </div>
          </div>

          <!-- Quick nav tabs — mobile only (desktop uses bottom nav) -->
          <div class="home-quick-nav">
            <button class="home-quick-btn" data-route="reflect">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              ${t('nav_reflect')}
            </button>
            <button class="home-quick-btn" data-route="archive">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/></svg>
              ${t('nav_archive')}
            </button>
          </div>
        </div>
      </div>

      <!-- RIGHT: task content -->
      <div class="desktop-right">
        <div class="task-section-heading fade-up delay-2">
          <div class="task-section-heading-line" style="background:linear-gradient(90deg,transparent,var(--border-gold))"></div>
          <div class="task-section-heading-text">${t('todays_task')}</div>
          <div class="task-section-heading-line"></div>
        </div>

        ${buildStageIndicator(stage, stageLabel, lang, taskName, category)}

        <div id="task-area" class="fade-up delay-3">
          ${bothDone ? buildCompletionCard(lang) : buildTaskCard(lang)}
        </div>
      </div>

    </div><!-- end .desktop-layout -->

  </div>
  <div class="ring-tooltip" id="ring-tooltip"></div>
  ${buildBottomNav()}`;
}

// ── Ring days builder — converts Firestore days map → ring dot array ──────
function _buildRingDays(firestoreDays, todayNum, totalDays) {
  const arr = [];
  for (let i = 1; i <= totalDays; i++) {
    if (i > todayNum) {
      arr.push('future');
    } else if (i === todayNum) {
      arr.push('today');
    } else {
      const entry = firestoreDays[String(i)];
      if (!entry || !entry.task_done) {
        arr.push('missed');
      } else if (entry.task_done && entry.reflected) {
        arr.push('full');
      } else {
        arr.push('partial'); // task done but no reflection
      }
    }
  }
  return arr;
}

// ── Stage indicator ───────────────────────────────────────────────────────
function buildStageIndicator(stage, stageLabel, lang, taskName, category) {
  const dots = [1,2,3,4,5].map(n =>
    `<div class="stage-dot ${n<=stage?'stage-dot-filled':''} ${n===stage?'stage-dot-current':''}"></div>`
  ).join('');
  return `
  <div class="stage-indicator fade-up delay-2">
    <div class="stage-indicator-inner">
      <div class="stage-meta">
        <span class="stage-category-pill">${category}</span>
        <span class="stage-task-name">${taskName[lang]||taskName.en}</span>
      </div>
      <div class="stage-progress">
        <span class="stage-label-text">${stageLabel[lang]||stageLabel.en}</span>
        <div class="stage-dots">${dots}</div>
      </div>
    </div>
  </div>`;
}

// ── Task card ─────────────────────────────────────────────────────────────
function buildTaskCard(lang) {
  const { task, hikmah, ayah, example } = _taskData;
  const { dayOfMonth } = _calendarState;
  const dir = lang==='ur' ? 'dir="rtl" lang="ur"' : lang==='hi' ? 'lang="hi"' : '';
  return `
  <div class="task-card ${state.taskDone?'completed':''}" id="task-card">
    <div class="task-card-header">
      <span class="task-day-label">${t('day_label')} ${dayOfMonth}</span>
      ${state.taskDone?`<span class="task-completed-badge">✓ ${t('task_done_label')}</span>`:''}
    </div>
    <div class="task-section">
      <div class="task-section-label">${t('todays_task')}</div>
      <div class="task-text" ${dir}>${task[lang]||task.en}</div>
    </div>
    <div class="task-section">
      <div class="task-section-label">${t('the_wisdom')}</div>
      <div class="task-hikmah" ${dir}>${hikmah[lang]||hikmah.en}</div>
    </div>
    <div class="task-section">
      <div class="task-section-label">${t('the_ayah')} · ${ayah.surah}:${ayah.ayah}</div>
      ${buildAyahBlock(ayah, lang)}
    </div>
    <div class="task-section">
      <div class="task-section-label">${t('in_practice')}</div>
      <div class="task-example" ${dir}>${example[lang]||example.en}</div>
    </div>
    <div class="task-actions ${state.taskDone?'single':''}">
      ${!state.taskDone
        ? `<button class="btn btn-secondary btn-full" id="btn-done">✓ &thinsp;${t('mark_done')}</button>
           <button class="btn btn-primary  btn-full" id="btn-reflect">✍ &thinsp;${t('add_reflection')}</button>`
        : `<button class="btn btn-primary  btn-full" id="btn-reflect">✍ &thinsp;${t('add_reflection')}</button>`
      }
    </div>
    ${state.taskDone && !state.reflected ? `
      <div class="reflect-nudge">
        <span style="font-size:1.1rem">💭</span>
        <div class="reflect-nudge-text" ${dir}>"${
          lang==='ur' ? 'دو سطریں ہی لکھیں۔ ہر سچی بات محفوظ رہتی ہے۔'
          : lang==='hi' ? 'दो लाइनें ही लिखें। हर सच्ची बात महफ़ूज़ रहती है।'
          : 'Write even two lines. Every sincere word is preserved.'}"</div>
      </div>` : ''}
  </div>`;
}

// ── Completion card ───────────────────────────────────────────────────────
function buildCompletionCard(lang) {
  const dir = lang==='ur' ? 'dir="rtl"' : '';
  return `
  <div class="come-back-card">
    <span class="seal-icon">📿</span>
    <div class="come-back-title">${t('both_done_message')}</div>
    <div class="come-back-ayah" ${dir}>${
      lang==='ur' ? '\"بے شک اللہ نیکی کرنے والوں کا اجر ضائع نہیں کرتا۔\" — قرآن ۹:۱۲۰'
      : lang==='hi' ? '\"बेशक अल्लाह नेकी करने वालों का अज्र ज़ाया नहीं करता।\" — क़ुरआन ९:१२०'
      : '\"Indeed, Allah does not allow the reward of the doers of good to be lost.\" — Quran 9:120'
    }</div>
    <div class="gem-earned-line">💎 &nbsp;${t('gem_earned_today')}</div>
  </div>`;
}

// ── Settings panel — all controls in one dropdown ─────────────────────────
function buildSettingsPanel(lang, scale) {
  const theme   = getTheme();
  const themes  = ['dark', 'light', 'system'];
  const themeIcons = {
    dark:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
    light:  `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.93" y1="4.93" x2="6.34" y2="6.34"/><line x1="17.66" y1="17.66" x2="19.07" y2="19.07"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.93" y1="19.07" x2="6.34" y2="17.66"/><line x1="17.66" y1="6.34" x2="19.07" y2="4.93"/></svg>`,
    system: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`,
  };
  const themeLabels = { dark: 'Dark', light: 'Light', system: 'System' };

  // Scale labels — clear and intuitive
  const scaleLabels = { xs: 'A', sm: 'A+', md: 'A++', lg: 'A+++', xl: 'A++++', '2xl': 'A+++++' };
  // Only show 4 most useful sizes
  const scaleOptions = ['sm', 'md', 'lg', 'xl'];

  return `
  <div class="settings-panel" id="settings-panel">

    <div class="settings-section-label">Language</div>
    <div class="settings-lang-group">
      <button class="settings-lang-btn ${lang==='en'?'active':''}" data-lang="en">English</button>
      <button class="settings-lang-btn ${lang==='hi'?'active':''}" data-lang="hi">हिंदी</button>
      <button class="settings-lang-btn ${lang==='ur'?'active':''}" data-lang="ur">اردو</button>
    </div>

    <div class="settings-divider"></div>

    <div class="settings-section-label">Text Size</div>
    <div class="settings-scale-group">
      ${scaleOptions.map(s => `
        <button class="settings-scale-btn ${s===scale?'active':''}" data-scale="${s}">
          ${scaleLabels[s]}
        </button>
      `).join('')}
    </div>

    <div class="settings-divider"></div>

    <div class="settings-section-label">Theme</div>
    <div class="settings-theme-group">
      ${themes.map(th => `
        <button class="settings-theme-btn ${th===theme?'active':''}" data-theme-set="${th}">
          ${themeIcons[th]}
          <span>${themeLabels[th]}</span>
        </button>
      `).join('')}
    </div>

    <div class="settings-divider"></div>

    <button class="settings-signout-btn" id="btn-signout">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      ${lang==='ur' ? 'لاگ آوٹ' : lang==='hi' ? 'लॉगआउट' : 'Sign Out'}
    </button>

  </div>`;
}

// ── Ring ──────────────────────────────────────────────────────────────────
function buildRingSVG(ringDays, totalDays, todayNum) {
  const cx=100,cy=100,R=82,r=68,gap=2.5;
  const defs=`<defs><filter id="todayGlow"><feGaussianBlur stdDeviation="2.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>`;
  const track=`<path d="${arcPath(cx,cy,R,r,0,359.5)}" fill="rgba(255,255,255,0.04)"/>`;
  const segs=ringDays.map((day,i)=>{
    const s=(i/totalDays)*360,e=((i+1)/totalDays)*360-gap,isToday=day==='today';
    const fill=(day==='full'||isToday)?'#C9A84C':day==='partial'?'#8A6F2E':day==='missed'?'rgba(255,255,255,0.07)':'rgba(255,255,255,0.03)';
    const label=isToday?`Today · Day ${i+1}`:day==='full'?`Day ${i+1} · Completed`:day==='partial'?`Day ${i+1} · Task only`:day==='missed'?`Day ${i+1} · Missed`:'';
    return `<path ${isToday?'id="today-seg"':''} d="${arcPath(cx,cy,R,r,s,e)}" fill="${fill}" opacity="${day==='partial'?'0.75':'1'}" class="ring-seg ${isToday?'ring-seg-today':''}" data-day="${i+1}" data-state="${day}" ${label?`data-label="${label}"`:''}  style="cursor:${day==='future'?'default':'pointer'};transition:opacity 0.2s ease"/>`;
  }).join('');
  return defs+track+segs;
}
function arcPath(cx,cy,R,r,s,e){const toR=d=>d*Math.PI/180;const[S,E]=[toR(s),toR(e)];const large=(e-s)>180?1:0;const p=(rad,dist)=>[cx+dist*Math.cos(rad),cy+dist*Math.sin(rad)];const[x1,y1]=p(S,R),[x2,y2]=p(E,R),[x3,y3]=p(E,r),[x4,y4]=p(S,r);return`M${x1} ${y1} A${R} ${R} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${r} ${r} 0 ${large} 0 ${x4} ${y4}Z`;}
function animateRing(container){container.querySelectorAll('.ring-seg').forEach((seg,i)=>{const orig=seg.getAttribute('opacity')||'1';seg.style.opacity='0';setTimeout(()=>{seg.style.transition='opacity 0.25s ease';seg.style.opacity=orig;},30+i*16);});const today=container.querySelector('#today-seg');if(today){let tick=0;const id=setInterval(()=>{if(!document.contains(today)){clearInterval(id);return;}today.style.filter=`drop-shadow(0 0 ${2+Math.sin(tick*=0.05+0.05)*2}px #C9A84C)`;},50);}}

// ── Listeners ─────────────────────────────────────────────────────────────
function attachListeners(container) {
  injectStageStyles();

  // Bottom nav + quick nav buttons — all use data-route
  container.querySelectorAll('[data-route]').forEach(btn =>
    btn.addEventListener('click', () => {
      const route = btn.dataset.route;
      window.location.hash = route ? `#/${route}` : '#/';
    })
  );

  // Settings button — toggle panel (no full rerender)
  container.querySelector('#settings-btn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const existing = document.getElementById('settings-panel');
    if (existing) {
      existing.remove();
      state.showSettings = false;
    } else {
      state.showSettings = true;
      const lang  = getLang();
      const scale = getScale();
      const wrap  = container.querySelector('.nav-settings-wrap');
      if (wrap) {
        wrap.insertAdjacentHTML('beforeend', buildSettingsPanel(lang, scale));
        // Re-attach panel listeners without full rerender
        attachSettingsPanelListeners(container);
      }
    }
  });

  attachSettingsPanelListeners(container);

  // Close settings on outside click — no rerender, just remove
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('settings-panel');
    if (panel && !panel.contains(e.target) && e.target.id !== 'settings-btn') {
      panel.remove();
      state.showSettings = false;
    }
  });

  container.querySelector('#btn-done')?.addEventListener('click', async () => {
    if (state.taskDone || state.saving) return;
    state.saving = true;
    const { taskId, stage, monthMeta } = _taskData;
    const { monthKey, dayOfMonth, isRamadan } = _calendarState;
    const pts = isRamadan ? 30 : 10;
    state.taskDone = true; state.points += pts;
    updateStats(container); refreshTaskArea(container);
    showCelebration({
      icon:'✓', title:'Deed Recorded',
      subtitle: getLang()==='ur'?'فرشتوں نے لکھ لیا۔ اب ایک سوچ لکھیں۔'
               :getLang()==='hi'?'फ़रिश्तों ने लिख लिया। अब एक सोच लिखें।'
               :'The angels have written it down. Now take a moment to reflect.',
      gem:false, points:`+${pts}`,
    });
    await saveTaskDone(monthKey, dayOfMonth, taskId, stage, isRamadan);
    state.saving = false;
  });

  container.querySelector('#btn-reflect')?.addEventListener('click', async () => {
    if (state.reflected || state.saving) return;
    state.saving = true;
    const { taskId, stage, monthMeta } = _taskData;
    const { monthKey, dayOfMonth, isRamadan } = _calendarState;
    const lang = getLang();
    const pts = isRamadan ? 30 : 10;
    state.reflected = true; state.taskDone = true; state.points += pts; state.gems += 1;
    updateStats(container); refreshTaskArea(container);
    spawnParticles(['#C9A84C','#DFC06A','#E8C060','#F0EBE0','#8A6F2E']);
    showCelebration({
      icon:'💎', title:t('gem_earned_today'),
      subtitle: lang==='ur'?'خلوص سے لکھی ہر بات صدقہ جاریہ بن جاتی ہے۔'
               :lang==='hi'?'ख़ुलूस से लिखी हर बात सदक़ह जारिया बन जाती है।'
               :'Every word written in sincerity becomes sadaqah jariyah.',
      gem:true, points:`+${pts} · +1 preserved`,
    });
    await saveReflection(monthKey, dayOfMonth, taskId, stage, `[home-screen ${new Date().toISOString()}]`, lang, isRamadan);
    state.saving = false;
  });

  const tooltip = document.getElementById('ring-tooltip');
  if (tooltip) {
    container.querySelectorAll('.ring-seg[data-label]').forEach(seg=>{
      const show=e=>{tooltip.textContent=seg.dataset.label;tooltip.classList.add('visible');const x=(e.clientX||e.touches?.[0]?.clientX||0)+12,y=(e.clientY||e.touches?.[0]?.clientY||0)-36;tooltip.style.cssText+=`;left:${Math.min(x,window.innerWidth-160)}px;top:${y}px`;};
      seg.addEventListener('mouseenter',show);seg.addEventListener('mousemove',show);
      seg.addEventListener('mouseleave',()=>tooltip.classList.remove('visible'));
      seg.addEventListener('touchstart',show,{passive:true});seg.addEventListener('touchend',()=>tooltip.classList.remove('visible'));
    });
  }
}

function rerender(container){container.innerHTML=buildHTML();attachListeners(container);requestAnimationFrame(()=>animateRing(container));}

function attachSettingsPanelListeners(container) {
  // Language — rerender needed (changes all text)
  document.querySelectorAll('[data-lang]').forEach(btn =>
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setLang(btn.dataset.lang);
      document.getElementById('settings-panel')?.remove();
      state.showSettings = false;
      rerender(container);
    })
  );
  // Scale — rerender needed (changes font sizes)
  document.querySelectorAll('[data-scale]').forEach(btn =>
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setScale(btn.dataset.scale);
      document.getElementById('settings-panel')?.remove();
      state.showSettings = false;
      rerender(container);
    })
  );
  // Theme — rerender needed (changes colours)
  document.querySelectorAll('[data-theme-set]').forEach(btn =>
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setTheme(btn.dataset.themeSet);
      document.getElementById('settings-panel')?.remove();
      state.showSettings = false;
      rerender(container);
    })
  );
  // Sign out
  document.getElementById('btn-signout')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    await signOut();
    // app.js onAuthStateChanged fires → renderLogin() called automatically
  });
}
function refreshTaskArea(container){const area=container.querySelector('#task-area');if(!area)return;area.innerHTML=(state.taskDone&&state.reflected)?buildCompletionCard(getLang()):buildTaskCard(getLang());attachListeners(container);}
function updateStats(container){const pts=container.querySelector('#stat-pts');const gems=container.querySelector('#stat-gems');if(pts)pts.innerHTML=`${state.points}<span style="font-size:0.7em;color:var(--text-muted)">/${_monthProgress?.maxPoints??'—'}</span>`;if(gems)gems.textContent=`${state.gems}`;}

function showCelebration({icon,title,subtitle,gem,points}){const el=document.createElement('div');el.className='celebration-overlay';el.innerHTML=`<div class="celebration-card"><span class="celebration-icon">${icon}</span><div class="celebration-title">${title}</div><div class="celebration-subtitle">${subtitle}</div>${gem?`<div class="celebration-gem">💎 &nbsp;Reflection Preserved</div>`:''}<div class="celebration-points">${points}</div><button class="celebration-dismiss">${t('close')||'Continue'}</button></div>`;document.body.appendChild(el);const dismiss=()=>{el.style.animation='celebFadeIn 0.22s ease reverse forwards';setTimeout(()=>el.remove(),220);};el.querySelector('.celebration-dismiss').addEventListener('click',dismiss);el.addEventListener('click',e=>{if(e.target===el)dismiss();});setTimeout(dismiss,5000);}
function spawnParticles(colors){for(let i=0;i<30;i++)setTimeout(()=>{const p=document.createElement('div');p.className='particle';const sz=3+Math.random()*4;p.style.cssText=`left:${8+Math.random()*84}%;top:-8px;width:${sz}px;height:${sz}px;background:${colors[Math.floor(Math.random()*colors.length)]};border-radius:${Math.random()>.4?'50%':'2px'};animation-duration:${1.6+Math.random()*1.8}s;animation-delay:${Math.random()*.4}s;`;document.body.appendChild(p);setTimeout(()=>p.remove(),3500);},i*25);}

// ── Desktop nav links (in top navbar) ────────────────────────────────────
function buildDesktopNavLinks() {
  const hash   = window.location.hash.replace('#/','').replace('#','').trim();
  const active = hash || '';

  const items = [
    { route: '',        labelKey: 'nav_home',    icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/><path d="M9 21V12h6v9"/></svg>` },
    { route: 'reflect', labelKey: 'nav_reflect', icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>` },
    { route: 'archive', labelKey: 'nav_archive', icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="5" rx="1"/><path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/></svg>` },
  ];

  return `
  <div class="desktop-nav-links" role="navigation">
    ${items.map(item => `
      <button class="desktop-nav-link ${active === item.route ? 'active' : ''}"
              data-route="${item.route}">
        ${item.icon}
        ${t(item.labelKey)}
      </button>
    `).join('')}
  </div>`;
}

// ── Bottom nav ────────────────────────────────────────────────────────────
function buildBottomNav() {
  const hash = window.location.hash.replace('#/','').replace('#','').trim();
  const active = hash || '';

  const items = [
    {
      route: '',
      labelKey: 'nav_home',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
        <path d="M9 21V12h6v9"/>
      </svg>`,
    },
    {
      route: 'reflect',
      labelKey: 'nav_reflect',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9"/>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>`,
    },
    {
      route: 'archive',
      labelKey: 'nav_archive',
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="4" width="20" height="5" rx="1"/>
        <path d="M4 9v10a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9"/>
        <path d="M10 13h4"/>
      </svg>`,
    },
  ];

  const isDark = getResolvedTheme() === 'dark';
  const logoSrc = isDark ? 'icons/logo-dark.png' : 'icons/logo-light.png';

  return `
  <nav class="bottom-nav" role="navigation" aria-label="Main navigation">
    <div class="bottom-nav-brand">
      <img src="${logoSrc}" alt="Aamaal" class="bottom-nav-logo"
           onerror="this.style.display='none'"/>
    </div>
    ${items.map(item => `
      <button
        class="bottom-nav-item ${active === item.route ? 'active' : ''}"
        data-route="${item.route}"
        aria-label="${t(item.labelKey)}"
        aria-current="${active === item.route ? 'page' : 'false'}"
      >
        <span class="bottom-nav-icon">${item.icon}</span>
        <span class="bottom-nav-label">${t(item.labelKey)}</span>
      </button>
    `).join('')}
  </nav>`;
}


function injectStageStyles(){
  if(document.getElementById('stage-styles'))return;
  const s=document.createElement('style');s.id='stage-styles';
  s.textContent=`
    .stage-indicator{margin:0 16px 8px;}
    .stage-indicator-inner{background:var(--bg-card);border:1px solid var(--border-gold);border-radius:var(--r-md);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;gap:12px;}
    .stage-meta{display:flex;flex-direction:column;gap:4px;min-width:0;}
    .stage-category-pill{font-family:var(--font-display);font-size:0.6rem;letter-spacing:0.12em;text-transform:uppercase;color:var(--gold);background:rgba(201,168,76,0.1);border:1px solid var(--border-gold);border-radius:20px;padding:2px 8px;width:fit-content;}
    .stage-task-name{font-family:var(--font-display);font-size:0.78rem;color:var(--off-white);letter-spacing:0.03em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .stage-progress{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;}
    .stage-label-text{font-family:var(--font-body);font-size:0.7rem;color:var(--text-muted);white-space:nowrap;}
    .stage-dots{display:flex;gap:5px;align-items:center;}
    .stage-dot{width:7px;height:7px;border-radius:50%;background:var(--border);border:1px solid rgba(255,255,255,0.1);transition:all 0.2s ease;}
    .stage-dot-filled{background:var(--gold-dim);border-color:var(--gold-dim);}
    .stage-dot-current{background:var(--gold);border-color:var(--gold);box-shadow:0 0 6px rgba(201,168,76,0.5);transform:scale(1.2);}
  `;
  document.head.appendChild(s);
}
