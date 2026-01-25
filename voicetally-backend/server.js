require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1'; // STRICT: Localhost only

// --- SECURITY MIDDLEWARE ---

// 1. Helmet: Sets various HTTP headers to secure the app
app.use(helmet());

// 2. CORS: Restrict access to specific origins (e.g., your extension ID)
// For MVP dev, we allow all, but in prod, this should be your Extension ID.
app.use(cors({ origin: '*' })); 

// 3. Rate Limiter: Prevent brute force/DoS
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW_MIN || 1) * 60 * 1000, // 1 minute
  max: process.env.RATE_LIMIT_MAX_REQ || 100, // Limit each IP to 100 requests per window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: "Too many requests, please try again later." }
});

// Apply rate limiting to all requests
app.use(limiter);

// --- VALIDATION HELPER ---
const VALID_PERIODS = ['week', 'month', 'year'];

// --- ROUTES ---

// 1. Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// 2. Sales Data Endpoint
app.get('/sales', (req, res) => {
  // Input Validation
  const period = req.query.period;

  // Strict Parameter Validation
  if (period && !VALID_PERIODS.includes(period)) {
    return res.status(400).json({ 
      error: "Invalid Parameter", 
      message: `Period must be one of: ${VALID_PERIODS.join(', ')}` 
    });
  }

  // Check for unexpected parameters (Whitelisting approach)
  const allowedKeys = ['period'];
  const queryKeys = Object.keys(req.query);
  const invalidKeys = queryKeys.filter(key => !allowedKeys.includes(key));

  if (invalidKeys.length > 0) {
    return res.status(400).json({
      error: "Bad Request",
      message: `Unknown parameters: ${invalidKeys.join(', ')}`
    });
  }

  // Mock Data Logic
  const data = {
    period: period || 'week', // Default to week
    total: period === 'month' ? 450000 : 124500,
    currency: "INR",
    transaction_count: period === 'month' ? 120 : 45
  };

  res.json(data);
});

// --- GLOBAL ERROR HANDLER ---
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// --- START SERVER ---
app.listen(PORT, HOST, () => {
  console.log(`[VoiceTally-Backend] Securely running at http://${HOST}:${PORT}`);
  console.log(`[Security] Rate Limit: ${process.env.RATE_LIMIT_MAX_REQ} reqs / ${process.env.RATE_LIMIT_WINDOW_MIN} min`);
});