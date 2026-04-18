/**
 * progress.js — Aamaal Progress Service
 * QUR'AN WORLD VIEW · Aamaal
 *
 * ALL Firestore reads and writes for Aamaal go through this file.
 * No page file ever calls db directly.
 *
 * Read functions:
 *   getTodayProgress(monthKey, dayNumber)   → { taskDone, reflected, points, gemEarned }
 *   getMonthProgress(monthKey)              → { days, totalPoints, totalGems, streak, longestStreak }
 *
 * Write functions:
 *   saveTaskDone(monthKey, dayNumber, taskId, stage, isRamadan)
 *   saveReflection(monthKey, dayNumber, taskId, stage, text, lang, isRamadan)
 *   updateTaskHistory(taskId, stage, monthKey, reflectionId)
 *   checkAndAwardRamadanBadges(monthKey, hijriYear)
 *   setFirstLoginComplete()
 */

import { db, auth, COLLECTIONS } from '../core/firebase.js';

// ── Helpers ────────────────────────────────────────────────────────────────

function _uid()       { return auth.currentUser?.uid ?? null; }
function _today()     { return new Date().toISOString().slice(0, 10); }
function _serverTs()  { return firebase.firestore.FieldValue.serverTimestamp(); }
function _increment(n){ return firebase.firestore.FieldValue.increment(n); }

function _daysBetween(dateStrA, dateStrB) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((new Date(dateStrB) - new Date(dateStrA)) / msPerDay);
}

// ── getTodayProgress ───────────────────────────────────────────────────────

/**
 * getTodayProgress(monthKey, dayNumber)
 * Reads the current student's progress entry for a specific day.
 * Used by home.js and reflect.js on load to pre-populate state.
 *
 * Returns:
 * {
 *   taskDone:   boolean,
 *   reflected:  boolean,
 *   points:     number,
 *   gemEarned:  boolean,
 *   gemType:    string | null,
 * }
 * Returns defaults (all false/0) if no entry exists yet.
 */
export async function getTodayProgress(monthKey, dayNumber) {
  const uid = _uid();
  const defaults = { taskDone: false, reflected: false, points: 0, gemEarned: false, gemType: null };
  if (!uid) return defaults;

  try {
    const snap = await db.collection(COLLECTIONS.AAMAAL_PROGRESS).doc(uid)
      .collection('months').doc(monthKey).get();

    if (!snap.exists) return defaults;

    const dayEntry = snap.data()?.days?.[String(dayNumber)];
    if (!dayEntry) return defaults;

    return {
      taskDone:  dayEntry.task_done  ?? false,
      reflected: dayEntry.reflected  ?? false,
      points:    dayEntry.points     ?? 0,
      gemEarned: dayEntry.gem_earned ?? false,
      gemType:   dayEntry.gem_type   ?? null,
    };
  } catch (err) {
    console.error('[progress] getTodayProgress failed:', err);
    return defaults;
  }
}

// ── getMonthProgress ────────────────────────────────────────────────────────

/**
 * getMonthProgress(monthKey)
 * Reads the full month document + summary for the ring, stats bar, and archive.
 *
 * Returns:
 * {
 *   days:          object,   // { '1': { task_done, reflected, ... }, ... }
 *   totalPoints:   number,   // points earned this month
 *   maxPoints:     number,   // total possible (days * 20, Ramadan * 60)
 *   totalDays:     number,   // total days in this month (from schedule or 30)
 *   totalGems:     number,   // gems earned this month
 *   streak:        number,   // current streak (from summary doc)
 *   longestStreak: number,
 * }
 */
export async function getMonthProgress(monthKey, totalDays = 30, isRamadan = false) {
  const uid = _uid();
  const defaults = {
    days: {}, totalPoints: 0, maxPoints: totalDays * (isRamadan ? 60 : 20),
    totalDays, totalGems: 0, streak: 0, longestStreak: 0,
  };
  if (!uid) return defaults;

  try {
    // Read month doc and summary doc in parallel
    const [monthSnap, summarySnap] = await Promise.all([
      db.collection(COLLECTIONS.AAMAAL_PROGRESS).doc(uid)
        .collection('months').doc(monthKey).get(),
      db.collection(COLLECTIONS.AAMAAL_PROGRESS).doc(uid).get(),
    ]);

    const monthData   = monthSnap.exists   ? monthSnap.data()   : {};
    const summaryData = summarySnap.exists ? summarySnap.data() : {};

    return {
      days:          monthData.days           ?? {},
      totalPoints:   monthData.total_points   ?? 0,
      maxPoints:     totalDays * (isRamadan ? 60 : 20),
      totalDays,
      totalGems:     monthData.total_gems     ?? 0,
      streak:        summaryData.current_streak  ?? 0,
      longestStreak: summaryData.longest_streak  ?? 0,
    };
  } catch (err) {
    console.error('[progress] getMonthProgress failed:', err);
    return defaults;
  }
}

// ── saveTaskDone ───────────────────────────────────────────────────────────

export async function saveTaskDone(monthKey, dayNumber, taskId, stage, isRamadan = false) {
  const uid = _uid();
  if (!uid) return { success: false, reason: 'not_authenticated' };

  const points = isRamadan ? 30 : 10;
  const today  = _today();
  const dayKey = String(dayNumber);
  const batch  = db.batch();

  const monthRef = db.collection(COLLECTIONS.AAMAAL_PROGRESS).doc(uid)
    .collection('months').doc(monthKey);
  batch.set(monthRef, {
    uid, month_key: monthKey,
    [`days.${dayKey}.task_done`]:    true,
    [`days.${dayKey}.task_id`]:      taskId,
    [`days.${dayKey}.stage`]:        stage,
    [`days.${dayKey}.completed_at`]: _serverTs(),
    [`days.${dayKey}.points`]:       _increment(points),
    total_points: _increment(points),
    last_active:  _serverTs(),
  }, { merge: true });

  const summaryRef = db.collection(COLLECTIONS.AAMAAL_PROGRESS).doc(uid);
  batch.set(summaryRef, {
    total_points:   _increment(points),
    last_task_date: today,
    updated_at:     _serverTs(),
  }, { merge: true });

  batch.update(db.collection(COLLECTIONS.USERS).doc(uid), {
    last_active: _serverTs(),
  });

  try {
    await batch.commit();
    await _updateStreak(uid, today);
    return { success: true, points };
  } catch (err) {
    console.error('[progress] saveTaskDone failed:', err);
    return { success: false, reason: err.message };
  }
}

// ── saveReflection ─────────────────────────────────────────────────────────

export async function saveReflection(
  monthKey, dayNumber, taskId, stage, text, lang, isRamadan = false
) {
  const uid = _uid();
  if (!uid) return { success: false, reason: 'not_authenticated' };
  if (!text?.trim()) return { success: false, reason: 'empty_text' };

  const points  = isRamadan ? 30 : 10;
  const gemType = isRamadan ? 'ramadan' : 'standard';
  const today   = _today();
  const dayKey  = String(dayNumber);
  const batch   = db.batch();

  // Reflection entry
  const reflectionRef = db.collection('aamaal_reflections').doc(uid)
    .collection('entries').doc(today);
  batch.set(reflectionRef, {
    uid, month_key: monthKey, day: dayNumber,
    task_id: taskId, stage, text: text.trim(),
    language: lang, submitted_at: _serverTs(),
    status: 'pending', gem_type: gemType,
    library_id: null, reviewed_by: null, reviewed_at: null,
  });

  // Monthly progress
  const monthRef = db.collection(COLLECTIONS.AAMAAL_PROGRESS).doc(uid)
    .collection('months').doc(monthKey);
  batch.set(monthRef, {
    uid, month_key: monthKey,
    [`days.${dayKey}.task_done`]:     true,
    [`days.${dayKey}.reflected`]:     true,
    [`days.${dayKey}.task_id`]:       taskId,
    [`days.${dayKey}.stage`]:         stage,
    [`days.${dayKey}.gem_earned`]:    true,
    [`days.${dayKey}.gem_type`]:      gemType,
    [`days.${dayKey}.reflection_id`]: today,
    [`days.${dayKey}.points`]:        _increment(points),
    total_points: _increment(points),
    total_gems:   _increment(1),
    last_active:  _serverTs(),
  }, { merge: true });

  // Summary
  const summaryRef = db.collection(COLLECTIONS.AAMAAL_PROGRESS).doc(uid);
  batch.set(summaryRef, {
    total_points:       _increment(points),
    total_gems:         _increment(1),
    total_gems_ramadan: isRamadan ? _increment(1) : _increment(0),
    last_task_date:     today,
    updated_at:         _serverTs(),
  }, { merge: true });

  // Cross-app gem count
  batch.update(db.collection(COLLECTIONS.USERS).doc(uid), {
    total_gems: _increment(1),
    last_active: _serverTs(),
  });

  try {
    await batch.commit();
    await _updateStreak(uid, today);
    await updateTaskHistory(taskId, stage, monthKey, today);
    return { success: true, points, gemType };
  } catch (err) {
    console.error('[progress] saveReflection failed:', err);
    return { success: false, reason: err.message };
  }
}

// ── updateTaskHistory — living task tracking ───────────────────────────────

export async function updateTaskHistory(taskId, stage, monthKey, reflectionId = null) {
  const uid = _uid();
  if (!uid) return;

  const historyRef = db.collection(COLLECTIONS.AAMAAL_PROGRESS).doc(uid)
    .collection('task_history').doc(taskId);

  try {
    const snap = await historyRef.get();
    const stageEntry = {
      stage, month_key: monthKey,
      reflection_id: reflectionId,
      completed_at: _serverTs(),
    };
    await historyRef.set({
      task_id:          taskId,
      current_stage:    stage,
      stages_completed: firebase.firestore.FieldValue.arrayUnion(stageEntry),
      last_encounter:   _serverTs(),
      ...(!snap.exists ? { first_encounter: _serverTs() } : {}),
    }, { merge: true });
  } catch (err) {
    console.error('[progress] updateTaskHistory failed:', err);
  }
}

// ── Streak ─────────────────────────────────────────────────────────────────

async function _updateStreak(uid, today) {
  try {
    const summaryRef = db.collection(COLLECTIONS.AAMAAL_PROGRESS).doc(uid);
    const snap       = await summaryRef.get();
    const data       = snap.exists ? snap.data() : {};
    const lastDate   = data.last_task_date;
    let current      = data.current_streak ?? 0;
    let longest      = data.longest_streak ?? 0;

    if (!lastDate) {
      current = 1;
    } else {
      const diff = _daysBetween(lastDate, today);
      if (diff === 0) return;
      current = diff === 1 ? current + 1 : 1;
    }
    if (current > longest) longest = current;

    await summaryRef.set({ current_streak: current, longest_streak: longest }, { merge: true });
    await db.collection(COLLECTIONS.USERS).doc(uid).update({ streak: current });
  } catch (err) {
    console.error('[progress] _updateStreak failed:', err);
  }
}

// ── Ramadan badges ─────────────────────────────────────────────────────────

export async function checkAndAwardRamadanBadges(monthKey, hijriYear) {
  const uid = _uid();
  if (!uid) return;
  try {
    const snap = await db.collection(COLLECTIONS.AAMAAL_PROGRESS).doc(uid)
      .collection('months').doc(monthKey).get();
    if (!snap.exists) return;

    const days    = snap.data()?.days ?? {};
    const dayKeys = Object.keys(days);
    const badges  = [];

    if (dayKeys.length >= 30 && dayKeys.every(k => days[k].task_done)) {
      badges.push({
        id: `muttaqi_${hijriYear}`,
        label: { en: 'Muttaqi', hi: 'मुत्तक़ी', ur: 'متقی' },
        description: {
          en: `Completed all 30 days of Ramadan ${hijriYear}`,
          hi: `रमज़ान ${hijriYear} के सभी 30 दिन पूरे किए`,
          ur: `رمضان ${hijriYear} کے تمام 30 دن مکمل کیے`,
        },
        earned_at: _serverTs(), hijri_year: hijriYear, type: 'ramadan',
      });
    }
    if (dayKeys.length >= 30 && dayKeys.every(k => days[k].reflected)) {
      badges.push({
        id: `salik_${hijriYear}`,
        label: { en: 'Salik', hi: 'सालिक', ur: 'سالک' },
        description: {
          en: `Reflected all 30 days of Ramadan ${hijriYear}`,
          hi: `रमज़ान ${hijriYear} के सभी 30 दिन लिखा`,
          ur: `رمضان ${hijriYear} کے تمام 30 دن لکھا`,
        },
        earned_at: _serverTs(), hijri_year: hijriYear, type: 'ramadan',
      });
    }
    if (badges.length > 0) {
      await db.collection(COLLECTIONS.USERS).doc(uid).update({
        badges: firebase.firestore.FieldValue.arrayUnion(...badges),
      });
    }
  } catch (err) {
    console.error('[progress] checkAndAwardRamadanBadges failed:', err);
  }
}

// ── setFirstLoginComplete ──────────────────────────────────────────────────

export async function setFirstLoginComplete() {
  const uid = _uid();
  if (!uid) return;
  try {
    await db.collection(COLLECTIONS.USERS).doc(uid).update({ first_login: false });
  } catch (err) {
    console.error('[progress] setFirstLoginComplete failed:', err);
  }
}
