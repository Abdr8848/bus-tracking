// Configuration
const API_URL = "http://localhost:3000"; // Update with your backend URL
let map;
let busMarkers = {};
let stopMarkers = {};
let routePolylines = {};
let selectedRouteId = "101";

// Route Data (will be fetched from backend) - Jadcherla
const routesData = {
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
    ],
  },
  203: {
    id: "203",
    name: "Route 203 - Jadcherla Circle",
    subtitle: "Local Loop",
    path: "Station Road ↔ Temple Street",
    status: "Delayed",
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
    ],
  },
};

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadRoutes();
  displayRoute(selectedRouteId);
  setupEventListeners();
  startLiveTracking();
});

// Initialize Leaflet Map
function initMap() {
  // Default center (Jadcherla, Telangana)
  const defaultCenter = [16.7667, 78.8333];

  map = L.map("map").setView(defaultCenter, 14);

  // Add OpenStreetMap tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);
}

// Load and display all routes in the sidebar
function loadRoutes() {
  const routesList = document.getElementById("routesList");
  routesList.innerHTML = "";

  Object.values(routesData).forEach((route) => {
    const routeElement = createRouteElement(route);
    routesList.appendChild(routeElement);
  });
}

// Create route list item element
function createRouteElement(route) {
  const div = document.createElement("div");
  div.className = `route-item ${route.id === selectedRouteId ? "active" : ""}`;
  div.dataset.routeId = route.id;

  div.innerHTML = `
        <div class="route-item-content">
            <div class="route-info">
                <h4>${route.name}</h4>
                <div class="route-path">${route.path}</div>
            </div>
            <span class="route-status ${route.status.toLowerCase()}">${route.status}</span>
        </div>
    `;

  div.addEventListener("click", () => {
    selectRoute(route.id);
  });

  return div;
}

// Select and display a route
function selectRoute(routeId) {
  selectedRouteId = routeId;

  // Update UI
  document.querySelectorAll(".route-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.routeId === routeId);
  });

  displayRoute(routeId);
  updateMapForRoute(routeId);
}

// Display route details
function displayRoute(routeId) {
  const route = routesData[routeId];
  if (!route) return;

  // Update route header
  document.getElementById("routeNumber").textContent = route.id;
  document.getElementById("routeSubtitle").textContent = route.subtitle;

  const statusBadge = document.getElementById("statusBadge");
  statusBadge.textContent =
    route.status === "Running" ? "On Time" : route.status;
  statusBadge.className = `status-badge ${route.status === "Delayed" ? "delayed" : ""}`;

  // Display stops
  displayStops(route.stops);
}

// Display upcoming stops
function displayStops(stops) {
  const stopsGrid = document.getElementById("stopsGrid");
  stopsGrid.innerHTML = "";

  stops.forEach((stop, index) => {
    const stopElement = document.createElement("div");
    stopElement.className = `stop-card ${index === 0 ? "active" : ""}`;

    stopElement.innerHTML = `
            <div class="stop-number">${index + 1}</div>
            <div class="stop-name">${stop.name}</div>
            <div class="stop-eta">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                ETA: ${stop.eta}
            </div>
        `;

    stopsGrid.appendChild(stopElement);
  });
}

// Update map to show selected route
function updateMapForRoute(routeId) {
  const route = routesData[routeId];
  if (!route) return;

  // Clear existing markers and polylines
  clearMap();

  // Add stop markers
  route.stops.forEach((stop) => {
    const marker = L.marker([stop.lat, stop.lng], {
      icon: L.divIcon({
        className: "stop-marker",
        iconSize: [32, 32],
      }),
    }).addTo(map);

    marker.bindPopup(`
            <div style="font-family: inherit;">
                <strong>${stop.name}</strong><br>
                <small style="color: #6b7280;">ETA: ${stop.eta}</small>
            </div>
        `);

    stopMarkers[stop.id] = marker;
  });

  // Add route polyline
  const coords = route.stops.map((stop) => [stop.lat, stop.lng]);
  const polyline = L.polyline(coords, {
    color: "#3b82f6",
    weight: 4,
    opacity: 0.7,
  }).addTo(map);

  routePolylines[routeId] = polyline;

  // Fit map to route bounds
  map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

  // Add bus marker (simulated position on first stop)
  addBusMarker(routeId, route.stops[0].lat, route.stops[0].lng);
}

// Add bus marker to map
function addBusMarker(routeId, lat, lng) {
  const busIcon = L.divIcon({
    className: "bus-marker pulse",
    html: `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
            </svg>
        `,
    iconSize: [48, 48],
  });

  const marker = L.marker([lat, lng], { icon: busIcon }).addTo(map);
  marker.bindPopup(`<strong>Route ${routeId}</strong>`);

  busMarkers[routeId] = marker;
}

// Clear map markers and polylines
function clearMap() {
  Object.values(busMarkers).forEach((marker) => map.removeLayer(marker));
  Object.values(stopMarkers).forEach((marker) => map.removeLayer(marker));
  Object.values(routePolylines).forEach((polyline) =>
    map.removeLayer(polyline),
  );

  busMarkers = {};
  stopMarkers = {};
  routePolylines = {};
}

// Setup event listeners
function setupEventListeners() {
  // Status buttons
  document.querySelector(".crowding-btn").addEventListener("click", () => {
    reportStatus("crowding");
  });

  document.querySelector(".delay-btn").addEventListener("click", () => {
    reportStatus("delay");
  });

  // Find nearest button
  document.querySelector(".find-nearest-btn").addEventListener("click", () => {
    findNearestStop();
  });

  // Download offline button
  document.querySelector(".download-btn").addEventListener("click", () => {
    downloadOfflineData();
  });
}

// Report status to backend
function reportStatus(type) {
  const message = type === "crowding" ? "Crowding reported" : "Delay reported";
  alert(message);

  // TODO: Send to backend
  // fetch(`${API_URL}/api/report`, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ routeId: selectedRouteId, type, timestamp: Date.now() })
  // });
}

// Find nearest stop using geolocation
function findNearestStop() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      const route = routesData[selectedRouteId];
      let nearest = null;
      let minDistance = Infinity;

      route.stops.forEach((stop) => {
        const distance = calculateDistance(
          userLat,
          userLng,
          stop.lat,
          stop.lng,
        );
        if (distance < minDistance) {
          minDistance = distance;
          nearest = stop;
        }
      });

      if (nearest) {
        alert(
          `Nearest stop: ${nearest.name} (${minDistance.toFixed(2)} km away)`,
        );
        map.setView([nearest.lat, nearest.lng], 15);
        stopMarkers[nearest.id].openPopup();
      }
    },
    (error) => {
      alert("Unable to retrieve your location");
    },
  );
}

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

// Download offline data
function downloadOfflineData() {
  alert("Offline data download started");
  // TODO: Implement offline data caching
}

// Start live tracking (fetch from backend periodically)
function startLiveTracking() {
  // Fetch bus positions every 5 seconds
  setInterval(async () => {
    try {
      // TODO: Fetch from your backend
      // const response = await fetch(`${API_URL}/api/buses`);
      // const buses = await response.json();
      // updateBusPositions(buses);

      // For now, simulate movement
      simulateBusMovement();
    } catch (error) {
      console.error("Error fetching bus positions:", error);
    }
  }, 5000);
}

// Simulate bus movement (for demo)
function simulateBusMovement() {
  const route = routesData[selectedRouteId];
  if (!route || !busMarkers[selectedRouteId]) return;

  const currentPos = busMarkers[selectedRouteId].getLatLng();
  const stops = route.stops;

  // Simple linear interpolation between stops
  const newLat = currentPos.lat + (Math.random() - 0.5) * 0.001;
  const newLng = currentPos.lng + (Math.random() - 0.5) * 0.001;

  busMarkers[selectedRouteId].setLatLng([newLat, newLng]);
}

// Update bus positions from backend data
function updateBusPositions(buses) {
  buses.forEach((bus) => {
    if (busMarkers[bus.routeId]) {
      busMarkers[bus.routeId].setLatLng([bus.latitude, bus.longitude]);
    } else {
      addBusMarker(bus.routeId, bus.latitude, bus.longitude);
    }
  });
}
