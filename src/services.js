import { DISTANCE_UNITS, DEGREES_DISTANCE_COEFFICIENTS, SECONDS } from "./constants.js";
import { stationDetailModel, stationIdLookupModel, zoneObservationsCache } from "./models.js";


function calculateDistanceInDegrees(latX, lonX, latY, lonY) {
  const distLon = lonX - lonY;
  const distLat = latX - latY;

  return Math.abs(Math.sqrt(distLon**2 + distLat**2));
}

function convertDistanceInDegrees(distance, toUnits) {
  let convertedDistance, suffix;

  switch (toUnits) {
    case DISTANCE_UNITS.MILES: {
      convertedDistance = distance * DEGREES_DISTANCE_COEFFICIENTS.MILES;
      suffix = DISTANCE_UNITS.MILES;
      break;
    }
    case DISTANCE_UNITS.KILOMETERS: {
      convertedDistance = distance * DEGREES_DISTANCE_COEFFICIENTS.KILOMETERS;
      suffix = DISTANCE_UNITS.KILOMETERS;
      break;
    }
    default: {
      return;
    }
  }

  const roundedDistance = Math.round(convertedDistance * 100) / 100;

  return roundedDistance + suffix;
}

export function findClosetStations(
  latitude,
  longitude,
  limit,
  units
) {
  const latitudeKey = latitude.replace(/\..*/g, "");
  const longitudeKey = longitude.replace(/\..*/g, "");

  const key = `${latitudeKey}_${longitudeKey}`;

  if (!stationIdLookupModel.has(key)) {
    return {
      error: {
        code: 404,
        message: `No stations found for latitude '${latitude}' and longitude ${longitude}`
      },
      data: null,
    }
  }

  const stations = Array.from(stationIdLookupModel.get(key))

  const lat = Number.parseFloat(latitude);
  const lon = Number.parseFloat(longitude);

  stations.sort((a, b) => {
    const lonA = a[2];
    const latA = a[3];

    const distA = calculateDistanceInDegrees(
      lat,
      lon,
      latA,
      lonA
    );

    const lonB = b[2];
    const latB = b[3];

    const distB = calculateDistanceInDegrees(
      lat,
      lon,
      latB,
      lonB
    );

    return distA - distB;
  });

  const result = [];

  for (let i = 0; i < limit; i++) {
    const source = stations[i][0];
    const stationId = stations[i][1];
    
    const stationDetail = stationDetailModel.get(source + stationId);

    const stationLon = Number.parseFloat(stationDetail.geometry.coordinates[0], 10);
    const stationLat = Number.parseFloat(stationDetail.geometry.coordinates[1], 10);

    const distanceInDegrees = calculateDistanceInDegrees(
      lat,
      lon,
      stationLat,
      stationLon
    );

    stationDetail.properties._meta = {
      order: i,
      distance: convertDistanceInDegrees(distanceInDegrees, units),
    };

    result.push(stationDetail);
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


export async function fetchForecastZoneObservations(stations) {
  const result = [];

  const now = new Date();
  now.setHours(now.getHours() - 1);
  const oneHourAgo = now.toISOString();

  // const beginningOfHour = new Date().toISOString().slice(0, 13) + ":00:00Z";

  const context = [];

  for (let station of stations) {
    const key = station.properties.forecast;

    const cachedRecord = zoneObservationsCache.get(key);

    if (cachedRecord) {
      result.push({
        message: "Successfully retrieved cached observations!",
        status: 200,
        data: cachedRecord,
        error: null,
      });

      break;
    }

    const url = `${station.properties.forecast}/observations?start=${oneHourAgo}`;

    const observationsResponse = await fetch(url);
    const observationsResponseData = await observationsResponse.json();

    if (observationsResponse.status < 300) {

      console.log({
        observationResponseDataStationIDs: observationsResponseData.features.map(
          (feature) => feature.properties.stationId,
        ),
        station
      })

      const stationObservations = observationsResponseData.features.filter(
        (feature) => feature.properties.stationId === station.properties.stationIdentifier
      );

      if (stationObservations.length === 0) {
        context.push({
          url,
          message: `No observations found for station '${station.properties.stationIdentifier}'`
        });
        continue;
      }

      const stationWindObservations = stationObservations.some(
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

      zoneObservationsCache.set(key, observationsResponse, SECONDS.ONE_MINUTE);

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

      /**
       * Success!
       * 
       * `station` is a GeoJSON Point representing a NOAA observation station
       * 
       * `observationsResponseData` is a GeoJSON FeatureCollection from a request
       * whose url is derived from `station.properties.forecast`.
       * 
       * Each `feature` represents a /stations/{stationId}/observations/{time}
       * response.
       * 
       * notable `feature.properties`
       * - `stationId` where these observations were recorded
       * - `timestamp` when these observations were recorded
       * - `windDirection` self-explanitory
       * - `windSpeed` self-explanitory
       * - `windGust` self-explanitory
       * 
       * `context` is an array containing metadata about the steps taken by
       * this function and can be optionally included in the response for
       * debugging
       * 
       * for each feature
       * 
       *   stationObservations = filter feature.properties.stationId == station.properties.stationIdentifier
       * 
       *   if stationObservations length is 0
       *     context push "No observations found for station '{station.properties.stationIdentifier}'"
       *     continue
       * 
       *   stationHasWindObservations = some feature.properties.windSpeed.value is number
       * 
       *   if not stationHasWindObservations
       *     context push "No wind observations found for station '{station.properties.stationIdentifier}'"
       *     continue
       * 
       *   cache the observationsResponse
       * 
       *   station.properties._observations = {
       *     feature.properties.timestamp
       *     feature.properties.windDirection
       *     feature.properties.windSpeed
       *     feature.properties.windGust
       *   }
       *    
       *   return {
       *     status   200
       *     data     station
       *     error    null
       *     context  context
       *   }
       * 
       */
    }

    context.push({
      message: `There was an error fetching ${url}`,
      status: response.status,
      error: json,
    });
  }

  return {
    something: "went wrong",
    context
  }
  // return result;
}