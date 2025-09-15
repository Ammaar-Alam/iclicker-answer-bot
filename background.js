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
  