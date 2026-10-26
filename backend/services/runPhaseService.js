'use strict';

const db = require('../models');
const { Movie } = db;
const { QueryTypes } = db.Sequelize;

/** @typedef {'not_opened' | 'tracking' | 'finished'} RunPhase */

const DAY_MS = 24 * 60 * 60 * 1000;
const STALL_AFTER_WEEKS = 8;
const FINISHED_AFTER_WEEKS = 16;
const MATERIAL_FLOOR_DOLLARS = 1_000_000;
const REGION = 'domestic';
const PERIOD_TYPE = 'weekly';

const RUN_PHASES = new Set(['not_opened', 'tracking', 'finished']);

function parseMoneyString(value) {
  if (value == null || value === '') return null;
  const n = Number(String(value).replace(/[^0-9.-]+/g, ''));
  return Number.isFinite(n) ? n : null;
}

function daysSinceRelease(released, now = Date.now()) {
  if (!released) return null;
  const t = new Date(released).getTime();
  if (Number.isNaN(t)) return null;
  return (now - t) / DAY_MS;
}

/** True once the theatrical date has arrived (or opening figures exist with no date). */
function releaseHasStarted(movie, now = Date.now()) {
  const days = daysSinceRelease(movie.released, now);
  if (days != null) return days >= 0;
  return parseMoneyString(movie.domesticOpening) != null;
}

function isMaterialRise(current, previous) {
  const delta = current - previous;
  if (delta <= 0) return false;
  const threshold = Math.max(MATERIAL_FLOOR_DOLLARS, previous * 0.05);
  return delta >= threshold;
}

/**
 * Stall when the last two weekly cumulatives show no material rise,
 * or both weekly period grosses are under $1M.
 * @param {{ gross: number|null, grossToDate: number|null }[]} recentNewestFirst
 */
function weeksLookStalled(recentNewestFirst) {
  if (!recentNewestFirst || recentNewestFirst.length === 0) return false;

  if (recentNewestFirst.length >= 2) {
    const [latest, prev] = recentNewestFirst;
    if (latest.grossToDate != null && prev.grossToDate != null) {
      if (!isMaterialRise(latest.grossToDate, prev.grossToDate)) return true;
    }
    if (
      latest.gross != null &&
      prev.gross != null &&
      latest.gross < MATERIAL_FLOOR_DOLLARS &&
      prev.gross < MATERIAL_FLOOR_DOLLARS
    ) {
      return true;
    }
    return false;
  }

  // Single recent week: treat as stalled only if that week itself is tiny.
  const only = recentNewestFirst[0];
  return only.gross != null && only.gross < MATERIAL_FLOOR_DOLLARS;
}

/**
 * Pure phase from movie fields + optional recent weekly tips (newest first).
 * Past release date → tracking/finished even before opening actuals land.
 * @returns {RunPhase}
 */
function computeRunPhase(movie, recentWeekly = [], now = Date.now()) {
  const days = daysSinceRelease(movie.released, now);

  // Future release (or unknown date with no opening) → not yet opened.
  if (days != null && days < 0) return 'not_opened';
  if (days == null && parseMoneyString(movie.domesticOpening) == null) {
    return 'not_opened';
  }

  if (days == null) return 'tracking';

  const weeks = days / 7;
  if (weeks >= FINISHED_AFTER_WEEKS) return 'finished';
  if (weeks < STALL_AFTER_WEEKS) return 'tracking';

  // 8–16 weeks: need period tips; without them stay tracking.
  if (weeksLookStalled(recentWeekly)) return 'finished';
  return 'tracking';
}

/**
 * Last two domestic weekly periods per movie, newest first.
 * One round-trip for the whole id set.
 * @returns {Promise<Map<string, { gross: number|null, grossToDate: number|null, endDate: string }[]>>}
 */
async function batchLatestWeeklyPeriods(movieIds) {
  const map = new Map();
  if (!movieIds || movieIds.length === 0) return map;

  const uniqueIds = [...new Set(movieIds.filter(Boolean))];
  if (uniqueIds.length === 0) return map;

  // Postgres: rank weeks per movie, keep top 2.
  const rows = await db.sequelize.query(
    `
    SELECT movie_id, gross, gross_to_date, end_date
    FROM (
      SELECT
        movie_id,
        gross,
        gross_to_date,
        end_date,
        ROW_NUMBER() OVER (
          PARTITION BY movie_id
          ORDER BY end_date DESC
        ) AS rn
      FROM movie_box_office_periods
      WHERE region = :region
        AND period_type = :periodType
        AND movie_id IN (:movieIds)
    ) ranked
    WHERE rn <= 2
    ORDER BY movie_id, end_date DESC
    `,
    {
      replacements: {
        region: REGION,
        periodType: PERIOD_TYPE,
        movieIds: uniqueIds,
      },
      type: QueryTypes.SELECT,
    }
  );

  for (const row of rows) {
    const id = String(row.movie_id);
    const list = map.get(id) || [];
    list.push({
      gross: row.gross != null ? Number(row.gross) : null,
      grossToDate: row.gross_to_date != null ? Number(row.gross_to_date) : null,
      endDate: row.end_date,
    });
    map.set(id, list);
  }

  return map;
}

function needsPeriodTips(movie, now = Date.now()) {
  if (!releaseHasStarted(movie, now)) return false;
  const days = daysSinceRelease(movie.released, now);
  if (days == null) return false;
  const weeks = days / 7;
  return weeks >= STALL_AFTER_WEEKS && weeks < FINISHED_AFTER_WEEKS;
}

/**
 * Resolve phases for a list of movie plain objects / instances.
 * Batches period lookups only for the 8–16 week cohort.
 * @returns {Promise<Map<string, RunPhase>>}
 */
async function resolveRunPhases(movies, { now = Date.now() } = {}) {
  const list = (movies || []).map((m) => (m.get ? m.get({ plain: true }) : m));
  const phaseById = new Map();

  const tipIds = list.filter((m) => m.id && needsPeriodTips(m, now)).map((m) => String(m.id));
  const tipsByMovie = await batchLatestWeeklyPeriods(tipIds);

  for (const movie of list) {
    if (!movie.id) continue;
    const id = String(movie.id);
    const tips = tipsByMovie.get(id) || [];
    phaseById.set(id, computeRunPhase(movie, tips, now));
  }

  return phaseById;
}

/**
 * Compute phases and persist when they differ from stored values.
 * @returns {Promise<Map<string, RunPhase>>}
 */
async function persistRunPhases(movies, { now = Date.now() } = {}) {
  const list = (movies || []).map((m) => (m.get ? m.get({ plain: true }) : m));
  const phaseById = await resolveRunPhases(list, { now });
  const checkedAt = new Date(now);

  await Promise.all(
    list.map(async (movie) => {
      if (!movie.id) return;
      const id = String(movie.id);
      const phase = phaseById.get(id);
      if (!phase || !RUN_PHASES.has(phase)) return;
      if (movie.runPhase === phase && movie.runPhaseAt) return;

      await Movie.update(
        { runPhase: phase, runPhaseAt: checkedAt },
        { where: { id: movie.id } }
      );
      movie.runPhase = phase;
      movie.runPhaseAt = checkedAt;
    })
  );

  return phaseById;
}

/** Recompute + persist for every movie (refresh job). */
async function refreshAllMovieRunPhases() {
  const movies = await Movie.findAll();
  return persistRunPhases(movies);
}

/**
 * Resolve phases for specific ids (batch API). Loads movies, computes, persists.
 * @returns {Promise<Record<string, RunPhase>>}
 */
async function getRunPhasesForMovieIds(movieIds) {
  const uniqueIds = [...new Set((movieIds || []).filter(Boolean).map(String))];
  if (uniqueIds.length === 0) return {};

  const movies = await Movie.findAll({ where: { id: uniqueIds } });
  const phaseById = await persistRunPhases(movies);
  const out = {};
  for (const id of uniqueIds) {
    out[id] = phaseById.get(id) || 'not_opened';
  }
  return out;
}

const GUESS_MOVIE_ATTRIBUTES = [
  'id',
  'title',
  'tmdbID',
  'poster',
  'released',
  'domesticOpening',
  'internationalOpening',
  'domesticGross',
  'internationalGross',
  'worldwideGross',
  'rottenTomatoesScore',
  'runPhase',
  'runPhaseAt',
];

/**
 * @param {object|null} movie
 * @param {RunPhase|null|undefined} runPhase
 * @param {{
 *   latestWeeklyTip?: { gross: number|null }|null,
 *   latestIntlWeeklyAdd?: number|null,
 * }} [tips]
 */
function movieSnippetForGuess(movie, runPhase, tips = {}) {
  if (!movie) return null;
  const plain = movie.get ? movie.get({ plain: true }) : movie;
  const snippet = {};
  for (const key of GUESS_MOVIE_ATTRIBUTES) {
    if (key === 'runPhase') {
      snippet.runPhase = runPhase ?? plain.runPhase ?? null;
      continue;
    }
    snippet[key] = plain[key] ?? null;
  }
  const weekGross = tips.latestWeeklyTip?.gross;
  snippet.latestWeeklyGross =
    weekGross != null && Number.isFinite(Number(weekGross))
      ? Number(weekGross)
      : null;
  const intlAdd = tips.latestIntlWeeklyAdd;
  snippet.latestIntlWeeklyGross =
    intlAdd != null && Number.isFinite(Number(intlAdd)) ? Number(intlAdd) : null;
  return snippet;
}

module.exports = {
  STALL_AFTER_WEEKS,
  FINISHED_AFTER_WEEKS,
  computeRunPhase,
  batchLatestWeeklyPeriods,
  needsPeriodTips,
  resolveRunPhases,
  persistRunPhases,
  refreshAllMovieRunPhases,
  getRunPhasesForMovieIds,
  movieSnippetForGuess,
  GUESS_MOVIE_ATTRIBUTES,
  releaseHasStarted,
  daysSinceRelease,
};
