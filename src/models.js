import fs, { stat } from "node:fs";
import path from "node:path";

import { DATA_DIR } from "../scripts/utils.js";

export const stationDetailModel = _createObservationStationModel();
export const stationIdLookupModel = _createStationIdLookupModel();
export const observationsCache = _createForecastZoneForecastObservationsCache();

/**
 * @typedef GeoJSONPointGeometry 
 * @property {"Point"} type
 * @property {[number, number]} coordinates 
 * 
 * @typedef ObservationStationElevation
 * @property {string} unitCode
 * @property {number} value
 * 
 * @typedef ObservationStationGeoJSONProperties
 * @property {string} stationIdentifier
 * @property {`https://api.weather.gov/zones/forecast/${string}`} forecast
 * 
 * @typedef ObservationStationGeoJSON
 * @property {"Feature"} type
 * @property {GeoJSONPointGeometry} geometry
 * @property {ObservationStationGeoJSONProperties} properties
 * 
 * @typedef ObservationStationMeta
 * @property {number} order
 * @property {number | undefined} distance
 * @property {string | undefined} units
 * 
 * @typedef NOAAObservationObject
 * @property {number | null} value
 * @property {string} unitCode
 * @property {string} qualityControl
 * 
 * @typedef ObservationStationObservations
 * @property {string} timestamp
 * @property {NOAAObservationObject} windDirection
 * @property {NOAAObservationObject} windSpeed
 * @property {NOAAObservationObject} windGust
 * 
 * @typedef ObservationStationExtendedGeoJSON
 * @property {"Feature"} type
 * @property {GeoJSONPointGeometry} geometry
 * @property {ObservationStationGeoJSONProperties & {
 *  stationName: string | undefined;
 *  _meta: ObservationStationMeta;
 *  _observations: NOAAObservationObject | undefined
 * }} properties
 */

export function _createForecastZoneForecastObservationsCache() {
  const cache = new Map();

  return {
    get(key) {
      const entry = cache.get(key);

      if (!entry) {
        return;
      }

      const now = Date.now();

      if (entry.ttl > now) {
        return entry.value;
      }

      cache.delete(key);
    },
    set(key, value, ttl = 1800) {
      cache.set(key, { value, ttl: Date.now() + ttl * 1000 });
    },
    entries() {
      return cache.entries()
    }
  }
}

export function _createObservationStationModel() {
  /** @type {ObservationStationGeoJSON[]} */
  const stations = JSON.parse(
    fs.readFileSync(
      path.join(DATA_DIR, "forecast-zones-observation-stations.json")
    )
  );

  /** @type {Map<string, ObservationStationGeoJSON>} */
  const model = new Map();

  for (let station of stations) {
    model.set(station.properties.stationIdentifier, station);
  }

  return model;
}

export function _createStationIdLookupModel() {
  /** @type {ObservationStationGeoJSON[]} */
  const stations = JSON.parse(
    fs.readFileSync(
      path.join(DATA_DIR, "forecast-zones-observation-stations.json")
    )
  );

  /** @type {Map<`${string}_${string}`, string[]>} */
  const model = new Map();

  for (let station of stations) {
    const [lon, lat] = station.geometry.coordinates;

    const roundedLatitude = lat < 0 ? Math.ceil(lat) : Math.floor(lat);
    const roundedLongitude = lon < 0 ? Math.ceil(lon) : Math.floor(lon);

    const key = `${roundedLatitude}_${roundedLongitude}`;

    if (model.has(key)) {
      model.get(key).push(station.properties.stationIdentifier);
    } else {
      model.set(key, [station.properties.stationIdentifier]);
    }
  }

  return {
    /**
     * 
     * @param {string} lat
     * @param {string} lon
     */
    getStationIDs(lat, lon) {
      const roundedLatitude = lat.slice(0, lat.indexOf("."));
      const roundedLongitude = lon.slice(0, lon.indexOf("."));

      const key = `${roundedLatitude}_${roundedLongitude}`;

      return Array.from(model.get(key));
    }
  }
}
