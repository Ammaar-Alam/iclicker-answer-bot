/**********************
  popup.js
  -------
  Purpose:
    - Controls the popup UI. 
    - Saves/retrieves local settings (random answers, auto-join).
    - Sends "start" or "stop" messages to content.js.

**********************/

const startBtn = document.getElementById("start-btn");
const stopBtn = document.getElementById("stop-btn");
const runStatus = document.getElementById("runStatus");
const statusPill = document.getElementById("statusPill");

const randomCheckbox = document.getElementById("random");
const autoJoinCheckbox = document.getElementById("autoJoin");
const locationSpoofCheckbox = document.getElementById("locationSpoof");
const mapContainer = document.getElementById("mapContainer");
const selectedLocationSpan = document.getElementById("selectedLocation");
const clearLocationBtn = document.getElementById("clearLocation");
const buildingSelect = document.getElementById("buildingSelect");
const latInput = document.getElementById("latInput");
const lngInput = document.getElementById("lngInput");
const setCustomLocationBtn = document.getElementById("setCustomLocation");

/**
 * On DOMContentLoaded, load existing settings from storage,
 * and update the UI accordingly.
 */
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(
    ["status", "random", "autoJoin", "locationSpoof", "spoofedLocation"],
    (result) => {
      // Show the correct Start/Stop state
      if (result.status === "started") {
        showRunningState();
      } else {
        showStoppedState();
      }

      // Check or uncheck the 'Random Answers' box
      if (typeof result.random === "boolean") {
        randomCheckbox.checked = result.random;
      }

      // Check or uncheck the 'Auto Join' box
      if (typeof result.autoJoin === "boolean") {
        autoJoinCheckbox.checked = result.autoJoin;
      }

      // Check or uncheck the 'Location Spoof' box and show map if enabled
      if (typeof result.locationSpoof === "boolean") {
        locationSpoofCheckbox.checked = result.locationSpoof;
        if (result.locationSpoof) {
          mapContainer.style.display = "block";
          
          // If there's a saved location, show it
          if (result.spoofedLocation) {
            const { lat, lng } = result.spoofedLocation;
            updateLocationDisplay(lat, lng);
            
            // Pre-fill the custom coordinate inputs
            latInput.value = lat;
            lngInput.value = lng;
          }
        }
      }
    }
  );

  // initial coordinate validation state
  validateCoordinates();
});

startBtn.addEventListener("click", () => {
  // Switch UI to "running"
  showRunningState();

  // Send "start" to content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { from: "popup", msg: "start" });
  });
});

stopBtn.addEventListener("click", () => {
  // Switch UI to "stopped"
  showStoppedState();

  // Send "stop" to content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { from: "popup", msg: "stop" });
  });
});

// Handle toggles
randomCheckbox.addEventListener("click", () => {
  // Send "random" toggle to content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { from: "popup", msg: "random" });
  });
});

autoJoinCheckbox.addEventListener("click", () => {
  // Send "autoJoin" toggle to content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { from: "popup", msg: "autoJoin" });
  });
});

locationSpoofCheckbox.addEventListener("click", () => {
  const isChecked = locationSpoofCheckbox.checked;
  chrome.storage.local.set({ locationSpoof: isChecked });
  
  // Show/hide map container
  mapContainer.style.display = isChecked ? "block" : "none";
  
  // If enabling and no location is set, default to Nassau Hall
  if (isChecked) {
    chrome.storage.local.get(["spoofedLocation"], (result) => {
      if (!result.spoofedLocation) {
        // Default to Nassau Hall at Princeton
        const defaultLat = 40.34663;
        const defaultLng = -74.65747;
        latInput.value = defaultLat;
        lngInput.value = defaultLng;
        buildingSelect.value = `${defaultLat},${defaultLng}`;
        updateLocationDisplay(defaultLat, defaultLng);
        saveLocation(defaultLat, defaultLng);
      }
    });
  }
  
  // Send toggle to content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { from: "popup", msg: "locationSpoof", enabled: isChecked });
  });
});

// Handle building selection
buildingSelect.addEventListener("change", () => {
  const value = buildingSelect.value;
  if (value) {
    const [lat, lng] = value.split(",").map(v => parseFloat(v));
    latInput.value = lat;
    lngInput.value = lng;
    updateLocationDisplay(lat, lng);
    saveLocation(lat, lng);
  }
});

// Handle custom location button
setCustomLocationBtn.addEventListener("click", () => {
  const lat = parseFloat(latInput.value);
  const lng = parseFloat(lngInput.value);
  
  if (!isNaN(lat) && !isNaN(lng)) {
    updateLocationDisplay(lat, lng);
    saveLocation(lat, lng);
  } else {
    alert("Please enter valid latitude and longitude values");
  }
});

// Enable/disable the Set button based on coordinate validity
latInput.addEventListener("input", validateCoordinates);
lngInput.addEventListener("input", validateCoordinates);

clearLocationBtn.addEventListener("click", () => {
  // Clear the saved location
  chrome.storage.local.remove("spoofedLocation");
  
  // Clear inputs
  latInput.value = "";
  lngInput.value = "";
  buildingSelect.value = "";
  
  // Update display
  selectedLocationSpan.textContent = "No location selected";
  clearLocationBtn.style.display = "none";
  
  // Notify content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { from: "popup", msg: "clearLocation" });
  });
});

/** Switches the popup UI to reflect “running.” */
function showRunningState() {
  startBtn.style.display = "none";
  stopBtn.style.display = "block";
  runStatus.style.display = "none"; // we use the pill now
  if (statusPill) {
    statusPill.textContent = "Running";
    statusPill.classList.remove("status--stopped");
    statusPill.classList.add("status--running");
  }
}

/** Switches the popup UI to reflect "stopped." */
function showStoppedState() {
  startBtn.style.display = "block";
  stopBtn.style.display = "none";
  runStatus.style.display = "none";
  if (statusPill) {
    statusPill.textContent = "Stopped";
    statusPill.classList.remove("status--running");
    statusPill.classList.add("status--stopped");
  }
}


/** Update location display text */
function updateLocationDisplay(lat, lng) {
  selectedLocationSpan.textContent = `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`;
  clearLocationBtn.style.display = "block";
}

/** Save location to storage and notify content script */
function saveLocation(lat, lng) {
  const location = { lat, lng };
  chrome.storage.local.set({ spoofedLocation: location });
  
  // Notify content script of new location
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { 
      from: "popup", 
      msg: "updateLocation", 
      location: location 
    });
  });
}

// Validate coordinates and enable/disable the Set button
function validateCoordinates() {
  const lat = parseFloat(latInput.value);
  const lng = parseFloat(lngInput.value);
  const valid = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  setCustomLocationBtn.disabled = !valid;
}
