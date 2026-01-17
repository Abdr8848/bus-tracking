// Initialize map
const map = L.map("map").setView([16.7735, 78.1302], 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors",
}).addTo(map);

// ---------------------------
// Route polyline
// ---------------------------
const routeCoords = [
  [16.773504, 78.130198],
  [16.7722, 78.1331],
  [16.7741, 78.1289],
  [16.7763, 78.1368],
];

L.polyline(routeCoords, {
  color: "#2563eb",
  weight: 5,
}).addTo(map);

// ---------------------------
// Stops
// ---------------------------
fetch("http://localhost:3000/api/routes/1/stops")
  .then((res) => res.json())
  .then((stops) => {
    stops.forEach((stop) => {
      L.circleMarker([stop.lat, stop.lon], {
        radius: 6,
        color: "#111827",
        fillColor: "#22c55e",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindPopup(`<b>${stop.name}</b>`);
    });

    document.getElementById("route-info").innerText =
      `Route 1 • ${stops.length} Stops`;
  });

// ---------------------------
// Bus icon
// ---------------------------
const busIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61231.png",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// ---------------------------
// Live buses
// ---------------------------
const busMarkers = {};

async function updateBuses() {
  const res = await fetch("http://localhost:3000/api/buses/1");
  const buses = await res.json();

  document.getElementById("bus-info").innerText =
    `Active buses: ${buses.length}`;

  buses.forEach((bus) => {
    if (!busMarkers[bus.id]) {
      busMarkers[bus.id] = L.marker([bus.lat, bus.lon], {
        icon: busIcon,
      }).addTo(map);
    } else {
      busMarkers[bus.id].setLatLng([bus.lat, bus.lon]);
    }
  });
}

// Poll every second
setInterval(updateBuses, 1000);
updateBuses();
