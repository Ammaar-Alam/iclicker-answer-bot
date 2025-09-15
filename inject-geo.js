(function() {
  try {
    var stored = null;
    try { stored = localStorage.getItem('iclicker_location_data'); } catch (_) {}
    if (!stored) return;
    var data = null;
    try { data = JSON.parse(stored); } catch (_) { return; }
    if (!data || !data.enabled || !data.location) return;

    var fakeLat = Number(data.location.lat);
    var fakeLng = Number(data.location.lng);
    if (!isFinite(fakeLat) || !isFinite(fakeLng)) return;

    var fakePosition = {
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

    var get = function(successCallback, errorCallback, options) {
      if (typeof successCallback === 'function') {
        setTimeout(function () { successCallback(fakePosition); }, 50);
      }
    };

    var watch = function(successCallback, errorCallback, options) {
      if (typeof successCallback === 'function') {
        setTimeout(function () { successCallback(fakePosition); }, 50);
      }
      return Math.floor(Math.random() * 10000);
    };

    try {
      Object.defineProperty(navigator.geolocation, 'getCurrentPosition', { value: get, configurable: true });
      Object.defineProperty(navigator.geolocation, 'watchPosition', { value: watch, configurable: true });
    } catch (e) {
      try {
        navigator.geolocation.getCurrentPosition = get;
        navigator.geolocation.watchPosition = watch;
      } catch (_) {}
    }

    console.log('BetterByeClicker: geolocation override installed at', fakeLat, fakeLng);
  } catch (_) {}
})();

