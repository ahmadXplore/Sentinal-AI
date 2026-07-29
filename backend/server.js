const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const connectDB = require('./config/db');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');

// Route imports
const authRoutes = require('./routes/auth');
const logRoutes = require('./routes/logs');
const aiRoutes = require('./routes/ai');
const dashboardRoutes = require('./routes/dashboard');
const ruleRoutes = require('./routes/rules');
const alertRoutes = require('./routes/alerts');
const chatRoutes = require('./routes/chat');
const incidentRoutes = require('./routes/incidents');
const mlRoutes = require('./routes/ml');
const { seedDefaultRules } = require('./services/detectionEngine');

const app = express();

// ─── Middleware ────────────────────────────────────────────

// Set security HTTP headers
app.use(helmet());

app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent HTTP param pollution
app.use(hpp());

// Apply global rate limiting
app.use('/api', globalLimiter);

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Static uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ───────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/rules', ruleRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/ml', mlRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'SentinelAI Backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────
const startServer = async () => {
  await connectDB();
  await seedDefaultRules();

  app.listen(config.port, () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║     🛡️  SentinelAI Backend Server        ║
    ║     Mode: ${config.nodeEnv.padEnd(28)}   ║
    ║     Port: ${String(config.port).padEnd(28)}   ║
    ║     API:  http://localhost:${config.port}/api    ║
    ╚══════════════════════════════════════════╝
    `);
  });
};

startServer();

module.exports = app;
