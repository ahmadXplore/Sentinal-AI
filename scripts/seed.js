/**
 * Seed script — creates default admin user and sample log data.
 * Run: node scripts/seed.js
 */
const mongoose = require('../backend/node_modules/mongoose');
const path = require('path');

// Load env
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/sentinelai';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const User = require('../backend/models/User');
    const Log = require('../backend/models/Log');
    const AISummary = require('../backend/models/AISummary');

    // Clear existing data
    await User.deleteMany({});
    await Log.deleteMany({});
    await AISummary.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create admin user
    const admin = await User.create({
      username: 'admin',
      email: 'admin@sentinelai.com',
      password: 'Admin@123',
      role: 'admin',
    });
    console.log('👤 Created admin user: admin@sentinelai.com / Admin@123');

    // Create analyst user
    const analyst = await User.create({
      username: 'analyst',
      email: 'analyst@sentinelai.com',
      password: 'Analyst@123',
      role: 'analyst',
    });
    console.log('👤 Created analyst user: analyst@sentinelai.com / Analyst@123');

    // Create viewer user
    await User.create({
      username: 'viewer',
      email: 'viewer@sentinelai.com',
      password: 'Viewer@123',
      role: 'viewer',
    });
    console.log('👤 Created viewer user: viewer@sentinelai.com / Viewer@123');

    // Sample syslog data
    const syslogContent = `Jan 12 06:26:19 server sshd[12345]: Failed password for invalid user admin from 192.168.1.100 port 22 ssh2
Jan 12 06:26:21 server sshd[12346]: Failed password for invalid user root from 192.168.1.100 port 22 ssh2
Jan 12 06:26:23 server sshd[12347]: Failed password for invalid user admin from 192.168.1.100 port 22 ssh2
Jan 12 06:26:25 server sshd[12348]: Failed password for invalid user test from 192.168.1.100 port 22 ssh2
Jan 12 06:26:27 server sshd[12349]: Failed password for invalid user admin from 192.168.1.100 port 22 ssh2
Jan 12 06:27:01 server sshd[12350]: Accepted password for john from 10.0.0.5 port 22 ssh2
Jan 12 06:30:00 server sudo: john : TTY=pts/0 ; PWD=/home/john ; USER=root ; COMMAND=/bin/bash
Jan 12 06:30:05 server kernel: [UFW BLOCK] IN=eth0 OUT= MAC= SRC=203.0.113.50 DST=192.168.1.10 PROTO=TCP SPT=45678 DPT=3389
Jan 12 06:31:00 server sshd[12351]: Failed password for invalid user admin from 45.33.32.156 port 22 ssh2
Jan 12 06:31:02 server sshd[12352]: Failed password for invalid user root from 45.33.32.156 port 22 ssh2
Jan 12 06:31:04 server sshd[12353]: Failed password for invalid user administrator from 45.33.32.156 port 22 ssh2
Jan 12 06:32:00 server kernel: [UFW BLOCK] IN=eth0 OUT= MAC= SRC=203.0.113.50 DST=192.168.1.10 PROTO=TCP SPT=45679 DPT=445
Jan 12 06:35:00 server cron[12354]: (root) CMD (/usr/bin/certbot renew)
Jan 12 06:40:00 server sshd[12355]: Accepted publickey for deploy from 10.0.0.20 port 22 ssh2
Jan 12 07:00:00 server kernel: Linux version 5.4.0 (gcc version 9.3.0)
Jan 12 07:15:00 server sshd[12360]: Failed password for invalid user oracle from 185.220.101.1 port 22 ssh2
Jan 12 07:15:02 server sshd[12361]: Failed password for invalid user postgres from 185.220.101.1 port 22 ssh2
Jan 12 07:15:04 server sshd[12362]: Failed password for invalid user mysql from 185.220.101.1 port 22 ssh2
Jan 12 07:20:00 server sudo: deploy : TTY=pts/1 ; PWD=/opt/app ; USER=root ; COMMAND=/usr/bin/systemctl restart nginx
Jan 12 07:25:00 server kernel: [UFW BLOCK] IN=eth0 OUT= MAC= SRC=198.51.100.23 DST=192.168.1.10 PROTO=UDP SPT=53 DPT=53`;

    const { parseLog } = require('../backend/services/logParser');
    const { normalizeEntries } = require('../backend/services/logNormalizer');

    const { format: syslogFormat, entries: syslogEntries } = parseLog(syslogContent);
    const syslogNormalized = normalizeEntries(syslogEntries);

    await Log.create({
      filename: 'sample-auth-syslog.log',
      originalName: 'auth-syslog-jan12.log',
      format: syslogFormat,
      rawContent: syslogContent,
      parsedEntries: syslogNormalized.entries,
      totalEntries: syslogNormalized.totalEntries,
      severityCounts: syslogNormalized.severityCounts,
      uploadedBy: admin._id,
      metadata: {
        fileSize: Buffer.byteLength(syslogContent),
        mimeType: 'text/plain',
        sourceIPs: syslogNormalized.sourceIPs,
        dateRange: syslogNormalized.dateRange,
      },
      status: 'parsed',
    });
    console.log('📄 Created sample syslog');

    // Sample Apache access log
    const apacheContent = `192.168.1.50 - john [12/Jan/2024:08:00:01 +0000] "GET /dashboard HTTP/1.1" 200 5432 "-" "Mozilla/5.0"
192.168.1.50 - john [12/Jan/2024:08:00:05 +0000] "GET /api/users HTTP/1.1" 200 1234 "-" "Mozilla/5.0"
10.0.0.99 - - [12/Jan/2024:08:05:00 +0000] "GET /admin/config HTTP/1.1" 403 289 "-" "curl/7.68.0"
10.0.0.99 - - [12/Jan/2024:08:05:02 +0000] "GET /admin/../../../etc/passwd HTTP/1.1" 400 0 "-" "curl/7.68.0"
10.0.0.99 - - [12/Jan/2024:08:05:04 +0000] "POST /login HTTP/1.1" 401 145 "-" "curl/7.68.0"
10.0.0.99 - - [12/Jan/2024:08:05:06 +0000] "POST /login HTTP/1.1" 401 145 "-" "curl/7.68.0"
10.0.0.99 - - [12/Jan/2024:08:05:08 +0000] "POST /login HTTP/1.1" 401 145 "-" "curl/7.68.0"
172.16.0.5 - admin [12/Jan/2024:09:00:00 +0000] "GET /api/reports HTTP/1.1" 200 8976 "-" "Mozilla/5.0"
172.16.0.5 - admin [12/Jan/2024:09:15:00 +0000] "POST /api/logs/upload HTTP/1.1" 201 567 "-" "Mozilla/5.0"
45.33.32.156 - - [12/Jan/2024:10:00:00 +0000] "GET /wp-admin HTTP/1.1" 404 0 "-" "Googlebot/2.1"
45.33.32.156 - - [12/Jan/2024:10:00:02 +0000] "GET /phpmyadmin HTTP/1.1" 404 0 "-" "Googlebot/2.1"
45.33.32.156 - - [12/Jan/2024:10:00:04 +0000] "GET /.env HTTP/1.1" 404 0 "-" "Googlebot/2.1"
203.0.113.10 - - [12/Jan/2024:11:00:00 +0000] "GET / HTTP/1.1" 200 12345 "-" "Mozilla/5.0"
203.0.113.10 - - [12/Jan/2024:11:00:05 +0000] "GET /api/status HTTP/1.1" 500 234 "-" "Mozilla/5.0"`;

    const { format: apacheFormat, entries: apacheEntries } = parseLog(apacheContent);
    const apacheNormalized = normalizeEntries(apacheEntries);

    await Log.create({
      filename: 'sample-apache-access.log',
      originalName: 'apache-access-jan12.log',
      format: apacheFormat,
      rawContent: apacheContent,
      parsedEntries: apacheNormalized.entries,
      totalEntries: apacheNormalized.totalEntries,
      severityCounts: apacheNormalized.severityCounts,
      uploadedBy: analyst._id,
      metadata: {
        fileSize: Buffer.byteLength(apacheContent),
        mimeType: 'text/plain',
        sourceIPs: apacheNormalized.sourceIPs,
        dateRange: apacheNormalized.dateRange,
      },
      status: 'parsed',
    });
    console.log('📄 Created sample Apache access log');

    console.log('\n✅ Seeding complete!');
    console.log('────────────────────────────────────');
    console.log('Admin:   admin@sentinelai.com / Admin@123');
    console.log('Analyst: analyst@sentinelai.com / Analyst@123');
    console.log('Viewer:  viewer@sentinelai.com / Viewer@123');
    console.log('────────────────────────────────────');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
