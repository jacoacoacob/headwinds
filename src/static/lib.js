
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
        ...positionHistory.value,
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

  function watch(watcher) {
    watcher(result.value);
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