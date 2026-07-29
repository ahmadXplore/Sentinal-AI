const Rule = require('../models/Rule');

/**
 * @desc    Get all rules
 * @route   GET /api/rules
 */
exports.getRules = async (req, res) => {
  try {
    const rules = await Rule.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: { rules },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Get single rule by ID
 * @route   GET /api/rules/:id
 */
exports.getRuleById = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }
    res.json({
      success: true,
      data: { rule },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Create a new rule
 * @route   POST /api/rules
 */
exports.createRule = async (req, res) => {
  try {
    const {
      name,
      description,
      severity,
      mitreAttack,
      conditions,
      timeWindowMinutes,
      minThreshold,
      groupBy,
    } = req.body;

    const rule = await Rule.create({
      name,
      description,
      severity,
      mitreAttack,
      conditions,
      timeWindowMinutes,
      minThreshold,
      groupBy,
    });

    res.status(201).json({
      success: true,
      message: 'Rule created successfully',
      data: { rule },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A rule with this name already exists' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Update a rule
 * @route   PUT /api/rules/:id
 */
exports.updateRule = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    const {
      name,
      description,
      severity,
      mitreAttack,
      conditions,
      timeWindowMinutes,
      minThreshold,
      groupBy,
      isActive,
    } = req.body;

    rule.name = name !== undefined ? name : rule.name;
    rule.description = description !== undefined ? description : rule.description;
    rule.severity = severity !== undefined ? severity : rule.severity;
    rule.mitreAttack = mitreAttack !== undefined ? mitreAttack : rule.mitreAttack;
    rule.conditions = conditions !== undefined ? conditions : rule.conditions;
    rule.timeWindowMinutes = timeWindowMinutes !== undefined ? timeWindowMinutes : rule.timeWindowMinutes;
    rule.minThreshold = minThreshold !== undefined ? minThreshold : rule.minThreshold;
    rule.groupBy = groupBy !== undefined ? groupBy : rule.groupBy;
    rule.isActive = isActive !== undefined ? isActive : rule.isActive;

    await rule.save();

    res.json({
      success: true,
      message: 'Rule updated successfully',
      data: { rule },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'A rule with this name already exists' });
    }
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Delete a rule
 * @route   DELETE /api/rules/:id
 */
exports.deleteRule = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    if (rule.isDefault) {
      return res.status(400).json({ success: false, message: 'Default rules cannot be deleted' });
    }

    await Rule.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Rule deleted successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc    Toggle rule active state
 * @route   PATCH /api/rules/:id/toggle
 */
exports.toggleRule = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ success: false, message: 'Rule not found' });
    }

    rule.isActive = !rule.isActive;
    await rule.save();

    res.json({
      success: true,
      message: `Rule ${rule.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { rule },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
