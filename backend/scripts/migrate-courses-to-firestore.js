/* 
 * One-time migration script: copy existing courses and user access
 * from local JSON files (storage.js) into Firestore.
 *
 * This DOES NOT change how the live server works. 
 * It simply writes the same data into Firestore collections:
 *  - courses
 *  - user_courses
 *
 * How to run (from backend directory):
 *    node scripts/migrate-courses-to-firestore.js
 */

const path = require("path");
const admin = require("firebase-admin");

// Re‑use existing storage helpers
const {
  loadCourses,
  loadUserAccess,
} = require("../storage");

// Re‑use the same service account as server.js
const serviceAccount = require("../firebaseServiceAccount.json");

async function initFirebase() {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase Admin initialized for migration");
  } catch (error) {
    console.error("❌ Failed to initialize Firebase Admin:", error);
    process.exit(1);
  }
}

async function migrate() {
  await initFirebase();
  const db = admin.firestore();

  // 1) Migrate courses
  const courses = await loadCourses();
  console.log(`📚 Found ${courses.length} courses in local storage`);

  for (const course of courses) {
    const docId = course.id;
    if (!docId) {
      console.warn("⚠️ Skipping course without id:", course);
      continue;
    }

    const docRef = db.collection("courses").doc(docId);
    await docRef.set(
      {
        id: course.id,
        title: course.title,
        subtitle: course.subtitle || "",
        price: Number(course.price) || 0,
        compareAt: course.compareAt != null ? Number(course.compareAt) : null,
        lessons: course.lessons || [],
        difficulty: course.difficulty || null,
        tags: course.tags || [],
        progress: course.progress || null,
        heroStat: course.heroStat || null,
        // Include full course content so API can read from Firestore only
        modules: course.modules || [],
        resources: course.resources || [],
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`✅ Migrated course "${course.id}" to Firestore`);
  }

  // 2) Migrate user course access
  const userAccessMap = await loadUserAccess();
  const entries = Array.from(userAccessMap.entries());
  console.log(`👥 Found access data for ${entries.length} users`);

  let accessDocsCreated = 0;

  for (const [email, courseIdSet] of entries) {
    const emailLower = (email || "").toLowerCase();
    if (!emailLower) {
      console.warn("⚠️ Skipping access entry with empty email");
      continue;
    }

    for (const courseId of courseIdSet) {
      if (!courseId) continue;

      const compositeId = `${emailLower}__${courseId}`;
      const docRef = db.collection("user_courses").doc(compositeId);

      await docRef.set(
        {
          userEmail: email,
          userEmailLower: emailLower,
          courseId,
          grantedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      accessDocsCreated += 1;
      console.log(`✅ Migrated access: ${emailLower} -> ${courseId}`);
    }
  }

  console.log("🎉 Migration finished.");
  console.log(`   Courses migrated: ${courses.length}`);
  console.log(`   User access records created/updated: ${accessDocsCreated}`);

  process.exit(0);
}

migrate().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});


