
import path from "node:path"
import fs from "node:fs"

const DATA_DIR = path.resolve(import.meta.dirname, process.env.DATA_DIR || "../data");

function run() {
  for (let filename of fs.readdirSync(DATA_DIR)) {
    console.log(filename)
  }
}

run();