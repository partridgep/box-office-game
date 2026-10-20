'use strict';

const db = require('../models');
const { JobRun } = db;

const MAX_ERRORS = 50;

function emptyMovieRefreshSummary() {
  return {
    moviesTotal: 0,
    moviesUpdated: 0,
    moviesSkipped: 0,
    moviesFailed: 0,
    boxOfficeRefreshed: 0,
    boxOfficeSkipped: 0,
    boxOfficeFailed: 0,
    /** Movies whose territory pass scraped at least one market. */
    territoriesRefreshed: 0,
    territoriesSkipped: 0,
    /** Movies with thrown errors or soft scrape failures (failed > 0). */
    territoriesFailed: 0,
    /** Aggregate market-level counters across all movies in the run. */
    territoryMarketsDue: 0,
    territoryMarketsScraped: 0,
    territoryMarketsFailed: 0,
    errors: [],
  };
}

function pushError(summary, entry) {
  if (!summary.errors) summary.errors = [];
  if (summary.errors.length >= MAX_ERRORS) {
    summary.errorsTruncated = true;
    return;
  }
  summary.errors.push({
    stage: entry.stage,
    movieId: entry.movieId || null,
    title: entry.title || null,
    message: entry.message || 'Unknown error',
    at: new Date().toISOString(),
  });
}

async function startJobRun({ job, trigger = null } = {}) {
  return JobRun.create({
    job,
    trigger,
    status: 'running',
    startedAt: new Date(),
    finishedAt: null,
    summary: null,
  });
}

async function finishJobRun(runId, { status, summary } = {}) {
  const run = await JobRun.findByPk(runId);
  if (!run) return null;

  await run.update({
    status: status || 'failed',
    finishedAt: new Date(),
    summary: summary || null,
  });
  return run;
}

function resolveMovieRefreshStatus(summary) {
  const failed =
    (summary.moviesFailed || 0) +
    (summary.boxOfficeFailed || 0) +
    (summary.territoriesFailed || 0) +
    (summary.territoryMarketsFailed || 0);
  const succeeded =
    (summary.moviesUpdated || 0) +
    (summary.boxOfficeRefreshed || 0) +
    (summary.territoriesRefreshed || 0) +
    (summary.territoryMarketsScraped || 0);

  if (failed > 0 && succeeded > 0) return 'partial';
  if (failed > 0 && succeeded === 0) return 'failed';
  return 'success';
}

async function listJobRuns({ job = null, limit = 10 } = {}) {
  const where = job ? { job } : {};
  const rows = await JobRun.findAll({
    where,
    order: [['startedAt', 'DESC']],
    limit: Math.min(Math.max(Number(limit) || 10, 1), 50),
  });

  return rows.map((row) => {
    const plain = row.get({ plain: true });
    return {
      id: plain.id,
      job: plain.job,
      trigger: plain.trigger,
      status: plain.status,
      startedAt: plain.startedAt,
      finishedAt: plain.finishedAt,
      summary: plain.summary,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    };
  });
}

module.exports = {
  emptyMovieRefreshSummary,
  pushError,
  startJobRun,
  finishJobRun,
  resolveMovieRefreshStatus,
  listJobRuns,
  MAX_ERRORS,
};
