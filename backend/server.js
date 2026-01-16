const db = require("./db");
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
//Temporary ??
(async () => {
  try {
    const [rows] = await db.query("SELECT 1");
    console.log("✅ MySQL connected successfully");
  } catch (err) {
    console.error("❌ MySQL connection failed:", err.message);
  }
})();

// In-memory bus data (hackathon-friendly)
let buses = {
  BUS_1: {
    id: "BUS_1",
    lat: 17.385,
    lon: 78.4867,
    speed: 30, // km/h
  },
};

// Route stop (single stop for ETA demo)
const STOP = {
  name: "Central Bus Stop",
  lat: 17.39,
  lon: 78.49,
};

// Update bus location
app.post("/update-location", (req, res) => {
  const { id, lat, lon } = req.body;
  if (buses[id]) {
    buses[id].lat = lat;
    buses[id].lon = lon;
  }
  res.json({ status: "updated" });
});

// Get all buses
app.get("/buses", (req, res) => {
  res.json(Object.values(buses));
});

// Simple distance formula
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ETA endpoint
app.get("/eta/:id", (req, res) => {
  const bus = buses[req.params.id];
  const distance = getDistance(bus.lat, bus.lon, STOP.lat, STOP.lon);
  const eta = (distance / bus.speed) * 60;
  res.json({ stop: STOP.name, eta: eta.toFixed(1) });
});

app.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
});
