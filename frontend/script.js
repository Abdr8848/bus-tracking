const map = L.map("map").setView([16.7735, 78.1302], 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap",
}).addTo(map);

// Route line
const routeCoords = [
  [16.773504, 78.130198],
  [16.7722, 78.1331],
  [16.7741, 78.1289],
  [16.7763, 78.1368],
];

L.polyline(routeCoords, { color: "blue" }).addTo(map);

// Stops
fetch("http://localhost:3000/api/routes/1/stops")
  .then((res) => res.json())
  .then((stops) => {
    stops.forEach((stop) => {
      L.marker([stop.lat, stop.lon]).addTo(map).bindPopup(stop.name);
    });
  });

// Bus markers
const busMarkers = {};

async function updateBuses() {
  const res = await fetch("http://localhost:3000/api/buses/1");
  const buses = await res.json();

  buses.forEach((bus) => {
    if (!busMarkers[bus.id]) {
      busMarkers[bus.id] = L.marker([bus.lat, bus.lon]).addTo(map);
    } else {
      busMarkers[bus.id].setLatLng([bus.lat, bus.lon]);
    }
  });

  document.getElementById("info").innerText =
    `Route ID: 1 | Stops: 4 | Buses: ${buses.length}`;
}

setInterval(updateBuses, 1000);
