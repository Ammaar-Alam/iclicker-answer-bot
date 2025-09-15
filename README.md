# BetterByeClicker (iClicker helper)

Automatically joins and answers iClicker questions for you. Includes optional AI Image Assist to analyze image-based questions and pick an answer.

## Features
- Auto Join: attempts to click “Join” when a class becomes available.
- Auto Answer: clicks a choice when a poll appears (random or deterministic).
- AI Image Assist (optional):
  - Detects when a question contains an image.
  - Sends the image and visible choices to OpenAI Vision.
  - Chooses a letter (A–E) and clicks it for you.
- Location Spoof (optional): overrides geolocation to preset or custom coordinates.

## Install (Chrome / Edge)
1. Download or clone this repo.
2. Open your browser’s extensions page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable “Developer mode”.
4. Click “Load unpacked” and select the `iclicker` folder from this repo.
5. After loading, pin the extension if you like.

If you’re upgrading from a previous version, click “Reload” on the extension card.

## Permissions (why they’re needed)
- `https://student.iclicker.com/*` and `https://api.iclicker.com/*`: read page state and join/answer.
- `https://api.openai.com/*`: only if you enable AI Image Assist; calls happen from the background script.
- `storage`: save your settings (toggles, location, AI key).
- `geolocation`: allow the extension to spoof location when enabled.

## Quick Start
1. Open `https://student.iclicker.com` and navigate to your course.
2. Click the extension icon to open the popup.
3. Choose your preferences:
   - Start/Stop: begins or stops the observer.
   - Randomize Answers: random or first option.
   - Auto Join: attempts to click Join when available.
   - Location Spoof: toggle + pick a building or enter custom coordinates.
   - AI Image Assist: toggle on, paste your OpenAI API key, and Save.
4. Click “Start Answering”. If a “Join” button is visible, the extension attempts to click it immediately.
5. When a poll appears:
   - For non-image questions: extension clicks an option using your Randomize preference.
   - For image questions (with AI enabled): a small panel appears under the question, “Analyzing image…”, then “AI chose: X”, and the extension clicks that option.

## AI Image Assist Setup
- API key: generate from your OpenAI account. Paste it in the popup and click Save.
- Model: defaults to `gpt-4o-mini` (fast, lower cost). You can switch to `gpt-4o`.
- Temperature: defaults to `0.2`. Lower (0–0.2) is recommended for deterministic choices.
- Prompt (optional): you can tailor guidance. If empty, the extension uses a concise multiple-choice prompt.

Security and privacy:
- Your API key is saved locally via `chrome.storage.local`.
- The key is used only by the background script to call `api.openai.com` when an image question appears.
- The page never sees your key.

## Location Spoof
- Toggle on in the popup to enable geolocation override.
- Pick a building or enter custom coordinates. Click “Set Custom Location”.
- The override is applied early in page load via an injected script file (CSP-safe).

## Troubleshooting
- I don’t see “Analyzing image…” under image questions:
  - Ensure “AI Image Assist” is toggled on and your OpenAI key is saved.
  - Reload the extension (chrome://extensions → Reload) and the class page.
- It doesn’t auto-join when I press Start:
  - It tries for ~5s to click a visible Join button. If your course uses a different markup, open DevTools and share the button HTML so selectors can be extended.
- Console shows “Refused to execute inline script …” or `chrome-extension://invalid` on content.js:
  - Reload the extension. The current version uses a CSP-safe injected script declared in `web_accessible_resources`.
- “Blocked script execution in about:blank … sandboxed frame”:
  - This is a site frame; it’s safe to ignore.

## Notes
- Manifest V3, no build step. All code lives in `iclicker/`.
- If you had an older version installed, click “Reload” after updating and revisit the course page.
- OpenAI usage may incur cost; monitor your account as needed.

## Changelog (highlights)
- AI Image Assist: analyzes image questions and auto-selects A–E.
- Geolocation override reworked to be CSP-safe (`inject-geo.js`).
- More resilient auto-join when Start is pressed mid-prompt.

## Disclaimer
This project is for educational use. Respect your course policies and platform terms of service.

