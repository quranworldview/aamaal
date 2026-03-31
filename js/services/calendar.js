/**
 * calendar.js — Islamic Calendar Service
 * QUR'AN WORLD VIEW · Aamaal
 *
 * Answers three questions for the rest of the app:
 *   1. What Islamic month is it right now?
 *   2. What day number within that month?
 *   3. Is this a Ramadan month? (activates 3x multiplier + theme)
 *
 * Three-layer failsafe system:
 *   Layer 1 — Firestore (admin-set, human-verified, moon-sighting accurate)
 *   Layer 2 — AlAdhan API (reliable external Islamic calendar API, cached 24h)
 *   Layer 3 — Kuwaiti Algorithm (fully offline fallback, no dependency)
 *
 * RULE: No other file calculates Islamic dates. This file only.
 * RULE: Import and call getCalendarState() — consume the result, don't recompute.
 */

import { db } from './firebase.js';

// ─────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────

const CACHE_KEY      = 'qwv_hijri_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in ms
const ALADHAN_API    = 'https://api.aladhan.com/v1/gToH';

// The 12 Aamaal months in order (Shawwal = 1, Ramadan = 12)
// Islamic month numbers (1=Muharram ... 12=Dhul Hijjah) mapped to Aamaal position
const AAMAAL_MONTH_ORDER = [
  { key: 'shawwal',        islamicNumber: 10, aamaalNumber: 1  },
  { key: 'dhul-qadah',     islamicNumber: 11, aamaalNumber: 2  },
  { key: 'dhul-hijjah',    islamicNumber: 12, aamaalNumber: 3  },
  { key: 'muharram',       islamicNumber: 1,  aamaalNumber: 4  },
  { key: 'safar',          islamicNumber: 2,  aamaalNumber: 5  },
  { key: 'rabi-al-awwal',  islamicNumber: 3,  aamaalNumber: 6  },
  { key: 'rabi-al-thani',  islamicNumber: 4,  aamaalNumber: 7  },
  { key: 'jumada-al-ula',  islamicNumber: 5,  aamaalNumber: 8  },
  { key: 'jumada-al-thani',islamicNumber: 6,  aamaalNumber: 9  },
  { key: 'rajab',          islamicNumber: 7,  aamaalNumber: 10 },
  { key: 'shaban',         islamicNumber: 8,  aamaalNumber: 11 },
  { key: 'ramadan',        islamicNumber: 9,  aamaalNumber: 12, isRamadan: true },
];

// ─────────────────────────────────────────────
// MAIN EXPORT — the only function other files call
// ─────────────────────────────────────────────

/**
 * getCalendarState()
 * Returns the current Islamic calendar context for Aamaal.
 *
 * @returns {Promise<CalendarState>}
 *
 * CalendarState shape:
 * {
 *   monthKey:      string,   // e.g. 'muharram', 'ramadan'
 *   aamaalNumber:  number,   // 1–12 in the Aamaal year
 *   islamicNumber: number,   // 1–12 in the Hijri calendar
 *   dayOfMonth:    number,   // 1–30, current day within the Islamic month
 *   hijriYear:     number,   // e.g. 1447
 *   isRamadan:     boolean,
 *   source:        'firestore' | 'api' | 'algorithm',  // which layer answered
 *   firestoreMonth: object | null,  // raw Firestore month doc if found
 * }
 */
export async function getCalendarState() {
  const today = new Date();

  // ── Layer 1: Firestore (admin-set start dates) ──────────────────────────
  try {
    const firestoreResult = await _fromFirestore(today);
    if (firestoreResult) {
      console.log('[calendar] Source: Firestore');
      return { ...firestoreResult, source: 'firestore' };
    }
  } catch (e) {
    console.warn('[calendar] Firestore layer failed:', e.message);
  }

  // ── Layer 2: AlAdhan API (cached 24h) ───────────────────────────────────
  try {
    const apiResult = await _fromAPI(today);
    if (apiResult) {
      console.log('[calendar] Source: AlAdhan API');
      return { ...apiResult, source: 'api', firestoreMonth: null };
    }
  } catch (e) {
    console.warn('[calendar] API layer failed:', e.message);
  }

  // ── Layer 3: Kuwaiti Algorithm (fully offline) ──────────────────────────
  console.warn('[calendar] Source: Kuwaiti Algorithm (offline fallback)');
  const algoResult = _fromAlgorithm(today);
  return { ...algoResult, source: 'algorithm', firestoreMonth: null };
}

// ─────────────────────────────────────────────
// LAYER 1 — FIRESTORE
// ─────────────────────────────────────────────

/**
 * Checks Firestore for an admin-configured month whose start_date
 * is on or before today, and whose end_date is on or after today.
 * Returns a full CalendarState or null if nothing matches.
 */
async function _fromFirestore(today) {
  const todayStr = _toDateString(today); // 'YYYY-MM-DD'

  // Query aamaal_months for the active month
  // Admin sets start_date and end_date as 'YYYY-MM-DD' strings
  const snapshot = await db
    .collection('aamaal_months')
    .where('start_date', '<=', todayStr)
    .where('status', 'in', ['active', 'complete'])
    .orderBy('start_date', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) return null;

  const doc     = snapshot.docs[0];
  const data    = doc.data();

  // Confirm today is not past the end_date
  if (data.end_date && todayStr > data.end_date) return null;

  const startDate  = new Date(data.start_date + 'T00:00:00');
  const dayOfMonth = _daysBetween(startDate, today) + 1; // 1-indexed

  // Guard: day must be within the month length
  if (dayOfMonth < 1 || dayOfMonth > (data.total_days || 30)) return null;

  const monthMeta = _getMonthMeta(data.month_key);

  return {
    monthKey:      data.month_key,
    aamaalNumber:  monthMeta?.aamaalNumber  ?? data.month_number,
    islamicNumber: monthMeta?.islamicNumber ?? 0,
    dayOfMonth,
    hijriYear:     data.hijri_year,
    isRamadan:     data.is_ramadan ?? false,
    firestoreMonth: data,
  };
}

// ─────────────────────────────────────────────
// LAYER 2 — ALADHAN API
// ─────────────────────────────────────────────

/**
 * Fetches today's Hijri date from api.aladhan.com.
 * Result is cached in localStorage for 24 hours.
 */
async function _fromAPI(today) {
  // Check cache first
  const cached = _readCache();
  if (cached && _isSameDay(new Date(cached.fetchedAt), today)) {
    return _buildStateFromHijri(cached.hijriDay, cached.hijriMonth, cached.hijriYear, today);
  }

  const dd   = String(today.getDate()).padStart(2, '0');
  const mm   = String(today.getMonth() + 1).padStart(2, '0');
  const yyyy = today.getFullYear();

  const response = await fetch(`${ALADHAN_API}/${dd}-${mm}-${yyyy}`, {
    signal: AbortSignal.timeout(5000), // 5 second timeout — never hang the UI
  });

  if (!response.ok) throw new Error(`AlAdhan API responded ${response.status}`);

  const json = await response.json();
  const hijri = json?.data?.hijri;
  if (!hijri) throw new Error('AlAdhan API returned unexpected shape');

  const hijriDay   = parseInt(hijri.day, 10);
  const hijriMonth = parseInt(hijri.month.number, 10);
  const hijriYear  = parseInt(hijri.year, 10);

  // Cache for 24 hours
  _writeCache({ hijriDay, hijriMonth, hijriYear, fetchedAt: today.toISOString() });

  return _buildStateFromHijri(hijriDay, hijriMonth, hijriYear, today);
}

// ─────────────────────────────────────────────
// LAYER 3 — KUWAITI ALGORITHM
// ─────────────────────────────────────────────

/**
 * Calculates the Hijri date using the Kuwaiti/Microsoft algorithm.
 * Accurate to within 1–2 days. Pure math, zero dependencies.
 * Only used when both Firestore and the API are unavailable.
 */
function _fromAlgorithm(today) {
  const { day, month, year } = _kuwaitiToHijri(today);
  return _buildStateFromHijri(day, month, year, today);
}

/**
 * Kuwaiti algorithm implementation.
 * Converts a Gregorian Date to { day, month, year } in the Hijri calendar.
 */
function _kuwaitiToHijri(date) {
  const M = date.getMonth() + 1;
  const D = date.getDate();
  const Y = date.getFullYear();

  // Julian Day Number
  const JD = Math.floor((1461 * (Y + 4800 + Math.floor((M - 14) / 12))) / 4)
           + Math.floor((367  * (M - 2  - 12 * Math.floor((M - 14) / 12))) / 12)
           - Math.floor((3 * Math.floor((Y + 4900 + Math.floor((M - 14) / 12)) / 100)) / 4)
           + D - 32075;

  // Hijri conversion
  let l  = JD - 1948440 + 10632;
  const n  = Math.floor((l - 1) / 10631);
  l        = l - 10631 * n + 354;
  const j  = Math.floor((10985 - l) / 5316)
           * Math.floor((50 * l) / 17719)
           + Math.floor(l / 5670)
           * Math.floor((43 * l) / 15238);
  l        = l - Math.floor((30 - j) / 15)
           * Math.floor((17719 * j) / 50)
           - Math.floor(j / 16)
           * Math.floor((15238 * j) / 43) + 29;

  const month = Math.floor((24 * l) / 709);
  const day   = l - Math.floor((709 * month) / 24);
  const year  = 30 * n + j - 30;

  return { day, month, year };
}

// ─────────────────────────────────────────────
// SHARED HELPERS
// ─────────────────────────────────────────────

/**
 * Builds a CalendarState from raw Hijri day/month/year values.
 * Maps Islamic month number to Aamaal month key and position.
 */
function _buildStateFromHijri(hijriDay, hijriMonth, hijriYear, _today) {
  const monthMeta = AAMAAL_MONTH_ORDER.find(m => m.islamicNumber === hijriMonth);

  return {
    monthKey:      monthMeta?.key          ?? `month-${hijriMonth}`,
    aamaalNumber:  monthMeta?.aamaalNumber ?? hijriMonth,
    islamicNumber: hijriMonth,
    dayOfMonth:    hijriDay,
    hijriYear,
    isRamadan:     monthMeta?.isRamadan    ?? false,
    firestoreMonth: null,
  };
}

/** Returns the AAMAAL_MONTH_ORDER entry for a given month key. */
function _getMonthMeta(key) {
  return AAMAAL_MONTH_ORDER.find(m => m.key === key) ?? null;
}

/** Returns today's date as 'YYYY-MM-DD' string. */
function _toDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Returns the number of full days between two Date objects (ignoring time). */
function _daysBetween(dateA, dateB) {
  const msPerDay = 24 * 60 * 60 * 1000;
  const a = Date.UTC(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
  const b = Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
  return Math.floor((b - a) / msPerDay);
}

/** Returns true if two Date objects fall on the same calendar day. */
function _isSameDay(dateA, dateB) {
  return dateA.getFullYear() === dateB.getFullYear()
      && dateA.getMonth()    === dateB.getMonth()
      && dateA.getDate()     === dateB.getDate();
}

// ─────────────────────────────────────────────
// CACHE HELPERS (localStorage, 24h TTL)
// ─────────────────────────────────────────────

function _readCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Expire if older than CACHE_DURATION
    if (Date.now() - new Date(parsed.fetchedAt).getTime() > CACHE_DURATION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function _writeCache(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — fail silently
  }
}
