document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('queryInput');
  const button = document.getElementById('submitBtn');
  const output = document.getElementById('output');

  button.addEventListener('click', handleQuery);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleQuery();
  });

  function handleQuery() {
    const query = input.value.trim();
    output.classList.remove('error', 'success');
    output.style.borderColor = "#ddd";
    
    if (!query) {
      showOutput("Please enter a question.", "error");
      return;
    }

    // Set UI to loading state
    button.disabled = true;
    button.textContent = "Asking...";
    showOutput("Connecting to local system...", "neutral");

    // Send Message to Background
    chrome.runtime.sendMessage({ type: 'QUERY_TALLY', payload: query }, (response) => {
      // Reset UI state
      button.disabled = false;
      button.textContent = "Ask Tally";

      // 1. Runtime Error (e.g., Extension context invalidated)
      if (chrome.runtime.lastError) {
        showOutput("Extension Error: " + chrome.runtime.lastError.message, "error");
        return;
      }

      // 2. Logic Error from Background
      if (!response.success) {
        showOutput(response.error, "error");
        return;
      }

      // 3. Success
      formatAndDisplayResult(response.data);
    });
  }

  function showOutput(msg, type) {
    output.textContent = msg;
    if (type === 'error') {
      output.style.borderColor = "#d9534f";
      output.style.color = "#d9534f";
    } else if (type === 'neutral') {
      output.style.color = "#666";
    }
  }

  function formatAndDisplayResult(data) {
    output.style.borderColor = "#28a745";
    output.style.color = "#333";
    
    // Pretty print the JSON for the MVP
    // In a real app, you would parse this into an HTML table
    output.textContent = JSON.stringify(data, null, 2);
  }
});