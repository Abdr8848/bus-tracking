/**
 * GPS Simulator for Bus Tracking
 * Simulates realistic GPS movement along predefined routes
 */

class GPSSimulator {
  constructor(busId, routeId, stops, onPositionUpdate) {
    this.busId = busId;
    this.routeId = routeId;
    this.stops = stops;
    this.onPositionUpdate = onPositionUpdate;

    this.currentStopIndex = 0;
    this.progress = 0; // 0 to 1, progress between current and next stop
    this.speed = 30 + Math.random() * 20; // km/h (30-50)
    this.isRunning = false;
    this.updateInterval = null;

    // Configuration
    this.updateFrequency = 3000; // Update every 3 seconds
    this.speedVariation = 0.1; // ±10% speed variation
    this.stopDuration = 30000; // 30 seconds at each stop
    this.isAtStop = false;
  }

  start() {
    if (this.isRunning) return;

    this.isRunning = true;
    console.log(
      `GPS Simulator started for ${this.busId} on Route ${this.routeId}`,
    );

    this.updateInterval = setInterval(() => {
      this.update();
    }, this.updateFrequency);

    // Send initial position
    this.update();
  }

  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log(`GPS Simulator stopped for ${this.busId}`);
  }

  update() {
    if (this.stops.length < 2) return;

    const currentStop = this.stops[this.currentStopIndex];
    const nextStopIndex = (this.currentStopIndex + 1) % this.stops.length;
    const nextStop = this.stops[nextStopIndex];

    // If at stop, wait
    if (this.isAtStop) {
      setTimeout(() => {
        this.isAtStop = false;
        this.currentStopIndex = nextStopIndex;
        this.progress = 0;
      }, this.stopDuration);
      return;
    }

    // Calculate distance between stops (in km)
    const distance = this.calculateDistance(
      currentStop.lat,
      currentStop.lng,
      nextStop.lat,
      nextStop.lng,
    );

    // Calculate progress increment based on speed
    // speed is in km/h, updateFrequency is in ms
    const timeInHours = this.updateFrequency / (1000 * 60 * 60);
    const distanceTraveled = this.speed * timeInHours;
    const progressIncrement = distance > 0 ? distanceTraveled / distance : 1;

    // Update progress
    this.progress += progressIncrement;

    // Vary speed slightly for realism
    this.speed *= 1 + (Math.random() - 0.5) * this.speedVariation;
    this.speed = Math.max(20, Math.min(60, this.speed)); // Clamp between 20-60 km/h

    // Check if reached next stop
    if (this.progress >= 1) {
      this.progress = 0;
      this.isAtStop = true;

      // Position at stop
      const position = {
        busId: this.busId,
        routeId: this.routeId,
        latitude: nextStop.lat,
        longitude: nextStop.lng,
        speed: 0,
        heading: this.calculateHeading(currentStop, nextStop),
        timestamp: Date.now(),
      };

      this.onPositionUpdate(position);
      return;
    }

    // Interpolate position between stops
    const position = this.interpolatePosition(
      currentStop,
      nextStop,
      this.progress,
    );

    position.busId = this.busId;
    position.routeId = this.routeId;
    position.speed = this.speed;
    position.timestamp = Date.now();

    // Add some GPS noise for realism
    position.latitude += (Math.random() - 0.5) * 0.0001;
    position.longitude += (Math.random() - 0.5) * 0.0001;

    this.onPositionUpdate(position);
  }

  interpolatePosition(stop1, stop2, progress) {
    // Linear interpolation with slight curve for realism
    const easedProgress = this.easeInOutQuad(progress);

    const latitude = stop1.lat + (stop2.lat - stop1.lat) * easedProgress;
    const longitude = stop1.lng + (stop2.lng - stop1.lng) * easedProgress;
    const heading = this.calculateHeading(stop1, stop2);

    return { latitude, longitude, heading };
  }

  calculateHeading(from, to) {
    const dLng = to.lng - from.lng;
    const dLat = to.lat - from.lat;
    const heading = Math.atan2(dLng, dLat) * (180 / Math.PI);
    return (heading + 360) % 360; // Normalize to 0-360
  }

  calculateDistance(lat1, lng1, lat2, lng2) {
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

  // Easing function for smoother movement
  easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
}

// Store active simulators
const activeSimulators = new Map();

/**
 * Start GPS simulation for a bus
 */
function startGPSSimulator(busId, routeId, stops, onPositionUpdate) {
  // Stop existing simulator if any
  if (activeSimulators.has(busId)) {
    activeSimulators.get(busId).stop();
  }

  // Create and start new simulator
  const simulator = new GPSSimulator(busId, routeId, stops, onPositionUpdate);
  simulator.start();

  activeSimulators.set(busId, simulator);

  return simulator;
}

/**
 * Stop GPS simulation for a bus
 */
function stopGPSSimulator(busId) {
  if (activeSimulators.has(busId)) {
    activeSimulators.get(busId).stop();
    activeSimulators.delete(busId);
    return true;
  }
  return false;
}

/**
 * Stop all GPS simulators
 */
function stopAllSimulators() {
  activeSimulators.forEach((simulator) => simulator.stop());
  activeSimulators.clear();
}

/**
 * Get active simulators count
 */
function getActiveSimulatorsCount() {
  return activeSimulators.size;
}

/**
 * Generate realistic traffic patterns
 * Simulates rush hour slowdowns, accidents, etc.
 */
class TrafficSimulator {
  constructor() {
    this.conditions = {
      rushHourMorning: { start: 7, end: 10, speedMultiplier: 0.6 },
      rushHourEvening: { start: 17, end: 20, speedMultiplier: 0.6 },
      normal: { speedMultiplier: 1.0 },
      late: { start: 22, end: 6, speedMultiplier: 1.2 },
    };
  }

  getCurrentCondition() {
    const hour = new Date().getHours();

    if (
      hour >= this.conditions.rushHourMorning.start &&
      hour < this.conditions.rushHourMorning.end
    ) {
      return "rushHourMorning";
    }

    if (
      hour >= this.conditions.rushHourEvening.start &&
      hour < this.conditions.rushHourEvening.end
    ) {
      return "rushHourEvening";
    }

    if (hour >= this.conditions.late.start || hour < this.conditions.late.end) {
      return "late";
    }

    return "normal";
  }

  getSpeedMultiplier() {
    const condition = this.getCurrentCondition();
    return this.conditions[condition].speedMultiplier;
  }
}

const trafficSimulator = new TrafficSimulator();

module.exports = {
  GPSSimulator,
  startGPSSimulator,
  stopGPSSimulator,
  stopAllSimulators,
  getActiveSimulatorsCount,
  trafficSimulator,
};
