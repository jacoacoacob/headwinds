import path from "node:path";

import express from "express";

const PORT = process.env.PORT || 3000;

const app = express();

app.use("/static", express.static("src/static"));

app.get("/", (req, res) => {
  res.sendFile(path.resolve(import.meta.dirname, "index.html"));
});

app.get("/forecast/:lat/:lon", (req, res) => {
  console.log(req.params.lat, req.params.lon);
})

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}!`);
});
