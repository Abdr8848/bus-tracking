const map = L.map("map").setView([17.385, 78.4867], 14);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap",
}).addTo(map);

let marker = L.marker([17.385, 78.4867]).addTo(map);

async function updateBus() {
  const buses = await fetch("http://localhost:3000/buses").then((r) =>
    r.json()
  );
  const bus = buses[0];

  marker.setLatLng([bus.lat, bus.lon]);
  map.panTo([bus.lat, bus.lon]);

  const eta = await fetch("http://localhost:3000/eta/BUS_1").then((r) =>
    r.json()
  );
  document.getElementById(
    "eta"
  ).innerText = `${eta.stop} in ${eta.eta} minutes`;
}

setInterval(updateBus, 3000);
