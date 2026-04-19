import fs from "node:fs";
import path from "node:path";

export const DATA_DIR = path.resolve(
  import.meta.dirname,
  process.env.DATA_DIR || "../data"
);

export const DEGREES_DISTANCE_COEFFICIENTS = {
  MILES: 69.4,
  KILOMETERS: 111.1,
};

export const DISTANCE_UNITS = {
  DEGREES: "deg",
  MILES: "mi",
  KILOMETERS: "km",
};

export const VALID_DISTANCE_UNITS = Object.values(DISTANCE_UNITS);

export const SECONDS = {
  ONE_MINUTE: 60,
  FIVE_MINUTES: 60 * 5,
  TEN_MINUTES: 60 * 10,
  FIFTEEN_MINUTES: 60 * 15,
  THIRTY_MINUTES: 60 * 30,
  ONE_HOUR: 60 * 30,
}