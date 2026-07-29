const User = require('../models/User');
const Otp = require('../models/Otp');
const { generateToken } = require('../utils/helpers');
const { validateRegistration, validateLogin } = require('../utils/validators');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const config = require('../config/env');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 */
exports.register = async (req, res) => {
  const { username, email, password, role } = req.body;

  // Validate input
  const validation = validateRegistration(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.errors.join('. '),
    });
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    return res.status(400).json({
      success: false,
      message:
        existingUser.email === email
          ? 'Email is already registered'
          : 'Username is already taken',
    });
  }

  // Create user (only allow 'analyst' or 'viewer' role via registration)
  const user = await User.create({
    username,
    email,
    password,
    role: ['analyst', 'viewer'].includes(role) ? role : 'analyst',
  });

  res.status(201).json({
    success: true,
    message: 'Registration successful. Please log in to verify your email.',
  });
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 */
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  const validation = validateLogin(req.body);
  if (!validation.valid) {
    return res.status(400).json({
      success: false,
      message: validation.errors.join('. '),
    });
  }

  // Find user with password field
  const user = await User.findOne({ email }).select('+password');

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }

  if (!user.isActive) {
    return res.status(401).json({
      success: false,
      message: 'Account has been deactivated. Contact an administrator.',
    });
  }

  // Check password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password',
    });
  }

  // 1. Delete any existing OTPs for this user
  await Otp.deleteMany({ userId: user._id });

  // 2. Generate a random 6-digit OTP
  const rawOtp = Math.floor(100000 + Math.random() * 900000).toString();

  // 3. Hash the OTP
  const salt = await bcrypt.genSalt(10);
  const otpHash = await bcrypt.hash(rawOtp, salt);

  // 4. Save to DB
  await Otp.create({
    userId: user._id,
    otpHash: otpHash,
  });

  // 5. Generate a short-lived temporary token for OTP verification
  const otpToken = jwt.sign(
    { id: user._id, type: 'otp' },
    config.jwtSecret,
    { expiresIn: '5m' }
  );

  // --- EMAIL SENDING (NODEMAILER) ---
  if (config.smtpUser && config.smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });
      
      await transporter.sendMail({
        from: `"SentinelAI Security" <${config.smtpUser}>`,
        to: user.email,
        subject: 'Your SentinelAI Login OTP',
        text: `Your SentinelAI Security Code is: ${rawOtp}\n\nIt expires in 5 minutes. Do not share this code with anyone.`,
      });
      console.log(`[Email] Successfully sent OTP to ${user.email}`);
    } catch (error) {
      console.error(`[Email Error] Failed to send Email:`, error.message);
      // Fallback to console if Nodemailer fails in dev
      console.log(`\n\n[FALLBACK OTP] Code: ${rawOtp}\n\n`);
    }
  } else {
    // --- SIMULATED EMAIL SENDING (No SMTP Config) ---
    console.log(`\n\n======================================`);
    console.log(`📧 [SIMULATED EMAIL] Sent to ${user.email}`);
    console.log(`🔐 OTP Code: ${rawOtp}`);
    console.log(`======================================\n\n`);
  }
  // -----------------------------

  res.json({
    success: true,
    requiresOtp: true,
    message: 'OTP sent to your registered email address',
    otpToken: otpToken,
  });
};

/**
 * @desc    Login with Google
 * @route   POST /api/auth/google
 */
exports.googleLogin = async (req, res) => {
  const { credential } = req.body;
  if (!credential) {
    return res.status(400).json({ success: false, message: 'Google credential missing' });
  }

  try {
    const client = new OAuth2Client(config.googleClientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: config.googleClientId,
    });
    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    // Check if user exists by email or googleId
    let user = await User.findOne({ $or: [{ email }, { googleId }] });

    if (user) {
      // Link googleId if not linked yet
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
      if (!user.isActive) {
        return res.status(401).json({ success: false, message: 'Account deactivated.' });
      }
    } else {
      // Register a new user automatically
      // Generate random strong password as placeholder since they login via Google
      const randomPassword = require('crypto').randomBytes(16).toString('hex') + 'A1!';
      
      let baseUsername = name.replace(/\s+/g, '_').toLowerCase();
      let username = baseUsername;
      let count = 1;
      while (await User.findOne({ username })) {
        username = `${baseUsername}${count++}`;
      }

      user = await User.create({
        username,
        email,
        password: randomPassword,
        googleId,
        role: 'viewer', // default to viewer for auto-registered users for safety
      });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);
    res.json({
      success: true,
      message: 'Google login successful',
      data: {
        user: user.toJSON(),
        token,
      },
    });
  } catch (error) {
    console.error('[Google Auth Error]', error);
    res.status(401).json({ success: false, message: 'Google authentication failed' });
  }
};

/**
 * @desc    Verify OTP to complete login
 * @route   POST /api/auth/verify-otp
 */
exports.verifyOtp = async (req, res) => {
  const { otpToken, otp } = req.body;

  if (!otpToken || !otp) {
    return res.status(400).json({ success: false, message: 'OTP token and code are required' });
  }

  try {
    // 1. Verify temporary JWT
    const decoded = jwt.verify(otpToken, config.jwtSecret);
    if (decoded.type !== 'otp') {
      return res.status(401).json({ success: false, message: 'Invalid token type' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // 2. Find OTP document
    const otpRecord = await Otp.findOne({ userId: user._id });
    if (!otpRecord) {
      return res.status(401).json({ success: false, message: 'OTP expired or not found. Please login again.' });
    }

    // 3. Verify OTP Hash
    const isMatch = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid OTP code' });
    }

    // 4. Valid OTP: Cleanup OTP record
    await Otp.deleteMany({ userId: user._id });

    // 5. Update last login and generate final token
    user.lastLogin = new Date();
    await user.save();

    const token = generateToken(user);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: user.toJSON(),
        token,
      },
    });

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'OTP session expired. Please login again.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid OTP session.' });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/profile
 */
exports.getProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  res.json({
    success: true,
    data: { user },
  });
};

/**
 * @desc    Get all users (admin only)
 * @route   GET /api/auth/users
 */
exports.getUsers = async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });

  res.json({
    success: true,
    data: { users, total: users.length },
  });
};

/**
 * @desc    Admin creates a user with any role
 * @route   POST /api/auth/users
 */
exports.createUser = async (req, res) => {
  const { username, email, password, role } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ success: false, message: 'username, email and password are required' });
  }

  const existing = await User.findOne({ $or: [{ email }, { username }] });
  if (existing) {
    return res.status(400).json({
      success: false,
      message: existing.email === email ? 'Email already registered' : 'Username already taken',
    });
  }

  const user = await User.create({
    username,
    email,
    password,
    role: ['admin', 'analyst', 'viewer'].includes(role) ? role : 'analyst',
  });

  res.status(201).json({ success: true, message: 'User created', data: { user: user.toJSON() } });
};

/**
 * @desc    Update a user's role (admin only)
 * @route   PUT /api/auth/users/:id/role
 */
exports.updateUserRole = async (req, res) => {
  const { role } = req.body;
  if (!['admin', 'analyst', 'viewer'].includes(role)) {
    return res.status(400).json({ success: false, message: 'Invalid role. Must be admin, analyst, or viewer.' });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true, runValidators: true }
  ).select('-password');

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  res.json({ success: true, message: `Role updated to ${role}`, data: { user } });
};

/**
 * @desc    Block or unblock a user (admin only)
 * @route   PATCH /api/auth/users/:id/block
 */
exports.toggleUserBlock = async (req, res) => {
  const { blocked } = req.body;

  // Prevent admin from blocking themselves
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: 'You cannot block your own account.' });
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: !blocked },
    { new: true }
  ).select('-password');

  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  res.json({
    success: true,
    message: blocked ? 'User account blocked' : 'User account unblocked',
    data: { user },
  });
};

/**
 * @desc    Delete a user (admin only)
 * @route   DELETE /api/auth/users/:id
 */
exports.deleteUser = async (req, res) => {
  if (req.params.id === req.user._id.toString()) {
    return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
  }

  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });

  res.json({ success: true, message: 'User deleted successfully' });
};

/**
 * @desc    Verify token and return current user state (for frontend sync)
 * @route   GET /api/auth/verify
 */
exports.verifyToken = async (req, res) => {
  // authenticate middleware already verified token and fetched req.user
  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }

  if (!user.isActive) {
    return res.status(401).json({ success: false, message: 'Account has been deactivated' });
  }

  res.json({
    success: true,
    data: { user: user.toJSON() },
  });
};
