const dotenv = require('dotenv');
const path = require('path');

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
// Also try local .env
dotenv.config({ path: path.join(__dirname, '..', '.env') });

module.exports = {
  port: process.env.BACKEND_PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/sentinelai',
  jwtSecret: process.env.JWT_SECRET || 'sentinelai-dev-secret-key-2024',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  groqApiKey: process.env.GROQ_API_KEY || '',
  groqModel: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
};
