/**
 * ArabicText.js — Arabic Text Rendering
 * QUR'AN WORLD VIEW · Aamaal
 *
 * Every Arabic string in the app passes through this file.
 * Ensures consistent font (Amiri), direction (RTL), diacritics, and sizing.
 *
 * RULE: Never hardcode Arabic text directly in HTML templates or JS strings.
 *       Always use arabicText() or renderArabic().
 *
 * Two usage patterns:
 *
 *   1. arabicText(str, options)
 *      Returns an HTML string — use inside template literals.
 *      e.g. container.innerHTML = `<div>${arabicText(ayah)}</div>`
 *
 *   2. renderArabic(element, str, options)
 *      Sets innerHTML on a DOM element directly.
 *      e.g. renderArabic(document.getElementById('ayah'), text)
 */

// ─────────────────────────────────────────────
// DEFAULT OPTIONS
// ─────────────────────────────────────────────

const DEFAULTS = {
  size:      'md',      // 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  align:     'right',   // 'right' | 'center' | 'left'
  lineHeight:'1.9',     // Arabic needs generous line height for diacritics
  className: '',        // additional CSS class(es)
};

// Font size map — matches QWV design system scale
const SIZE_MAP = {
  'sm':  '1.2rem',
  'md':  '1.6rem',
  'lg':  '2.0rem',
  'xl':  '2.6rem',
  '2xl': '3.2rem',
};

// ─────────────────────────────────────────────
// arabicText(str, options?) → HTML string
// ─────────────────────────────────────────────

/**
 * Returns a fully styled <span> wrapping the Arabic text.
 * Use inside template literals for inline rendering.
 *
 * @param {string} str      - The Arabic text to render
 * @param {object} options  - Override defaults (size, align, lineHeight, className)
 * @returns {string}        - HTML string
 */
export function arabicText(str, options = {}) {
  if (!str) return '';
  const opts     = { ...DEFAULTS, ...options };
  const fontSize = SIZE_MAP[opts.size] || SIZE_MAP['md'];
  const classes  = ['arabic-text', opts.className].filter(Boolean).join(' ');

  return `<span
    class="${classes}"
    dir="rtl"
    lang="ar"
    style="
      font-family: 'Amiri', serif;
      font-size: ${fontSize};
      line-height: ${opts.lineHeight};
      text-align: ${opts.align};
      display: block;
      width: 100%;
    "
  >${str}</span>`;
}

// ─────────────────────────────────────────────
// renderArabic(element, str, options?) → void
// ─────────────────────────────────────────────

/**
 * Sets innerHTML of a DOM element to the rendered Arabic span.
 * Use when you have a reference to an existing element.
 *
 * @param {HTMLElement} element - Target DOM element
 * @param {string} str          - The Arabic text to render
 * @param {object} options      - Override defaults
 */
export function renderArabic(element, str, options = {}) {
  if (!element) return;
  element.innerHTML = arabicText(str, options);
}

// ─────────────────────────────────────────────
// arabicInline(str) → HTML string
// ─────────────────────────────────────────────

/**
 * Returns an inline <span> for Arabic within a mixed-direction sentence.
 * Use when Arabic appears mid-sentence alongside other text.
 * Does NOT display:block — flows inline with surrounding text.
 *
 * @param {string} str - The Arabic word or short phrase
 * @returns {string}   - HTML string
 */
export function arabicInline(str) {
  if (!str) return '';
  return `<span
    class="arabic-inline"
    dir="rtl"
    lang="ar"
    style="font-family: 'Amiri', serif; font-size: 1.1em;"
  >${str}</span>`;
}

// ─────────────────────────────────────────────
// buildAyahBlock(ayahData, lang) → HTML string
// ─────────────────────────────────────────────

/**
 * Builds a complete ayah display block:
 *   - Arabic text (large)
 *   - Translation in user's language
 *   - Surah:Ayah reference
 *
 * @param {object} ayahData - { arabic, translation: {en,hi,ur}, surah, ayah }
 * @param {string} lang     - 'en' | 'hi' | 'ur'
 * @returns {string}        - HTML string
 */
export function buildAyahBlock(ayahData, lang = 'en') {
  if (!ayahData) return '';

  const arabic      = ayahData.arabic      || '';
  const translation = ayahData.translation?.[lang]
                   || ayahData.translation?.['en']
                   || '';
  const ref         = ayahData.surah && ayahData.ayah
                    ? `${ayahData.surah}:${ayahData.ayah}`
                    : '';

  return `
    <div class="ayah-block">
      <div class="ayah-arabic">
        ${arabicText(arabic, { size: 'lg', align: 'right' })}
      </div>
      ${translation ? `
        <p class="ayah-translation" dir="${lang === 'ur' ? 'rtl' : 'ltr'}">
          ${translation}
        </p>` : ''}
      ${ref ? `<p class="ayah-ref">[${ref}]</p>` : ''}
    </div>
  `;
}
