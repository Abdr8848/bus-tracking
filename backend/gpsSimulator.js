const axios = require("axios");

// Hardcoded stops for Route 1 (from DB)
const ROUTE_STOPS = {
  1: [
    { lat: 16.773504, lon: 78.130198 }, // Jadcherla Bus Stand
    { lat: 16.7722, lon: 78.1331 }, // Nehru Chowrasta
    { lat: 16.7741, lon: 78.1289 }, // Old Bus Stand
    { lat: 16.7763, lon: 78.1368 }, // Kalwakurthy Road Bus Stop
  ],
};

const buses = [
  { id: "BUS_1", route_id: 1, stopIndex: 0 },
  { id: "BUS_2", route_id: 1, stopIndex: 1 },
];

function moveTowards(current, target, step = 0.0001) {
  const latDiff = target.lat - current.lat;
  const lonDiff = target.lon - current.lon;

  const distance = Math.sqrt(latDiff ** 2 + lonDiff ** 2);
  if (distance < step) return target;

  return {
    lat: current.lat + (latDiff / distance) * step,
    lon: current.lon + (lonDiff / distance) * step,
  };
}

async function updateBus(bus) {
  const stops = ROUTE_STOPS[bus.route_id];
  const nextStop = stops[(bus.stopIndex + 1) % stops.length];

  const current = bus.current || stops[bus.stopIndex];
  const nextPos = moveTowards(current, nextStop);

  bus.current = nextPos;

  // If reached stop → advance
  if (
    Math.abs(nextPos.lat - nextStop.lat) < 0.00015 &&
    Math.abs(nextPos.lon - nextStop.lon) < 0.00015
  ) {
    bus.stopIndex = (bus.stopIndex + 1) % stops.length;
  }

  await axios.post("http://localhost:3000/update-location", {
    id: bus.id,
    lat: nextPos.lat,
    lon: nextPos.lon,
  });
}

// Update every second
setInterval(() => {
  buses.forEach(updateBus);
}, 1000);

console.log("🚍 GPS Simulator running...");
