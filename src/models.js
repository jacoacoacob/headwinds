import fs from "node:fs";
import path from "node:path";

import { DATA_DIR } from "../scripts/utils.js";

export const stationDetailModel = _createStationDetailModel();
export const stationIdLookupModel = _createStationIdLookupModel();
export const zoneObservationsCache = _createForecastZoneForecastObservationsCache();

export function _createStationDetailModel() {
  /** @type {Map<string, GeoJSON} */
  const model = new Map();

  for (let filename of fs.readdirSync(DATA_DIR)) {

    if (!filename.startsWith("stations?")) {
      continue;
    }

    const keyBase = filename.slice(
      filename.indexOf("cursor=") + 7,
      filename.length - 5
    );

    const filepath = path.join(DATA_DIR, filename);

    const file = fs.readFileSync(filepath, {
      encoding: "utf-8"
    });

    const json = JSON.parse(file);

    for (let i = 0; i < json.features.length; i++) {
      const feature = json.features[i];

      const key = keyBase + feature.properties.stationIdentifier;

      model.set(key, feature);
    }
  }

  return model;
}

export function _createStationIdLookupModel() {
  const data = JSON.parse(
    fs.readFileSync(
      path.join(DATA_DIR, "station.index.json")
    )
  );

  /** @type {Map<string, string[][]} */
  const model = new Map();

  for (let i = 0; i < data.length; i++) {
    const entry = data[i];
    const [_source, _stationId, lon, lat] = entry;

    const latitudeKey = lat < 0 ? Math.ceil(lat) : Math.floor(lat);
    const longitudeKey = lon < 0 ? Math.ceil(lon) : Math.floor(lon);

    const key = `${latitudeKey}_${longitudeKey}`;

    if (model.has(key)) {
      model.get(key).push(entry);
    } else {
      model.set(key, [entry]);
    }
  }

  return model;
}

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