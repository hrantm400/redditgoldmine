const { Pool } = require("pg");
const fs = require("fs").promises;
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const REDDIT_CACHE_FILE = path.join(DATA_DIR, "redditCache.json");

const pool = new Pool({
  connectionString: process.env.PG_URI,
});

// Ensure data directory exists for cache
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating data directory:", error);
  }
}

// Load courses from DB
async function loadCourses() {
  try {
    const res = await pool.query("SELECT data FROM courses");
    return res.rows.map((row) => row.data);
  } catch (error) {
    console.error("Error loading courses from DB:", error);
    return [];
  }
}

// Save courses to DB
async function saveCourses(courses) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const course of courses) {
      await client.query(
        "INSERT INTO courses (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
        [course.id, JSON.stringify(course)]
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error saving courses to DB:", error);
  } finally {
    client.release();
  }
}

// Load user access from DB
async function loadUserAccess() {
  try {
    const res = await pool.query("SELECT email, course_id FROM user_access");
    const map = new Map();
    for (const row of res.rows) {
      if (!map.has(row.email)) {
        map.set(row.email, new Set());
      }
      map.get(row.email).add(row.course_id);
    }
    return map;
  } catch (error) {
    console.error("Error loading user access from DB:", error);
    return new Map();
  }
}

// Save user access to DB
async function saveUserAccess(userAccessMap) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // This function typically expects to overwrite or sync. 
    // Given the Map structure, we might just insert new ones if we use ON CONFLICT DO NOTHING
    // For a full sync, one would typically delete all and re-insert, but let's just make sure they exist
    for (const [email, courseIds] of userAccessMap.entries()) {
      for (const courseId of courseIds) {
        await client.query(
          "INSERT INTO user_access (email, course_id) VALUES ($1, $2) ON CONFLICT (email, course_id) DO NOTHING",
          [email, courseId]
        );
      }
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error saving user access to DB:", error);
  } finally {
    client.release();
  }
}

// Load users from DB
async function loadUsers() {
  try {
    const res = await pool.query("SELECT uid, email, display_name as \"displayName\", photo_url as \"photoURL\", created_at as \"createdAt\", updated_at as \"updatedAt\" FROM users");
    return res.rows;
  } catch (error) {
    console.error("Error loading users from DB:", error);
    return [];
  }
}

// Save users to DB (bulk)
async function saveUsers(users) {
  for (const user of users) {
    await addUser(user);
  }
}

// Add or update user in DB
async function addUser(userData) {
  try {
    const uid = userData.uid || `legacy_${userData.email}`;
    const res = await pool.query(
      `INSERT INTO users (uid, email, display_name, photo_url, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (email) DO UPDATE 
       SET uid = EXCLUDED.uid, display_name = EXCLUDED.display_name, photo_url = EXCLUDED.photo_url, updated_at = EXCLUDED.updated_at
       RETURNING uid, email, display_name as "displayName", photo_url as "photoURL", created_at as "createdAt", updated_at as "updatedAt"`,
      [
        uid,
        userData.email,
        userData.displayName || null,
        userData.photoURL || null,
        userData.createdAt ? new Date(userData.createdAt) : new Date(),
        userData.updatedAt ? new Date(userData.updatedAt) : new Date()
      ]
    );
    return res.rows[0];
  } catch (error) {
    console.error("Error adding user to DB:", error);
    throw error;
  }
}

// Load Reddit cache from file
async function loadRedditCache() {
  try {
    await ensureDataDir();
    const data = await fs.readFile(REDDIT_CACHE_FILE, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    console.error("Error loading Reddit cache:", error);
    return {};
  }
}

// Save Reddit cache to file
async function saveRedditCache(cache) {
  try {
    await ensureDataDir();
    await fs.writeFile(REDDIT_CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch (error) {
    console.error("Error saving Reddit cache:", error);
  }
}

// Get cached Reddit data
async function getCachedRedditData(username) {
  const cache = await loadRedditCache();
  const cached = cache[username.toLowerCase()];
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  return null;
}

// Save Reddit data to cache
async function saveCachedRedditData(username, data, ttlHours = 24) {
  const cache = await loadRedditCache();
  cache[username.toLowerCase()] = {
    data,
    expiresAt: Date.now() + ttlHours * 60 * 60 * 1000,
    cachedAt: new Date().toISOString(),
  };
  await saveRedditCache(cache);
}

module.exports = {
  loadCourses,
  saveCourses,
  loadUserAccess,
  saveUserAccess,
  loadUsers,
  saveUsers,
  addUser,
  getCachedRedditData,
  saveCachedRedditData,
  pool,
};


