// Configuration
const API_URL = "http://localhost:3000";
let map;
let busMarkers = {};
let stopMarkers = {};
let routePolylines = {};
let selectedRouteId = "101";
let updateInterval;

// Initialize the application
document.addEventListener("DOMContentLoaded", () => {
  console.log("Initializing CityBus Tracker...");
  initMap();
  loadRoutesFromAPI();
  setupEventListeners();
});

// Initialize Leaflet Map
function initMap() {
  // Default center (Jadcherla, Telangana)
  const defaultCenter = [16.7667, 78.8333];

  map = L.map("map", {
    center: defaultCenter,
    zoom: 14,
    zoomControl: false,
  });

  // Add zoom control to top left
  L.control
    .zoom({
      position: "topleft",
    })
    .addTo(map);

  // Add OpenStreetMap tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  console.log("Map initialized");
}

// Load routes from backend API
async function loadRoutesFromAPI() {
  try {
    const response = await fetch(`${API_URL}/api/routes`);
    const routes = await response.json();

    console.log("Loaded routes:", routes);

    // Display routes in sidebar
    displayRoutesList(routes);

    // Display first route by default
    if (routes.length > 0) {
      await displayRoute(routes[0].id);
      await updateMapForRoute(routes[0].id);
    }

    // Start live tracking
    startLiveTracking();
  } catch (error) {
    console.error("Error loading routes:", error);
    alert(
      "Could not connect to backend. Make sure the server is running on port 3000.",
    );
  }
}

// Display routes list in sidebar
function displayRoutesList(routes) {
  const routesList = document.getElementById("routesList");
  routesList.innerHTML = "";

  routes.forEach((route) => {
    const routeElement = document.createElement("div");
    routeElement.className = `route-item ${route.id === selectedRouteId ? "active" : ""}`;
    routeElement.dataset.routeId = route.id;

    routeElement.innerHTML = `
            <div class="route-item-content">
                <div class="route-info">
                    <h4>${route.name}</h4>
                    <div class="route-path">${route.path}</div>
                </div>
                <span class="route-status ${route.status.toLowerCase()}">${route.status}</span>
            </div>
        `;

    routeElement.addEventListener("click", async () => {
      selectedRouteId = route.id;
      document.querySelectorAll(".route-item").forEach((item) => {
        item.classList.toggle("active", item.dataset.routeId === route.id);
      });
      await displayRoute(route.id);
      await updateMapForRoute(route.id);
    });

    routesList.appendChild(routeElement);
  });
}

// Display route details
async function displayRoute(routeId) {
  try {
    const response = await fetch(`${API_URL}/api/routes/${routeId}`);
    const route = await response.json();

    console.log("Displaying route:", route);

    // Update route header
    document.getElementById("routeNumber").textContent = route.id;
    document.getElementById("routeSubtitle").textContent = route.subtitle;

    const statusBadge = document.getElementById("statusBadge");
    statusBadge.textContent =
      route.status === "Running" ? "On Time" : route.status;
    statusBadge.className = `status-badge ${route.status === "Delayed" ? "delayed" : ""}`;

    // Display stops
    displayStops(route.stops);
  } catch (error) {
    console.error("Error displaying route:", error);
  }
}

// Display upcoming stops
function displayStops(stops) {
  const stopsGrid = document.getElementById("stopsGrid");
  stopsGrid.innerHTML = "";

  stops.slice(0, 3).forEach((stop, index) => {
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
                ETA: ${stop.eta || "5 min"}
            </div>
        `;

    stopsGrid.appendChild(stopElement);
  });
}

// Update map to show selected route
async function updateMapForRoute(routeId) {
  try {
    const response = await fetch(`${API_URL}/api/routes/${routeId}`);
    const route = await response.json();

    console.log("Updating map for route:", route);

    // Clear existing markers and polylines
    clearMap();

    if (!route.stops || route.stops.length === 0) {
      console.warn("No stops found for route");
      return;
    }

    // Add stop markers
    route.stops.forEach((stop, index) => {
      const marker = L.circleMarker(
        [stop.lat || stop.latitude, stop.lng || stop.longitude],
        {
          radius: 8,
          fillColor: "#3b82f6",
          color: "#fff",
          weight: 3,
          opacity: 1,
          fillOpacity: 0.8,
        },
      ).addTo(map);

      marker.bindPopup(`
                <div style="font-family: inherit;">
                    <strong>${stop.name}</strong><br>
                    <small style="color: #6b7280;">Stop ${index + 1} - ETA: ${stop.eta || "N/A"}</small>
                </div>
            `);

      stopMarkers[stop.id] = marker;
    });

    // Add route polyline
    const coords = route.stops.map((stop) => [
      stop.lat || stop.latitude,
      stop.lng || stop.longitude,
    ]);
    const polyline = L.polyline(coords, {
      color: "#3b82f6",
      weight: 4,
      opacity: 0.7,
    }).addTo(map);

    routePolylines[routeId] = polyline;

    // Fit map to route bounds
    map.fitBounds(polyline.getBounds(), { padding: [50, 50] });

    // Fetch and display buses on this route
    await updateBusPositions();
  } catch (error) {
    console.error("Error updating map:", error);
  }
}

// Update bus positions from backend
async function updateBusPositions() {
  try {
    const response = await fetch(
      `${API_URL}/api/buses/route/${selectedRouteId}`,
    );
    const buses = await response.json();

    console.log("Buses on route:", buses);

    buses.forEach((bus) => {
      if (busMarkers[bus.busId]) {
        // Update existing marker
        busMarkers[bus.busId].setLatLng([bus.latitude, bus.longitude]);
      } else {
        // Create new marker
        const busIcon = L.divIcon({
          className: "custom-bus-marker",
          html: `
                        <div style="
                            width: 40px;
                            height: 40px;
                            background: #3b82f6;
                            border: 3px solid white;
                            border-radius: 50%;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                            animation: pulse 2s infinite;
                        ">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                                <polygon points="3 11 22 2 13 21 11 13 3 11"></polygon>
                            </svg>
                        </div>
                    `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const marker = L.marker([bus.latitude, bus.longitude], {
          icon: busIcon,
          zIndexOffset: 1000,
        }).addTo(map);

        marker.bindPopup(`
                    <div style="font-family: inherit;">
                        <strong>Bus ${bus.busId}</strong><br>
                        <small>Route ${bus.routeId}</small><br>
                        <small>Speed: ${Math.round(bus.speed)} km/h</small><br>
                        <small>Occupancy: ${bus.currentOccupancy}/${bus.capacity}</small>
                    </div>
                `);

        busMarkers[bus.busId] = marker;
      }
    });
  } catch (error) {
    console.error("Error updating bus positions:", error);
  }
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
async function reportStatus(type) {
  try {
    const response = await fetch(`${API_URL}/api/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routeId: selectedRouteId,
        type,
        timestamp: Date.now(),
      }),
    });

    const result = await response.json();
    const message =
      type === "crowding" ? "Crowding reported!" : "Delay reported!";
    alert(message);
  } catch (error) {
    console.error("Error reporting status:", error);
    alert("Failed to report status");
  }
}

// Find nearest stop using geolocation
function findNearestStop() {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported by your browser");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      try {
        const response = await fetch(
          `${API_URL}/api/nearest-stop?lat=${userLat}&lng=${userLng}&routeId=${selectedRouteId}`,
        );
        const data = await response.json();

        if (data.stop) {
          alert(`Nearest stop: ${data.stop.name} (${data.distance} away)`);
          map.setView(
            [
              data.stop.lat || data.stop.latitude,
              data.stop.lng || data.stop.longitude,
            ],
            16,
          );
          if (stopMarkers[data.stop.id]) {
            stopMarkers[data.stop.id].openPopup();
          }
        }
      } catch (error) {
        console.error("Error finding nearest stop:", error);
      }
    },
    (error) => {
      alert("Unable to retrieve your location");
    },
  );
}

// Download offline data
function downloadOfflineData() {
  alert("Offline data download started (feature coming soon)");
}

// Start live tracking
function startLiveTracking() {
  // Clear any existing interval
  if (updateInterval) {
    clearInterval(updateInterval);
  }

  // Update bus positions every 3 seconds
  updateInterval = setInterval(async () => {
    await updateBusPositions();
  }, 3000);

  console.log("Live tracking started");
}

// Stop live tracking when page unloads
window.addEventListener("beforeunload", () => {
  if (updateInterval) {
    clearInterval(updateInterval);
  }
});
