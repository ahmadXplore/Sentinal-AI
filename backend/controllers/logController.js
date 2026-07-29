const multer = require('multer');
const path = require('path');
const Log = require('../models/Log');
const Alert = require('../models/Alert');
const { parseLog } = require('../services/logParser');
const { normalizeEntries } = require('../services/logNormalizer');
const { runDetectionEngine } = require('../services/detectionEngine');

// Multer configuration for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'text/csv',
      'application/json',
      'application/xml',
      'text/xml',
      'application/octet-stream',
      'text/x-log',
    ];
    // Also allow by extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.log', '.txt', '.csv', '.json', '.xml', '.evtx', '.syslog'];

    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype} (${ext})`), false);
    }
  },
}).single('logfile');

/**
 * @desc    Upload and parse a log file
 * @route   POST /api/logs/upload
 */
exports.uploadLog = (req, res, next) => {
  upload(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
      const rawContent = req.file.buffer.toString('utf-8');

      // Parse the log content
      const { format, entries } = parseLog(rawContent);

      // Normalize and compute statistics
      const normalized = normalizeEntries(entries);

      // Create log document
      const log = await Log.create({
        filename: `${Date.now()}-${req.file.originalname}`,
        originalName: req.file.originalname,
        format,
        rawContent,
        parsedEntries: normalized.entries,
        totalEntries: normalized.totalEntries,
        severityCounts: normalized.severityCounts,
        uploadedBy: req.user._id,
        metadata: {
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          sourceIPs: normalized.sourceIPs,
          dateRange: normalized.dateRange,
        },
        status: 'parsed',
      });

      // Run threat detection engine on the parsed log
      try {
        await runDetectionEngine(log);
      } catch (detectErr) {
        console.error('❌ Threat detection engine error:', detectErr.message);
      }

      res.status(201).json({
        success: true,
        message: `Log uploaded and parsed successfully. ${normalized.totalEntries} entries found.`,
        data: {
          log: {
            _id: log._id,
            originalName: log.originalName,
            format: log.format,
            totalEntries: log.totalEntries,
            severityCounts: log.severityCounts,
            metadata: log.metadata,
            status: log.status,
            createdAt: log.createdAt,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  });
};

/**
 * @desc    Get all logs (paginated)
 * @route   GET /api/logs
 */
exports.getLogs = async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const skip = (page - 1) * limit;

  // Build filter
  const filter = {};
  if (req.query.format) filter.format = req.query.format;
  if (req.query.status) filter.status = req.query.status;

  // For non-admin users, only show their own logs (optional: remove for shared access)
  if (req.user.role === 'viewer') {
    // Viewers can see all logs but not upload
  }

  const [logs, total] = await Promise.all([
    Log.find(filter)
      .select('-rawContent -parsedEntries')
      .populate('uploadedBy', 'username email')
      .populate('aiSummary', 'summary riskScore status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Log.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: {
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    },
  });
};

/**
 * @desc    Get single log by ID
 * @route   GET /api/logs/:id
 */
exports.getLogById = async (req, res) => {
  const log = await Log.findById(req.params.id)
    .populate('uploadedBy', 'username email')
    .populate('aiSummary');

  if (!log) {
    return res.status(404).json({
      success: false,
      message: 'Log not found',
    });
  }

  res.json({
    success: true,
    data: { log },
  });
};

/**
 * @desc    Delete a log
 * @route   DELETE /api/logs/:id
 */
exports.deleteLog = async (req, res) => {
  const log = await Log.findById(req.params.id);

  if (!log) {
    return res.status(404).json({
      success: false,
      message: 'Log not found',
    });
  }

  // Only admin or the uploader can delete
  if (req.user.role !== 'admin' && log.uploadedBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({
      success: false,
      message: 'Not authorized to delete this log',
    });
  }

  // Delete associated alerts and AI summaries
  await Promise.all([
    Alert.deleteMany({ logId: log._id }),
    require('../models/AISummary').deleteMany({ logId: log._id }),
    Log.findByIdAndDelete(req.params.id)
  ]);

  res.json({
    success: true,
    message: 'Log deleted successfully',
  });
};
