/**
 * This script builds a database of NOAA /stations API responses so that we can
 * transform lat/lon coordinates to NOAA Station IDs on our server to enable a
 * cache layer between us and NOAA stations/:stationId/observations/latest
 * 
 * 
 * ```
 * [Client]           [Our Forecast API]              [Our Cache]                           [NOAA API]
 *  |                 ****************                key = stationId                       /stations/<stationId>/observations/latest
 * sends lat/lon –––> * transform to *                    |    
 *                    * stationId    *                    |
 *                    ****************                    |
 *                        |–––––––––––––––––––––––––> ====================
 *                        =                           has forecast record 
 *                        | < - - cached forecast - - ====================  
 *                        |                           no forecast record –––– Call NOAA ––> ========
 *                        |                                                                 success
 *   < - - - data - - - - | < - - - - - - - - - - - - - noaa forecast - - - - - - - - - - - ========                          
 *                        =                                                                 failure
 *    < - - no data - - - | < - - - - - - - - - - - - - error / no forecast - - - - - - - - ========  
 *                        = (retry with next 
 *                          nearest station)
 * ```                                          
 */

import path from "node:path";
import fs from "node:fs";

import { DATA_DIR, getEnvNumber, sleep } from "./utils.js"

/**
 * Used to compute a random duration, in milliseconds, to wait between /stations calls
 */
const SLEEP_INTERVAL = getEnvNumber(process.env.SLEEP_INTERVAL, 5000);

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR)
}

async function fetchStations(url) {

  const location = path.join(
    DATA_DIR,
    url.replace("https://api.weather.gov/", "")
  );

  const extension = ".json";

  const saveTo = location + extension;

  if (fs.existsSync(saveTo)) {
    console.error(url + ": already fetched");
    return;
  }

  try {
    console.log(`${url} : fetching`);
    
    const response = await fetch(url);
    
    const json = await response.json();
    
    console.log(`${url} : saving response`);

    fs.writeFileSync(saveTo, JSON.stringify(json));

    console.log(`${url} : response saved`);
    
    if (json.pagination.next && json.features.length > 0) {
      const delay = Math.random() * SLEEP_INTERVAL + 1000; 

      console.log(`${url} : waiting ${Math.round((delay / 1000) * 100) / 100} seconds to fetch next page`);

      await sleep(delay);

      await fetchStations(json.pagination.next);
    }

  } catch (error) {
    console.error(`${url} : error`, error);
  }
}

fetchStations("https://api.weather.gov/stations?limit=500");