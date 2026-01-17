// ---------------------------
// MAP SETUP
// ---------------------------
const map = L.map("map").setView([16.7735, 78.1302], 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap",
}).addTo(map);

// ---------------------------
// ROUTE
// ---------------------------
const routeCoords = [
  [16.773504, 78.130198],
  [16.7722, 78.1331],
  [16.7741, 78.1289],
  [16.7763, 78.1368],
];

L.polyline(routeCoords, {
  color: "#2563eb",
  weight: 6,
}).addTo(map);

// ---------------------------
// STOPS
// ---------------------------
fetch("http://localhost:3000/api/routes/1/stops")
  .then((res) => res.json())
  .then((stops) => {
    stops.forEach((stop) => {
      L.circleMarker([stop.lat, stop.lon], {
        radius: 7,
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
// BUS ICON (FIXED)
// ---------------------------
const busIcon = L.icon({
  iconUrl: "https://img.icons8.com/color/48/bus.png",
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

// ---------------------------
// LIVE BUSES
// ---------------------------
const busMarkers = {};

async function updateBuses() {
  const res = await fetch("http://localhost:3000/api/buses/1");
  const buses = await res.json();

  document.getElementById("bus-info").innerHTML = "";

  buses.forEach((bus) => {
    // Create marker if not exists
    if (!busMarkers[bus.id]) {
      busMarkers[bus.id] = L.marker([bus.lat, bus.lon], {
        icon: busIcon,
      }).addTo(map);
    } else {
      busMarkers[bus.id].setLatLng([bus.lat, bus.lon]);
    }

    // ETA (fake but realistic for hackathon)
    const eta = (Math.random() * 5 + 2).toFixed(1);

    // Popup on click
    busMarkers[bus.id].bindPopup(`
      <b>Bus ID:</b> ${bus.id}<br>
      <b>Speed:</b> ${bus.speed} km/h<br>
      <b>Next Stop ETA:</b> ${eta} min
    `);

    // Bottom panel info
    const div = document.createElement("div");
    div.innerHTML = `
      🚌 <b>${bus.id}</b> — ETA: ${eta} min
    `;
    document.getElementById("bus-info").appendChild(div);
  });
}

// Poll every second
setInterval(updateBuses, 1000);
updateBuses();
