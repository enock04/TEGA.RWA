const https = require('https');
const http = require('http');
const logger = require('../utils/logger');

const INTERVAL_MS = 10 * 60 * 1000; // ping every 10 minutes

const start = () => {
  const baseUrl = process.env.RENDER_EXTERNAL_URL;
  if (!baseUrl) return; // only active when deployed on Render

  const client = baseUrl.startsWith('https') ? https : http;
  const url = `${baseUrl}/health`;

  logger.info(`[KeepAlive] Self-ping enabled — pinging ${url} every 10 min`);

  setInterval(() => {
    client.get(url, (res) => {
      logger.info(`[KeepAlive] Pinged /health — HTTP ${res.statusCode}`);
    }).on('error', (err) => {
      logger.warn(`[KeepAlive] Ping failed: ${err.message}`);
    });
  }, INTERVAL_MS);
};

module.exports = { start };
