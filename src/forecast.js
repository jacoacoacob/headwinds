import fs from "node:fs";
import path from "node:path";

import express from "express";

import { DATA_DIR } from "../scripts/constants.js";

function getStationDetailModel() {
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

function getStationIdLookupModel() {
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

    const longitudeKey = lon < 0 ? Math.ceil(lon) : Math.floor(lon);
    const latitudeKey = lat < 0 ? Math.ceil(lat) : Math.floor(lat);

    const key = `${longitudeKey}_${latitudeKey}`;

    if (model.has(key)) {
      model.get(key).push(entry);
    } else {
      model.set(key, [entry]);
    }
  }

  return model;
}

const stationDetailModel = getStationDetailModel();
const stationIdLookupModel = getStationIdLookupModel();

const forecast = express.Router();

forecast.get("/stations/:lonLat", (req, res) => {
  const [lon, lat] = req.params.lonLat.split(",");

  let limit = Number.parseInt(req.query.limit, 10);

  if (Number.isNaN(limit) || limit < 0) {
    limit = 5;
  }

  const longitudeKey = lon.replace(/\..*/g, "");
  const latitudeKey = lat.replace(/\..*/g, "");

  const key = `${longitudeKey}_${latitudeKey}`;

  const narrowed = stationIdLookupModel.get(key);

  const longitude = Number.parseFloat(lon);
  const latitude = Number.parseFloat(lat);

  narrowed.sort((a, b) => {
    const lonA = a[2];
    const latA = a[3];

    const distLonA = longitude - lonA;
    const distLatA = latitude - latA;

    const distA = Math.sqrt(distLonA**2 + distLatA**2);

    const lonB = b[2];
    const latB = b[3];

    const distLonB = longitude - lonB;
    const distLatB = latitude - latB;

    const distB = Math.sqrt(distLonB**2 + distLatB**2);

    return distA - distB;
  });

  const stations = narrowed
    .slice(0, limit)
    .map(([source, stationId], i) => {
      const detail = stationDetailModel.get(source + stationId);
      detail.properties.order = i;
      return detail;
    });

  res.json({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          "type": "Point",
          "coordinates": [
            Number.parseFloat(lon),
            Number.parseFloat(lat)
          ]
        },
        properties: {
          its: "you"
        },
      },
      ...stations
    ]
  });

});

export { forecast }