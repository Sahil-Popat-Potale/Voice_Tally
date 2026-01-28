require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT;
const HOST = process.env.HOST; // STRICT: Localhost only

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
const { getSales } = require('./file_ingestion');

// 2. Sales Data Endpoint
app.get('/sales', async (req, res) => {
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

  try {
    const data = await getSales({ period });
    res.json(data);
  } catch (err) {
    console.error("Data Fetch Error:", err);
    res.status(500).json({ error: "Failed to load data." });
  }
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

// Conceptual Implementation, Secure STT Endpoint (Fragment)
const multer = require('multer'); // Middleware for multipart/form-data
const fs = require('fs');
const { exec } = require('child_process');

// 1. Configure Storage (Ephemeral)
const upload = multer({
  dest: require('os').tmpdir(), // Save to RAM-disk or Temp
  limits: {
    fileSize: 1024 * 1024, // 1MB Hard Limit
    files: 1
  }
});

// 2. Global Lock (Simple Concurrency Control)
let isTranscribing = false;

app.post('/transcribe', upload.single('audio'), (req, res) => {
  // A. Concurrency Check
  if (isTranscribing) {
    cleanup(req.file.path);
    return res.status(429).json({ error: "System busy processing another voice command." });
  }

  // B. Validation
  if (!req.file) return res.status(400).json({ error: "No audio file provided." });
  if (req.file.mimetype !== 'audio/wav' && req.file.mimetype !== 'audio/webm') {
    cleanup(req.file.path);
    return res.status(400).json({ error: "Invalid format. Send WAV or WebM." });
  }

  isTranscribing = true;

  // C. Execute Local Whisper (Example Command)
  // Assumes 'whisper-main' executable is in path or bundled
  const cmd = `./bin/whisper-main -m models/ggml-tiny.en.bin -f "${req.file.path}" -nt`;

  const process = exec(cmd, { timeout: 10000 }, (error, stdout, stderr) => {
    isTranscribing = false;
    cleanup(req.file.path); // D. Security: Immediate Deletion

    if (error) {
      console.error("STT Error:", stderr);
      return res.status(500).json({ error: "Transcription failed." });
    }

    // E. Text Normalization
    const cleanText = stdout.trim().replace(/\[.*?\]/g, ''); // Remove timestamps/metadata
    res.json({ success: true, text: cleanText });
  });
});

function cleanup(path) {
  if (path && fs.existsSync(path)) fs.unlinkSync(path);
}