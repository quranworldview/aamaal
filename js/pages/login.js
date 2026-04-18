/**
 * login.js — Aamaal Login Screen
 * QUR'AN WORLD VIEW · Aamaal
 *
 * Shown when:
 *   - User is not logged in (show email/password form)
 *   - User is logged in but Aamaal is not unlocked (show locked screen)
 *
 * On successful login:
 *   - app.js re-checks gate and routes to home
 *
 * RULE: This page never calls db directly.
 * RULE: All auth via auth.js — signInWithEmail, signOut.
 */

import { getResolvedTheme }          from '../core/theme.js';
import { getLang, setLang }          from '../core/i18n.js';
import { signInWithEmail, signOut,
         isAamaalUnlocked,
         getUserProfile }            from '../core/auth.js';

// ── State ─────────────────────────────────────────────────────────────────
let _submitting = false;

// ── Entry — two modes ─────────────────────────────────────────────────────

/**
 * renderLogin(container)
 * Called by app.js when user is NOT logged in.
 */
export async function renderLogin(container) {
  _submitting = false;
  container.innerHTML = buildLoginHTML();
  attachLoginListeners(container);
  injectLoginStyles();
}

/**
 * renderLocked(container)
 * Called by app.js when user IS logged in but Aamaal is not unlocked.
 */
export async function renderLocked(container) {
  container.innerHTML = buildLockedHTML();
  attachLockedListeners(container);
  injectLoginStyles();
}

// ── Login HTML ────────────────────────────────────────────────────────────

function buildLoginHTML(errorCode = null) {
  const isDark  = getResolvedTheme() === 'dark';
  const lang    = getLang();
  const logoSrc = isDark ? 'icons/logo-dark.png' : 'icons/logo-light.png';
  const dir     = lang === 'ur' ? 'dir="rtl"' : '';

  const errorMsg = _errorMessage(errorCode, lang);

  return `
  <div class="login-root" ${dir}>

    <div class="login-card">

      <!-- Logo -->
      <div class="login-logo-wrap">
        <img src="${logoSrc}" alt="Aamaal" class="login-logo"
             onerror="this.style.display='none';this.nextElementSibling.style.display='block'"/>
        <div class="login-logo-fallback" style="display:none">أعمال</div>
      </div>

      <!-- Heading -->
      <div class="login-heading">
        <div class="login-title">
          ${lang==='ur' ? 'اعمال میں خوش آمدید' : lang==='hi' ? 'Aamaal में स्वागत है' : 'Welcome to Aamaal'}
        </div>
        <div class="login-subtitle">
          ${lang==='ur' ? 'ایک عمل۔ ایک دن۔ ایک آیت۔'
          : lang==='hi' ? 'एक अमल। एक दिन। एक आयत।'
          : 'One deed. One day. One āyah behind it.'}
        </div>
      </div>

      <!-- Form -->
      <div class="login-form">

        ${errorMsg ? `<div class="login-error" id="login-error">${errorMsg}</div>` : ''}

        <div class="login-field">
          <label class="login-label" for="login-email">
            ${lang==='ur' ? 'ای میل' : lang==='hi' ? 'ईमेल' : 'Email'}
          </label>
          <input
            class="login-input"
            id="login-email"
            type="email"
            autocomplete="email"
            inputmode="email"
            placeholder="${lang==='ur' ? 'آپ کا ای میل' : lang==='hi' ? 'आपका ईमेल' : 'your@email.com'}"
          />
        </div>

        <div class="login-field">
          <label class="login-label" for="login-password">
            ${lang==='ur' ? 'پاس ورڈ' : lang==='hi' ? 'पासवर्ड' : 'Password'}
          </label>
          <div class="login-password-wrap">
            <input
              class="login-input"
              id="login-password"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
            />
            <button class="login-toggle-pw" id="btn-toggle-pw" type="button" aria-label="Show password">
              <svg id="pw-eye" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            </button>
          </div>
        </div>

        <button class="login-btn" id="btn-login" type="button">
          ${_submitting
            ? `<span class="login-spinner"></span>`
            : (lang==='ur' ? 'داخل ہوں' : lang==='hi' ? 'लॉगिन करें' : 'Sign In')
          }
        </button>

      </div>

      <!-- Footer -->
      <div class="login-footer">
        <a class="login-footer-link" href="https://quranworldview.github.io/quranworldview/" target="_blank">
          ${lang==='ur' ? 'QWV ڈیش بورڈ' : lang==='hi' ? 'QWV डैशबोर्ड' : 'QWV Dashboard'}
        </a>
        <span class="login-footer-sep">·</span>
        <a class="login-footer-link" href="https://quranworldview.github.io/quranworldview/#/forgot" target="_blank">
          ${lang==='ur' ? 'پاس ورڈ بھول گئے؟' : lang==='hi' ? 'पासवर्ड भूल गए?' : 'Forgot password?'}
        </a>
      </div>

    </div>

    <!-- Language switcher — minimal, outside card -->
    <div class="login-lang-row">
      <button class="login-lang-btn ${lang==='en'?'active':''}" data-lang="en">EN</button>
      <button class="login-lang-btn ${lang==='hi'?'active':''}" data-lang="hi">हि</button>
      <button class="login-lang-btn ${lang==='ur'?'active':''}" data-lang="ur">اُ</button>
    </div>

  </div>`;
}

// ── Locked HTML ───────────────────────────────────────────────────────────

function buildLockedHTML() {
  const isDark   = getResolvedTheme() === 'dark';
  const lang     = getLang();
  const logoSrc  = isDark ? 'icons/logo-dark.png' : 'icons/logo-light.png';
  const dir      = lang === 'ur' ? 'dir="rtl"' : '';
  const profile  = getUserProfile();
  const name     = profile?.name || profile?.display_name || '';

  return `
  <div class="login-root" ${dir}>
    <div class="login-card">

      <div class="login-logo-wrap">
        <img src="${logoSrc}" alt="Aamaal" class="login-logo"
             onerror="this.style.display='none';this.nextElementSibling.style.display='block'"/>
        <div class="login-logo-fallback" style="display:none">أعمال</div>
      </div>

      <div class="locked-icon">🔒</div>

      <div class="login-heading">
        <div class="login-title" style="font-size:1rem">
          ${name
            ? (lang==='ur' ? `${name}، Aamaal ابھی آپ کے لیے نہیں کھلا`
              : lang==='hi' ? `${name}, Aamaal अभी आपके लिए नहीं खुला`
              : `${name}, Aamaal isn't unlocked for you yet`)
            : (lang==='ur' ? 'Aamaal ابھی آپ کے لیے نہیں کھلا'
              : lang==='hi' ? 'Aamaal अभी आपके लिए नहीं खुला'
              : "Aamaal isn't unlocked for you yet")
          }
        </div>
        <div class="login-subtitle" style="margin-top:8px">
          ${lang==='ur' ? 'QWV ڈیش بورڈ پر جائیں اور اپنا سفر شروع کریں۔'
          : lang==='hi' ? 'QWV डैशबोर्ड पर जाएं और अपना सफ़र शुरू करें।'
          : 'Visit the QWV Dashboard to begin your journey.'}
        </div>
      </div>

      <a class="login-btn" style="text-decoration:none;text-align:center;display:block"
         href="https://quranworldview.github.io/quranworldview/">
        ${lang==='ur' ? 'QWV ڈیش بورڈ' : lang==='hi' ? 'QWV डैशबोर्ड जाएं' : 'Go to QWV Dashboard'}
      </a>

      <button class="login-footer-link" id="btn-signout" style="background:none;border:none;cursor:pointer;margin-top:16px;width:100%;text-align:center">
        ${lang==='ur' ? 'لاگ آوٹ' : lang==='hi' ? 'लॉगआउट करें' : 'Sign out'}
      </button>

    </div>
  </div>`;
}

// ── Login listeners ───────────────────────────────────────────────────────

function attachLoginListeners(container) {
  const emailInput = container.querySelector('#login-email');
  const pwInput    = container.querySelector('#login-password');
  const btnLogin   = container.querySelector('#btn-login');
  const btnTogglePw = container.querySelector('#btn-toggle-pw');

  // Language switcher — re-render login screen in new language
  container.querySelectorAll('[data-lang]').forEach(btn =>
    btn.addEventListener('click', () => {
      setLang(btn.dataset.lang);
      container.innerHTML = buildLoginHTML();
      attachLoginListeners(container);
    })
  );

  // Show/hide password
  btnTogglePw?.addEventListener('click', () => {
    const isText = pwInput.type === 'text';
    pwInput.type = isText ? 'password' : 'text';
    btnTogglePw.style.opacity = isText ? '0.5' : '1';
  });

  // Enter key on either field → submit
  [emailInput, pwInput].forEach(el =>
    el?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btnLogin?.click();
    })
  );

  // Login button
  btnLogin?.addEventListener('click', async () => {
    if (_submitting) return;
    const email    = emailInput?.value?.trim();
    const password = pwInput?.value;
    const lang     = getLang();

    // Basic validation
    if (!email || !password) {
      _showError(container, lang==='ur' ? 'ای میل اور پاس ورڈ درج کریں'
                           : lang==='hi' ? 'ईमेल और पासवर्ड डालें'
                           : 'Please enter your email and password');
      return;
    }

    _submitting = true;
    btnLogin.innerHTML = `<span class="login-spinner"></span>`;
    btnLogin.disabled = true;
    _clearError(container);

    const result = await signInWithEmail(email, password);

    _submitting = false;

    if (result.success) {
      // app.js onAuthStateChanged will fire, re-evaluate gate, and route to home
      // Nothing to do here — just show a brief success state
      btnLogin.innerHTML = '✓';
    } else {
      btnLogin.innerHTML = lang==='ur' ? 'داخل ہوں' : lang==='hi' ? 'लॉगिन करें' : 'Sign In';
      btnLogin.disabled = false;
      _showError(container, _errorMessage(result.code, lang));
    }
  });
}

function attachLockedListeners(container) {
  container.querySelector('#btn-signout')?.addEventListener('click', async () => {
    await signOut();
    // onAuthStateChanged in app.js will fire and re-render login screen
  });
}

// ── Error helpers ─────────────────────────────────────────────────────────

function _errorMessage(code, lang) {
  if (!code) return null;
  const msgs = {
    'auth/user-not-found':    { en: 'No account found with this email.',      hi: 'इस ईमेल से कोई अकाउंट नहीं मिला।',   ur: 'یہ ای میل رجسٹرڈ نہیں ہے۔'       },
    'auth/wrong-password':    { en: 'Incorrect password. Please try again.',  hi: 'पासवर्ड ग़लत है। दोबारा कोशिश करें।', ur: 'پاس ورڈ غلط ہے۔ دوبارہ کوشش کریں۔' },
    'auth/invalid-email':     { en: 'Please enter a valid email address.',    hi: 'सही ईमेल एड्रेस डालें।',              ur: 'درست ای میل درج کریں۔'             },
    'auth/too-many-requests': { en: 'Too many attempts. Please wait a moment.', hi: 'बहुत कोशिशें हो गईं। थोड़ा रुकें।', ur: 'بہت کوششیں ہوئیں۔ تھوڑا رکیں۔'    },
    'auth/network-request-failed': { en: 'Network error. Check your connection.', hi: 'नेटवर्क एरर। कनेक्शन चेक करें।', ur: 'نیٹ ورک خرابی۔ کنیکشن چیک کریں۔'  },
    'auth/invalid-credential':{ en: 'Incorrect email or password.',           hi: 'ईमेल या पासवर्ड ग़लत है।',            ur: 'ای میل یا پاس ورڈ غلط ہے۔'        },
  };
  const m = msgs[code];
  if (!m) return lang==='ur' ? 'کچھ غلط ہو گیا۔ دوبارہ کوشش کریں۔'
                : lang==='hi' ? 'कुछ ग़लत हो गया। दोबारा कोशिश करें।'
                : 'Something went wrong. Please try again.';
  return m[lang] || m.en;
}

function _showError(container, msg) {
  let el = container.querySelector('#login-error');
  if (!el) {
    el = document.createElement('div');
    el.id = 'login-error';
    el.className = 'login-error';
    container.querySelector('.login-form')?.prepend(el);
  }
  el.textContent = msg;
  el.style.display = 'block';
}

function _clearError(container) {
  const el = container.querySelector('#login-error');
  if (el) el.style.display = 'none';
}

// ── Styles ────────────────────────────────────────────────────────────────

function injectLoginStyles() {
  if (document.getElementById('login-styles')) return;
  const s = document.createElement('style');
  s.id = 'login-styles';
  s.textContent = `
    .login-root {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px 16px 40px;
      background: var(--bg);
    }
    .login-card {
      width: 100%;
      max-width: 400px;
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--r-lg);
      padding: 32px 28px 28px;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }
    .login-logo-wrap {
      display: flex;
      justify-content: center;
    }
    .login-logo {
      height: 36px;
      object-fit: contain;
    }
    .login-logo-fallback {
      font-family: var(--font-arabic);
      font-size: 1.6rem;
      color: var(--gold);
    }
    .login-heading {
      text-align: center;
    }
    .login-title {
      font-family: var(--font-display);
      font-size: 1.05rem;
      letter-spacing: 0.04em;
      color: var(--off-white);
      margin-bottom: 6px;
    }
    .login-subtitle {
      font-family: var(--font-serif);
      font-style: italic;
      font-size: 0.85rem;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .login-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .login-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .login-label {
      font-family: var(--font-display);
      font-size: 0.6rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .login-input {
      width: 100%;
      background: var(--bg-surface, rgba(255,255,255,0.04));
      border: 1px solid var(--border);
      border-radius: var(--r-sm);
      padding: 11px 14px;
      font-family: var(--font-body);
      font-size: 0.95rem;
      color: var(--text);
      outline: none;
      transition: border-color var(--transition);
      box-sizing: border-box;
    }
    .login-input:focus {
      border-color: var(--border-gold);
    }
    .login-input::placeholder {
      color: var(--text-muted);
      opacity: 0.5;
    }
    .login-password-wrap {
      position: relative;
    }
    .login-password-wrap .login-input {
      padding-right: 42px;
    }
    .login-toggle-pw {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      padding: 4px;
      display: flex;
      align-items: center;
      opacity: 0.6;
      transition: opacity var(--transition);
    }
    .login-toggle-pw:hover { opacity: 1; }
    .login-error {
      background: rgba(224, 112, 112, 0.1);
      border: 1px solid rgba(224, 112, 112, 0.3);
      border-radius: var(--r-sm);
      padding: 10px 14px;
      font-family: var(--font-body);
      font-size: 0.82rem;
      color: #E07070;
      line-height: 1.5;
    }
    .login-btn {
      width: 100%;
      background: var(--gold);
      color: #0A0C10;
      border: none;
      border-radius: var(--r-sm);
      padding: 13px;
      font-family: var(--font-display);
      font-size: 0.78rem;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      cursor: pointer;
      transition: opacity var(--transition), background var(--transition);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      min-height: 46px;
    }
    .login-btn:hover   { opacity: 0.88; }
    .login-btn:active  { opacity: 0.75; }
    .login-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .login-spinner {
      width: 16px; height: 16px;
      border: 2px solid rgba(0,0,0,0.2);
      border-top-color: #0A0C10;
      border-radius: 50%;
      animation: loginSpin 0.7s linear infinite;
      display: inline-block;
    }
    @keyframes loginSpin { to { transform: rotate(360deg); } }
    .login-footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      font-family: var(--font-display);
      font-size: 0.62rem;
      letter-spacing: 0.06em;
    }
    .login-footer-link {
      color: var(--text-muted);
      text-decoration: none;
      transition: color var(--transition);
    }
    .login-footer-link:hover { color: var(--gold); }
    .login-footer-sep { color: var(--border); }
    .login-lang-row {
      display: flex;
      gap: 8px;
      margin-top: 20px;
    }
    .login-lang-btn {
      background: none;
      border: 1px solid var(--border);
      border-radius: 20px;
      padding: 4px 12px;
      font-family: var(--font-display);
      font-size: 0.65rem;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      cursor: pointer;
      transition: all var(--transition);
    }
    .login-lang-btn.active,
    .login-lang-btn:hover {
      border-color: var(--border-gold);
      color: var(--gold);
    }
    .locked-icon {
      font-size: 2.2rem;
      text-align: center;
    }
  `;
  document.head.appendChild(s);
}
