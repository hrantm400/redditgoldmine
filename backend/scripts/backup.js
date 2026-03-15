const fs = require("fs").promises;
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const BACKUP_DIR = path.join(DATA_DIR, "backup");
const COURSES_FILE = path.join(DATA_DIR, "courses.json");
const USER_ACCESS_FILE = path.join(DATA_DIR, "userAccess.json");

// Interval in days
const BACKUP_INTERVAL_DAYS = 3;

async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
  } catch (error) {
    console.error("Error creating backup directory:", error);
  }
}

async function getLastBackupDate() {
  try {
    const files = await fs.readdir(BACKUP_DIR);
    const backupFiles = files
      .filter((f) => f.startsWith("courses_") && f.endsWith(".json"))
      .map((f) => {
        // Extract date from filename: courses_2025-11-17_13-34-11.json
        const match = f.match(/courses_(\d{4}-\d{2}-\d{2})_/);
        return match ? new Date(match[1]) : null;
      })
      .filter((d) => d !== null)
      .sort((a, b) => b - a); // Sort descending (newest first)

    return backupFiles.length > 0 ? backupFiles[0] : null;
  } catch (error) {
    console.error("Error reading backup directory:", error);
    return null;
  }
}

function daysSinceLastBackup(lastBackupDate) {
  if (!lastBackupDate) return Infinity; // No backup exists
  const now = new Date();
  const diffTime = Math.abs(now - lastBackupDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

async function createBackup() {
  try {
    await ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const coursesBackup = path.join(BACKUP_DIR, `courses_${timestamp}.json`);
    const accessBackup = path.join(BACKUP_DIR, `userAccess_${timestamp}.json`);

    // Copy courses.json
    try {
      await fs.copyFile(COURSES_FILE, coursesBackup);
      console.log(`✅ Backup created: ${path.basename(coursesBackup)}`);
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log("⚠️ courses.json not found, skipping...");
      } else {
        throw error;
      }
    }

    // Copy userAccess.json
    try {
      await fs.copyFile(USER_ACCESS_FILE, accessBackup);
      console.log(`✅ Backup created: ${path.basename(accessBackup)}`);
    } catch (error) {
      if (error.code === "ENOENT") {
        console.log("⚠️ userAccess.json not found, skipping...");
      } else {
        throw error;
      }
    }

    // Clean old backups (keep only last 10)
    try {
      const files = await fs.readdir(BACKUP_DIR);
      const backupFiles = files
        .filter((f) => f.startsWith("courses_") && f.endsWith(".json"))
        .map((f) => ({
          name: f,
          path: path.join(BACKUP_DIR, f),
          time: fs.stat(path.join(BACKUP_DIR, f)).then((s) => s.mtime),
        }));

      const fileStats = await Promise.all(
        backupFiles.map(async (f) => ({
          name: f.name,
          path: f.path,
          time: await f.time,
        }))
      );

      fileStats.sort((a, b) => b.time - a.time); // Sort by time, newest first

      // Delete old backups, keep only last 10
      if (fileStats.length > 10) {
        const toDelete = fileStats.slice(10);
        for (const file of toDelete) {
          await fs.unlink(file.path);
          // Also delete corresponding userAccess file
          const accessFile = file.path.replace("courses_", "userAccess_");
          try {
            await fs.unlink(accessFile);
          } catch (e) {
            // Ignore if file doesn't exist
          }
          console.log(`🗑️ Deleted old backup: ${file.name}`);
        }
      }
    } catch (error) {
      console.error("Error cleaning old backups:", error);
    }

    return true;
  } catch (error) {
    console.error("Error creating backup:", error);
    return false;
  }
}

async function checkAndBackup() {
  const lastBackup = await getLastBackupDate();
  const daysSince = daysSinceLastBackup(lastBackup);

  console.log(`Last backup: ${lastBackup ? lastBackup.toLocaleDateString() : "Never"}`);
  console.log(`Days since last backup: ${daysSince}`);

  if (daysSince >= BACKUP_INTERVAL_DAYS) {
    console.log(`\n📦 Creating backup (interval: ${BACKUP_INTERVAL_DAYS} days)...`);
    await createBackup();
  } else {
    console.log(`⏭️ Skipping backup (next backup in ${BACKUP_INTERVAL_DAYS - daysSince} days)`);
  }
}

// Run if called directly
if (require.main === module) {
  checkAndBackup()
    .then(() => {
      console.log("\n✅ Backup check completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Backup check failed:", error);
      process.exit(1);
    });
}

module.exports = { createBackup, checkAndBackup };







