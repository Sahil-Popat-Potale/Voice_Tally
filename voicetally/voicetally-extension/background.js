// CONFIGURATION
const CONNECTOR_BASE_URL = 'http://127.0.0.1:3000';
const REQUEST_TIMEOUT_MS = 3000; // 3 seconds max wait time

chrome.runtime.onInstalled.addListener(() => {
  console.log("VoiceTally Background Service Online");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  // 1. Validate Message Structure
  if (message.type !== 'QUERY_TALLY' || !message.payload || typeof message.payload !== 'string') {
    console.warn("Invalid message received:", message);
    sendResponse({ success: false, error: "Invalid request format." });
    return false;
  }

  // 2. Process Request asynchronously
  handleConnectorRequest(message.payload)
    .then(data => sendResponse({ success: true, data: data }))
    .catch(err => {
      // Map technical errors to user-friendly codes
      let userMsg = "System Error";
      if (err.message.includes("Failed to fetch")) userMsg = "Local Connector is offline.";
      else if (err.name === 'AbortError') userMsg = "Request timed out.";
      else userMsg = err.message;
      
      sendResponse({ success: false, error: userMsg });
    });

  return true; // Keep channel open for async response
});

/**
 * Orchestrates the fetch to the local service with timeout and validation.
 */
async function handleConnectorRequest(query) {
  const normalizedQuery = query.toLowerCase().trim();
  let endpoint = '';

  // Simple intent routing (in a real app, this would be more robust)
  if (normalizedQuery.includes('sales')) {
    endpoint = '/sales?period=week'; // Defaulting to week for MVP
  } else if (normalizedQuery === 'health') {
    endpoint = '/health';
  } else {
    throw new Error("Unknown command. Try 'sales'.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${CONNECTOR_BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Handle HTTP Errors explicitly
    if (!response.ok) {
      if (response.status === 429) throw new Error("Too many requests. Please wait.");
      if (response.status === 400) throw new Error("Invalid request parameters.");
      throw new Error(`Server Error (${response.status})`);
    }

    // Return strictly JSON
    return await response.json();

  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}