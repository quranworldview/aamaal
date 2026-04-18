/**
 * taskLoader.js — Task Resolution Service
 * QUR'AN WORLD VIEW · Aamaal
 *
 * Responsibilities:
 *   1. Load the schedule for a given month
 *   2. Resolve which task + stage is scheduled for a given day
 *   3. Fetch the task JSON and return the correct stage data
 *   4. Cache loaded JSON in memory — no repeated fetches in one session
 *
 * RULE: No page file imports JSON directly. Everything goes through here.
 * RULE: No hardcoded task content anywhere. Content lives in JSON only.
 *
 * Usage:
 *   import { getTodayTask, getMonthMeta } from '../services/taskLoader.js';
 *   const { task, stage, stageData, monthMeta } = await getTodayTask('muharram', 15);
 */

// ── In-memory cache ────────────────────────────────────────────────────────
// Prevents re-fetching the same file during a session
const _scheduleCache = {};
const _taskCache     = {};

// ── Base paths ─────────────────────────────────────────────────────────────
// Relative to the app root — works on both localhost and Cloudflare Pages
const SCHEDULE_BASE = './js/data/schedule/';
const TASK_BASE     = './js/data/tasks/';

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * getTodayTask(monthKey, dayNumber)
 *
 * Resolves the full task data for a given month + day.
 *
 * @param {string} monthKey  — e.g. 'muharram', 'shawwal', 'ramadan_1447'
 * @param {number} dayNumber — 1–30
 *
 * @returns {Promise<{
 *   monthMeta:  object,        // full schedule header (theme, ayah, question, etc.)
 *   taskId:     string,        // e.g. 'a1-adab-zubaan'
 *   stage:      number,        // 1–5
 *   stageLabel: object,        // { en, hi, ur }
 *   task:       object,        // { en, hi, ur }
 *   hikmah:     object,        // { en, hi, ur }
 *   ayah:       object,        // { surah, ayah, arabic, translation: {en,hi,ur} }
 *   example:    object,        // { en, hi, ur }
 *   taskName:   object,        // { en, hi, ur } — name of the living task
 *   category:   string,        // e.g. 'adab'
 * }>}
 */
export async function getTodayTask(monthKey, dayNumber) {
  // 1. Load schedule for this month
  const schedule = await _loadSchedule(monthKey);
  if (!schedule) {
    throw new Error(`[taskLoader] No schedule found for month: ${monthKey}`);
  }

  // 2. Find the day entry
  const dayEntry = schedule.days.find(d => d.day === dayNumber);
  if (!dayEntry) {
    throw new Error(`[taskLoader] No task scheduled for ${monthKey} day ${dayNumber}`);
  }

  // 3. Load the task JSON
  const taskData = await _loadTask(dayEntry.task_id);
  if (!taskData) {
    throw new Error(`[taskLoader] Task not found: ${dayEntry.task_id}`);
  }

  // 4. Find the correct stage
  const stageData = taskData.stages.find(s => s.stage === dayEntry.stage);
  if (!stageData) {
    throw new Error(`[taskLoader] Stage ${dayEntry.stage} not found in task ${dayEntry.task_id}`);
  }

  // 5. Build the month meta (everything except the days array)
  const { days: _days, ...monthMeta } = schedule;

  return {
    monthMeta,
    taskId:     taskData.id,
    taskName:   taskData.name,
    category:   taskData.category,
    stage:      stageData.stage,
    stageLabel: stageData.label,
    task:       stageData.task,
    hikmah:     stageData.hikmah,
    ayah:       stageData.ayah,
    example:    stageData.example,
  };
}

/**
 * getMonthMeta(monthKey)
 *
 * Returns just the month header — theme, theme ayah, month question.
 * Lightweight — doesn't resolve any task data.
 *
 * @param {string} monthKey
 * @returns {Promise<object>}
 */
export async function getMonthMeta(monthKey) {
  const schedule = await _loadSchedule(monthKey);
  if (!schedule) return null;
  const { days: _days, ...meta } = schedule;
  return meta;
}

/**
 * getScheduledDays(monthKey)
 *
 * Returns the raw days array for the month.
 * Used by the ring calendar to know how many days exist.
 *
 * @param {string} monthKey
 * @returns {Promise<Array>}
 */
export async function getScheduledDays(monthKey) {
  const schedule = await _loadSchedule(monthKey);
  return schedule?.days ?? [];
}

// ── Private loaders ────────────────────────────────────────────────────────

async function _loadSchedule(monthKey) {
  // Normalise ramadan_1447 → ramadan for file lookup
  // The year suffix is only for Firestore/progress tracking — file is always 'ramadan.json'
  const fileKey = monthKey.startsWith('ramadan') ? 'ramadan' : monthKey;

  if (_scheduleCache[fileKey]) return _scheduleCache[fileKey];

  try {
    const res  = await fetch(`${SCHEDULE_BASE}${fileKey}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    _scheduleCache[fileKey] = data;
    return data;
  } catch (err) {
    console.error(`[taskLoader] Failed to load schedule/${fileKey}.json:`, err);
    return null;
  }
}

async function _loadTask(taskId) {
  if (_taskCache[taskId]) return _taskCache[taskId];

  try {
    const res  = await fetch(`${TASK_BASE}${taskId}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    _taskCache[taskId] = data;
    return data;
  } catch (err) {
    console.error(`[taskLoader] Failed to load tasks/${taskId}.json:`, err);
    return null;
  }
}
