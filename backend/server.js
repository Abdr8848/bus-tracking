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
// Get all routes
app.get("/api/routes", async (req, res) => {
  try {
    const [routes] = await db.query("SELECT * FROM routes");
    res.json(routes);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch routes" });
  }
});
// Get all stops for a specific route
// Get all stops for a specific route
app.get("/api/routes/:id/stops", async (req, res) => {
  const routeId = parseInt(req.params.id); // make sure it's a number

  try {
    const [stops] = await db.query(
      `SELECT s.id, s.name, s.lat, s.lon, rs.stop_order
       FROM route_stops AS rs
       INNER JOIN stops AS s ON rs.stop_id = s.id
       WHERE rs.route_id = ?
       ORDER BY rs.stop_order ASC`,
      [routeId]
    );

    if (!stops || stops.length === 0) {
      return res.status(404).json({ error: "No stops found for this route" });
    }

    res.json(stops);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stops" });
  }
});
// Get all buses on a specific route
app.get("/api/routes/:id/buses", (req, res) => {
  const routeId = parseInt(req.params.id);

  // Filter in-memory buses for this route
  const routeBuses = Object.values(buses).filter(
    (bus) => bus.route_id === routeId
  );

  res.json(routeBuses);
});
// Get live route info: stops + buses + ETA
app.get("/api/routes/:id/live", async (req, res) => {
  const routeId = parseInt(req.params.id);

  try {
    // 1️⃣ Get stops for this route from DB
    const [stops] = await db.query(
      `SELECT s.id, s.name, s.lat, s.lon, rs.stop_order
       FROM route_stops AS rs
       JOIN stops AS s ON rs.stop_id = s.id
       WHERE rs.route_id = ?
       ORDER BY rs.stop_order ASC`,
      [routeId]
    );

    if (!stops || stops.length === 0) {
      return res.status(404).json({ error: "No stops found for this route" });
    }

    // 2️⃣ Get buses on this route
    const routeBuses = Object.values(buses).filter(
      (bus) => bus.route_id === routeId
    );

    // 3️⃣ Calculate ETA for each bus to each stop
    const liveData = routeBuses.map((bus) => {
      const etaPerStop = stops.map((stop) => {
        const distance = getDistance(
          bus.lat,
          bus.lon,
          parseFloat(stop.lat),
          parseFloat(stop.lon)
        );
        const eta = (distance / bus.speed) * 60; // minutes
        return { stop_id: stop.id, stop_name: stop.name, eta: eta.toFixed(1) };
      });
      return { ...bus, eta: etaPerStop };
    });

    res.json({
      route_id: routeId,
      stops,
      buses: liveData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch live route data" });
  }
});

// In-memory bus data (hackathon-friendly)
let buses = {
  BUS_1: {
    id: "BUS_1",
    route_id: 1,
    lat: 16.773504,
    lon: 78.130198,
    speed: 30,
    currentStopIndex: 0,
    direction: 1,
  },
  BUS_2: {
    id: "BUS_2",
    route_id: 1,
    lat: 16.7722,
    lon: 78.1331,
    speed: 28,
    currentStopIndex: 1,
    direction: 1,
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

  if (!bus) {
    return res.status(404).json({ error: "Bus not found" });
  }

  const distance = getDistance(bus.lat, bus.lon, STOP.lat, STOP.lon);
  const eta = (distance / bus.speed) * 60;

  res.json({ stop: STOP.name, eta: eta.toFixed(1) });
});

app.listen(3000, () => {
  console.log("Backend running on http://localhost:3000");
});
