const db = require('../models');
const { scrapeReleasePeriods } = require('../scraper');
const { daysSince, savePeriods, waitBetweenBomRequests } = require('./boxOfficeHistoryService');
const { MovieBomTerritory, MovieGrossSnapshot, MovieBoxOfficePeriod } = db;
const { Op, QueryTypes } = db.Sequelize;

// Territory weekend tables gain one row per weekend, so re-reading them more
// often than this only picks up mid-week totals we already snapshot.
const MIN_DAYS_BETWEEN_TERRITORY_SCRAPES = 6;
const TOTAL_SCOPES = ['domestic', 'international'];

const todayIso = () => new Date().toISOString().slice(0, 10);

const parseMoneyString = (value) => {
    if (value == null) return null;
    const n = Number(String(value).replace(/[$,]/g, ''));
    return Number.isFinite(n) && n > 0 ? n : null;
};

const getLatestSnapshotGross = async (movieId) => {
    const rows = await db.sequelize.query(
        `SELECT DISTINCT ON ("scope") "scope", "gross"
         FROM "movie_gross_snapshots"
         WHERE "movie_id" = :movieId
         ORDER BY "scope", "captured_on" DESC`,
        { replacements: { movieId }, type: QueryTypes.SELECT },
    );
    return new Map(rows.map((row) => [row.scope, row.gross]));
};

/**
 * Stores the title page's per-territory table and logs any totals that changed
 * since the last snapshot. Costs no requests: the data comes from the title
 * page scrape the nightly refresh already does.
 */
const recordTitleSnapshot = async (movie, { domesticGross, internationalGross, territories } = {}) => {
    if (!Array.isArray(territories)) return { territories: 0, snapshots: 0 };

    const latest = await getLatestSnapshotGross(movie.id);
    const capturedOn = todayIso();

    const snapshotRows = [
        ['domestic', parseMoneyString(domesticGross)],
        ['international', parseMoneyString(internationalGross)],
        ...territories.map((t) => [t.releaseId, t.gross]),
    ]
        .filter(([scope, gross]) => gross != null && latest.get(scope) !== gross)
        .map(([scope, gross]) => ({ movie_id: movie.id, scope, captured_on: capturedOn, gross }));

    if (snapshotRows.length) {
        await MovieGrossSnapshot.bulkCreate(snapshotRows, {
            conflictAttributes: ['movie_id', 'scope', 'captured_on'],
            updateOnDuplicate: ['gross', 'updatedAt'],
        });
    }

    if (territories.length) {
        await MovieBomTerritory.bulkCreate(
            territories.map((t) => ({
                movie_id: movie.id,
                release_id: t.releaseId,
                market: t.market,
                release_date: t.releaseDate,
                opening: t.opening,
                gross: t.gross,
            })),
            {
                conflictAttributes: ['movie_id', 'release_id'],
                updateOnDuplicate: ['market', 'release_date', 'opening', 'gross', 'updatedAt'],
            },
        );
    }

    return { territories: territories.length, snapshots: snapshotRows.length };
};

const needsPeriodScrape = (territory) => {
    if (!territory.gross) return false;
    if (!territory.periods_scraped_at) return true;
    if (territory.gross === territory.periods_gross) return false;
    return daysSince(territory.periods_scraped_at) >= MIN_DAYS_BETWEEN_TERRITORY_SCRAPES;
};

/**
 * Re-reads the weekend table of each territory whose title-page gross moved
 * since its last scrape (at most once per MIN_DAYS_BETWEEN_TERRITORY_SCRAPES).
 * `force` re-reads every territory with a gross. One BOM request per
 * territory, spaced out.
 */
const refreshTerritoryPeriods = async (movie, { force = false } = {}) => {
    const territories = await MovieBomTerritory.findAll({
        where: { movie_id: movie.id },
        order: [['gross', 'DESC NULLS LAST']],
    });
    const due = territories.filter((t) => (force ? Boolean(t.gross) : needsPeriodScrape(t)));

    const result = { total: territories.length, due: due.length, scraped: 0, rows: 0, failed: 0 };

    for (const territory of due) {
        try {
            const periods = await scrapeReleasePeriods(territory.release_id, 'weekend');
            const region =
                periods.find((p) => p.area)?.area ?? territory.region ?? territory.release_id;

            result.rows += await savePeriods(movie.id, region, 'weekend', periods);
            await territory.update({
                region,
                periods_gross: territory.gross,
                periods_scraped_at: new Date(),
            });
            result.scraped++;
        } catch (err) {
            result.failed++;
            console.error(`Failed to scrape ${territory.market} (${territory.release_id}) for ${movie.title}:`, err.message);
        }

        await waitBetweenBomRequests();
    }

    return result;
};

/** The Sunday on or after a date; aligns territories whose weekends start on different days. */
const toWeekEnding = (isoDate) => {
    const date = new Date(`${isoDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + ((7 - date.getUTCDay()) % 7));
    return date.toISOString().slice(0, 10);
};

/**
 * Builds an international cumulative series by calendar week: each week sums
 * every territory's latest running total, carrying forward territories that
 * didn't report that week.
 */
const buildInternationalWeekly = (periods) => {
    const byWeek = new Map();
    for (const p of periods) {
        if (p.gross_to_date == null) continue;
        const weekEnding = toWeekEnding(p.end_date);
        if (!byWeek.has(weekEnding)) byWeek.set(weekEnding, new Map());
        byWeek.get(weekEnding).set(p.region, p.gross_to_date);
    }

    const running = new Map();
    return [...byWeek.keys()].sort().map((weekEnding, i) => {
        const reported = byWeek.get(weekEnding);
        for (const [region, grossToDate] of reported) running.set(region, grossToDate);

        let grossToDate = 0;
        for (const value of running.values()) grossToDate += value;

        return {
            period: i + 1,
            weekEnding,
            grossToDate,
            territoriesReporting: reported.size,
            territoriesToDate: running.size,
        };
    });
};

const getInternationalHistory = async (movieId) => {
    const [territories, periods, totals] = await Promise.all([
        MovieBomTerritory.findAll({
            where: { movie_id: movieId },
            order: [['gross', 'DESC NULLS LAST'], ['market', 'ASC']],
        }),
        MovieBoxOfficePeriod.findAll({
            where: { movie_id: movieId, period_type: 'weekend', region: { [Op.ne]: 'domestic' } },
            order: [['end_date', 'ASC']],
        }),
        MovieGrossSnapshot.findAll({
            where: { movie_id: movieId, scope: TOTAL_SCOPES },
            order: [['captured_on', 'ASC']],
        }),
    ]);

    return {
        territories: territories.map((t) => ({
            market: t.market,
            region: t.region,
            releaseId: t.release_id,
            releaseDate: t.release_date,
            opening: t.opening,
            gross: t.gross,
            periodsScrapedAt: t.periods_scraped_at,
        })),
        weekly: buildInternationalWeekly(periods),
        totals: totals.map((s) => ({
            scope: s.scope,
            capturedOn: s.captured_on,
            gross: s.gross,
        })),
    };
};

module.exports = {
    recordTitleSnapshot,
    refreshTerritoryPeriods,
    getInternationalHistory,
};
