'use strict';

const { getAdminEngagementStats } = require('../services/adminStatsService');
const { listJobRuns } = require('../services/jobRunService');

const getAdminStats = async (req, res) => {
  try {
    const stats = await getAdminEngagementStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error('Failed to load admin stats:', error);
    res.status(500).json({
      error: error.message || 'Failed to load admin stats',
    });
  }
};

const getAdminJobRuns = async (req, res) => {
  try {
    const limit = req.query.limit;
    const job = req.query.job || null;
    const runs = await listJobRuns({ job, limit });
    res.status(200).json({ data: runs });
  } catch (error) {
    console.error('Failed to load job runs:', error);
    res.status(500).json({
      error: error.message || 'Failed to load job runs',
    });
  }
};

module.exports = {
  getAdminStats,
  getAdminJobRuns,
};
