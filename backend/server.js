const express = require("express");
const cors = require("cors");
const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 DB test
(async () => {
  try {
    await db.query("SELECT 1");
    console.log("✅ MySQL connected");
  } catch (e) {
    console.error("❌ DB error:", e.message);
  }
})();

/* ======================
   ROUTES & STOPS APIs
====================== */

// Get all routes
app.get("/api/routes", async (req, res) => {
  const [routes] = await db.query("SELECT * FROM routes");
  res.json(routes);
});

// Get stops for a route
app.get("/api/routes/:id/stops", async (req, res) => {
  const routeId = req.params.id;
  const [stops] = await db.query(
    `
    SELECT s.id, s.name, s.lat, s.lon, rs.stop_order
    FROM route_stops rs
    JOIN stops s ON s.id = rs.stop_id
    WHERE rs.route_id = ?
    ORDER BY rs.stop_order
    `,
    [routeId],
  );
  res.json(stops);
});

/* ======================
   BUS SIMULATION LOGIC
====================== */

const routePath = [
  [16.773504, 78.130198],
  [16.7722, 78.1331],
  [16.7741, 78.1289],
  [16.7763, 78.1368],
];

// Multiple buses
let buses = [
  { id: "BUS_1", route_id: 1, speed: 25, index: 0 },
  { id: "BUS_2", route_id: 1, speed: 20, index: 2 },
];

// Move buses
function moveBus(bus) {
  bus.index += 0.01;
  if (bus.index >= routePath.length - 1) bus.index = 0;

  const i = Math.floor(bus.index);
  const t = bus.index - i;

  const [lat1, lon1] = routePath[i];
  const [lat2, lon2] = routePath[i + 1];

  bus.lat = lat1 + (lat2 - lat1) * t;
  bus.lon = lon1 + (lon2 - lon1) * t;
}

// Update every second
setInterval(() => {
  buses.forEach(moveBus);
}, 1000);

// Get buses for a route
app.get("/api/buses/:routeId", (req, res) => {
  const routeId = Number(req.params.routeId);
  res.json(buses.filter((b) => b.route_id === routeId));
});

/* ======================
   ETA CALCULATION
====================== */

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

app.get("/api/eta/:busId/:stopId", async (req, res) => {
  const bus = buses.find((b) => b.id === req.params.busId);
  const [[stop]] = await db.query("SELECT * FROM stops WHERE id = ?", [
    req.params.stopId,
  ]);

  const dist = getDistance(bus.lat, bus.lon, stop.lat, stop.lon);
  const eta = (dist / bus.speed) * 60;

  res.json({ eta: eta.toFixed(1) });
});

app.listen(3000, () => {
  console.log("🚍 Backend running on http://localhost:3000");
});
