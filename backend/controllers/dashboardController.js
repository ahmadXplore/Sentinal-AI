const Log = require('../models/Log');
const AISummary = require('../models/AISummary');
const User = require('../models/User');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/dashboard/stats
 */
exports.getStats = async (req, res) => {
  try {
    // Get total counts
    const [totalLogs, totalUsers] = await Promise.all([
      Log.countDocuments(),
      User.countDocuments(),
    ]);

    // Aggregate severity counts across all logs
    const severityAgg = await Log.aggregate([
      {
        $group: {
          _id: null,
          totalEntries: { $sum: '$totalEntries' },
          critical: { $sum: '$severityCounts.critical' },
          high: { $sum: '$severityCounts.high' },
          medium: { $sum: '$severityCounts.medium' },
          low: { $sum: '$severityCounts.low' },
          info: { $sum: '$severityCounts.info' },
        },
      },
    ]);

    const severityData = severityAgg[0] || {
      totalEntries: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    // Get top source IPs
    const topIPs = await Log.aggregate([
      { $unwind: '$metadata.sourceIPs' },
      { $group: { _id: '$metadata.sourceIPs', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { ip: '$_id', count: 1, _id: 0 } },
    ]);

    // Get recent logs (last 7 days trend)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyTrend = await Log.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
          },
          count: { $sum: 1 },
          entries: { $sum: '$totalEntries' },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', count: 1, entries: 1, _id: 0 } },
    ]);

    // Get recent AI summaries with suspicious activities
    const recentAlerts = await AISummary.find({
      status: 'completed',
      'suspiciousActivities.0': { $exists: true },
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({
        path: 'logId',
        select: 'originalName createdAt',
      });

    // Format alerts
    const alerts = recentAlerts.flatMap((summary) =>
      summary.suspiciousActivities.map((activity) => ({
        logName: summary.logId?.originalName || 'Unknown',
        logId: summary.logId?._id,
        description: activity.description,
        severity: activity.severity,
        recommendation: activity.recommendation,
        timestamp: summary.createdAt,
      }))
    ).slice(0, 15);

    // Get recent logs
    const recentLogs = await Log.find()
      .select('originalName format totalEntries severityCounts status createdAt')
      .populate('uploadedBy', 'username')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        overview: {
          totalLogs,
          totalEntries: severityData.totalEntries,
          totalUsers,
          totalAlerts: alerts.length,
        },
        severity: {
          critical: severityData.critical,
          high: severityData.high,
          medium: severityData.medium,
          low: severityData.low,
          info: severityData.info,
        },
        topIPs,
        dailyTrend,
        recentAlerts: alerts,
        recentLogs,
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard statistics',
    });
  }
};
