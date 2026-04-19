import { DISTANCE_UNITS, DEGREES_DISTANCE_COEFFICIENTS, SECONDS } from "./constants.js";
import { stationDetailModel, stationIdLookupModel, observationsCache } from "./models.js";


function calculateDistanceInDegrees(latX, lonX, latY, lonY) {
  const distLon = lonX - lonY;
  const distLat = latX - latY;

  return Math.abs(Math.sqrt(distLon**2 + distLat**2));
}

function convertDistanceInDegrees(distance, toUnits) {
  let convertedDistance;

  switch (toUnits) {
    case DISTANCE_UNITS.MILES: {
      convertedDistance = distance * DEGREES_DISTANCE_COEFFICIENTS.MILES;

      break;
    }
    case DISTANCE_UNITS.KILOMETERS: {
      convertedDistance = distance * DEGREES_DISTANCE_COEFFICIENTS.KILOMETERS;
      break;
    }
    default: {
      return;
    }
  }

  return Math.round(convertedDistance * 100) / 100;
}

export function findClosetStations(
  latitude,
  longitude,
  limit,
  units
) {

  const stationIDs = stationIdLookupModel.getStationIDs(latitude, longitude);

  if (!stationIDs) {
    return {
      error: {
        code: 404,
        message: `No stations found for latitude '${latitude}' and longitude ${longitude}`
      },
      data: null,
    }
  }

  /**
   * @type {import("./models.js").ObservationStationGeoJSON[]}
   */
  const stations = stationIDs
    .map((stationId) => stationDetailModel.get(stationId))
    .filter(Boolean);

  const lat = Number.parseFloat(latitude);
  const lon = Number.parseFloat(longitude);

  stations.sort((a, b) => {
    const lonA = a.geometry.coordinates[0];
    const latA = a.geometry.coordinates[1];

    const distA = calculateDistanceInDegrees(
      lat,
      lon,
      latA,
      lonA
    );

    const lonB = b.geometry.coordinates[0];
    const latB = b.geometry.coordinates[1];

    const distB = calculateDistanceInDegrees(
      lat,
      lon,
      latB,
      lonB
    );

    return distA - distB;
  });

  /**
   * @type {import("./models.js").ObservationStationExtendedGeoJSON[]}
   */
  const result = [];

  for (let i = 0; i < limit; i++) {
    const station = stations[i];

    if (!station) {
      break;
    }

    const stationLon = Number.parseFloat(station.geometry.coordinates[0], 10);
    const stationLat = Number.parseFloat(station.geometry.coordinates[1], 10);

    const distanceInDegrees = calculateDistanceInDegrees(
      lat,
      lon,
      stationLat,
      stationLon
    );

    /**
     * @type {import("./models.js").ObservationStationExtendedGeoJSON}
     * 
     * A copy of a stationDetailModel obeject with additional `properties`
     * representing the station's relative distance from the request coordinates
     * 
     * @note although this is somewhat verbose, creating a copy guards against
     * accidentally leaking inaccurate `_meta` across requests by mutating shared
     * module-level state. Avoidance of the `...` spread operator here might be
     * a little obsesive and delusional as to the actual performance benefits of
     * opting for inline assignment of each proprty
     */
    const _station = {
      type: station.type,
      geometry: {
        type: station.geometry.type,
        coordinates: station.geometry.coordinates,
      },
      properties: {
        stationIdentifier: station.properties.stationIdentifier,
        forecast: station.properties.forecast,
        _meta: {
          order: i,
          distance: convertDistanceInDegrees(distanceInDegrees, units),
          units,
        }
      }
    };

    result.push(_station);
  }

  return {
    error: null,
    data: result,
  };
}

export function hasWindObservations(forecastZoneObservations) {
  return forecastZoneObservations.features.some(
    (feature) => (
      typeof feature.properties.windSpeed.value === "number" &&
      !Number.isNaN(feature.properties.windSpeed.value)
    )
  );
}

/**
 * 
 * @param {import("./models.js").ObservationStationExtendedGeoJSON} station
 * @returns 
 */
async function fetchObservationsFromNOAA(station) {
  const now = new Date();
  now.setHours(now.getHours() - 1);
  const oneHourAgo = now.toISOString();

  const url = `${station.properties.forecast}/observations?start=${oneHourAgo}`;

  const observationsResponse = await fetch(url);
  const observationsResponseData = await observationsResponse.json();

  if (observationsResponse.status < 300) {
    return {
      message: `Successfully fetched ${url}`,
      status: observationsResponse.status,
      data: observationsResponseData,
      error: null,
    }
  }

  return {
    message: `There was an error fetching ${url}`,
    status: response.status,
    error: observationsResponseData,
    data: null,
  }
}

/**
 * 
 * @param {import("./models.js").ObservationStationExtendedGeoJSON[]} stations 
 * @returns 
 */
export async function fetchForecastZoneObservations(stations) {
  const result = [];

  const context = [];


  for (let station of stations) {
    const key = station.properties.forecast;

    let observations = observationsCache.get(key);

    const cacheControl = {
      maxAge: SECONDS.TEN_MINUTES,
      noStore: false,
    };

    if (observations) {
      context.push({
        message: `Retrieved observations for '${station.properties.stationIdentifier}' from cache`,
      });

      cacheControl.noStore = true;

    } else {
      const noaaResponse = await fetchObservationsFromNOAA(station);

      if (noaaResponse.error) {
        context.push(noaaResponse);
        continue;
      }

      context.push({
        message: `Fetched observations for '${station.properties.stationIdentifier}' from NOAA`
      })

      observations = noaaResponse.data;
    }

    const stationObservations = observations.features.filter(
      (feature) => feature.properties.stationId === station.properties.stationIdentifier
    );

    if (stationObservations.length === 0) {
      context.push({
        url,
        message: `No observations found for station '${station.properties.stationIdentifier}'`
      });
      continue;
    }

    const stationWindObservations = stationObservations.filter(
      (feature) => (
        typeof feature.properties.windSpeed.value === "number" &&
        !Number.isNaN(feature.properties.windSpeed.value)
      )
    );

    if (stationWindObservations.length === 0) {
      context.push({
        url,
        message: `No wind observations found for station '${station.properties.stationIdentifier}'`
      });
      continue;
    }

    if (!cacheControl.noStore) {
      observationsCache.set(key, observations, cacheControl.maxAge);
    }

    station.properties.stationName = stationWindObservations[0].properties.stationName;
    station.properties._observations = {
      timestamp: stationWindObservations[0].properties.timestamp,
      windDirection: stationWindObservations[0].properties.windDirection,
      windSpeed: stationWindObservations[0].properties.windSpeed,
      windGust: stationWindObservations[0].properties.windGust,
    };

    return {
      status: 200,
      data: station,
      error: null,
      context
    }
  }

  return {
    status: 404,
    message: "Unable to fetch observations",
    context,
  };
}