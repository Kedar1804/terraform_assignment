const express = require("express");

const app = express();

app.get("/", (req, res) => {
  res.send("Hello from backend CI/CD Working Successfully"); 
});

app.listen(80, () => {
  console.log("Server started");
});