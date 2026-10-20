'use strict';

const { getAdminEngagementStats } = require('../services/adminStatsService');

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

module.exports = {
  getAdminStats,
};
