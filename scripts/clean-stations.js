import path from "node:path"
import fs from "node:fs"

const DATA_DIR = path.resolve(import.meta.dirname, process.env.DATA_DIR || "../data");

function run() {
  const pathsToDelete = [];

  for (let filename of fs.readdirSync(DATA_DIR)) {
    const filepath = path.join(DATA_DIR, filename);
    
    const file = fs.readFileSync(filepath, {
      encoding: "utf-8"
    });

    const data = JSON.parse(file);

    if (data.features.length === 0) {
      pathsToDelete.push(filepath);
    }
  }

  for (let filepath of pathsToDelete) {
    fs.rmSync(filepath);
  }
}

run();