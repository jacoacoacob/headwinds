import fs from "node:fs";
import path from "node:path";

import express from "express";

import { DATA_DIR } from "../scripts/constants.js";

function getModel() {
  const data = JSON.parse(
    fs.readFileSync(
      path.join(DATA_DIR, "station.index.json")
    )
  );

  /** @type {Map<string, string[][]} */
  const model = new Map();

  for (let i = 0; i < data.length; i++) {
    const entry = data[i];
    const [_source, _stationId, lat, lon] = entry;

    const key = `${Math.floor(lat)}_${Math.floor(lon)}`;

    if (model.has(key)) {
      model.get(key).push(entry);
    } else {
      model.set(key, [entry]);
    }
  }

  return model;
}

const model = getModel();

const forecast = express.Router();

forecast.get("/:lat/:lon", (req, res) => {
  const { lat, lon } = req.params;

  const latFloor = lat.replace(/\..*/g, "");
  const lonFloor = lon.replace(/\..*/g, "");

  const key = `${latFloor}_${lonFloor}`;

  const narrowed = model.get(key);

  res.json({
    lat,
    lon,
    key,
    narrowed
  });

});

export { forecast }