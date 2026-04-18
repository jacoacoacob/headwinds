import path from "node:path";

export const DATA_DIR = path.resolve(
  import.meta.dirname,
  process.env.DATA_DIR || "../data"
);

export function getEnvNumber(value, defaultValue = 2000) {
  const parsed = Number.parseInt(value, 10);
  
  if (Number.isNaN(parsed)) {
    return defaultValue;
  }

  return parsed;
}

export function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}