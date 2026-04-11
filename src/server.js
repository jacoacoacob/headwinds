import path from "node:path";

import express from "express";

const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.static("/public"))

app.get("/", (req, res) => {
  res.sendFile(path.resolve(import.meta.dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}!`);
});