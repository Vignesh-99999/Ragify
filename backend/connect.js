const express = require("express");
const mongoose = require("mongoose");

const app = express();

mongoose.connect("mongodb+srv://vigljku_db_user:7vJh7wVeLnkF0CYN@ragify-db.nk4yaa4.mongodb.net/mean_auth?appName=ragify-db")
  .then(() => console.log("DB Connected"))
  .catch(console.error);

app.get("/", (req, res) => res.send("Hello"));

app.listen(5000, () => console.log("Server running"));
