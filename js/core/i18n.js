/**
 * i18n.js — Internationalisation / Translation
 * QUR'AN WORLD VIEW · Aamaal
 *
 * Three languages: English (en), Hindi (hi), Urdu (ur)
 * Default: 'en' — change per user preference stored in Firebase + localStorage
 *
 * THE BOLCHAAL PRINCIPLE (Rule 0):
 * All Hindi and Urdu strings must use simple spoken register.
 * Never literary, never formal, never a barrier.
 * Use words a student in Indore or Karachi would say in conversation.
 *
 * Usage:
 *   import { t, setLang, getLang } from './i18n.js';
 *   t('today_task')   → "Today's Task" / "आज का काम" / "آج کا کام"
 */

// ─────────────────────────────────────────────
// LANGUAGE STATE
// ─────────────────────────────────────────────

const LANG_KEY = 'qwv_lang';
let _lang = localStorage.getItem(LANG_KEY) || 'en';

export function getLang()       { return _lang; }
export function isRTL()         { return _lang === 'ur'; }

export function setLang(lang) {
  if (!['en', 'hi', 'ur'].includes(lang)) return;
  _lang = lang;
  localStorage.setItem(LANG_KEY, lang);
  // Apply RTL direction to the document
  document.documentElement.setAttribute('lang', lang);
  document.documentElement.setAttribute('dir', lang === 'ur' ? 'rtl' : 'ltr');
}

/** Primary translation function. Returns string for current language. */
export function t(key) {
  return strings[_lang]?.[key] ?? strings['en']?.[key] ?? key;
}

// ─────────────────────────────────────────────
// STRING TABLE
// ─────────────────────────────────────────────

const strings = {

  // ── ENGLISH ──────────────────────────────────────────────────────────────
  en: {

    // App identity
    app_name:             'Aamaal',
    app_tagline:          'One deed. One day. One ayah behind it.',

    // Navigation & chrome
    nav_home:             'Today',
    nav_reflect:          'Reflect',
    nav_archive:          'Archive',
    nav_sign_out:         'Sign Out',

    // Language toggle
    lang_en:              'EN',
    lang_hi:              'HI',
    lang_ur:              'UR',

    // Theme toggle
    theme_dark:           'Dark',
    theme_light:          'Light',
    theme_system:         'System',

    // Auth / gate
    not_unlocked_title:   'Aamaal is Locked',
    not_unlocked_body:    'Complete Stage 2 (Alif) to unlock Aamaal. Keep going — you\'re close.',
    go_to_dashboard:      'Go to Dashboard',
    loading:              'Loading...',
    signing_out:          'Signing out...',

    // Home screen — month banner
    month_label:          'Month',
    theme_label:          'Theme',
    day_label:            'Day',

    // Home screen — stats row
    streak_label:         'Day Streak',
    streak_unit:          'days',
    points_label:         'Points',
    gems_label:           'Gems',
    this_month:           'This Month',

    // Home screen — today's task card
    todays_task:          'Today\'s Task',
    the_wisdom:           'The Wisdom',
    the_ayah:             'The Ayah',
    in_practice:          'In Practice',
    mark_done:            'Done',
    add_reflection:       'Reflect',
    task_done_label:      'Completed ✓',
    gem_earned_today:     'Gem earned today 💎',
    come_back_tomorrow:   'Come back tomorrow for the next task.',
    both_done_message:    'MashaAllah. You showed up today.',

    // Home screen — no active month
    no_month_title:       'Next Month Coming Soon',
    no_month_body:        'The next month\'s tasks are being prepared. Check back soon.',
    next_month_label:     'Next month begins',

    // Home screen — calendar dots
    calendar_title:       'This Month',
    day_full:             'Full — task + reflection',
    day_partial:          'Partial — task only',
    day_missed:           'Missed',
    day_future:           'Upcoming',

    // Reflection screen
    reflect_title:        'Your Reflection',
    reflect_prompt:       'What did this feel like to actually do today?',
    reflect_placeholder:  'Write 2–3 lines. No pressure — just honest.',
    reflect_submit:       'Submit Reflection',
    reflect_submitting:   'Saving...',
    reflect_success:      'Reflection saved. +10 points, +1 gem 💎',
    reflect_error:        'Something went wrong. Please try again.',
    reflect_already_done: 'You\'ve already reflected today. JazakAllah khair.',
    reflect_char_hint:    'Keep it brief — 2 or 3 lines is perfect.',

    // Archive screen
    archive_title:        'Your Journey',
    archive_empty:        'No completed months yet. Keep going.',
    archive_month_label:  'Month',
    archive_completion:   'Completion',
    archive_gems_earned:  'Gems Earned',
    archive_streak_peak:  'Longest Streak',
    archive_view_month:   'View Month',

    // Past day detail (modal)
    past_day_title:       'Day',
    past_day_task:        'The Task',
    past_day_reflection:  'Your Reflection',
    past_day_no_reflect:  'No reflection submitted.',
    past_day_points:      'Points Earned',
    close:                'Close',

    // Points & gems
    points_task:          '+10 pts',
    points_reflect:       '+10 pts',
    points_task_ramadan:  '+30 pts',
    points_reflect_ramadan: '+30 pts',
    gem_standard:         'Gem',
    gem_ramadan:          'Ramadan Gem',

    // Badges
    badge_muttaqi_label:  'Muttaqi',
    badge_muttaqi_desc:   'Completed all 30 days of Ramadan',
    badge_salik_label:    'Salik',
    badge_salik_desc:     '30 reflections in Ramadan — the Seeker',

    // Ramadan special
    ramadan_multiplier:   '3× Ramadan',
    ramadan_banner:       'Ramadan Mubarak — Every deed multiplied × 3',
    ramadan_bridge_title: 'Ramadan Has Begun',
    ramadan_bridge_body:  '11 months of preparation. Now the exam.',
    shaban_bridge_title:  'Sha\'ban Complete',
    shaban_bridge_body:   'You\'ve completed the full year of preparation. Ramadan begins soon.',

    // Errors & fallbacks
    error_load:           'Could not load. Please check your connection.',
    error_save:           'Could not save. Please try again.',
    error_generic:        'Something went wrong.',
    retry:                'Try Again',
  },

  // ── HINDI (bolchaal — spoken Hindustani, Devanagari script) ──────────────
  hi: {

    // App identity
    app_name:             'आमाल',
    app_tagline:          'एक काम। एक दिन। एक आयत उसके पीछे।',

    // Navigation & chrome
    nav_home:             'आज',
    nav_reflect:          'सोचें',
    nav_archive:          'पुराने',
    nav_sign_out:         'बाहर जाएं',

    // Language toggle
    lang_en:              'EN',
    lang_hi:              'हि',
    lang_ur:              'اُر',

    // Theme toggle
    theme_dark:           'डार्क',
    theme_light:          'लाइट',
    theme_system:         'सिस्टम',

    // Auth / gate
    not_unlocked_title:   'आमाल अभी बंद है',
    not_unlocked_body:    'आमाल खोलने के लिए पहले अलिफ़ पूरा करें। आप बिल्कुल करीब हैं।',
    go_to_dashboard:      'डैशबोर्ड पर जाएं',
    loading:              'लोड हो रहा है...',
    signing_out:          'बाहर जा रहे हैं...',

    // Home screen — month banner
    month_label:          'महीना',
    theme_label:          'थीम',
    day_label:            'दिन',

    // Home screen — stats row
    streak_label:         'दिन लगातार',
    streak_unit:          'दिन',
    points_label:         'पॉइंट्स',
    gems_label:           'जेम्स',
    this_month:           'इस महीने',

    // Home screen — today's task card
    todays_task:          'आज का काम',
    the_wisdom:           'इसकी हिकमत',
    the_ayah:             'क़ुरआन की आयत',
    in_practice:          'असल ज़िंदगी में',
    mark_done:            'कर लिया ✓',
    add_reflection:       'सोच लिखें',
    task_done_label:      'हो गया ✓',
    gem_earned_today:     'आज का जेम मिला 💎',
    come_back_tomorrow:   'कल का काम कल आएगा।',
    both_done_message:    'माशाअल्लाह। आज आप आए और किया।',

    // Home screen — no active month
    no_month_title:       'अगला महीना जल्द आएगा',
    no_month_body:        'अगले महीने के काम तैयार हो रहे हैं। थोड़ा इंतज़ार करें।',
    next_month_label:     'अगला महीना शुरू होगा',

    // Home screen — calendar dots
    calendar_title:       'इस महीने',
    day_full:             'पूरा — काम + सोच दोनों',
    day_partial:          'आधा — सिर्फ़ काम',
    day_missed:           'छूट गया',
    day_future:           'आने वाला',

    // Reflection screen
    reflect_title:        'आपकी सोच',
    reflect_prompt:       'आज यह काम करते वक़्त आपको कैसा लगा?',
    reflect_placeholder:  '२-३ लाइनें लिखें। जो दिल में आए, सच्चाई से।',
    reflect_submit:       'सोच जमा करें',
    reflect_submitting:   'सेव हो रहा है...',
    reflect_success:      'सोच सेव हो गई। +१० पॉइंट्स, +१ जेम 💎',
    reflect_error:        'कुछ गड़बड़ हो गई। दोबारा कोशिश करें।',
    reflect_already_done: 'आज की सोच पहले ही लिख दी है। जज़ाकल्लाह खैर।',
    reflect_char_hint:    'बस २-३ लाइनें काफ़ी हैं।',

    // Archive screen
    archive_title:        'आपका सफ़र',
    archive_empty:        'अभी कोई महीना पूरा नहीं हुआ। जारी रखें।',
    archive_month_label:  'महीना',
    archive_completion:   'पूरा हुआ',
    archive_gems_earned:  'जेम्स मिले',
    archive_streak_peak:  'सबसे लंबा स्ट्रीक',
    archive_view_month:   'देखें',

    // Past day detail
    past_day_title:       'दिन',
    past_day_task:        'काम था',
    past_day_reflection:  'आपकी सोच',
    past_day_no_reflect:  'कोई सोच नहीं लिखी थी।',
    past_day_points:      'पॉइंट्स मिले',
    close:                'बंद करें',

    // Points & gems
    points_task:          '+१० पॉइंट्स',
    points_reflect:       '+१० पॉइंट्स',
    points_task_ramadan:  '+३० पॉइंट्स',
    points_reflect_ramadan: '+३० पॉइंट्स',
    gem_standard:         'जेम',
    gem_ramadan:          'रमज़ान जेम',

    // Badges
    badge_muttaqi_label:  'मुत्तक़ी',
    badge_muttaqi_desc:   'रमज़ान के सभी ३० दिन पूरे किए',
    badge_salik_label:    'सालिक',
    badge_salik_desc:     'रमज़ान में ३० सोचें लिखीं — तलाशने वाला',

    // Ramadan special
    ramadan_multiplier:   '३× रमज़ान',
    ramadan_banner:       'रमज़ान मुबारक — हर काम × ३ गुना',
    ramadan_bridge_title: 'रमज़ान शुरू हो गया',
    ramadan_bridge_body:  '११ महीने की तैयारी। अब असली इम्तिहान।',
    shaban_bridge_title:  'शाबान पूरा हुआ',
    shaban_bridge_body:   'पूरे साल की तैयारी मुकम्मल। रमज़ान क़रीब है।',

    // Errors
    error_load:           'लोड नहीं हो सका। इंटरनेट चेक करें।',
    error_save:           'सेव नहीं हो सका। दोबारा कोशिश करें।',
    error_generic:        'कुछ गड़बड़ हो गई।',
    retry:                'फिर कोशिश करें',
  },

  // ── URDU (bolchaal — spoken Urdu, written right-to-left) ─────────────────
  ur: {

    // App identity
    app_name:             'اعمال',
    app_tagline:          'ایک کام۔ ایک دن۔ ایک آیت اس کے پیچھے۔',

    // Navigation & chrome
    nav_home:             'آج',
    nav_reflect:          'سوچیں',
    nav_archive:          'پرانے',
    nav_sign_out:         'باہر جائیں',

    // Language toggle
    lang_en:              'EN',
    lang_hi:              'हि',
    lang_ur:              'اُر',

    // Theme toggle
    theme_dark:           'ڈارک',
    theme_light:          'لائٹ',
    theme_system:         'سسٹم',

    // Auth / gate
    not_unlocked_title:   'اعمال ابھی بند ہے',
    not_unlocked_body:    'اعمال کھولنے کے لیے پہلے الف مکمل کریں۔ آپ بالکل قریب ہیں۔',
    go_to_dashboard:      'ڈیش بورڈ پر جائیں',
    loading:              'لوڈ ہو رہا ہے...',
    signing_out:          'باہر جا رہے ہیں...',

    // Home screen — month banner
    month_label:          'مہینہ',
    theme_label:          'تھیم',
    day_label:            'دن',

    // Home screen — stats row
    streak_label:         'دن لگاتار',
    streak_unit:          'دن',
    points_label:         'پوائنٹس',
    gems_label:           'جیمز',
    this_month:           'اس مہینے',

    // Home screen — today's task card
    todays_task:          'آج کا کام',
    the_wisdom:           'اس کی حکمت',
    the_ayah:             'قرآن کی آیت',
    in_practice:          'اصل زندگی میں',
    mark_done:            'ہو گیا ✓',
    add_reflection:       'سوچ لکھیں',
    task_done_label:      'مکمل ✓',
    gem_earned_today:     'آج کا جیم ملا 💎',
    come_back_tomorrow:   'کل کا کام کل آئے گا۔',
    both_done_message:    'ماشاءاللہ۔ آج آپ آئے اور کیا۔',

    // Home screen — no active month
    no_month_title:       'اگلا مہینہ جلد آئے گا',
    no_month_body:        'اگلے مہینے کے کام تیار ہو رہے ہیں۔ تھوڑا انتظار کریں۔',
    next_month_label:     'اگلا مہینہ شروع ہوگا',

    // Home screen — calendar dots
    calendar_title:       'اس مہینے',
    day_full:             'مکمل — کام + سوچ دونوں',
    day_partial:          'ادھورا — صرف کام',
    day_missed:           'چھوٹ گیا',
    day_future:           'آنے والا',

    // Reflection screen
    reflect_title:        'آپ کی سوچ',
    reflect_prompt:       'آج یہ کام کرتے وقت آپ کو کیسا لگا؟',
    reflect_placeholder:  '۲-۳ سطریں لکھیں۔ جو دل میں آئے، سچائی سے۔',
    reflect_submit:       'سوچ جمع کریں',
    reflect_submitting:   'سیو ہو رہا ہے...',
    reflect_success:      'سوچ سیو ہو گئی۔ +۱۰ پوائنٹس، +۱ جیم 💎',
    reflect_error:        'کچھ گڑبڑ ہو گئی۔ دوبارہ کوشش کریں۔',
    reflect_already_done: 'آج کی سوچ پہلے ہی لکھ دی ہے۔ جزاک اللہ خیر۔',
    reflect_char_hint:    'بس ۲-۳ سطریں کافی ہیں۔',

    // Archive screen
    archive_title:        'آپ کا سفر',
    archive_empty:        'ابھی کوئی مہینہ مکمل نہیں ہوا۔ جاری رکھیں۔',
    archive_month_label:  'مہینہ',
    archive_completion:   'مکمل ہوا',
    archive_gems_earned:  'جیمز ملے',
    archive_streak_peak:  'سب سے لمبا اسٹریک',
    archive_view_month:   'دیکھیں',

    // Past day detail
    past_day_title:       'دن',
    past_day_task:        'کام تھا',
    past_day_reflection:  'آپ کی سوچ',
    past_day_no_reflect:  'کوئی سوچ نہیں لکھی تھی۔',
    past_day_points:      'پوائنٹس ملے',
    close:                'بند کریں',

    // Points & gems
    points_task:          '+۱۰ پوائنٹس',
    points_reflect:       '+۱۰ پوائنٹس',
    points_task_ramadan:  '+۳۰ پوائنٹس',
    points_reflect_ramadan: '+۳۰ پوائنٹس',
    gem_standard:         'جیم',
    gem_ramadan:          'رمضان جیم',

    // Badges
    badge_muttaqi_label:  'متقی',
    badge_muttaqi_desc:   'رمضان کے سبھی ۳۰ دن مکمل کیے',
    badge_salik_label:    'سالک',
    badge_salik_desc:     'رمضان میں ۳۰ سوچیں لکھیں — تلاش کرنے والا',

    // Ramadan special
    ramadan_multiplier:   '۳× رمضان',
    ramadan_banner:       'رمضان مبارک — ہر کام × ۳ گنا',
    ramadan_bridge_title: 'رمضان شروع ہو گیا',
    ramadan_bridge_body:  '۱۱ مہینے کی تیاری۔ اب اصل امتحان۔',
    shaban_bridge_title:  'شعبان مکمل ہوا',
    shaban_bridge_body:   'پورے سال کی تیاری مکمل۔ رمضان قریب ہے۔',

    // Errors
    error_load:           'لوڈ نہیں ہو سکا۔ انٹرنیٹ چیک کریں۔',
    error_save:           'سیو نہیں ہو سکا۔ دوبارہ کوشش کریں۔',
    error_generic:        'کچھ گڑبڑ ہو گئی۔',
    retry:                'پھر کوشش کریں',
  },
};
