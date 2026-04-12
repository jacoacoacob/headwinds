/**
 * Create an index of stationIDs and the Point geometries. Include a pointer to
 * their GeoJSON properties and other meta data using their source-file name and
 * feature array index
 */

import fs from "node:fs";
import path from "node:path";

import { DATA_DIR } from "./constants.js";

function run() {
  const model = [];

  for (let filename of fs.readdirSync(DATA_DIR)) {

    if (!filename.startsWith("stations?")) {
      continue;
    }

    const filepath = path.join(DATA_DIR, filename);

    const file = fs.readFileSync(filepath, {
      encoding: "utf-8"
    });

    const json = JSON.parse(file);

    for (let i = 0; i < json.features.length; i++) {
      const feature = json.features[i];

      model.push([
        filename.slice(filename.indexOf("cursor=") + 7, filename.length - 5),
        feature.properties.stationIdentifier,
        ...feature.geometry.coordinates
      ])
    }
  }

  fs.writeFileSync(
    path.join(DATA_DIR, "station.index.json"),
    JSON.stringify(model)
  );
}

run();
