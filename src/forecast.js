import express from "express";

import { fetchForecastZoneObservations, findClosetStations, hasWindObservations } from "./services.js";
import { observationsCache } from "./models.js";
import { VALID_DISTANCE_UNITS } from "./constants.js";

const forecast = express.Router();

forecast.get("/observations/cache", (req, res) => {
  const now = Date.now();

  const result = Object.fromEntries(
    Array.from(observationsCache.entries()).map(
      ([key, entry]) => [
        key,
        {
          status: entry.ttl > now ? "fresh" : "stale",
          ttl: new Date(entry.ttl).toISOString(),
          value: entry.value,
        }
      ]
    )
  );
  
  res.json(result);
});

forecast.get("/observations/:latLon", async (req, res) => {
  const [lat, lon] = req.params.latLon.split(",").map((part) => part.trim());

  let limit = Number.parseInt(req.query.limit, 10);

  if (Number.isNaN(limit) || limit < 0) {
    limit = 5;
  }

  let units;

  if (VALID_DISTANCE_UNITS.includes(req.query.units)) {
    units = req.query.units;
  }

  const { error: closestStationsError, data: closestStations } = findClosetStations(
    lat,
    lon,
    limit,
    units,
  );

  if (closestStationsError) {
    return res
      .status(closestStationsError.code)
      .json(closestStationsError);
  }

  const result = await fetchForecastZoneObservations(closestStations);

  return res.json(result);
});

forecast.get("/stations/:latLon", (req, res) => {
  const [lat, lon] = req.params.latLon.split(",").map((part) => part.trim());

  let limit = Number.parseInt(req.query.limit, 10);

  if (Number.isNaN(limit) || limit < 0) {
    limit = 5;
  }

  let units;

  if (VALID_DISTANCE_UNITS.includes(req.query.units)) {
    units = req.query.units;
  }

  const { error, data: stations } = findClosetStations(
    lat, 
    lon,
    limit,
    units
  );

  if (error) {
    return res.status(error.code).json(error);
  }

  return res.json({
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