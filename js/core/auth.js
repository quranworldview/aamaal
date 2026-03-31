/**
 * auth.js — Authentication State Management
 * QUR'AN WORLD VIEW · Aamaal
 *
 * Handles:
 * - Auth state listener (login / logout)
 * - Fetching the user's Firestore profile
 * - Aamaal gate check (gate_status.aamaal === 'unlocked')
 * - Exposing the current user and profile to the rest of the app
 *
 * RULE: No page file calls firebase.auth() directly.
 *       All auth operations go through this file.
 */

import { auth, db, COLLECTIONS } from './firebase.js';

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────

let _currentUser    = null;   // Firebase Auth user object
let _userProfile    = null;   // Firestore users/{uid} document data
let _authReady      = false;
let _readyCallbacks = [];

// ─────────────────────────────────────────────
// PUBLIC ACCESSORS
// ─────────────────────────────────────────────

export function getCurrentUser()  { return _currentUser; }
export function getUserProfile()  { return _userProfile; }
export function isLoggedIn()      { return _currentUser !== null; }
export function isAuthReady()     { return _authReady; }

/**
 * Returns a Promise that resolves once the initial auth state is known.
 * Use this in app.js before rendering anything.
 */
export function waitForAuth() {
  if (_authReady) return Promise.resolve(_currentUser);
  return new Promise(resolve => _readyCallbacks.push(resolve));
}

/**
 * Returns true if the current user has Aamaal unlocked.
 * Gate check — always read from _userProfile, never trust client-side state alone.
 */
export function isAamaalUnlocked() {
  if (!_userProfile) return false;
  return _userProfile.gate_status?.aamaal === 'unlocked'
      || _userProfile.member_tier === 'admin';  // admins always have access
}

/**
 * Returns the user's language preference.
 * Falls back to localStorage, then 'en'.
 */
export function getUserLang() {
  return _userProfile?.language
      || localStorage.getItem('qwv_lang')
      || 'en';
}

// ─────────────────────────────────────────────
// AUTH STATE LISTENER
// ─────────────────────────────────────────────

/**
 * initAuth(onLogin, onLogout)
 * Starts listening to Firebase auth state changes.
 * Call once from app.js on boot.
 *
 * @param {function} onLogin   - Called with (user, profile) when logged in
 * @param {function} onLogout  - Called when logged out
 */
export function initAuth(onLogin, onLogout) {
  auth.onAuthStateChanged(async (user) => {
    if (user) {
      _currentUser = user;
      try {
        _userProfile = await _fetchProfile(user.uid);
      } catch (e) {
        console.error('[auth] Failed to fetch user profile:', e);
        _userProfile = null;
      }
      _markReady(user);
      if (typeof onLogin === 'function') onLogin(user, _userProfile);
    } else {
      _currentUser = null;
      _userProfile = null;
      _markReady(null);
      if (typeof onLogout === 'function') onLogout();
    }
  });
}

// ─────────────────────────────────────────────
// SIGN OUT
// ─────────────────────────────────────────────

export async function signOut() {
  try {
    await auth.signOut();
  } catch (e) {
    console.error('[auth] Sign out failed:', e);
    throw e;
  }
}

// ─────────────────────────────────────────────
// PROFILE REFRESH
// ─────────────────────────────────────────────

/**
 * Refreshes the cached user profile from Firestore.
 * Call after progress.js writes that change gate_status or tier.
 */
export async function refreshProfile() {
  if (!_currentUser) return null;
  try {
    _userProfile = await _fetchProfile(_currentUser.uid);
    return _userProfile;
  } catch (e) {
    console.error('[auth] Profile refresh failed:', e);
    return null;
  }
}

// ─────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────

async function _fetchProfile(uid) {
  const snap = await db.collection(COLLECTIONS.USERS).doc(uid).get();
  if (!snap.exists) {
    console.warn('[auth] No user profile found for uid:', uid);
    return null;
  }
  return { uid, ...snap.data() };
}

function _markReady(user) {
  _authReady = true;
  _readyCallbacks.forEach(cb => cb(user));
  _readyCallbacks = [];
}
