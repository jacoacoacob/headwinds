import express from "express";

import { fetchForecastZoneObservations, findClosetStations, hasWindObservations } from "./services.js";
import { zoneObservationsCache } from "./models.js";

const forecast = express.Router();

forecast.get("/observations/:latLon", async (req, res) => {
  const [lat, lon] = req.params.latLon.split(",").map((part) => part.trim());

  let limit = Number.parseInt(req.query.limit, 10);

  if (Number.isNaN(limit) || limit < 0) {
    limit = 5;
  }

  const { error: closestStationsError, data: closestStations } = findClosetStations(
    lat,
    lon,
    limit,
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

  const { error, data: stations } = findClosetStations(
    lat, 
    lon,
    limit,
    req.query.units
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