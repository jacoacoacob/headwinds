import path from "node:path";

import express from "express";

import { forecast } from "./forecast.js";

const PORT = process.env.PORT || 3000;

const app = express();

app.use("/static", express.static("src/static"));

app.get("/", (req, res) => {
  res.sendFile(path.resolve(import.meta.dirname, "index.html"));
});

app.use("/forecast", forecast);

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}!`);
});
