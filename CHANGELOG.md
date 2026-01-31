# VoiceTally Extension Changelog's

---

Log Date: 25-01-2026 - 30-01-2026

This changelog covers the new features implemented for VoiceTally: Voice/STT Integration and Real-World Backend with File Ingestion.

### New Features

1. **Voice Interaction:** Click the 🎤 button in the popup to speak your query. The extension uses the Web Speech API to transcribe your voice.

2. **Real Data Ingestion:** The local backend now reads from a CSV file ```(data/sales.csv)``` instead of using hardcoded mock data.
   * Supported format: ```Date,Customer,Amount,Status```.
   * Secure ingestion: Validates file existence and content.

### Setup & Verification
1. Start the Local Backend
    The extension relies on the local backend service.

    1. Navigate to ```...\Voice_Tally\voicetally-backend```.
    2. Run the server:
       ```node
       npm start
       ```
       *Note: The server runs on port 3000.*

2. Install/Reload Extension

   Follow the steps in **extension_steps.md:** if avilable.
   1. Open ```chrome://extensions```.
   2. Enable Developer Mode.
   3. Click Load Unpacked.
   4. Select folder ```...\Voice_Tally\voicetally-extension```.

4. Verify Voice & Data
   1. Click the VoiceTally extension icon.
   2. **Text Query:** Type ```sales last week``` and press Enter. You should see real data from the CSV file (e.g., Total: ₹...).
   3. **Voice Query:** Click the Microphone icon, say ```"sales last week"```. It should transcribe and fetch the same data.

Configuration
1. **Data File:** You can edit ```...\Voice_Tally\voicetally-backend\data\sales.csv``` to add your own test data.
2. **Environment:** Configuration is in **voicetally-backend/.env**.

Security Notes
* **Rate Limiting:** The backend limits requests to 100/min.
* **Input Validation:** Extension and Backend strictly validate length and content of queries.