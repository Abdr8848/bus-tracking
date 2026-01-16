const axios = require("axios");

let lat = 17.385;
let lon = 78.4867;

setInterval(async () => {
  lat += 0.0001;
  lon += 0.0001;

  await axios.post("http://localhost:3000/update-location", {
    id: "BUS_1",
    lat,
    lon,
  });

  console.log("Location sent:", lat, lon);
}, 3000);
