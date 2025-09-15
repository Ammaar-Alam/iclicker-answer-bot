// Apply geolocation override as early as possible
(function() {
    // Check if we have a spoofed location saved
    const storedData = localStorage.getItem('iclicker_location_data');
    if (storedData) {
        const data = JSON.parse(storedData);
        if (data.enabled && data.location) {
            // Apply override immediately
            const script = document.createElement('script');
            script.textContent = `
                (function() {
                    const fakeLat = ${data.location.lat};
                    const fakeLng = ${data.location.lng};
                    
                    const fakePosition = {
                        coords: {
                            latitude: fakeLat,
                            longitude: fakeLng,
                            altitude: null,
                            accuracy: 10,
                            altitudeAccuracy: null,
                            heading: null,
                            speed: null
                        },
                        timestamp: Date.now()
                    };
                    
                    navigator.geolocation.getCurrentPosition = function(successCallback, errorCallback, options) {
                        console.log('Early location spoof to:', fakeLat, fakeLng);
                        if (successCallback) {
                            setTimeout(() => successCallback(fakePosition), 100);
                        }
                    };
                    
                    navigator.geolocation.watchPosition = function(successCallback, errorCallback, options) {
                        if (successCallback) {
                            setTimeout(() => successCallback(fakePosition), 100);
                        }
                        return Math.floor(Math.random() * 10000);
                    };
                })();
            `;
            document.documentElement.appendChild(script);
            script.remove();
        }
    }
})();

window.onload = () => {
  chrome.storage.local.remove("status");
  chrome.storage.local.remove("prevPage");

  let targetNode;
  const HOST = "https://bye-clicker-api.vercel.app";
  
  // Location spoofing variables
  let locationSpoof = false;
  let spoofedLocation = null;
  // AI image analysis
  let aiImageAssist = false;
  let visionPrompt = "";
  const seenVisionImages = new Set();

  // Set default values
  let isFirstTime = true;
  let random;
  let autoJoin;
  let notify;
  let access_token;
  let activity;
  let courseId;
  let activityId;
  let requestOptions;
  let intervalId;
  const optionsToIndex = {
      A: 0,
      B: 1,
      C: 2,
      D: 3,
      E: 4,
  };

  // Get values from storage
  chrome.storage.local.get(["notify"], function (result) {
      if (result.notify == true) {
          notify = true;
      } else if (result.notify == false || result == undefined) {
          notify = false;
      }
  });

  chrome.storage.local.get(["random"], function (result) {
      if (result.random == true) {
          random = true;
      } else if (result.random == false || result == undefined) {
          random = false;
      }
  });

  chrome.storage.local.get(["autoJoin"], function (result) {
      if (result.autoJoin == true) {
          autoJoin = true;
      } else if (result.autoJoin == false || result == undefined) {
          autoJoin = false;
      }
  });

  // Load location spoofing settings
  chrome.storage.local.get(["locationSpoof", "spoofedLocation"], function (result) {
      if (result.locationSpoof == true) {
          locationSpoof = true;
          if (result.spoofedLocation) {
              spoofedLocation = result.spoofedLocation;
              overrideGeolocation();
          }
      }
  });

  // Load AI settings
  chrome.storage.local.get(["aiImageAssist", "visionPrompt"], function (result) {
      if (typeof result.aiImageAssist === "boolean") {
          aiImageAssist = result.aiImageAssist;
      }
      if (typeof result.visionPrompt === "string") {
          visionPrompt = result.visionPrompt;
      }
  });

  let fetchCalled = false;

  const observerConfig = {
      attributes: true, // Watch for attribute changes (e.g., style changes)
      // attributeFilter: ["style"], // Only observe changes to style attribute (worked in older version of iClicker)
      childList: true,
      subtree: true,
  };

  const observer = new MutationObserver(function (mutationsList) {
      const url = window.location.href;
      for (let mutation of mutationsList) {
          if (
              mutation.type === "childList" &&
              mutation.addedNodes.length > 0
          ) {
              for (let node of mutation.addedNodes) {
                  if (node instanceof Element) {
                      // Detect question images as soon as they appear
                      if (node.matches && node.matches('.question-image-container img')) {
                          handleQuestionImage(node);
                      } else if (node.querySelector) {
                          const nested = node.querySelector('.question-image-container img');
                          if (nested) handleQuestionImage(nested);
                      }
                      if (
                          url.includes("https://student.iclicker.com/#/class")
                      ) {
                          chrome.storage.local.set({ prevPage: "poll" });
                          if (url.includes("/poll")) {
                              if (isFirstTime && !activityId) {
                                  setActivityId();
                                  isFirstTime = false;
                              }
                              // console.log(node);
                              // Listening for next question
                              if (node.matches(".question-type-container")) {
                                  setTimeout(() => {
                                      setVariables();
                                  }, 3000);
                                  try {
                                      const btns =
                                          document.querySelectorAll(
                                              ".btn-container"
                                          );
                                      if (random) {
                                          var optionIndex = getRandomInteger(
                                              btns.length
                                          );
                                      } else {
                                          var optionIndex = 0;
                                      }
                                      // notify backend to send email
                                      if (notify && !fetchCalled) {
                                          fetchCalled = true;
                                          let img =
                                              "https://institutional-web-assets-share.s3.amazonaws.com/iClicker/student/images/image_hidden_2.png";
                                          const imgContainer =
                                              document.querySelector(
                                                  ".question-image-container"
                                              );
                                          setTimeout(() => {
                                              const source =
                                                  imgContainer.querySelector(
                                                      "img"
                                                  ).src;
                                              if (
                                                  source != undefined &&
                                                  source != ""
                                              ) {
                                                  img =
                                                      imgContainer.querySelector(
                                                          "img"
                                                      ).src;
                                              }
                                              callFurther();
                                          }, 1000);

                                          function callFurther() {
                                              chrome.storage.local.get(
                                                  ["email"],
                                                  (result) => {
                                                      const email =
                                                          result.email;
                                                      fetch(
                                                          `${HOST}/notify`,
                                                          {
                                                              method: "POST",
                                                              headers: {
                                                                  "Content-Type":
                                                                      "application/json",
                                                              },
                                                              body: JSON.stringify(
                                                                  {
                                                                      email: email,
                                                                      type: "ques",
                                                                      img: img,
                                                                  }
                                                              ),
                                                          }
                                                      )
                                                          .then((res) =>
                                                              res.json()
                                                          )
                                                          .then((data) => {
                                                              // console.log(data);
                                                              fetchCalled = false;
                                                              clearInterval(
                                                                  intervalId
                                                              );
                                                              checkAnswer(
                                                                  btns,
                                                                  optionIndex
                                                              );
                                                          })
                                                          .catch((err) => {
                                                              console.log(
                                                                  err
                                                              );
                                                              fetchCalled = false;
                                                              clearInterval(
                                                                  intervalId
                                                              );
                                                              checkAnswer(
                                                                  btns,
                                                                  optionIndex
                                                              );
                                                          });
                                                  }
                                              );
                                          }
                                      }
                                      clearInterval(intervalId);
                                      checkAnswer(btns, optionIndex);
                                  } catch (error) {
                                      console.log("buttons not found");
                                  }
                              }
                          }
                      }
                  }
              }
          } else if (mutation.type === "attributes") {
              // Monitor src swaps on images
              const t = mutation.target;
              if (t instanceof Element && t.matches && t.matches('.question-image-container img') && mutation.attributeName === 'src') {
                  handleQuestionImage(t);
              }
              if (mutation.attributeName == "aria-hidden") {
              // console.log('CSS change detected:', mutation.target);
              if (
                  url.includes("https://student.iclicker.com/#/course") &&
                  url.includes("/overview")
              ) {
                  // console.log("course page");
                  chrome.storage.local.get(["prevPage"], function (result) {
                      if (result.prevPage == "poll") {
                          stopObserver("default");
                      }
                  });
                  // console.log(mutation.attributeName);
                  if (autoJoin) {
                      try {
                          if (
                              document
                                  .querySelector(".course-join-container")
                                  .classList.contains("expanded")
                          ) {
                              if (notify && !fetchCalled) {
                                  fetchCalled = true;
                                  // notify backend to send email
                                  chrome.storage.local.get(
                                      ["email"],
                                      (result) => {
                                          const email = result.email;
                                          fetch(`${HOST}/notify`, {
                                              method: "POST",
                                              headers: {
                                                  "Content-Type":
                                                      "application/json",
                                              },
                                              body: JSON.stringify({
                                                  email: email,
                                                  type: "classStart",
                                              }),
                                          })
                                              .then((res) => res.json())
                                              .then((data) => {
                                                  // console.log(data);
                                                  document
                                                      .querySelector(
                                                          "#btnJoin"
                                                      )
                                                      .click();
                                                  fetchCalled = false;
                                                  setActivityId();
                                              })
                                              .catch((err) =>
                                                  console.log(err)
                                              );
                                      }
                                  );
                              }
                              document.querySelector("#btnJoin").click();
                              setActivityId();
                          }
                          // Fallback: click Join if the button is visible even if container state changed
                          else if (document.querySelector("#btnJoin")) {
                              document.querySelector("#btnJoin").click();
                              setActivityId();
                          }
                      } catch (error) {
                          console.log("join button not found");
                      }
                  }
              }
          }
      }
  });

  function checkAnswer(btns, optionIndex) {
      // Simplified answering logic: click once immediately, then retry a few times
      // No reliance on patched reporting endpoint.
      let attempts = 0;
      const maxAttempts = 5;
      const clickOnce = () => {
          try {
              const buttons = document.querySelectorAll(".btn-container");
              if (!buttons || buttons.length === 0) return false;
              const idx = Math.min(optionIndex, buttons.length - 1);
              const target = buttons[idx];
              const clickable = target.querySelector("button") || target.children[0] || target;
              clickable.click();
              return true;
          } catch (e) {
              return false;
          }
      };

      // try immediately
      clickOnce();
      clearInterval(intervalId);
      intervalId = setInterval(() => {
          attempts++;
          if (clickOnce() || attempts >= maxAttempts) {
              clearInterval(intervalId);
          }
      }, 1000);
  }

  function setActivityId() {
      fetch(
          `https://api.iclicker.com/v2/courses/${sessionStorage.getItem(
              "courseId"
          )}/class-sections?recordsPerPage=1&pageNumber=1&expandChild=activities&expandChild=userActivities&expandChild=attendances&expandChild=questions&expandChild=userQuestions&expandChild=questionGroups`,
          {
              method: "GET",
              headers: {
                  Authorization: `Bearer ${sessionStorage.getItem(
                      "access_token"
                  )}`,
                  Accept: "application/json",
                  "Content-Type": "application/json",
                  Origin: "https://student.iclicker.com",
                  // Add any other headers as needed
              },
          }
      )
          .then((resp) => resp.json())
          .then((data) => {
              activity = data[0].activities[0];
              if (activity == undefined) {
                  return;
              }
              activityId = activity._id;
          })
          .catch((error) => {
              console.error("Error:", error);
          });
  }

  function setVariables() {
      access_token = sessionStorage.getItem("access_token");
      if (
          access_token == null ||
          access_token == undefined ||
          access_token == ""
      ) {
          // get access token from cookies
          access_token = document.cookie
              .split("; ")
              .find((row) => row.startsWith("access_token"))
              .split("=")[1];
      }
      courseId = sessionStorage.getItem("courseId");
      requestOptions = {
          method: "GET",
          headers: {
              Authorization: `Bearer ${access_token}`,
              Accept: "application/json",
              "Content-Type": "application/json",
              Origin: "https://student.iclicker.com",
              // Add any other headers as needed
          },
      };
  }

  function getRandomInteger(max) {
      return Math.floor(Math.random() * max);
  }

  // Function to override geolocation
  function overrideGeolocation() {
      if (!spoofedLocation) return;
      
      // Save to localStorage for early injection on page reload
      localStorage.setItem('iclicker_location_data', JSON.stringify({
          enabled: locationSpoof,
          location: spoofedLocation
      }));
      
      // Inject script to override geolocation in the page context
      const script = document.createElement('script');
      script.textContent = `
          (function() {
              const fakeLat = ${spoofedLocation.lat};
              const fakeLng = ${spoofedLocation.lng};
              
              // Create fake position object
              const fakePosition = {
                  coords: {
                      latitude: fakeLat,
                      longitude: fakeLng,
                      altitude: null,
                      accuracy: 10,
                      altitudeAccuracy: null,
                      heading: null,
                      speed: null
                  },
                  timestamp: Date.now()
              };
              
              // Override getCurrentPosition
              const originalGetCurrentPosition = navigator.geolocation.getCurrentPosition;
              navigator.geolocation.getCurrentPosition = function(successCallback, errorCallback, options) {
                  console.log('Location spoofed to:', fakeLat, fakeLng);
                  if (successCallback) {
                      setTimeout(() => successCallback(fakePosition), 100);
                  }
              };
              
              // Override watchPosition
              const originalWatchPosition = navigator.geolocation.watchPosition;
              navigator.geolocation.watchPosition = function(successCallback, errorCallback, options) {
                  console.log('Watch position spoofed to:', fakeLat, fakeLng);
                  if (successCallback) {
                      setTimeout(() => successCallback(fakePosition), 100);
                  }
                  return Math.floor(Math.random() * 10000); // Return fake watch ID
              };
              
              console.log('Geolocation override installed');
          })();
      `;
      
      // Inject the script at the beginning of the page
      if (document.head) {
          document.head.appendChild(script);
          script.remove();
      } else {
          // If head is not available yet, wait for it
          const observer = new MutationObserver((mutations, obs) => {
              if (document.head) {
                  document.head.appendChild(script);
                  script.remove();
                  obs.disconnect();
              }
          });
          observer.observe(document.documentElement, { childList: true, subtree: true });
      }
  }

  chrome.runtime.onMessage.addListener((message) => {
      if (message.from == "popup" && message.msg == "start") {
          const url = window.location.href;
          if (
              url.includes("https://student.iclicker.com/#/class") &&
              url.includes("/poll")
          ) {
              setTimeout(() => {
                  setVariables();
              }, 3000);
              try {
                  const btns = document.querySelectorAll(".btn-container");
                  if (random) {
                      var optionIndex = getRandomInteger(btns.length);
                  } else {
                      var optionIndex = 0;
                  }
                  clearInterval(intervalId);
                  checkAnswer(btns, optionIndex);
              } catch (error) {
                  console.log("buttons not found");
              }
          } else if (
              url.includes("https://student.iclicker.com/#/course") &&
              url.includes("/overview")
          ) {
              chrome.storage.local.get(["status"], function (result) {
                  if (result.status != "started") {
                      if (autoJoin) {
                          try {
                              if (
                                  document
                                      .querySelector(".course-join-container")
                                      .classList.contains("expanded")
                              ) {
                                  document.querySelector("#btnJoin").click();
                                  setActivityId();
                              }
                              // Fallback if expanded state not detected
                              else if (document.querySelector("#btnJoin")) {
                                  document.querySelector("#btnJoin").click();
                                  setActivityId();
                              }
                          } catch (error) {
                              console.log("join button not found");
                          }
                      }
                  }
              });
          }
          startObserver();
      } else if (message.from == "popup" && message.msg == "stop") {
          stopObserver("manual");
      } else if (message.from == "popup" && message.msg == "random") {
          random = !random;
          chrome.storage.local.set({ random: random });
      } else if (message.from == "popup" && message.msg == "autoJoin") {
          autoJoin = !autoJoin;
          chrome.storage.local.set({ autoJoin: autoJoin });
      } else if (message.from == "popup" && message.msg == "notify") {
          notify = !notify;
          chrome.storage.local.set({ email: message.email });
          chrome.storage.local.set({ notify: notify });
      } else if (message.from == "popup" && message.msg == "locationSpoof") {
          locationSpoof = message.enabled;
          chrome.storage.local.set({ locationSpoof: locationSpoof });
          if (locationSpoof && spoofedLocation) {
              overrideGeolocation();
          } else if (!locationSpoof) {
              // Remove the localStorage data when disabled
              localStorage.removeItem('iclicker_location_data');
              window.location.reload();
          }
      } else if (message.from == "popup" && message.msg == "updateLocation") {
          spoofedLocation = message.location;
          chrome.storage.local.set({ spoofedLocation: spoofedLocation });
          if (locationSpoof) {
              overrideGeolocation();
              // Reload the page to apply the new location
              window.location.reload();
          }
      } else if (message.from == "popup" && message.msg == "clearLocation") {
          spoofedLocation = null;
          chrome.storage.local.remove("spoofedLocation");
          localStorage.removeItem('iclicker_location_data');
          if (locationSpoof) {
              // Reload to remove the override
              window.location.reload();
          }
      } else if (message.from == "popup" && message.msg == "aiImageAssist") {
          aiImageAssist = message.enabled;
      }
  });

  function startObserver() {
      targetNode = document.querySelector("#wrapper");
      // console.log(targetNode);
      observer.observe(targetNode, observerConfig);
      console.log("started answering");
      chrome.storage.local.set({ status: "started" });
      const currentUrl = window.location.href;
      if (currentUrl.includes("https://student.iclicker.com/#/course")) {
          chrome.storage.local.set({ prevPage: "courses" });
      } else if (currentUrl.includes("https://student.iclicker.com/#/class")) {
          chrome.storage.local.set({ prevPage: "poll" });
      }
      // Initial image scan
      try {
          document.querySelectorAll('.question-image-container img').forEach((img) => handleQuestionImage(img));
      } catch (_) { /* no-op */ }
  }

  function stopObserver(status) {
      observer.disconnect();
      if (status == "default") {
          console.log("default stop");
          chrome.storage.local.remove("status");
          clearInterval(intervalId);
          if (notify && !fetchCalled) {
              fetchCalled = true;
              // notify backend to send email
              chrome.storage.local.get(["email"], (result) => {
                  const email = result.email;
                  fetch(`${HOST}/notify`, {
                      method: "POST",
                      headers: {
                          "Content-Type": "application/json",
                      },
                      body: JSON.stringify({
                          email: email,
                          type: "classEnd",
                      }),
                  })
                      .then((res) => res.json())
                      .then((data) => {
                          // console.log(data);
                          fetchCalled = false;
                          window.location.reload();
                      })
                      .catch((err) => console.log(err));
              });
          }
      } else if (status == "manual") {
          console.log("stopped");
          clearInterval(intervalId);
          chrome.storage.local.set({ status: "stopped" });
      }
  }
  
  // Analyze a detected question image with OpenAI and render a lightweight panel
  function handleQuestionImage(imgEl) {
      try {
          if (!aiImageAssist) return;
          const src = imgEl && imgEl.getAttribute('src');
          if (!src || seenVisionImages.has(src)) return;
          seenVisionImages.add(src);

          const container = imgEl.closest('.question-data-container') || imgEl.parentElement;
          if (!container) return;
          const panel = ensureVisionPanel(container);
          panel.textContent = 'Analyzing image…';

          callVision(src, visionPrompt).then((res) => {
              if (!panel.isConnected) return;
              if (res && res.text) {
                  panel.textContent = res.text;
              } else if (res && res.error === 'missing_key') {
                  panel.textContent = 'OpenAI key not set. Open extension popup to add it.';
              } else {
                  panel.textContent = 'Analysis failed.';
              }
          });
      } catch (_) { /* no-op */ }
  }

  function ensureVisionPanel(container) {
      let panel = container.querySelector('#bbc-vision-panel');
      if (panel) return panel;
      panel = document.createElement('div');
      panel.id = 'bbc-vision-panel';
      panel.setAttribute('role', 'status');
      panel.style.cssText = [
          'margin-top:8px',
          'padding:8px 10px',
          'background:rgba(13,17,23,0.92)',
          'color:#c9d1d9',
          'font: 13px/1.4 -apple-system,Segoe UI,Roboto,Ubuntu,Cantarell,Helvetica,Arial,sans-serif',
          'border:1px solid #30363d',
          'border-radius:6px',
          'white-space:pre-wrap'
      ].join(';');
      container.appendChild(panel);
      return panel;
  }

  function callVision(imageUrl, prompt) {
      return new Promise((resolve) => {
          try {
              chrome.runtime.sendMessage({ type: 'vision.analyze', imageUrl, prompt }, (resp) => {
                  resolve(resp || {});
              });
          } catch (e) {
              resolve({ error: 'send_failed' });
          }
      });
  }
};
