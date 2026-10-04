const db = require('../models');
const { scrapeReleasePeriods } = require('../scraper');
const { MovieBoxOfficePeriod } = db;

const PERIOD_TYPES = ['weekly', 'weekend'];
const REGION = 'domestic';
const IN_RELEASE_MAX_DAYS = 180;
const LATEST_PERIOD_MAX_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

const BOM_REQUEST_DELAY_MS = 1500;

const daysSince = (date) => (Date.now() - new Date(date).getTime()) / DAY_MS;

const waitBetweenBomRequests = () =>
    new Promise((resolve) => setTimeout(resolve, BOM_REQUEST_DELAY_MS));

const savePeriods = async (movieId, region, periodType, periods) => {
    if (!periods.length) return 0;

    const rows = periods.map((p) => ({
        movie_id: movieId,
        region,
        period_type: periodType,
        period_number: p.periodNumber,
        start_date: p.startDate,
        end_date: p.endDate,
        gross: p.gross,
        gross_to_date: p.grossToDate,
        rank: p.rank,
        theaters: p.theaters,
        is_estimate: p.isEstimate,
    }));

    await MovieBoxOfficePeriod.bulkCreate(rows, {
        conflictAttributes: ['movie_id', 'region', 'period_type', 'start_date'],
        updateOnDuplicate: [
            'period_number',
            'end_date',
            'gross',
            'gross_to_date',
            'rank',
            'theaters',
            'is_estimate',
            'updatedAt',
        ],
    });

    return rows.length;
};

const refreshBoxOfficePeriods = async (movie) => {
    if (!movie.bomReleaseId) return 0;

    let saved = 0;

    for (const periodType of PERIOD_TYPES) {
        const periods = await scrapeReleasePeriods(movie.bomReleaseId, periodType);
        saved += await savePeriods(movie.id, REGION, periodType, periods);
    }

    return saved;
};

const toPoint = (row) => ({
    period: row.period_number,
    startDate: row.start_date,
    endDate: row.end_date,
    gross: row.gross,
    grossToDate: row.gross_to_date,
    isEstimate: row.is_estimate,
    rank: row.rank,
    theaters: row.theaters,
    region: row.region,
    updatedAt: row.updatedAt,
});

const getBoxOfficePeriods = async (movieId) => {
    const rows = await MovieBoxOfficePeriod.findAll({
        where: { movie_id: movieId, region: REGION },
        order: [['period_number', 'ASC'], ['start_date', 'ASC']],
    });

    const result = { weekly: [], weekend: [] };
    for (const row of rows) {
        result[row.period_type]?.push(toPoint(row));
    }
    return result;
};

const getLatestPeriod = (movieId) =>
    MovieBoxOfficePeriod.findOne({
        where: { movie_id: movieId, region: REGION },
        order: [['end_date', 'DESC']],
    });

const isInRelease = (movie, latestPeriod) => {
    if (!movie.released) return false;

    const sinceRelease = daysSince(movie.released);
    if (sinceRelease < 0 || sinceRelease > IN_RELEASE_MAX_DAYS) return false;

    if (!latestPeriod) return true;
    return daysSince(latestPeriod.end_date) <= LATEST_PERIOD_MAX_DAYS;
};

module.exports = {
    daysSince,
    savePeriods,
    refreshBoxOfficePeriods,
    getBoxOfficePeriods,
    getLatestPeriod,
    isInRelease,
    waitBetweenBomRequests,
};
