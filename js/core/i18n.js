/**
 * i18n.js — Internationalisation
 * QUR'AN WORLD VIEW · Aamaal
 *
 * THE BOLCHAAL PRINCIPLE (Rule 0):
 * All Hindi and Urdu strings must use simple spoken register.
 * Never literary, never formal, never a barrier.
 */

const LANG_KEY = 'qwv_lang';
let _lang = localStorage.getItem(LANG_KEY) || 'en';

export function getLang() { return _lang; }
export function isRTL()   { return _lang === 'ur'; }

export function setLang(lang) {
  if (!['en', 'hi', 'ur'].includes(lang)) return;
  _lang = lang;
  localStorage.setItem(LANG_KEY, lang);
  // Drive CSS: RTL direction + Nastaliq font via data-lang
  document.documentElement.setAttribute('lang',      lang);
  document.documentElement.setAttribute('dir',       lang === 'ur' ? 'rtl' : 'ltr');
  document.documentElement.setAttribute('data-lang', lang);
}

// Apply on boot
setLang(_lang);

export function t(key) {
  return strings[_lang]?.[key] ?? strings['en']?.[key] ?? key;
}

const strings = {

  en: {
    app_name:             'Aamaal',
    app_tagline:          'One deed. One day. One ayah behind it.',
    nav_home:             'Today',
    nav_reflect:          'Reflect',
    nav_archive:          'Archive',
    nav_sign_out:         'Sign Out',
    lang_en:              'EN',
    lang_hi:              'HI',
    lang_ur:              'UR',
    theme_dark:           'Dark',
    theme_light:          'Light',
    theme_system:         'System',
    not_unlocked_title:   'Aamaal is Locked',
    not_unlocked_body:    'Complete Stage 2 (Alif) to unlock Aamaal.',
    go_to_dashboard:      'Go to Dashboard',
    loading:              'Loading...',
    month_label:          'Month',
    theme_label:          'Theme',
    day_label:            'Day',
    streak_label:         'Days Consistent',
    points_label:         'This Month',
    gems_label:           'Words Preserved',
    this_month:           'This Month',
    todays_task:          "Today's Task",
    the_wisdom:           'The Wisdom',
    the_ayah:             'The Ayah',
    in_practice:          'In Practice',
    // Button labels — NO tick mark here, the button adds its own icon
    mark_done:            'Done',
    add_reflection:       'Reflect',
    task_done_label:      'Completed',
    gem_earned_today:     'Reflection Preserved · +1',
    come_back_tomorrow:   'Come back tomorrow for the next task.',
    both_done_message:    'MashaAllah. You showed up today.',
    no_month_title:       'Next Month Coming Soon',
    no_month_body:        'Tasks are being prepared. Check back soon.',
    calendar_title:       'This Month',
    reflect_title:        'Your Reflection',
    reflect_prompt:       'What did this feel like to actually do today?',
    reflect_placeholder:  'Write 2–3 lines. Just honest.',
    reflect_submit:       'Submit',
    reflect_submitting:   'Saving...',
    reflect_success:      'Reflection saved. +10 points, +1 word preserved.',
    reflect_error:        'Something went wrong. Please try again.',
    reflect_already_done: 'Already reflected today. JazakAllah khair.',
    archive_title:        'Your Journey',
    archive_empty:        'No completed months yet. Keep going.',
    close:                'Close',
    error_load:           'Could not load. Check your connection.',
    error_save:           'Could not save. Please try again.',
    error_generic:        'Something went wrong.',
    retry:                'Try Again',
    text_size:            'Text Size',
    ramadan_banner:       'Ramadan Mubarak — Every deed × 3',
  },

  hi: {
    app_name:             'आमाल',
    app_tagline:          'एक काम। एक दिन। एक आयत उसके पीछे।',
    nav_home:             'आज',
    nav_reflect:          'सोचें',
    nav_archive:          'पुराने',
    nav_sign_out:         'बाहर जाएं',
    lang_en:              'EN',
    lang_hi:              'हि',
    lang_ur:              'اُر',
    theme_dark:           'डार्क',
    theme_light:          'लाइट',
    theme_system:         'सिस्टम',
    not_unlocked_title:   'आमाल अभी बंद है',
    not_unlocked_body:    'आमाल खोलने के लिए पहले अलिफ़ पूरा करें।',
    go_to_dashboard:      'डैशबोर्ड पर जाएं',
    loading:              'लोड हो रहा है...',
    month_label:          'महीना',
    theme_label:          'थीम',
    day_label:            'दिन',
    streak_label:         'दिन लगातार',
    points_label:         'इस महीने',
    gems_label:           'बातें महफ़ूज़',
    this_month:           'इस महीने',
    todays_task:          'आज का काम',
    the_wisdom:           'इसकी हिकमत',
    the_ayah:             'क़ुरआन की आयत',
    in_practice:          'असल ज़िंदगी में',
    mark_done:            'कर लिया',
    add_reflection:       'सोच लिखें',
    task_done_label:      'हो गया',
    gem_earned_today:     'सोच महफ़ूज़ · +१',
    come_back_tomorrow:   'कल का काम कल आएगा।',
    both_done_message:    'माशाअल्लाह। आज आप आए और किया।',
    no_month_title:       'अगला महीना जल्द आएगा',
    no_month_body:        'काम तैयार हो रहे हैं। थोड़ा इंतज़ार करें।',
    calendar_title:       'इस महीने',
    reflect_title:        'आपकी सोच',
    reflect_prompt:       'आज यह काम करते वक़्त कैसा लगा?',
    reflect_placeholder:  '२-३ लाइनें लिखें। जो दिल में आए।',
    reflect_submit:       'जमा करें',
    reflect_submitting:   'सेव हो रहा है...',
    reflect_success:      'सोच सेव हो गई। +१० पॉइंट्स, +१ जेम।',
    reflect_error:        'कुछ गड़बड़ हो गई। दोबारा कोशिश करें।',
    reflect_already_done: 'आज की सोच पहले ही लिखी है।',
    archive_title:        'आपका सफ़र',
    archive_empty:        'अभी कोई महीना पूरा नहीं हुआ।',
    close:                'बंद करें',
    error_load:           'लोड नहीं हो सका। इंटरनेट चेक करें।',
    error_save:           'सेव नहीं हो सका। दोबारा कोशिश करें।',
    error_generic:        'कुछ गड़बड़ हो गई।',
    retry:                'फिर कोशिश करें',
    text_size:            'टेक्स्ट साइज़',
    ramadan_banner:       'रमज़ान मुबारक — हर काम × ३ गुना',
  },

  ur: {
    app_name:             'اعمال',
    app_tagline:          'ایک کام۔ ایک دن۔ ایک آیت اس کے پیچھے۔',
    nav_home:             'آج',
    nav_reflect:          'سوچیں',
    nav_archive:          'پرانے',
    nav_sign_out:         'باہر جائیں',
    lang_en:              'EN',
    lang_hi:              'हि',
    lang_ur:              'اُر',
    theme_dark:           'ڈارک',
    theme_light:          'لائٹ',
    theme_system:         'سسٹم',
    not_unlocked_title:   'اعمال ابھی بند ہے',
    not_unlocked_body:    'اعمال کھولنے کے لیے پہلے الف مکمل کریں۔',
    go_to_dashboard:      'ڈیش بورڈ پر جائیں',
    loading:              'لوڈ ہو رہا ہے...',
    month_label:          'مہینہ',
    theme_label:          'تھیم',
    day_label:            'دن',
    streak_label:         'دن لگاتار',
    points_label:         'اس مہینے',
    gems_label:           'باتیں محفوظ',
    this_month:           'اس مہینے',
    todays_task:          'آج کا کام',
    the_wisdom:           'اس کی حکمت',
    the_ayah:             'قرآن کی آیت',
    in_practice:          'اصل زندگی میں',
    mark_done:            'ہو گیا',
    add_reflection:       'سوچ لکھیں',
    task_done_label:      'مکمل',
    gem_earned_today:     'سوچ محفوظ · +۱',
    come_back_tomorrow:   'کل کا کام کل آئے گا۔',
    both_done_message:    'ماشاءاللہ۔ آج آپ آئے اور کیا۔',
    no_month_title:       'اگلا مہینہ جلد آئے گا',
    no_month_body:        'کام تیار ہو رہے ہیں۔ تھوڑا انتظار کریں۔',
    calendar_title:       'اس مہینے',
    reflect_title:        'آپ کی سوچ',
    reflect_prompt:       'آج یہ کام کرتے وقت کیسا لگا؟',
    reflect_placeholder:  '۲-۳ سطریں لکھیں۔ جو دل میں آئے۔',
    reflect_submit:       'جمع کریں',
    reflect_submitting:   'سیو ہو رہا ہے...',
    reflect_success:      'سوچ سیو ہو گئی۔ +۱۰ پوائنٹس، +۱ جیم۔',
    reflect_error:        'کچھ گڑبڑ ہو گئی۔ دوبارہ کوشش کریں۔',
    reflect_already_done: 'آج کی سوچ پہلے ہی لکھ دی ہے۔',
    archive_title:        'آپ کا سفر',
    archive_empty:        'ابھی کوئی مہینہ مکمل نہیں ہوا۔',
    close:                'بند کریں',
    error_load:           'لوڈ نہیں ہو سکا۔ انٹرنیٹ چیک کریں۔',
    error_save:           'سیو نہیں ہو سکا۔ دوبارہ کوشش کریں۔',
    error_generic:        'کچھ گڑبڑ ہو گئی۔',
    retry:                'پھر کوشش کریں',
    text_size:            'متن کا سائز',
    ramadan_banner:       'رمضان مبارک — ہر کام × ۳ گنا',
  },
};
