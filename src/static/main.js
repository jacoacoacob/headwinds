import { watchable, trackPosition, empty } from "./lib.js";

const ui_geolocCurrent = document.getElementById("geoloc-current");
const ui_geolocCurrentClosestStations = document.getElementById("geoloc-current-closest-stations");
const ui_geolocCurrentLat = document.getElementById("geoloc-current-lat");
const ui_geolocCurrentLon = document.getElementById("geoloc-current-lon");
const ui_geolocCurrentHeading = document.getElementById("geoloc-current-heading");
const ui_geolocCurrentSpeed = document.getElementById("geoloc-current-speed");
const ui_geolocHistory = document.getElementById("geoloc-history");

const error = watchable(null);
const watchId = watchable();

const positionHistory = watchable([]);

trackPosition({
  error,
  watchId,
  positionHistory,
});

positionHistory.watch((data) => {
  updateGeolocCurrent(data[0]);
  updateGeolocHistory(data.slice(1));
});

function updateGeolocCurrent({
  lat: latitude,
  lon: longetude,
  hdg: heading,
  spd: speed,
  ts: timestamp,
} = {}) {
  ui_geolocCurrentLon.textContent = longetude;
  ui_geolocCurrentLat.textContent = latitude;
  ui_geolocCurrentSpeed.textContent = speed;
  ui_geolocCurrentHeading.textContent = heading;
  ui_geolocCurrentClosestStations.href = `/forecast/stations/${longetude},${latitude}`;
}

function updateGeolocHistory(data) {
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

