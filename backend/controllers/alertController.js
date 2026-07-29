const Alert = require('../models/Alert');

/**
 * @desc    Get all alerts (filtered and paginated)
 * @route   GET /api/alerts
 */
exports.getAlerts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    const query = {};

    // Filters
    if (req.query.status) query.status = req.query.status;
    if (req.query.severity) query.severity = req.query.severity;
    if (req.query.logId) query.logId = req.query.logId;

    // Search query
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      query.$or = [
        { ruleName: searchRegex },
        { description: searchRegex },
        { affectedIPs: searchRegex },
        { affectedUsers: searchRegex },
      ];
    }

    const [alerts, total] = await Promise.all([
      Alert.find(query)
        .populate('assignedTo', 'username email')
        .populate('logId', 'originalName format')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Alert.countDocuments(query),
    ]);

    // Aggregate statistics for dashboard summary
    const stats = await Alert.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'open'] }, 1, 0] } },
          investigating: { $sum: { $cond: [{ $eq: ['$status', 'investigating'] }, 1, 0] } },
          resolved: { $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        alerts,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        summary: stats[0] || { total: 0, open: 0, investigating: 0, resolved: 0, critical: 0, high: 0 },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get single alert details
 * @route   GET /api/alerts/:id
 */
exports.getAlertById = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('assignedTo', 'username email')
      .populate('logId', 'originalName format createdAt');

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    res.json({
      success: true,
      data: { alert },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update alert status
 * @route   PUT /api/alerts/:id/status
 */
exports.updateAlertStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    const oldStatus = alert.status;
    alert.status = status;

    // Add audit log note
    alert.notes.push({
      text: `Status changed from '${oldStatus}' to '${status}'`,
      addedBy: req.user.username,
    });

    await alert.save();

    // Auto-generate draft incident report if status is changed to investigating
    if (status === 'investigating') {
      try {
        const Incident = require('../models/Incident');
        
        let incident = await Incident.findOne({ alertId: alert._id });
        if (!incident) {
          incident = await Incident.create({
            alertId: alert._id,
            title: `Incident Report: ${alert.ruleName}`,
            status: 'draft',
            report: {
              incidentSummary: `Investigation initiated for alert: ${alert.ruleName}.`,
              threatDescription: alert.description || `Suspicious activity matching ${alert.ruleName}.`,
              affectedSystems: alert.affectedIPs || [],
              mitreAttack: alert.mitreAttack ? {
                techniqueId: alert.mitreAttack.techniqueId,
                techniqueName: alert.mitreAttack.techniqueName,
              } : undefined,
              riskAssessment: {
                score: alert.riskScore,
                level: alert.severity === 'critical' || alert.severity === 'high' ? 'high' : 'medium',
              }
            },
            createdBy: req.user._id,
          });
        }
      } catch (err) {
        console.error('[Alert Controller] Error auto-generating incident data:', err.message);
      }
    }

    res.json({
      success: true,
      message: 'Alert status updated successfully',
      data: { alert },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Assign alert to analyst
 * @route   PUT /api/alerts/:id/assign
 */
exports.assignAlert = async (req, res) => {
  try {
    const { userId } = req.body;
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    alert.assignedTo = userId || null;

    let textNote = 'Alert unassigned';
    if (userId) {
      const User = require('../models/User');
      const user = await User.findById(userId);
      if (user) {
        textNote = `Alert assigned to ${user.username}`;
      }
    }

    alert.notes.push({
      text: textNote,
      addedBy: req.user.username,
    });

    await alert.save();

    const populatedAlert = await Alert.findById(alert._id)
      .populate('assignedTo', 'username email');

    res.json({
      success: true,
      message: 'Alert assignment updated successfully',
      data: { alert: populatedAlert },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Add investigation note to alert
 * @route   POST /api/alerts/:id/notes
 */
exports.addAlertNote = async (req, res) => {
  try {
    const { text } = req.body;
    const alert = await Alert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Note text is required' });
    }

    alert.notes.push({
      text: text.trim(),
      addedBy: req.user.username,
    });

    await alert.save();

    res.status(201).json({
      success: true,
      message: 'Note added successfully',
      data: { notes: alert.notes },
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Find correlated alerts based on target users or source IPs
 * @route   GET /api/alerts/:id/correlations
 */
exports.getCorrelatedAlerts = async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: 'Alert not found' });
    }

    const { affectedIPs, affectedUsers } = alert;

    if (affectedIPs.length === 0 && affectedUsers.length === 0) {
      return res.json({
        success: true,
        data: { correlations: [] },
      });
    }

    const correlationQuery = {
      _id: { $ne: alert._id }, // exclude self
      $or: [],
    };

    if (affectedIPs.length > 0) {
      correlationQuery.$or.push({ affectedIPs: { $in: affectedIPs } });
    }
    if (affectedUsers.length > 0) {
      correlationQuery.$or.push({ affectedUsers: { $in: affectedUsers } });
    }

    const correlations = await Alert.find(correlationQuery)
      .populate('logId', 'originalName format')
      .populate('assignedTo', 'username')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: { correlations },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
