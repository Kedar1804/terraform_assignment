const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("CI/CD Working Successfully"); 
});

app.listen(80, () => {
  console.log("Server started");
});