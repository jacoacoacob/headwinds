
/**
 * @typedef {ReturnType<typeof watchable>} BaseWatchable
 * @typedef {{ value: any } & BaseWatchable} Watchable
 */

/**
 * 
 * @param {{
 *   watchId: Watchable;
 *   error: Watchable;
 *   positionHistory: Watchable;
 * }} param0 
 * @returns 
 */
export function trackPosition({ watchId, error, positionHistory } = {}) {
  if (!navigator.geolocation) {
    error.value = "Geolocation is not supported by your browser";
    return;
  }

  watchId.value = navigator.geolocation.watchPosition(
    (position) => {
      const { coords, timestamp } = position;

      positionHistory.value = [
        {
          lat: coords.latitude,
          lon: coords.longitude,
          hdg: coords.heading,
          spd: coords.speed,
          ts: timestamp,
        },
        ...positionHistory.value.slice(0, 10),
      ];


      if (error.value !== null) {
        error.value = null;
      }
    },
    (err) => {
      error.value = `Error: ${err.message}`;
    },
    {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0,
    },
  );
}

/**
 * 
 * @param {any} initialValue
 */
export function watchable(initialValue) {
  let _value = initialValue;

  const result = { watch, unwatch };

  const watchers = [];

  function notify() {
    watchers.forEach(watcher => watcher(result.value))
  }

  function watch(watcher, options = { lazy: false }) {
    if (!options.lazy) {
      watcher(result.value);
    }
    watchers.push(watcher);
  }

  function unwatch(watcher) {
    watchers.splice(watchers.indexOf(watcher), 1);
  }

  Object.defineProperties(result, {
    value: {
      get() {
        return _value;
      },
      set(value) {
        _value = value;
        notify();
      }
    }
  })

  return result;
}

export function empty(domNode) {
  while (domNode.lastChild) {
    domNode.removeChild(domNode.lastChild);
  }
}

export function degreesToCardinalDirections(degrees) {
  const cardinalDirections = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  
  const sliceSize = 360 / cardinalDirections.length;

  const index = Math.floor(((degrees + sliceSize / 2) % 360) / sliceSize);

  return cardinalDirections[index];
}

export function metersPerSecondToMilesPerHour(mps) {
  return mps * 2.236936;
}

export function kilometersPerHourToMilesPerHour(kmph) {
  return kmph * 0.6213712;
}

export function round(num, places = 1) {
  return Math.round(num * (10 * places)) / (10 * places);
}