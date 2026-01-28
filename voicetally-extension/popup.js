document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('queryInput');
  const submitBtn = document.getElementById('submitBtn');
  const micBtn = document.getElementById('micBtn');
  const output = document.getElementById('output');
  const statusBar = document.getElementById('statusBar');

  // --- STANDARD EVENT LISTENERS ---
  submitBtn.addEventListener('click', handleQuery);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleQuery();
  });

  // --- SPEECH RECOGNITION SETUP ---
  
  // 1. Browser Compatibility Check
  // We check for the prefixed version common in Chromium browsers
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    // Graceful Degradation: Hide mic button if API is missing
    micBtn.style.display = 'none';
  } else {
    initializeVoice(SpeechRecognition);
  }

  function initializeVoice(RecognitionClass) {
    const recognition = new RecognitionClass();
    
    // Configuration
    recognition.continuous = false; // Stop automatically after one sentence
    recognition.interimResults = true; // Show text while speaking (feedback)
    recognition.lang = 'en-US'; 
    recognition.maxAlternatives = 1;

    let isListening = false;
    let watchdogTimer = null; // Security timeout reference

    // Button Toggle Logic
    micBtn.addEventListener('click', () => {
      if (isListening) {
        recognition.stop();
      } else {
        startListening();
      }
    });

    function startListening() {
      // Clear previous states
      output.textContent = "";
      output.classList.remove('error');
      input.value = "";
      
      try {
        recognition.start(); // This triggers permission prompt on first use
      } catch (err) {
        // Handle race conditions (e.g., clicking too fast)
        updateStatus("Mic Error: Try again.", true);
      }
    }

    // --- API EVENT HANDLERS ---

    recognition.onstart = () => {
      isListening = true;
      micBtn.classList.add('listening');
      updateStatus("Listening... (10s max)");

      // SECURITY: 10-Second Max Duration
      // Prevents the mic from hanging open indefinitely
      watchdogTimer = setTimeout(() => {
        if (isListening) {
          recognition.stop();
          updateStatus("Timed out.", true);
        }
      }, 10000); 
    };

    recognition.onend = () => {
      isListening = false;
      micBtn.classList.remove('listening');
      clearTimeout(watchdogTimer); // Clean up timer
      
      // If the user just stopped speaking without valid input, reset text
      if (input.value.trim() === "") {
         updateStatus("No speech detected.");
      } else {
         updateStatus(""); // Clear status if we have text
      }
    };

    recognition.onresult = (event) => {
      // Extract transcript
      // event.resultIndex is usually 0 for single-shot mode
      const transcript = event.results[0][0].transcript;

      // SECURITY: Length Validation
      // We truncate visually or stop processing if it exceeds limits
      if (transcript.length > 200) {
        recognition.stop();
        updateStatus("Input too long.", true);
        return;
      }

      // Live Feedback
      input.value = transcript;

      // Check if this is the "Final" result (user stopped speaking)
      if (event.results[0].isFinal) {
        // Automatic Handoff to Submission Logic
        handleQuery();
      }
    };

    recognition.onerror = (event) => {
      clearTimeout(watchdogTimer);
      isListening = false;
      micBtn.classList.remove('listening');

      // Granular Error Handling
      switch (event.error) {
        case 'not-allowed':
          updateStatus("Permission denied.", true);
          break;
        case 'no-speech':
          updateStatus("No speech detected.", true);
          break;
        case 'network':
          updateStatus("Offline: Voice unavailable.", true);
          break;
        default:
          updateStatus("Voice Error: " + event.error, true);
      }
    };
  }

  function updateStatus(msg, isError = false) {
    statusBar.textContent = msg;
    statusBar.style.color = isError ? "#d9534f" : "#666";
  }

  // --- CORE QUERY PIPELINE (Reused) ---
  function handleQuery() {
    const query = input.value.trim();
    
    // Clear status
    output.classList.remove('error');
    output.style.borderColor = "#ddd";

    // 1. Validation (Applies to both Voice and Type)
    if (!query) return; // Ignore empty inputs
    
    if (query.length > 200) {
      showOutput("Error: Query too long (max 200 chars).", "error");
      return;
    }

    // 2. Processing
    statusBar.textContent = "";
    showOutput("Asking Tally...", "neutral");

    chrome.runtime.sendMessage({ type: 'QUERY_TALLY', payload: query }, (response) => {
      if (chrome.runtime.lastError) {
        showOutput("System Error: " + chrome.runtime.lastError.message, "error");
        return;
      }

      if (response && response.success) {
        // Pretty print JSON response
        output.textContent = JSON.stringify(response.data, null, 2);
        output.style.borderColor = "#28a745";
        output.style.color = "#333";
      } else {
        showOutput(response ? response.error : "Unknown error.", "error");
      }
    });
  }

  function showOutput(msg, type) {
    output.textContent = msg;
    if (type === 'error') {
      output.style.borderColor = "#d9534f";
      output.style.color = "#d9534f";
    } else {
      output.style.color = "#666";
    }
  }
});