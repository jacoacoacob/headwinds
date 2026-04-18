import path from "node:path";
import fs, { stat } from "node:fs";

import { DATA_DIR, getEnvNumber, sleep } from "./utils.js"

/**
 * Used to compute a random duration, in milliseconds, to wait between /stations calls
 */
const SLEEP_INTERVAL = getEnvNumber(process.env.SLEEP_INTERVAL, 5000);


function log(message) {
  console.log(new Date().toISOString() + " " + message);
}

async function run() {

  let forecastZones;

  const forecastZonesLocation = path.join(DATA_DIR, "forecast-zones.json");

  if (fs.existsSync(forecastZonesLocation)) {
    log("loading existing /zones/forecast response");
    forecastZones = fs.readFileSync(forecastZonesLocation, { encoding: "utf-8" });
    forecastZones = JSON.parse(forecastZones);
  } else {
    log("fetching /zones/forecast");
    const response = await fetch("https://api.weather.gov/zones/forecast");
    const text = await response.text();
    fs.writeFileSync(forecastZonesLocation, text);
    forecastZones = JSON.parse(text);
  }

  const observationStationUrls = forecastZones.features.flatMap(
    (feature) => feature.properties.observationStations
  );

  const forecastZonesObservationStationsLocation = path.join(
    DATA_DIR,
    "forecast-zones-observation-stations.json"
  );

  if (!fs.existsSync(forecastZonesObservationStationsLocation)) {
    fs.writeFileSync(
      forecastZonesObservationStationsLocation,
      JSON.stringify([])
    );
  }

  for (let stationUrl of observationStationUrls) {
    const stationId = stationUrl.slice(stationUrl.lastIndexOf("/") + 1);

    const savedFile = fs.readFileSync(
      forecastZonesObservationStationsLocation,
      {
        encoding: "utf-8",
      }
    );

    const savedData = JSON.parse(savedFile);

    const savedStationData = savedData.find(
      (record) => record.properties.stationIdentifier === stationId
    );

    if (Boolean(savedStationData)) {
      log(`${stationUrl} : already saved`, savedStationData);
      continue;
    }

    const delay = Math.random() * SLEEP_INTERVAL + 1000;

    log(`${stationUrl} : waiting ${Math.round((delay / 1000) * 100) / 100} seconds to fetch`);

    await sleep(delay)

    try {
      log(`${stationUrl} : loading`);

      const response = await fetch(stationUrl);
      const data = await response.json();

      log(`${stationUrl} : saving response`);
      
      savedData.push({
        type: data.type,
        geometry: data.geometry,
        properties: {
          stationIdentifier: data.properties.stationIdentifier,
          forecast: data.properties.forecast,
          elevation: data.properties.elevation,
        }
      });
      
      fs.writeFileSync(
        forecastZonesObservationStationsLocation,
        JSON.stringify(savedData)
      );

      log(`${stationUrl} : response saved`);
    } catch (error) {
      log(`${stationUrl} : ${error}`);
    }
  }

}

run();