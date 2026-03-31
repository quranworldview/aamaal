/**
 * api.js — Qur'an Foundation API Service
 * QUR'AN WORLD VIEW · Aamaal
 *
 * Handles all calls to api.quran.com v4
 * Used by Admin Panel for ayah auto-fetch when creating tasks.
 *
 * STATUS: Placeholder — full implementation in Step 9 (Admin Panel)
 *
 * Translation IDs (confirmed working):
 *   English: 131
 *   Urdu:    158
 *   Hindi:   180
 */

const BASE_URL = 'https://api.quran.com/api/v4';

/**
 * Fetch a single ayah with Arabic text and translations.
 * @param {number} surah - Surah number (1-114)
 * @param {number} ayah  - Ayah number
 * @returns {Promise<object>} - { arabic, translation: {en, hi, ur} }
 */
export async function fetchAyah(surah, ayah) {
  // Implementation in Step 9
  throw new Error('api.js not yet implemented — coming in Step 9');
}
