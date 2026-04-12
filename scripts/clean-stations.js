import fs from "node:fs";
import path from "node:path";

import { DATA_DIR} from "./constants.js";

function run() {
  const pathsToDelete = [];

  for (let filename of fs.readdirSync(DATA_DIR)) {
    const filepath = path.join(DATA_DIR, filename);
    
    const file = fs.readFileSync(filepath, {
      encoding: "utf-8"
    });

    const json = JSON.parse(file);

    if (json.features.length === 0) {
      pathsToDelete.push(filepath);
    }
  }

  for (let filepath of pathsToDelete) {
    fs.rmSync(filepath);
  }
}

run();