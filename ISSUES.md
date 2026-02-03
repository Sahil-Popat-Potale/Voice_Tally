# VoiceTally Project Code Audit & Issues

This document lists issues identified during a comprehensive scan of the `voicetally-backend` and `voicetally-extension` codebases (excluding `data/` and `node_modules/`).

## 1. Security Vulnerabilities

### [CRITICAL] Permissive CORS Configuration
- **File**: `voicetally-backend/server.js` (Line 18)
- **Issue**: `app.use(cors({ origin: '*' }));` allows any website to query your local server. Malicious sites could scan `127.0.0.1:3000` and steal financial data.
- **Production Fix**:
  Restrict origin to your specific Chrome Extension ID.
  1. Add `EXTENSION_ID` to `.env`.
  2. Update `server.js`:
     ```javascript
     const corsOptions = {
       origin: process.env.NODE_ENV === 'production' 
         ? `chrome-extension://${process.env.EXTENSION_ID}` 
         : '*', // Dev mode
       optionsSuccessStatus: 200
     };
     app.use(cors(corsOptions));
     ```

### [MEDIUM] Unused Extension Permissions
- **File**: `voicetally-extension/manifest.json` (Lines 20-21)
- **Issue**: `activeTab` and `scripting` permissions are declared but not used in the current Popup -> Background -> Server architecture. Unused permissions increase attack surface and user suspicion.
- **Production Fix**: Remove them if no content scripts are planned.
  ```json
  "permissions": ["storage"] 
  ```

## 2. Scalability & Performance

### [HIGH] In-Memory Data Storage
- **File**: `voicetally-backend/file_ingestion.js` (Lines 7, 67, 95)
- **Issue**: `cachedSales` loads the entire CSV/XML file into RAM. For large Tally exports (e.g., 500MB+), this will crash the Node.js process (OOM).
- **Production Fix**: Switch to a lightweight embedded database like **SQLite**.
  - **Ingestion**: Parse CSV stream -> Insert into SQLite `sales` table.
  - **Query**: Use SQL (`SELECT sum(amount) FROM sales WHERE ...`).
  - *Benefits*: Low RAM usage, instant filtering, ACID compliance.

### [MEDIUM] Synchronous Filter Logic
- **File**: `voicetally-backend/file_ingestion.js`
- **Issue**: `filtered.filter(...)` runs on the main thread. Large datasets will block the event loop, causing request timeouts.
- **Fix**: Moving to SQLite (above) solves this. Alternatively, use Node.js Worker Threads for processing.

## 3. Code Quality & Maintenance

### [MEDIUM] Hardcoded Configuration
- **File**: `voicetally-extension/background.js` (Line 2)
- **Issue**: `const CONNECTOR_BASE_URL = 'http://127.0.0.1:3000';` is hardcoded. Changing ports requires extension recompilation.
- **Production Fix**: proper `options.html` page for the extension where the user can configure the connector URL, stored in `chrome.storage.local`.

### [LOW] Conceptual STT Endpoint
- **File**: `voicetally-backend/server.js` (Lines 91-143)
- **Issue**: The `/transcribe` endpoint is implemented as a "Conceptual Fragment" using `child_process.exec`. It relies on an external binary (`whisper-main`) existing in a specific path.
- **Fix**:
  - Integrate a Node.js binding for Whisper (e.g., `whisper-node`) instead of raw `exec` calls.
  - Or officially deprecated this endpoint if client-side Web Speech API is the primary method.

## 4. Robustness

### [LOW] Loose Date Parsing
- **File**: `voicetally-backend/file_ingestion.js` (Line 29)
- **Issue**: `new Date(record[dateKey])` is inconsistent across locales (e.g., MM/DD vs DD/MM). Tally often exports DD-MM-YYYY which JS parses incorrectly or invalidates.
- **Production Fix**: Use a date library like `date-fns` or `moment` with explicit format strings (e.g., `parse(dateStr, 'dd-MM-yyyy', new Date())`).
