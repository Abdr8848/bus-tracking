const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();
const db = require("./db");
const { startGPSSimulator } = require("./gpsSimulator");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// In-memory storage for demo (replace with database in production)
let buses = {};
let reports = [];

// Initialize routes data - Jadcherla, Telangana
const routes = {
  101: {
    id: "101",
    name: "Route 101 - Jadcherla Main",
    subtitle: "Town Center Express",
    path: "Bus Stand ↔ Hospital",
    status: "Running",
    stops: [
      { id: "s1", name: "Bus Stand", lat: 16.7667, lng: 78.8333, eta: "3 min" },
      {
        id: "s2",
        name: "Gandhi Chowk",
        lat: 16.768,
        lng: 78.835,
        eta: "8 min",
      },
      { id: "s3", name: "Market Area", lat: 16.77, lng: 78.837, eta: "12 min" },
      {
        id: "s4",
        name: "School Junction",
        lat: 16.772,
        lng: 78.839,
        eta: "15 min",
      },
      {
        id: "s5",
        name: "Government Hospital",
        lat: 16.775,
        lng: 78.842,
        eta: "20 min",
      },
    ],
  },
  203: {
    id: "203",
    name: "Route 203 - Jadcherla Circle",
    subtitle: "Local Loop",
    path: "Station Road ↔ Temple Street",
    status: "Running",
    stops: [
      {
        id: "s6",
        name: "Railway Station",
        lat: 16.765,
        lng: 78.83,
        eta: "5 min",
      },
      {
        id: "s7",
        name: "Municipal Office",
        lat: 16.767,
        lng: 78.832,
        eta: "9 min",
      },
      {
        id: "s8",
        name: "Main Temple",
        lat: 16.769,
        lng: 78.834,
        eta: "14 min",
      },
      {
        id: "s9",
        name: "College Road",
        lat: 16.771,
        lng: 78.836,
        eta: "18 min",
      },
    ],
  },
  305: {
    id: "305",
    name: "Route 305 - Outer Ring",
    subtitle: "Suburban Service",
    path: "Outskirts ↔ City Center",
    status: "Running",
    stops: [
      {
        id: "s10",
        name: "Outer Ring Road",
        lat: 16.76,
        lng: 78.828,
        eta: "2 min",
      },
      {
        id: "s11",
        name: "Industrial Area",
        lat: 16.763,
        lng: 78.831,
        eta: "7 min",
      },
      {
        id: "s12",
        name: "City Center",
        lat: 16.7667,
        lng: 78.8333,
        eta: "12 min",
      },
    ],
  },
};

// Initialize buses - Jadcherla
buses = {
  bus_101: {
    busId: "bus_101",
    routeId: "101",
    latitude: 16.7667,
    longitude: 78.8333,
    speed: 35,
    heading: 180,
    capacity: 50,
    currentOccupancy: 32,
    timestamp: Date.now(),
  },
  bus_203: {
    busId: "bus_203",
    routeId: "203",
    latitude: 16.765,
    longitude: 78.83,
    speed: 28,
    heading: 90,
    capacity: 45,
    currentOccupancy: 41,
    timestamp: Date.now(),
  },
  bus_305: {
    busId: "bus_305",
    routeId: "305",
    latitude: 16.76,
    longitude: 78.828,
    speed: 40,
    heading: 270,
    capacity: 40,
    currentOccupancy: 15,
    timestamp: Date.now(),
  },
};

// ============================================
// API ROUTES
// ============================================

// Get all routes
app.get("/api/routes", (req, res) => {
  try {
    res.json(Object.values(routes));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific route
app.get("/api/routes/:routeId", (req, res) => {
  try {
    const route = routes[req.params.routeId];
    if (!route) {
      return res.status(404).json({ error: "Route not found" });
    }
    res.json(route);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all buses
app.get("/api/buses", (req, res) => {
  try {
    res.json(Object.values(buses));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get buses for specific route
app.get("/api/buses/route/:routeId", (req, res) => {
  try {
    const routeBuses = Object.values(buses).filter(
      (bus) => bus.routeId === req.params.routeId,
    );
    res.json(routeBuses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get specific bus
app.get("/api/buses/:busId", (req, res) => {
  try {
    const bus = buses[req.params.busId];
    if (!bus) {
      return res.status(404).json({ error: "Bus not found" });
    }
    res.json(bus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update bus position (used by GPS simulator)
app.post("/api/buses/:busId/position", (req, res) => {
  try {
    const { busId } = req.params;
    const { latitude, longitude, speed, heading } = req.body;

    if (!buses[busId]) {
      buses[busId] = {
        busId,
        routeId: req.body.routeId || "101",
        capacity: 50,
        currentOccupancy: 0,
      };
    }

    buses[busId] = {
      ...buses[busId],
      latitude,
      longitude,
      speed: speed || buses[busId].speed,
      heading: heading || buses[busId].heading,
      timestamp: Date.now(),
    };

    res.json({ success: true, bus: buses[busId] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Report status (crowding/delay)
app.post("/api/report", (req, res) => {
  try {
    const { routeId, type, timestamp, busId, description } = req.body;

    const report = {
      id: `report_${Date.now()}`,
      routeId,
      busId,
      type, // 'crowding' or 'delay'
      description,
      timestamp: timestamp || Date.now(),
      status: "active",
    };

    reports.push(report);

    // Update route status if delay reported
    if (type === "delay" && routes[routeId]) {
      routes[routeId].status = "Delayed";
    }

    res.json({ success: true, report });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get reports
app.get("/api/reports", (req, res) => {
  try {
    const { routeId, type } = req.query;
    let filteredReports = reports;

    if (routeId) {
      filteredReports = filteredReports.filter((r) => r.routeId === routeId);
    }

    if (type) {
      filteredReports = filteredReports.filter((r) => r.type === type);
    }

    res.json(filteredReports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calculate ETA for a stop
app.get("/api/eta/:routeId/:stopId", (req, res) => {
  try {
    const { routeId, stopId } = req.params;
    const route = routes[routeId];

    if (!route) {
      return res.status(404).json({ error: "Route not found" });
    }

    const stop = route.stops.find((s) => s.id === stopId);
    if (!stop) {
      return res.status(404).json({ error: "Stop not found" });
    }

    // Find nearest bus on this route
    const routeBuses = Object.values(buses).filter(
      (b) => b.routeId === routeId,
    );

    if (routeBuses.length === 0) {
      return res.json({ eta: "N/A", message: "No buses currently on route" });
    }

    // Calculate distance and ETA (simplified)
    const nearestBus = routeBuses[0];
    const distance = calculateDistance(
      nearestBus.latitude,
      nearestBus.longitude,
      stop.lat,
      stop.lng,
    );

    const etaMinutes = Math.round((distance / nearestBus.speed) * 60);

    res.json({
      eta: `${etaMinutes} min`,
      distance: `${distance.toFixed(2)} km`,
      busId: nearestBus.busId,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get nearest stop to coordinates
app.get("/api/nearest-stop", (req, res) => {
  try {
    const { lat, lng, routeId } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({ error: "Latitude and longitude required" });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    let allStops = [];

    if (routeId && routes[routeId]) {
      allStops = routes[routeId].stops;
    } else {
      // Get stops from all routes
      Object.values(routes).forEach((route) => {
        allStops = allStops.concat(route.stops);
      });
    }

    let nearestStop = null;
    let minDistance = Infinity;

    allStops.forEach((stop) => {
      const distance = calculateDistance(userLat, userLng, stop.lat, stop.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestStop = stop;
      }
    });

    res.json({
      stop: nearestStop,
      distance: `${minDistance.toFixed(2)} km`,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: Date.now(),
    busesActive: Object.keys(buses).length,
    routesActive: Object.keys(routes).length,
  });
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================
// START SERVER
// ============================================

app.listen(PORT, () => {
  console.log(`🚌 CityBus Tracker Server running on http://localhost:${PORT}`);
  console.log(`📍 Frontend available at http://localhost:${PORT}`);
  console.log(`🔌 API available at http://localhost:${PORT}/api`);

  // Start GPS simulator for all buses
  console.log("\n🛰️  Starting GPS simulators...");
  Object.keys(buses).forEach((busId) => {
    const bus = buses[busId];
    const route = routes[bus.routeId];
    if (route) {
      startGPSSimulator(busId, bus.routeId, route.stops, (position) => {
        buses[busId] = {
          ...buses[busId],
          ...position,
        };
      });
      console.log(
        `   ✓ GPS simulator started for ${busId} on Route ${bus.routeId}`,
      );
    }
  });

  console.log("\n✅ All systems ready!\n");
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    console.log("HTTP server closed");
  });
});
