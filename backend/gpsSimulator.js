const axios = require("axios");

// In-memory route stops for simulation (copy from DB or define manually)
const routeStops = {
  1: [
    { lat: 16.773504, lon: 78.130198 }, // Jadcherla Bus Stand
    { lat: 16.7722, lon: 78.1331 }, // Nehru Chowrasta
    { lat: 16.7741, lon: 78.1289 }, // Old Bus Stand
    { lat: 16.7763, lon: 78.1368 }, // Kalwakurthy Road Bus Stop
  ],
};

// Buses in simulation
let buses = [
  { id: "BUS_1", route_id: 1, index: 0 },
  { id: "BUS_2", route_id: 1, index: 1 },
];

function moveBus(bus) {
  const stops = routeStops[bus.route_id];
  let target = stops[bus.index + 1];
  if (!target) {
    bus.index = 0; // loop back
    target = stops[bus.index + 1];
  }

  // Send updated location to backend
  axios
    .post("http://localhost:3000/update-location", {
      id: bus.id,
      lat: target.lat,
      lon: target.lon,
    })
    .catch(console.error);

  bus.index++;
}

// Move buses every 2 seconds
setInterval(() => {
  buses.forEach(moveBus);
}, 2000);
