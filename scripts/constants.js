import path from "node:path";

export const DATA_DIR = path.resolve(
  import.meta.dirname,
  process.env.DATA_DIR || "../data"
);
