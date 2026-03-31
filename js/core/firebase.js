/**
 * firebase.js — Firebase Initialisation
 * QUR'AN WORLD VIEW · Aamaal
 *
 * Firebase v8 compat SDK — loaded via CDN script tags in index.html.
 * Do NOT use v10 syntax. Do NOT import firebase modules here.
 * This file assumes firebase-app.js, firebase-auth.js, firebase-firestore.js
 * are already loaded as <script> tags before this module runs.
 *
 * Project: quranworldview-home (single shared project across all QWV apps)
 */

// ─────────────────────────────────────────────
// FIREBASE CONFIG
// Replace messagingSenderId and appId with real values from Firebase Console
// apiKey and projectId are confirmed correct — do not change
// ─────────────────────────────────────────────

const firebaseConfig = {
  apiKey:            'AIzaSyCqxgyulLw6nitLSjn89M1u0A7bxbWlt_U',
  authDomain:        'quranworldview-home.firebaseapp.com',
  projectId:         'quranworldview-home',
  storageBucket:     'quranworldview-home.firebasestorage.app',
  messagingSenderId: '349899904697',   // ← replace before deploy
  appId:             '1:349899904697:web:b78d66af8f9af2cb80ad68',      // ← replace before deploy
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const db   = firebase.firestore();
export const auth = firebase.auth();

// ─────────────────────────────────────────────
// COLLECTION NAME CONSTANTS
// Always use these — never type collection names as raw strings.
// Prevents typos. One place to update if a name ever changes.
// ─────────────────────────────────────────────

export const COLLECTIONS = {
  // Shared across all QWV apps
  USERS:               'users',
  LIBRARY:             'library',
  NOTIFICATIONS:       'notifications',
  BLOG:                'blog',
  CONFIG:              'config',
  APPLICATIONS:        'applications',
  SABIQUN_RESPONSES:   'sabiqun_responses',
  USER_REFLECTIONS:    'user_reflections',

  // Aamaal-specific top-level collections
  AAMAAL_PROGRESS:     'aamaal_progress',   // aamaal_progress/{uid}
  AAMAAL_MONTHS:       'aamaal_months',     // aamaal_months/{monthKey}
  AAMAAL_REFLECTIONS:  'aamaal_reflections', // aamaal_reflections/{uid}
};

export const SUB_COLLECTIONS = {
  // Under aamaal_progress/{uid}
  MONTHS:              'months',   // aamaal_progress/{uid}/months/{monthKey}

  // Under aamaal_months/{monthKey}
  TASKS:               'tasks',    // aamaal_months/{monthKey}/tasks/{day}

  // Under aamaal_reflections/{uid}
  ENTRIES:             'entries',  // aamaal_reflections/{uid}/entries/{date}

  // Under notifications/{uid}
  ITEMS:               'items',    // notifications/{uid}/items/{docId}
};
