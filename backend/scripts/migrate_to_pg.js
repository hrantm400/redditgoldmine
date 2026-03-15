const { Pool } = require("pg");
const fs = require("fs").promises;
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const pool = new Pool({
  connectionString: process.env.PG_URI,
});

const DATA_DIR = path.join(__dirname, "../data");

async function migrate() {
  const client = await pool.connect();
  try {
    console.log("Starting PostgreSQL migration...");

    // 1. Create Tables
    console.log("Creating tables...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
          uid VARCHAR(255) PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          display_name VARCHAR(255),
          photo_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS courses (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL
      );

      CREATE TABLE IF NOT EXISTS user_access (
          email VARCHAR(255) NOT NULL,
          course_id VARCHAR(255) NOT NULL,
          granted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (email, course_id),
          FOREIGN KEY (email) REFERENCES users(email) ON DELETE CASCADE,
          FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
      );
    `);
    console.log("Tables created successfully.");

    // 2. Migrate courses.json
    try {
      console.log("Migrating courses...");
      const coursesData = await fs.readFile(path.join(DATA_DIR, "courses.json"), "utf8");
      const courses = JSON.parse(coursesData);
      
      for (const course of courses) {
        await client.query(
          "INSERT INTO courses (id, data) VALUES ($1, $2) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data",
          [course.id, JSON.stringify(course)]
        );
      }
      console.log(`Migrated ${courses.length} courses.`);
    } catch (e) {
      if (e.code !== "ENOENT") console.error("Error migrating courses:", e);
      else console.log("courses.json not found, skipping.");
    }

    // 3. Migrate users.json
    let migratedUsersCount = 0;
    try {
      console.log("Migrating users...");
      const usersData = await fs.readFile(path.join(DATA_DIR, "users.json"), "utf8");
      const users = JSON.parse(usersData);
      
      for (const user of users) {
        // Simple mapping, ensuring uid is present (using email as fallback uid if missing, though it shouldn't be based on existing Firebase setup)
        const uid = user.uid || `legacy_uid_${user.email}`;
        
        await client.query(
          `INSERT INTO users (uid, email, display_name, photo_url, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6) 
           ON CONFLICT (email) DO UPDATE 
           SET uid = EXCLUDED.uid, display_name = EXCLUDED.display_name, photo_url = EXCLUDED.photo_url, updated_at = EXCLUDED.updated_at`,
          [
            uid,
            user.email,
            user.displayName || null,
            user.photoURL || null,
            user.createdAt ? new Date(user.createdAt) : new Date(),
            user.updatedAt ? new Date(user.updatedAt) : new Date()
          ]
        );
        migratedUsersCount++;
      }
      console.log(`Migrated ${migratedUsersCount} users.`);
    } catch (e) {
      if (e.code !== "ENOENT") console.error("Error migrating users:", e);
      else console.log("users.json not found, skipping.");
    }

    // 4. Migrate userAccess.json
    try {
      console.log("Migrating user access...");
      // userAccess.json is structured as { "email": ["course1", "course2"] }
      const accessData = await fs.readFile(path.join(DATA_DIR, "userAccess.json"), "utf8");
      const userAccess = JSON.parse(accessData);
      
      let accessCount = 0;
      for (const [email, courseIds] of Object.entries(userAccess)) {
        // Make sure user exists in DB first before granting access to satisfy foreign key (in case userAccess has emails not in users.json)
        // Check if user exists:
        const userRes = await client.query("SELECT email FROM users WHERE email = $1", [email]);
        if (userRes.rows.length === 0) {
            console.log(`Warning: Email ${email} found in userAccess but not in users.json. Creating dummy user to satisfy FK.`);
            await client.query("INSERT INTO users (uid, email) VALUES ($1, $2)", [`auto_${email}`, email]);
        }

        for (const courseId of courseIds) {
          try {
            await client.query(
              "INSERT INTO user_access (email, course_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
              [email, courseId]
            );
            accessCount++;
          } catch(err) {
            console.error(`Failed to grant ${courseId} to ${email}: ${err.message}`);
          }
        }
      }
      console.log(`Migrated ${accessCount} user access records.`);
    } catch (e) {
      if (e.code !== "ENOENT") console.error("Error migrating user access:", e);
      else console.log("userAccess.json not found, skipping.");
    }

    console.log("Migration completed successfully.");

  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
