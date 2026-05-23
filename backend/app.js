const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Backend Running Successfully");
});

app.listen(80, () => {
  console.log("Server started");
});