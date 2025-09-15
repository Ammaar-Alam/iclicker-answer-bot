/**********************
  background.js
  -------------
  Purpose:
   - Enables or disables the extension’s icon based on whether the active tab
     is on student.iclicker.com.
   - Ensures the extension can be clicked only when relevant.

**********************/

chrome.tabs.onActivated.addListener((activeInfo) => {
    chrome.tabs.get(activeInfo.tabId, (tab) => {
      handleTabChange(tab);
    });
  });
  
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    // This event fires when the tab's URL changes or finishes loading
    if (changeInfo.status === "complete" && tab.active) {
      handleTabChange(tab);
    }
  });
  
  function handleTabChange(tab) {
    if (!tab || !tab.url) {
      disableExtension();
      return;
    }
    if (tab.url.includes("student.iclicker.com")) {
      enableExtension();
    } else {
      disableExtension();
    }
  }
  
  function enableExtension() {
    chrome.action.enable();
    chrome.action.setIcon({
      path: {
        "16": "./assets/logo-16.png",
        "32": "./assets/logo-32.png",
        "48": "./assets/logo-48.png",
        "128": "./assets/logo-128.png"
      }
    });
  }
  
  function disableExtension() {
    chrome.action.disable();
    chrome.action.setIcon({
      path: {
        "16": "./assets/logo-disabled-16.png",
        "32": "./assets/logo-disabled-32.png",
        "48": "./assets/logo-disabled-48.png",
        "128": "./assets/logo-disabled-128.png"
      }
    });
  }

// Vision analysis request handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "vision.analyze") {
    const { imageUrl, prompt } = message;
    chrome.storage.local.get(
      ["openaiKey", "visionModel", "visionTemp"],
      async (cfg) => {
        const apiKey = cfg.openaiKey || "";
        const model = cfg.visionModel || "gpt-5-mini";
        const temperature = typeof cfg.visionTemp === "number" ? cfg.visionTemp : 0.2;
        if (!apiKey) {
          sendResponse({ error: "missing_key" });
          return;
        }
        try {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              model,
              messages: [
                {
                  role: "user",
                  content: [
                    { type: "text", text: prompt || "Extract all legible text and summarize any diagrams." },
                    { type: "image_url", image_url: { url: imageUrl } }
                  ]
                }
              ],
              temperature
            })
          });
          if (!res.ok) {
            const errText = await res.text();
            sendResponse({ error: `openai_http_${res.status}`, details: errText.slice(0, 300) });
            return;
          }
          const data = await res.json();
          const text = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
          sendResponse({ text });
        } catch (e) {
          sendResponse({ error: "openai_fetch_error" });
        }
      }
    );
    return true; // keep the message channel open for async sendResponse
  }
});
  
