const mysql = require("mysql2/promise");
require("dotenv").config();

// Database configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "bus_tracker",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Create connection pool
let pool;

async function initializeDatabase() {
  try {
    pool = mysql.createPool(dbConfig);
    console.log("✓ Database connection pool created");

    // Test connection
    const connection = await pool.getConnection();
    console.log("✓ Database connected successfully");
    connection.release();

    // Create tables if they don't exist
    await createTables();

    return pool;
  } catch (error) {
    console.error("✗ Database connection failed:", error.message);
    console.log("⚠️  Running in memory mode (no database persistence)");
    return null;
  }
}

async function createTables() {
  try {
    const connection = await pool.getConnection();

    // Routes table
    await connection.query(`
            CREATE TABLE IF NOT EXISTS routes (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                subtitle VARCHAR(255),
                path VARCHAR(255),
                status VARCHAR(50) DEFAULT 'Running',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);

    // Stops table
    await connection.query(`
            CREATE TABLE IF NOT EXISTS stops (
                id VARCHAR(50) PRIMARY KEY,
                route_id VARCHAR(50),
                name VARCHAR(255) NOT NULL,
                latitude DECIMAL(10, 8) NOT NULL,
                longitude DECIMAL(11, 8) NOT NULL,
                stop_order INT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
            )
        `);

    // Buses table
    await connection.query(`
            CREATE TABLE IF NOT EXISTS buses (
                bus_id VARCHAR(50) PRIMARY KEY,
                route_id VARCHAR(50),
                latitude DECIMAL(10, 8),
                longitude DECIMAL(11, 8),
                speed DECIMAL(5, 2),
                heading DECIMAL(5, 2),
                capacity INT DEFAULT 50,
                current_occupancy INT DEFAULT 0,
                timestamp BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE SET NULL
            )
        `);

    // Reports table
    await connection.query(`
            CREATE TABLE IF NOT EXISTS reports (
                id VARCHAR(50) PRIMARY KEY,
                route_id VARCHAR(50),
                bus_id VARCHAR(50),
                type VARCHAR(50) NOT NULL,
                description TEXT,
                timestamp BIGINT,
                status VARCHAR(50) DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
                FOREIGN KEY (bus_id) REFERENCES buses(bus_id) ON DELETE CASCADE
            )
        `);

    // GPS History table
    await connection.query(`
            CREATE TABLE IF NOT EXISTS gps_history (
                id INT AUTO_INCREMENT PRIMARY KEY,
                bus_id VARCHAR(50),
                latitude DECIMAL(10, 8) NOT NULL,
                longitude DECIMAL(11, 8) NOT NULL,
                speed DECIMAL(5, 2),
                heading DECIMAL(5, 2),
                timestamp BIGINT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (bus_id) REFERENCES buses(bus_id) ON DELETE CASCADE
            )
        `);

    connection.release();
    console.log("✓ Database tables created/verified");
  } catch (error) {
    console.error("Error creating tables:", error.message);
    throw error;
  }
}

// ============================================
// ROUTES OPERATIONS
// ============================================

async function getAllRoutes() {
  if (!pool) return [];
  try {
    const [rows] = await pool.query("SELECT * FROM routes");
    return rows;
  } catch (error) {
    console.error("Error getting routes:", error);
    return [];
  }
}

async function getRoute(routeId) {
  if (!pool) return null;
  try {
    const [rows] = await pool.query("SELECT * FROM routes WHERE id = ?", [
      routeId,
    ]);
    if (rows.length === 0) return null;

    const route = rows[0];

    // Get stops for this route
    const [stops] = await pool.query(
      "SELECT * FROM stops WHERE route_id = ? ORDER BY stop_order",
      [routeId],
    );

    route.stops = stops;
    return route;
  } catch (error) {
    console.error("Error getting route:", error);
    return null;
  }
}

async function createRoute(routeData) {
  if (!pool) return null;
  try {
    const { id, name, subtitle, path, status } = routeData;
    await pool.query(
      "INSERT INTO routes (id, name, subtitle, path, status) VALUES (?, ?, ?, ?, ?)",
      [id, name, subtitle, path, status || "Running"],
    );
    return { id, name, subtitle, path, status };
  } catch (error) {
    console.error("Error creating route:", error);
    return null;
  }
}

async function updateRouteStatus(routeId, status) {
  if (!pool) return false;
  try {
    await pool.query("UPDATE routes SET status = ? WHERE id = ?", [
      status,
      routeId,
    ]);
    return true;
  } catch (error) {
    console.error("Error updating route status:", error);
    return false;
  }
}

// ============================================
// STOPS OPERATIONS
// ============================================

async function createStop(stopData) {
  if (!pool) return null;
  try {
    const { id, route_id, name, latitude, longitude, stop_order } = stopData;
    await pool.query(
      "INSERT INTO stops (id, route_id, name, latitude, longitude, stop_order) VALUES (?, ?, ?, ?, ?, ?)",
      [id, route_id, name, latitude, longitude, stop_order],
    );
    return stopData;
  } catch (error) {
    console.error("Error creating stop:", error);
    return null;
  }
}

async function getStopsForRoute(routeId) {
  if (!pool) return [];
  try {
    const [rows] = await pool.query(
      "SELECT * FROM stops WHERE route_id = ? ORDER BY stop_order",
      [routeId],
    );
    return rows;
  } catch (error) {
    console.error("Error getting stops:", error);
    return [];
  }
}

// ============================================
// BUSES OPERATIONS
// ============================================

async function getAllBuses() {
  if (!pool) return [];
  try {
    const [rows] = await pool.query("SELECT * FROM buses");
    return rows;
  } catch (error) {
    console.error("Error getting buses:", error);
    return [];
  }
}

async function getBus(busId) {
  if (!pool) return null;
  try {
    const [rows] = await pool.query("SELECT * FROM buses WHERE bus_id = ?", [
      busId,
    ]);
    return rows.length > 0 ? rows[0] : null;
  } catch (error) {
    console.error("Error getting bus:", error);
    return null;
  }
}

async function getBusesByRoute(routeId) {
  if (!pool) return [];
  try {
    const [rows] = await pool.query("SELECT * FROM buses WHERE route_id = ?", [
      routeId,
    ]);
    return rows;
  } catch (error) {
    console.error("Error getting buses by route:", error);
    return [];
  }
}

async function updateBusPosition(busId, positionData) {
  if (!pool) return false;
  try {
    const { latitude, longitude, speed, heading, timestamp } = positionData;

    // Check if bus exists
    const bus = await getBus(busId);

    if (bus) {
      // Update existing bus
      await pool.query(
        `UPDATE buses 
                 SET latitude = ?, longitude = ?, speed = ?, heading = ?, timestamp = ?
                 WHERE bus_id = ?`,
        [latitude, longitude, speed, heading, timestamp, busId],
      );
    } else {
      // Insert new bus
      await pool.query(
        `INSERT INTO buses (bus_id, route_id, latitude, longitude, speed, heading, timestamp)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          busId,
          positionData.routeId || "101",
          latitude,
          longitude,
          speed,
          heading,
          timestamp,
        ],
      );
    }

    // Save to history
    await pool.query(
      `INSERT INTO gps_history (bus_id, latitude, longitude, speed, heading, timestamp)
             VALUES (?, ?, ?, ?, ?, ?)`,
      [busId, latitude, longitude, speed, heading, timestamp],
    );

    return true;
  } catch (error) {
    console.error("Error updating bus position:", error);
    return false;
  }
}

async function updateBusOccupancy(busId, occupancy) {
  if (!pool) return false;
  try {
    await pool.query(
      "UPDATE buses SET current_occupancy = ? WHERE bus_id = ?",
      [occupancy, busId],
    );
    return true;
  } catch (error) {
    console.error("Error updating bus occupancy:", error);
    return false;
  }
}

// ============================================
// REPORTS OPERATIONS
// ============================================

async function createReport(reportData) {
  if (!pool) return null;
  try {
    const { id, route_id, bus_id, type, description, timestamp } = reportData;
    await pool.query(
      `INSERT INTO reports (id, route_id, bus_id, type, description, timestamp)
             VALUES (?, ?, ?, ?, ?, ?)`,
      [id, route_id, bus_id, type, description, timestamp],
    );
    return reportData;
  } catch (error) {
    console.error("Error creating report:", error);
    return null;
  }
}

async function getReports(filters = {}) {
  if (!pool) return [];
  try {
    let query = "SELECT * FROM reports WHERE 1=1";
    const params = [];

    if (filters.routeId) {
      query += " AND route_id = ?";
      params.push(filters.routeId);
    }

    if (filters.type) {
      query += " AND type = ?";
      params.push(filters.type);
    }

    if (filters.status) {
      query += " AND status = ?";
      params.push(filters.status);
    }

    query += " ORDER BY timestamp DESC LIMIT 100";

    const [rows] = await pool.query(query, params);
    return rows;
  } catch (error) {
    console.error("Error getting reports:", error);
    return [];
  }
}

// ============================================
// GPS HISTORY OPERATIONS
// ============================================

async function getGPSHistory(busId, limit = 100) {
  if (!pool) return [];
  try {
    const [rows] = await pool.query(
      `SELECT * FROM gps_history 
             WHERE bus_id = ? 
             ORDER BY timestamp DESC 
             LIMIT ?`,
      [busId, limit],
    );
    return rows;
  } catch (error) {
    console.error("Error getting GPS history:", error);
    return [];
  }
}

async function cleanOldGPSHistory(daysToKeep = 7) {
  if (!pool) return false;
  try {
    const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;
    await pool.query("DELETE FROM gps_history WHERE timestamp < ?", [
      cutoffTime,
    ]);
    return true;
  } catch (error) {
    console.error("Error cleaning GPS history:", error);
    return false;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

async function closeConnection() {
  if (pool) {
    await pool.end();
    console.log("Database connection closed");
  }
}

// Initialize database on module load
initializeDatabase();

// Export functions
module.exports = {
  pool,
  initializeDatabase,

  // Routes
  getAllRoutes,
  getRoute,
  createRoute,
  updateRouteStatus,

  // Stops
  createStop,
  getStopsForRoute,

  // Buses
  getAllBuses,
  getBus,
  getBusesByRoute,
  updateBusPosition,
  updateBusOccupancy,

  // Reports
  createReport,
  getReports,

  // GPS History
  getGPSHistory,
  cleanOldGPSHistory,

  // Utility
  closeConnection,
};
