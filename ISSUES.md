# VoiceTally Project Issue Tracker

This document tracks the status of identified issues in the codebase.

---

## 🔴 Unresolved Issues
*(Critical issues pending action)*

> **Status**: Great job! No critical unresolved issues identified at this time.

---

## ⚠️ Deferred Issues
*(Identified but postponed)*

### ⏳ In-Memory Data Storage
- **Section**: Scalability
- **Issue**: `file_ingestion.js` loads the entire CSV into RAM. Large datasets (>500MB) will crash the server.
- **Recommendation**: Migrate to **SQLite** for disk-based storage and efficient SQL querying.
- **Status**: **DEFERRED** (Per user instruction: "Ignore scalability for now")

---

## ✅ Resolved Issues
*(Fixed and verified)*

### 🔒 Security: Permissive CORS Configuration
- **Issue**: Backend allowed all origins (`*`), posing a risk of data theft from malicious sites.
- **Resolution**: Updated `server.js` to strictly allow only the specific Chrome Extension ID (configurable via `.env`).

### 🔒 Security: Unused Extension Permissions
- **Issue**: `manifest.json` requested `activeTab` and `scripting` without using them.
- **Resolution**: Removed unnecessary permissions. Now only requests `storage`.

### 🛠 Quality: Hardcoded Connector URL
- **Issue**: Extension hardcoded `http://127.0.0.1:3000`, making it hard to change ports.
- **Resolution**: Refactored `background.js` to read `connectorUrl` from `chrome.storage.local`.

### 🛠 Quality: Conceptual STT Endpoint
- **Issue**: `server.js` contained a non-functional "conceptual" endpoint for Whisper CLI.
- **Resolution**: Removed the dead code to ensure the backend is production-ready and lean.

### 🛡 Robustness: Robust Date Parsing
- **Issue**: JS `Date()` failed on common Tally formats (e.g., DD-MM-YYYY), leading to skipped records.
- **Resolution**: Implemented `date-fns` in `file_ingestion.js` to intelligently parse generic ISO, `dd-MM-yyyy`, and slash-separated formats.
