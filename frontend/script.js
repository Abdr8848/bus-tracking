// --------------------
// 1. Create the map
// --------------------
const map = L.map("map").setView([16.7735, 78.1302], 15);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

// --------------------
// 2. Define route path (IMPORTANT)
// These points MUST follow roads
// --------------------
const routePath = [
  [16.773504, 78.130198], // Jadcherla Bus Stand
  [16.7722, 78.1331], // Nehru Chowrasta
  [16.7741, 78.1289], // Old Bus Stand
  [16.7763, 78.1368], // Kalwakurthy Road Bus Stop
];

// Draw route line (debug & validation)
L.polyline(routePath, {
  color: "blue",
  weight: 5,
}).addTo(map);

// --------------------
// 3. Add stop markers
// --------------------
routePath.forEach((point, index) => {
  L.marker(point)
    .addTo(map)
    .bindPopup(`Stop ${index + 1}`);
});

// --------------------
// 4. Bus icon
// --------------------
const busIcon = L.icon({
  iconUrl: "https://cdn-icons-png.flaticon.com/512/61/61231.png",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

// --------------------
// 5. Create bus marker
// --------------------
const busMarker = L.marker(routePath[0], {
  icon: busIcon,
}).addTo(map);

// --------------------
// 6. Bus movement state
// --------------------
let bus = {
  index: 0, // position along path
  speed: 0.02, // lower = slower
};

// --------------------
// 7. Move bus smoothly along route
// --------------------
function moveBus() {
  bus.index += bus.speed;

  if (bus.index >= routePath.length - 1) {
    bus.index = routePath.length - 1;
    return;
  }

  const i = Math.floor(bus.index);
  const t = bus.index - i;

  const [lat1, lng1] = routePath[i];
  const [lat2, lng2] = routePath[i + 1];

  const lat = lat1 + (lat2 - lat1) * t;
  const lng = lng1 + (lng2 - lng1) * t;

  busMarker.setLatLng([lat, lng]);
}

// --------------------
// 8. Animate
// --------------------
setInterval(moveBus, 100);
