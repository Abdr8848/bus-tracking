const map = L.map("map").setView([16.7735, 78.1302], 15); // center on Jadcherla

// Tile layer
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
}).addTo(map);

// Store markers
let stopMarkers = [];
let busMarkers = {};

// Load route 1 live data
async function loadRoute(routeId = 1) {
  const res = await fetch(`http://localhost:3000/api/routes/${routeId}/live`);
  const data = await res.json();

  // Display route info
  const routeInfo = `
    Route ID: ${data.route_id} | Stops: ${data.stops.length} | Buses: ${data.buses.length}
  `;
  document.getElementById("route-info").innerText = routeInfo;

  // Add stop markers
  stopMarkers.forEach((m) => map.removeLayer(m));
  stopMarkers = data.stops.map((stop) => {
    return L.marker([stop.lat, stop.lon], { title: stop.name })
      .addTo(map)
      .bindPopup(`<b>${stop.name}</b>`);
  });

  // Add/update bus markers
  data.buses.forEach((bus) => {
    const lat = bus.lat;
    const lon = bus.lon;
    const popupContent = `<b>${bus.id}</b><br>Next stop ETA: ${bus.eta[0].eta} min`;

    if (busMarkers[bus.id]) {
      busMarkers[bus.id].setLatLng([lat, lon]);
      busMarkers[bus.id].setPopupContent(popupContent);
    } else {
      busMarkers[bus.id] = L.marker([lat, lon], {
        icon: L.icon({
          iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61231.png",
          iconSize: [25, 25],
        }),
      })
        .addTo(map)
        .bindPopup(popupContent);
    }
  });
}

// Update every 3 seconds
loadRoute();
setInterval(() => loadRoute(), 3000);
