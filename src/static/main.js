import { watchable, trackPosition, empty, degreesToCardinalDirections, metersPerSecondToMilesPerHour, round, kilometersPerHourToMilesPerHour } from "./lib.js";

const ui_geolocCurrentSummary = document.getElementById("geoloc-current-summary");
const ui_geolocCurrentClosestStations = document.getElementById("geoloc-current-closest-stations");
const ui_geolocCurrentLat = document.getElementById("geoloc-current-lat");
const ui_geolocCurrentLon = document.getElementById("geoloc-current-lon");
const ui_geolocCurrentHeading = document.getElementById("geoloc-current-heading");
const ui_geolocCurrentSpeed = document.getElementById("geoloc-current-speed");

const ui_geolocHistory = document.getElementById("geoloc-history");

const ui_observationsSummary = document.getElementById("observations-summary");
const ui_observationsData = document.getElementById("observations-data");

const observations = watchable({});
const error = watchable(null);

const watchId = watchable();
const positionHistory = watchable([]);

trackPosition({
  error,
  watchId,
  positionHistory,
});

const _called = new Set();

function once(fn, ...args) {
  if (_called.has(fn)) {
    return;
  }
  _called.add(fn, true);
  return fn(...args);
}

async function fetchObservations(lat, lon) {
  const response = await fetch(`/forecast/observations/${lat},${lon}?units=mi`);
  const json = await response.json();

  observations.value = json;
}

setInterval(async () => {
  const currentPosition = positionHistory.value[0];

  if (currentPosition) {
    fetchObservations(currentPosition.lat, currentPosition.lon);
  }
}, 10_000);

positionHistory.watch((data) => {
  const currentPosition = data[0];
  once(async () => {
    await fetchObservations(currentPosition.lat, currentPosition.lon)
  })
}, { lazy: true })

positionHistory.watch((data) => {
  ui_updateGeolocCurrent(data[0]);
  ui_updateGeolocHistory(data.slice(1));
});

observations.watch(ui_updateObservations);

function ui_updateObservations({ status, data, error, context }) {
  if (data) {
    
    console.log(data);

    const {
      properties: {
        stationName,
        _meta: {
          distance,
          units,
        },
        _observations: {
          timestamp,
          windSpeed,
          windDirection,
        }
      }
    } = data;
    const observations = data.properties._observations;
    
    let summaryMessage;

    if (observations.windSpeed.value <= 0) {
      summaryMessage = `No wind at ${stationName}`;
    } else {
      const windSpeedMessage = round(kilometersPerHourToMilesPerHour(windSpeed.value));
      const observationTime = new Date(timestamp).toLocaleTimeString();
      summaryMessage = `Wind was observed blowing ${windDirection.value} degrees ${degreesToCardinalDirections(windDirection.value)} at ${windSpeedMessage}mph at ${observationTime} from ${stationName}.`
    }

    ui_observationsSummary.textContent = summaryMessage;
    ui_observationsData.textContent = JSON.stringify({ status, error, context, data }, null, 2);
  }
}

function ui_updateGeolocCurrent({
  lat: latitude,
  lon: longetude,
  hdg: heading,
  spd: speed,
  ts: timestamp,
} = {}) {
  if (heading && speed) {
    ui_geolocCurrentSummary.textContent = `Moving ${heading} degrees ${degreesToCardinalDirections(heading)} at ${metersPerSecondToMilesPerHour(speed)}mph`
  } else {
    ui_geolocCurrentSummary.textContent = "No motion detected"
  }

  ui_geolocCurrentLon.textContent = longetude;
  ui_geolocCurrentLat.textContent = latitude;
  ui_geolocCurrentSpeed.textContent = speed;
  ui_geolocCurrentHeading.textContent = heading;
  ui_geolocCurrentClosestStations.href = `/forecast/stations/${longetude},${latitude}`;
}

function ui_updateGeolocHistory(data) {
  empty(ui_geolocHistory);

  data.forEach(({
    lat: latitude,
    lon: longetude,
    hdg: heading,
    spd: speed,
    ts: timestamp,
  } = {}) => {
    const li = document.createElement("li");
    li.textContent = `${new Date(timestamp).toLocaleString()}: Heading ${heading} at ${speed}`;
    ui_geolocHistory.appendChild(li);
  });
}

