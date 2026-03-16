const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { randomUUID } = require("crypto");
const axios = require("axios");
const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const admin = require("firebase-admin");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const morgan = require("morgan");
const { body, param, validationResult } = require("express-validator");
const serviceAccount = require("./firebaseServiceAccount.json");

// Initialize Firebase Admin for Firestore (Forum)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const forum = require("./lib/firestore");
const nodemailer = require("nodemailer");

dotenv.config();

// Require storage after dotenv so process.env.PG_URI is available
const { loadCourses, saveCourses, loadUserAccess, saveUserAccess, loadUsers, addUser, getCachedRedditData, saveCachedRedditData } = require("./storage");

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ["APP_PASSWORD", "ADMIN_PASSWORD", "ADMIN_EMAILS"];
const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`ERROR: Missing required environment variables: ${missingVars.join(", ")}`);
  console.error("Please create a .env file with all required variables. See .env.example for reference.");
  process.exit(1);
}



const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_development_only";

const app = express();
const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || "development";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim());

// Trust proxy (for Apache reverse proxy) - trust only first proxy (Apache)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://fast.wistia.com"],
      frameSrc: ["'self'", "https://fast.wistia.com"],
      imgSrc: ["'self'", "data:", "https:"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

// CORS configuration - allow requests without Origin as well (for health checks, server-to-server, etc.)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without Origin header (browser direct URL, health checks, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      // Normalize origin (remove trailing slash)
      const normalizedOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.includes(origin) || allowedOrigins.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin not allowed: ${origin}`), false);
    },
  })
);

// Request logging
app.use(morgan("combined"));

// Body parser
app.use(express.json({ limit: "10mb" })); // Limit request body size

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  validate: { trustProxy: false }, // Disable the warning/error about trust proxy since we handle it in app.set
});

// Apply the rate limiting middleware to all requests
app.use(limiter);

// Helper function to check if email is admin
async function isAdminEmail(email) {
  if (!email) return false;
  return await forum.isAdmin(email);
}

// Helper function to send error responses (without exposing internal details)
function sendError(res, status, message, logError = null) {
  if (logError) {
    console.error(`[${status}] ${message}:`, logError);
  }
  res.status(status).json({ message });
}

// Validation result handler
function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, 400, "Validation failed: " + errors.array().map(e => e.msg).join(", "));
  }
  next();
}

// Middleware to verify JWT token
const verifyFirebaseToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, 401, "Token not provided");
  }
  const token = authHeader.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    // req.user has { uid, email, name, picture }
    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return sendError(res, 401, "Invalid or expired token");
  }
};

// Google Auth Login/Registration endpoint
app.post("/api/auth/google", async (req, res) => {
  const { idToken } = req.body || {};
  if (!idToken) {
    return sendError(res, 400, "Google idToken required");
  }
  
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture, sub: googleId } = payload;
    
    // Save or update user in PostgreSQL
    const userData = {
      uid: googleId,
      email: email,
      displayName: name,
      photoURL: picture,
      updatedAt: new Date().toISOString(),
    };
    
    await addUser(userData);
    console.log(`User logged in via Google: ${email}`);

    // Generate our own JWT
    const token = jwt.sign(
      { uid: googleId, email, name, picture },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    return res.json({
      success: true,
      token,
      user: { uid: googleId, email, name, picture }
    });
    
  } catch (error) {
    console.error("Google token verification failed:", error.message);
    return sendError(res, 401, "Invalid or expired Google token");
  }
});

// Email/Password Registration (Custom Auth)
app.post("/api/auth/register-email", async (req, res) => {
  const { email, password, name } = req.body;
  
  if (!email || !password) {
    return sendError(res, 400, "Email and password are required");
  }
  
  try {
    // Generate a new UUID for the user
    const uid = randomUUID();
    
    // Hash the password securely
    const bcrypt = require("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    const userData = {
      uid,
      email,
      displayName: name || email.split("@")[0],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      password_hash: passwordHash,
    };
    
    await addUser(userData);
    console.log(`New user registered via Email: ${email}`);
    
    const token = jwt.sign(
      { uid, email, name: userData.displayName },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    
    res.json({ success: true, token, user: userData });
  } catch (error) {
    if (error.code === '23505') { // Unique violation in Postgres
      return sendError(res, 409, "Email already exists");
    }
    console.error("Registration error:", error);
    sendError(res, 500, "Failed to register user");
  }
});

const courses = [
  {
    id: "reddit-domination",
    title: "Reddit Domination Blueprint",
    subtitle: "Grow karma on autopilot and syndicate the hottest content.",
    price: 250,
    compareAt: 6235,
    lessons: 42,
    difficulty: "Intermediate",
    tags: ["RedHack v5", "Viral Hooks", "Automation"],
    progress: 0.74,
    heroStat: { label: "Karma", value: "3,000+", subtext: "in 72 hours" },
    modules: [
      {
        id: 1,
        title: "Master Multiple Account Creation & Management",
        description:
          "Proxies, multi-browser setups, and persona playbooks to build trustworthy accounts in parallel.",
      },
      {
        id: 2,
        title: "Get Massive Traffic from Reddit",
        description:
          "Craft scroll-stopping threads, stack comment ladders, and funnel clicks to your sites or channels.",
      },
      {
        id: 3,
        title: "Create Cross-Platform Content Machines",
        description:
          "Repurpose Reddit wins into TikTok, YouTube Shorts, and Instagram Reels with batching templates.",
      },
      {
        id: 4,
        title: "Paid Communities & Micro Offers",
        description:
          "Launch premium Discord pods, Patreon drops, or cohort-based programs fueled by Reddit demand.",
      },
    ],
    resources: [
      "Content calendar (.csv)",
      "AI persona prompt pack",
      "Subreddit vault (weekly updates)",
      "Ghostwriter automation recipes",
    ],
  },
  {
    id: "affiliate-sprint",
    title: "Reddit x Affiliate Sprint",
    subtitle: "Story-driven funnels built for ultra-fast affiliate validation.",
    price: 189,
    compareAt: 799,
    lessons: 18,
    difficulty: "Advanced",
    tags: ["Trust Hacks", "Safe-List Tactics"],
    progress: 0.36,
    heroStat: { label: "Templates", value: "18", subtext: "plug & play" },
    modules: [
      {
        id: 1,
        title: "Offer Selection Matrix",
        description:
          "Pick affiliate products that actually belong on Reddit and segment subreddits by buyer intent.",
      },
      {
        id: 2,
        title: "Narrative Landing Pages",
        description:
          "Build trust-first landers with screenshots, receipts, and UGC to boost conversions.",
      },
      {
        id: 3,
        title: "Ethical Cloaking",
        description:
          "Route users through value ladders while staying compliant with subreddit rules.",
      },
    ],
    resources: [
      "18 landing page sections",
      "Comment swipe file",
      "Affiliate disclosure templates",
    ],
  },
  {
    id: "ghostwriter-lab",
    title: "Ghostwriter Comment Agency",
    subtitle: "AI personas that sound human, never spammy.",
    price: 149,
    compareAt: 499,
    lessons: 24,
    difficulty: "Beginner friendly",
    tags: ["Automation", "AI", "Persona design"],
    progress: 0.12,
    heroStat: { label: "Workflows", value: "6", subtext: "automation ready" },
    modules: [
      {
        id: 1,
        title: "Persona Cloning",
        description:
          "Train GPT-style agents using your tone and favorite subreddits.",
      },
      {
        id: 2,
        title: "Queue-Based Scheduling",
        description:
          "Throttle outbound comments with queue limits to dodge shadow bans.",
      },
      {
        id: 3,
        title: "Service Packaging",
        description:
          "Sell managed karma, engagement boosts, or growth retainers like an agency.",
      },
    ],
    resources: ["Zapier blueprint", "Client onboarding notion", "QA checklist"],
  },
];

const faqItems = [
  {
    question: "Will I be able to replicate the entire style and animations?",
    answer:
      "Yes, the frontend is built with Tailwind + GSAP. All effects and custom cursor are transferred to React components.",
  },
  {
    question: "Do I need subscriptions or additional services?",
    answer:
      "No. Node.js and npm are enough. All data is currently mocked locally, you can connect a real database later.",
  },
  {
    question: "Can it be deployed to production?",
    answer:
      "Yes. The frontend builds into a static bundle, the backend is a regular Express. Add a database + auth and you can deploy.",
  },
  {
    question: "How are courses updated?",
    answer:
      "Content is stored in JSON structures. Later you can move it to a CMS or database and connect the API.",
  },
];

const userProfile = {
  name: "Hrant Davtyan",
  email: "student@redditgoldmine.com",
  avatar: "https://api.dicebear.com/7.x/thumbs/svg?seed=redditgoldmine",
  membership: "Founder Pass",
  joinDate: "2024-08-12",
  badges: ["Viral Architect", "Karma Sprinter", "Automation Lab"],
  streakDays: 17,
  timezone: "UTC+4",
  notifications: {
    product: true,
    community: true,
    weeklyDigest: false,
  },
  favoriteCourse: courses[0],
};

const dashboardSnapshot = {
  karmaGrowth: {
    current: 3021,
    delta: "+482 vs last week",
  },
  actionList: [
    {
      id: "wk-mini-launch",
      title: "Drop homework thread",
      due: "Friday",
      status: "in-progress",
    },
    {
      id: "build-personas",
      title: "Clone 2 new personas",
      due: "Today",
      status: "pending",
    },
  ],
  experiments: [
    {
      title: "Story hook generator",
      status: "Testing",
      uplift: "+31% CTR",
    },
    {
      title: "Comment ladder",
      status: "Scaling",
      uplift: "+860 karma/day",
    },
  ],
};

const adminStats = {
  revenue: {
    currentMonth: 18240,
    change: "+18% WoW",
  },
  students: {
    active: 428,
    newToday: 12,
  },
  automations: [
    { title: "Discord onboarding", status: "healthy" },
    { title: "Course drip", status: "healthy" },
    { title: "Refund desk", status: "watch" },
  ],
};

const adminTokens = new Set();

// Nodemailer transporter (optional, for admin notifications)
let mailTransporter = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  try {
    mailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    console.log("✅ SMTP transporter initialized for admin notifications");
  } catch (e) {
    console.warn("⚠️ Failed to initialize SMTP transporter:", e.message);
  }
} else {
  console.log("ℹ️ SMTP credentials not provided. Email notifications are disabled.");
}

// User course access storage (persisted to file)
let userCourseAccess = new Map(); // email -> Set of courseIds

// Course storage (persisted to file)
let courseStorage = [];


// Load data from files on startup
(async () => {
  try {
    const savedCourses = await loadCourses();
    if (savedCourses.length > 0) {
      courseStorage = savedCourses;
      console.log(`Loaded ${courseStorage.length} courses from storage`);
    } else {
      // Initialize with default courses if no saved data
      courseStorage = [...courses];
      await saveCourses(courseStorage);
      console.log("Initialized with default courses");
    }

    userCourseAccess = await loadUserAccess();
    const accessCount = Array.from(userCourseAccess.values()).reduce((sum, set) => sum + set.size, 0);
    console.log(`Loaded user access data (${userCourseAccess.size} users, ${accessCount} access grants)`);
  } catch (error) {
    console.error("Error loading data on startup:", error);
    // Fallback to default courses
    courseStorage = [...courses];
    userCourseAccess = new Map();
  }
})();

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// Custom Email/Password Login
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return sendError(res, 400, "Email and password are required");
  }

  try {
    // Legacy generic app login (keeping it for backward compatibility if used elsewhere)
    const appPassword = process.env.APP_PASSWORD;
    if (appPassword && password === appPassword) {
      const token = jwt.sign({ role: "legacy_user" }, JWT_SECRET, { expiresIn: "1d" });
      return res.json({ token, user: userProfile });
    }

    // Database lookup
    const { pool } = require("./storage");
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    
    if (result.rows.length === 0) {
      return sendError(res, 401, "Invalid credentials or user not found");
    }

    const user = result.rows[0];

    // Users migrated from Firebase do not have a password set in PostgreSQL yet.
    if (!user.password_hash) {
      console.log(`User ${email} needs a password reset (migrated from Firebase)`);
      
      // Auto-send password reset email
      if (mailTransporter) {
        try {
          const resetToken = jwt.sign({ uid: user.uid, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
          const resetLink = `https://redditgoldmine.com/reset-password?token=${resetToken}`;
          
          await mailTransporter.sendMail({
            from: `"RedditGoldmine Security" <${process.env.SMTP_USER}>`,
            to: user.email,
            subject: "Action Required: Update your RedditGoldmine Password",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
                <h2 style="color: #FF4500;">Security Update 🔒</h2>
                <p>Hello ${user.displayName || 'there'},</p>
                <p>We've recently upgraded our infrastructure and security systems for <strong>RedditGoldmine</strong> to serve you better!</p>
                <p>As part of this security upgrade, we need you to set a new password for your account to retain access to your courses and profile.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetLink}" style="display:inline-block;background:#FF4500;color:white;padding:14px 28px;text-decoration:none;border-radius:4px;font-weight:bold;font-size:16px;">Set New Password</a>
                </div>
                <p>Alternatively, you can skip this entirely by clicking <strong>"Sign in with Google"</strong> on our login page using this email address.</p>
                <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
                <p style="color:#888;font-size:12px;">This link expires in 1 hour. If it expires, simply try logging in again to receive a new link.</p>
              </div>
            `
          });
          console.log(`Auto-sent security upgrade reset email to ${email}`);
        } catch (mailErr) {
          console.error(`Failed to auto-send reset email to ${email}:`, mailErr);
        }
      }

      return res.status(403).json({
        success: false,
        message: "We've upgraded our security! We just emailed you a secure link to set your new password. Please check your inbox (and spam folder).",
        requiresPasswordReset: true
      });
    }

    const bcrypt = require("bcryptjs");
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return sendError(res, 401, "Invalid credentials");
    }

    const token = jwt.sign({ 
      uid: user.uid, 
      email: user.email, 
      name: user.displayName, 
      picture: user.photoURL 
    }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({
      success: true,
      token,
      user: {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
        picture: user.photoURL
      }
    });
    
  } catch (error) {
    console.error("Login error:", error);
    return sendError(res, 500, "Internal server error during login");
  }
});

app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return sendError(res, 400, "Email is required");

  try {
    const { pool } = require("./storage");
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const resetToken = jwt.sign({ uid: user.uid, email: user.email }, JWT_SECRET, { expiresIn: "1h" });
      
      if (mailTransporter) {
        const resetLink = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;
        await mailTransporter.sendMail({
          from: `"RedditGoldmine" <${process.env.SMTP_USER}>`,
          to: user.email,
          subject: "Password Reset - RedditGoldmine",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Password Reset</h2>
              <p>You requested a password reset. Click the button below to set a new password:</p>
              <a href="${resetLink}" style="display:inline-block;background:#FF4500;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;">Reset Password</a>
              <p>If you didn't request this, you can ignore this email.</p>
              <hr style="border:none;border-top:1px solid #eee;margin:20px 0;">
              <p style="color:#888;font-size:12px;">This link expires in 1 hour.</p>
            </div>
          `
        });
      }
    }
    
    // Always return success to prevent email enumeration
    res.json({ success: true, message: "If an account exists, a reset link has been sent." });
  } catch (error) {
    console.error("Forgot password error:", error);
    sendError(res, 500, "Internal server error");
  }
});

app.post("/api/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return sendError(res, 400, "Token and new password are required");

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const bcrypt = require("bcryptjs");
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    const { pool } = require("./storage");
    await pool.query("UPDATE users SET password_hash = $1 WHERE email = $2", [hashedPassword, decoded.email]);
    
    res.json({ success: true, message: "Password updated successfully. You can now log in." });
  } catch (error) {
    console.error("Reset password error:", error);
    if (error.name === "TokenExpiredError") {
      return sendError(res, 400, "Reset link has expired. Please request a new one.");
    }
    sendError(res, 400, "Invalid or expired reset token.");
  }
});

app.get("/api/profile", verifyFirebaseToken, async (req, res) => {
  try {
    const { pool } = require("./storage");
    const result = await pool.query("SELECT uid, email, display_name as \"displayName\", photo_url as \"photoURL\", created_at as \"createdAt\" FROM users WHERE email = $1", [req.user.email]);
    
    if (result.rows.length === 0) {
      return sendError(res, 404, "User not found");
    }
    
    // Construct userProfile object dynamically based on database data
    // Mix static legacy data attributes temporarily while migrating frontend completely
    const dbUser = result.rows[0];
    const userProfileToSend = {
      uid: dbUser.uid,
      name: dbUser.displayName || dbUser.email.split("@")[0],
      email: dbUser.email,
      avatar: dbUser.photoURL || `https://api.dicebear.com/7.x/thumbs/svg?seed=${dbUser.email}`,
      membership: "Member",
      joinDate: dbUser.createdAt,
      badges: [],
      streakDays: 0,
      timezone: "UTC",
      notifications: { product: true, community: true, weeklyDigest: false },
    };
    
    res.json(userProfileToSend);
  } catch (error) {
    console.error("Profile fetch error:", error);
    sendError(res, 500, "Failed to fetch profile");
  }
});

app.get("/api/dashboard", (req, res) => {
  res.json({
    snapshot: dashboardSnapshot,
    spotlight: courses[0],
    tasks: dashboardSnapshot.actionList,
  });
});

// Course storage is now loaded from file on startup (see async block above)

app.get("/api/courses", (req, res) => {
  res.json(
    courseStorage.map((course) => ({
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      price: course.price,
      compareAt: course.compareAt,
      lessons: course.lessons,
      difficulty: course.difficulty,
      tags: course.tags,
      progress: course.progress,
      heroStat: course.heroStat,
    }))
  );
});

app.get("/api/courses/:id", (req, res) => {
  const { id } = req.params;
  const course = courseStorage.find((item) => item.id === id);
  if (!course) {
    return sendError(res, 404, "Course not found");
  }
  res.json(course);
});

app.get("/api/resources", (req, res) => {
  const resources = courseStorage.flatMap((course) =>
    (course.resources || []).map((resource) => ({
      courseId: course.id,
      courseTitle: course.title,
      label: resource,
    }))
  );
  res.json(resources);
});

app.get("/api/faq", (req, res) => {
  res.json(faqItems);
});

// Get user courses (only those with access)
app.get("/api/user/courses", verifyFirebaseToken, (req, res) => {
  const userEmail = req.user.email;
  const accessibleCourseIds = userCourseAccess.get(userEmail) || new Set();
  const userCourses = courseStorage
    .filter((course) => accessibleCourseIds.has(course.id))
    .map((course) => ({
      id: course.id,
      title: course.title,
      subtitle: course.subtitle,
      price: course.price,
      compareAt: course.compareAt,
      lessons: course.lessons,
      difficulty: course.difficulty,
      tags: course.tags,
      progress: 0, // Progress is calculated on frontend based on viewed modules
      heroStat: course.heroStat,
    }));
  res.json(userCourses);
});

// Grant course access to user (admin only)
app.post("/api/admin/grant-access",
  verifyFirebaseToken,
  [
    body("userEmail").trim().isEmail().withMessage("Valid email is required"),
    body("courseId").trim().notEmpty().withMessage("Course ID is required"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const adminEmail = req.user.email;
      if (!(await isAdminEmail(adminEmail))) {
        console.warn(`Unauthorized access attempt to grant-access by: ${adminEmail}`);
        return sendError(res, 403, "Only admin can grant access");
      }

      const { userEmail, courseId } = req.body;

      if (!userCourseAccess.has(userEmail)) {
        userCourseAccess.set(userEmail, new Set());
      }

      let courseTitle = courseId;
      
      if (courseId === "promo-bundle") {
        userCourseAccess.get(userEmail).add("reddit-domination");
        userCourseAccess.get(userEmail).add("quora-gems");
        courseTitle = "Reddit Domination & Quora Gems Bundle";
      } else {
        const course = courseStorage.find((c) => c.id === courseId);
        if (!course) {
          return sendError(res, 404, "Course not found");
        }
        userCourseAccess.get(userEmail).add(courseId);
        courseTitle = course.title;
      }

      // Save to file
      await saveUserAccess(userCourseAccess);

      // Create in-app notification for the user about granted access
      try {
        const message = `You now have access to ${courseTitle}.`;

        // Notify by email key so NotificationBell will pick it up
        const userIdForNotif = userEmail.toLowerCase();
        await forum.createNotification({
          userId: userIdForNotif,
          type: "course_access_granted",
          title: "Course access granted",
          message,
          link: "/my-courses",
          read: false,
        });
        console.log("🔔 Course access notification created for", userEmail);
      } catch (notifError) {
        console.error("Error creating course access notification:", notifError);
      }

      // Send email notifications
      if (mailTransporter) {
        // 1. Email to User
        const userMailOptions = {
          from: `"RedditGoldmine" <${process.env.SMTP_USER}>`,
          to: userEmail,
          subject: `Welcome to ${courseTitle}! 🚀`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #FF4500;">Welcome to RedditGoldmine!</h1>
              <p>Hi there,</p>
              <p>You have been granted access to <strong>${courseTitle}</strong>.</p>
              <p>You can start learning right now by logging into your dashboard:</p>
              <a href="https://redditgoldmine.com/my-courses" style="display: inline-block; background-color: #FF4500; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Go to My Courses</a>
              <p>Good luck with your Reddit journey!</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
              <p style="color: #888; font-size: 12px;">RedditGoldmine Team</p>
            </div>
          `,
        };

        // 2. Email to Admin
        const adminMailOptions = {
          from: `"RedditGoldmine Bot" <${process.env.SMTP_USER}>`,
          to: process.env.ADMIN_EMAILS || process.env.SMTP_USER,
          subject: `💰 New Access Granted: ${courseTitle}`,
          text: `User ${userEmail} has been granted access to ${courseTitle}.`,
        };

        // Send emails asynchronously (don't block response)
        Promise.all([
          mailTransporter.sendMail(userMailOptions).catch(e => console.error("Failed to send user email:", e)),
          mailTransporter.sendMail(adminMailOptions).catch(e => console.error("Failed to send admin email:", e))
        ]).then(() => console.log("📧 Emails sent successfully"));
      }

      res.json({ success: true, message: `Access to course ${courseId} granted to ${userEmail}` });
    } catch (error) {
      console.error("Error granting access:", error);
      return sendError(res, 500, "Failed to grant access: " + error.message);
    }
  });

// Revoke course access from user (admin only)
app.delete("/api/admin/revoke-access", verifyFirebaseToken, async (req, res) => {
  const adminEmail = req.user.email;
  if (!(await isAdminEmail(adminEmail))) {
    console.warn(`Unauthorized access attempt to revoke-access by: ${adminEmail}`);
    return sendError(res, 403, "Only admin can revoke access");
  }

  const { userEmail, courseId } = req.body;

  if (!userCourseAccess.has(userEmail)) {
    return sendError(res, 404, "User has no course access");
  }

  const courseIds = userCourseAccess.get(userEmail);
  if (!courseIds.has(courseId)) {
    return sendError(res, 404, "User does not have access to this course");
  }

  courseIds.delete(courseId);

  // If no courses left, remove the user entry
  if (courseIds.size === 0) {
    userCourseAccess.delete(userEmail);
  }

  // Save to file
  await saveUserAccess(userCourseAccess);

  res.json({ success: true, message: `Access to course ${courseId} revoked from ${userEmail}` });
});

// Get all registered users (admin only)
app.get("/api/admin/all-users", verifyFirebaseToken, async (req, res) => {
  const adminEmail = req.user.email;
  if (!(await isAdminEmail(adminEmail))) {
    console.warn(`Unauthorized access attempt to view users by: ${adminEmail}`);
    return sendError(res, 403, "Only admin can view users");
  }

  try {
    console.log("Fetching users from PostgreSQL storage...");
    const allPostgresUsers = await loadUsers();
    console.log(`Found ${allPostgresUsers.length} users in DB`);

    const allUsers = allPostgresUsers.map((userRecord) => {
      const email = userRecord.email || "No email";
      const courseIds = userCourseAccess.get(email) || new Set();
      const coursesList = Array.from(courseIds).map((id) => {
        const course = courseStorage.find((c) => c.id === id);
        return {
          id: id,
          title: course ? course.title : id,
        };
      });

      return {
        uid: userRecord.uid,
        email: email,
        displayName: userRecord.displayName || "No name",
        photoURL: userRecord.photoURL || null,
        createdAt: userRecord.createdAt,
        courses: coursesList, // Now returns array of {id, title}
        coursesText: coursesList.length > 0 ? coursesList.map(c => c.title).join(", ") : "No access", // For display
      };
    });

    console.log(`Returning ${allUsers.length} users to admin`);
    res.json(allUsers);
  } catch (error) {
    console.error("Error fetching users:", error);
    sendError(res, 500, "Failed to fetch users");
  }
});

// Get all users and their access (admin only) - legacy endpoint
app.get("/api/admin/users", verifyFirebaseToken, async (req, res) => {
  const adminEmail = req.user.email;
  if (!(await isAdminEmail(adminEmail))) {
    console.warn(`Unauthorized access attempt to view users by: ${adminEmail}`);
    return sendError(res, 403, "Only admin can view users");
  }

  const users = Array.from(userCourseAccess.entries()).map(([email, courseIds]) => ({
    email,
    courses: Array.from(courseIds)
      .map((id) => {
        const course = courseStorage.find((c) => c.id === id);
        return course ? course.title : id;
      })
      .join(", "),
  }));

  res.json(users);
});

app.post("/api/admin/login", (req, res) => {
  const { password } = req.body || {};
  if (!password) {
    return sendError(res, 400, "Password is required");
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    console.error("ADMIN_PASSWORD not configured");
    return sendError(res, 500, "Server configuration error");
  }

  if (password !== adminPassword) {
    console.warn("Failed admin login attempt");
    return sendError(res, 401, "Invalid admin password");
  }

  const token = randomUUID();
  adminTokens.add(token);
  console.log("Admin login successful");

  res.json({ token, expiresIn: 60 * 60 });
});

// CRUD operations for courses (admin only)
app.post("/api/admin/courses",
  verifyFirebaseToken,
  [
    body("title").trim().isLength({ min: 1, max: 200 }).withMessage("Title must be between 1 and 200 characters"),
    body("price").isFloat({ min: 0 }).withMessage("Price must be a positive number"),
    body("subtitle").optional().trim().isLength({ max: 500 }).withMessage("Subtitle must be less than 500 characters"),
    body("compareAt").optional().isFloat({ min: 0 }).withMessage("CompareAt must be a positive number"),
    body("lessons").optional().isInt({ min: 0 }).withMessage("Lessons must be a non-negative integer"),
    body("difficulty").optional().trim().isLength({ max: 50 }).withMessage("Difficulty must be less than 50 characters"),
    body("tags").optional().isArray().withMessage("Tags must be an array"),
  ],
  handleValidationErrors,
  async (req, res) => {
    const adminEmail = req.user.email;
    if (!(await isAdminEmail(adminEmail))) {
      console.warn(`Unauthorized access attempt to create course by: ${adminEmail}`);
      return sendError(res, 403, "Only admin can create courses");
    }

    const { title, subtitle, price, compareAt, lessons, difficulty, tags, heroStat } = req.body;

    const newCourse = {
      id: title.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      title,
      subtitle: subtitle || "",
      price: Number(price),
      compareAt: compareAt ? Number(compareAt) : null,
      lessons: lessons || 0,
      difficulty: difficulty || "Beginner",
      tags: tags || [],
      progress: 0,
      heroStat: heroStat || { label: "", value: "", subtext: "" },
      modules: [],
      resources: [],
    };

    courseStorage.push(newCourse);

    // Save to file
    await saveCourses(courseStorage);

    res.json({ success: true, course: newCourse });
  });

app.put("/api/admin/courses/:id", verifyFirebaseToken, async (req, res) => {
  const adminEmail = req.user.email;
  if (!(await isAdminEmail(adminEmail))) {
    console.warn(`Unauthorized access attempt to update course by: ${adminEmail}`);
    return sendError(res, 403, "Only admin can update courses");
  }

  const { id } = req.params;
  const courseIndex = courseStorage.findIndex((c) => c.id === id);
  if (courseIndex === -1) {
    return res.status(404).json({ message: "Course not found" });
  }

  const { title, subtitle, price, compareAt, lessons, difficulty, tags, heroStat } = req.body;
  const updatedCourse = {
    ...courseStorage[courseIndex],
    ...(title && { title }),
    ...(subtitle !== undefined && { subtitle }),
    ...(price !== undefined && { price: Number(price) }),
    ...(compareAt !== undefined && { compareAt: compareAt ? Number(compareAt) : null }),
    ...(lessons !== undefined && { lessons: Number(lessons) }),
    ...(difficulty && { difficulty }),
    ...(tags && { tags }),
    ...(heroStat && { heroStat }),
  };

  courseStorage[courseIndex] = updatedCourse;

  // Save to file
  await saveCourses(courseStorage);

  res.json({ success: true, course: updatedCourse });
});

app.delete("/api/admin/courses/:id", verifyFirebaseToken, async (req, res) => {
  const adminEmail = req.user.email;
  if (!(await isAdminEmail(adminEmail))) {
    console.warn(`Unauthorized access attempt to delete course by: ${adminEmail}`);
    return sendError(res, 403, "Only admin can delete courses");
  }

  const { id } = req.params;
  const courseIndex = courseStorage.findIndex((c) => c.id === id);
  if (courseIndex === -1) {
    return res.status(404).json({ message: "Course not found" });
  }

  courseStorage.splice(courseIndex, 1);

  // Save to file
  await saveCourses(courseStorage);

  res.json({ success: true, message: "Course deleted" });
});

// Course modules/lessons management
app.post("/api/admin/courses/:id/modules",
  verifyFirebaseToken,
  [
    param("id").notEmpty().withMessage("Course ID is required"),
    body("title").trim().isLength({ min: 1, max: 200 }).withMessage("Module title must be between 1 and 200 characters"),
    body("description").optional().trim().isLength({ max: 2000 }).withMessage("Description must be less than 2000 characters"),
    body("wistiaUrl").optional({ checkFalsy: true }).trim().custom((value) => {
      if (!value || value === "") return true;
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error("Wistia URL must be a valid URL");
      }
    }),
  ],
  handleValidationErrors,
  async (req, res) => {
    const adminEmail = req.user.email;
    if (!(await isAdminEmail(adminEmail))) {
      console.warn(`Unauthorized access attempt to manage modules by: ${adminEmail}`);
      return sendError(res, 403, "Only admin can manage modules");
    }

    const { id } = req.params;
    const course = courseStorage.find((c) => c.id === id);
    if (!course) {
      return sendError(res, 404, "Course not found");
    }

    const { title, description, wistiaUrl } = req.body;

    if (!course.modules) {
      course.modules = [];
    }

    const newModule = {
      id: course.modules.length + 1,
      title,
      description: description || "",
      wistiaUrl: wistiaUrl || "",
    };

    course.modules.push(newModule);

    // Save to file
    try {
      await saveCourses(courseStorage);
      res.json({ success: true, module: newModule });
    } catch (error) {
      console.error("Error saving module:", error);
      sendError(res, 500, "Failed to save module");
    }
  });

app.put("/api/admin/courses/:id/modules/:moduleId",
  verifyFirebaseToken,
  [
    param("id").notEmpty().withMessage("Course ID is required"),
    param("moduleId").notEmpty().withMessage("Module ID is required"),
    body("title").trim().isLength({ min: 1, max: 200 }).withMessage("Module title must be between 1 and 200 characters"),
    body("description").optional().trim().isLength({ max: 2000 }).withMessage("Description must be less than 2000 characters"),
    body("wistiaUrl").optional({ checkFalsy: true }).trim().custom((value) => {
      if (!value || value === "") return true;
      try {
        new URL(value);
        return true;
      } catch {
        throw new Error("Wistia URL must be a valid URL");
      }
    }),
  ],
  handleValidationErrors,
  async (req, res) => {
    const adminEmail = req.user.email;
    if (!(await isAdminEmail(adminEmail))) {
      console.warn(`Unauthorized access attempt to update module by: ${adminEmail}`);
      return sendError(res, 403, "Only admin can update modules");
    }

    const { id, moduleId } = req.params;
    const course = courseStorage.find((c) => c.id === id);
    if (!course || !course.modules) {
      return sendError(res, 404, "Course or module not found");
    }

    const moduleIndex = course.modules.findIndex((m) => m.id === Number(moduleId));
    if (moduleIndex === -1) {
      return sendError(res, 404, "Module not found");
    }

    const { title, description, wistiaUrl } = req.body;

    course.modules[moduleIndex] = {
      ...course.modules[moduleIndex],
      title,
      description: description || "",
      wistiaUrl: wistiaUrl || "",
    };

    // Save to file
    try {
      await saveCourses(courseStorage);
      res.json({ success: true, module: course.modules[moduleIndex] });
    } catch (error) {
      console.error("Error updating module:", error);
      sendError(res, 500, "Failed to update module");
    }
  });

app.delete("/api/admin/courses/:id/modules/:moduleId", verifyFirebaseToken, async (req, res) => {
  const adminEmail = req.user.email;
  if (!(await isAdminEmail(adminEmail))) {
    console.warn(`Unauthorized access attempt to delete module by: ${adminEmail}`);
    return sendError(res, 403, "Only admin can delete modules");
  }

  const { id, moduleId } = req.params;
  const course = courseStorage.find((c) => c.id === id);
  if (!course || !course.modules) {
    return sendError(res, 404, "Course or module not found");
  }

  const moduleIndex = course.modules.findIndex((m) => m.id === Number(moduleId));
  if (moduleIndex === -1) {
    return sendError(res, 404, "Module not found");
  }

  course.modules.splice(moduleIndex, 1);

  // Save to file
  try {
    await saveCourses(courseStorage);
    res.json({ success: true, message: "Module deleted" });
  } catch (error) {
    console.error("Error deleting module:", error);
    sendError(res, 500, "Failed to delete module");
  }
});

app.get("/api/admin/stats", verifyFirebaseToken, async (req, res) => {
  try {
    const adminEmail = req.user.email;
    if (!(await isAdminEmail(adminEmail))) {
      return sendError(res, 403, "Only admin can view stats");
    }

    // Users count from Firebase Auth
    let totalUsers = 0;
    let recentSignups = 0;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    try {
      const listResult = await admin.auth().listUsers(1000);
      totalUsers = listResult.users.length;
      recentSignups = listResult.users.filter(u => {
        const created = new Date(u.metadata.creationTime);
        return created >= sevenDaysAgo;
      }).length;
    } catch (e) {
      console.error("Error counting users:", e);
    }

    // Courses count
    const totalCourses = courseStorage.length;

    // Total access grants
    let totalAccessGrants = 0;
    for (const [, courses] of userCourseAccess) {
      totalAccessGrants += courses.size;
    }

    // Users with course access
    const usersWithAccess = userCourseAccess.size;

    // Pending payment requests
    let pendingRequests = 0;
    try {
      const snapshot = await admin.firestore()
        .collection("forum_notifications")
        .where("type", "==", "payment_request")
        .where("read", "==", false)
        .get();
      pendingRequests = snapshot.size;
    } catch (e) {
      console.error("Error counting pending requests:", e);
    }

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalCourses,
        totalAccessGrants,
        usersWithAccess,
        recentSignups,
        pendingRequests,
      }
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    sendError(res, 500, "Failed to get stats");
  }
});

// Reddit Avatar Preview Endpoint
app.get("/api/reddit/avatar/:username",
  [
    param("username").trim().isLength({ min: 1, max: 20 }).withMessage("Username must be between 1 and 20 characters"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username } = req.params;
      const usernameLower = username.toLowerCase();
      const WORKER_URL = 'https://shy-moon-d5d1.hromelkyan.workers.dev';
      const redditUrl = `${WORKER_URL}/user/${usernameLower}/about.json`;

      try {
        const response = await axios.get(redditUrl, {
          headers: {
            "Accept": "application/json",
          },
          timeout: 5000,
        });

        const redditData = response.data?.data;
        if (redditData?.icon_img) {
          let avatarUrl = redditData.icon_img;
          // Remove size parameters
          avatarUrl = avatarUrl.split('?')[0];
          // Make absolute if relative
          if (!avatarUrl.startsWith('http')) {
            avatarUrl = `https://www.reddit.com${avatarUrl}`;
          }
          return res.json({ avatar: avatarUrl });
        }
        return res.json({ avatar: null });
      } catch (error) {
        return res.json({ avatar: null });
      }
    } catch (error) {
      return res.json({ avatar: null });
    }
  }
);

// Reddit Calculator API Endpoint
app.get("/api/reddit/analyze/:username",
  [
    param("username").trim().isLength({ min: 1, max: 20 }).withMessage("Username must be between 1 and 20 characters"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { username } = req.params;
      const usernameLower = username.toLowerCase();
      const userTimezone = req.query.timezone ? parseInt(req.query.timezone) : null; // Timezone offset in minutes

      // Cache disabled - always fetch fresh data
      // const cached = await getCachedRedditData(usernameLower);
      // if (cached) {
      //   console.log(`✅ Reddit data served from cache for: ${username}`);
      //   return res.json({ ...cached, cached: true });
      // }

      // Fetch from Reddit API via Cloudflare Worker Proxy
      const WORKER_URL = 'https://shy-moon-d5d1.hromelkyan.workers.dev';
      const redditUrl = `${WORKER_URL}/user/${usernameLower}/about.json`;

      let redditData;
      try {
        const response = await axios.get(redditUrl, {
          headers: {
            "Accept": "application/json",
          },
          timeout: 15000,
        });
        redditData = response.data?.data;
      } catch (error) {
        if (error.response?.status === 404) {
          return sendError(res, 404, "Reddit user not found");
        }
        if (error.response?.status === 403) {
          console.error("Reddit API 403 Forbidden:", {
            username: usernameLower,
            headers: error.response.headers,
            data: error.response.data
          });
          return sendError(res, 403, "Reddit user profile is private, suspended, or API access is restricted by Reddit.");
        }
        console.error("Reddit API error:", error.message);
        return sendError(res, 500, "Failed to fetch Reddit data: " + error.message);
      }

      if (!redditData) {
        return sendError(res, 404, "Reddit user data not found");
      }

      // Fetch user's posts for time analysis and top posts
      let userPosts = [];
      let topPosts = [];
      let postingTimeAnalysis = null;
      let subredditAnalysis = null;
      let karmaGrowthData = [];
      let activityByDay = null;
      let commentsAnalysis = null;

      try {
        const postsUrl = `${WORKER_URL}/user/${usernameLower}/submitted.json?limit=100`;
        const postsResponse = await axios.get(postsUrl, {
          headers: {
            "Accept": "application/json",
          },
          timeout: 15000,
        });

        if (postsResponse.data?.data?.children) {
          userPosts = postsResponse.data.data.children
            .map(child => child.data)
            .filter(post => post.score !== undefined);

          // Get top 5 posts by score
          topPosts = userPosts
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(post => ({
              title: post.title,
              subreddit: post.subreddit,
              score: post.score,
              numComments: post.num_comments,
              createdUtc: post.created_utc,
              url: `https://reddit.com${post.permalink}`,
              thumbnail: post.thumbnail && post.thumbnail.startsWith('http') ? post.thumbnail : null,
            }));

          // Subreddit Analysis
          const subredditStats = {};
          userPosts.forEach(post => {
            const sub = post.subreddit;
            if (!subredditStats[sub]) {
              subredditStats[sub] = { karma: 0, posts: 0, totalScore: 0 };
            }
            subredditStats[sub].karma += post.score || 0;
            subredditStats[sub].posts += 1;
            subredditStats[sub].totalScore += post.score || 0;
          });

          const topSubreddits = Object.entries(subredditStats)
            .map(([name, stats]) => ({
              name,
              karma: stats.karma,
              posts: stats.posts,
              avgScore: Math.round(stats.totalScore / stats.posts),
            }))
            .sort((a, b) => b.karma - a.karma)
            .slice(0, 5);

          subredditAnalysis = {
            topSubreddits,
            totalSubreddits: Object.keys(subredditStats).length,
          };

          // Karma Growth Data (last 30 posts sorted by date)
          const sortedPosts = [...userPosts]
            .sort((a, b) => a.created_utc - b.created_utc)
            .slice(-30);

          let cumulativeKarma = 0;
          karmaGrowthData = sortedPosts.map(post => {
            cumulativeKarma += post.score || 0;
            const date = new Date(post.created_utc * 1000);
            if (userTimezone !== null) {
              date.setMinutes(date.getMinutes() + userTimezone);
            }
            return {
              date: date.toISOString().split('T')[0],
              karma: cumulativeKarma,
              score: post.score || 0,
            };
          });

          // Activity by Day of Week
          const dayCounts = Array(7).fill(0);
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          userPosts.forEach(post => {
            const date = new Date(post.created_utc * 1000);
            if (userTimezone !== null) {
              date.setMinutes(date.getMinutes() + userTimezone);
            }
            const day = date.getDay();
            dayCounts[day]++;
          });

          activityByDay = dayNames.map((name, idx) => ({
            day: name,
            count: dayCounts[idx],
          }));

          // Analyze posting times
          if (userPosts.length > 0) {
            const postingHours = userPosts.map(post => {
              const date = new Date(post.created_utc * 1000);
              // Adjust for user's timezone if provided
              if (userTimezone !== null) {
                date.setMinutes(date.getMinutes() + userTimezone);
              }
              return date.getHours();
            });

            // Count posts per hour
            const hourCounts = Array(24).fill(0);
            postingHours.forEach(hour => {
              hourCounts[hour]++;
            });

            // Find most active hours
            const maxCount = Math.max(...hourCounts);
            const mostActiveHours = hourCounts
              .map((count, hour) => ({ hour, count }))
              .filter(item => item.count > 0)
              .sort((a, b) => b.count - a.count)
              .slice(0, 5);

            // Determine best posting times (Reddit peak hours: 9-11 AM, 1-3 PM, 7-9 PM EST)
            // Reddit's peak hours are based on US Eastern Time (UTC-5)
            // Convert to user's timezone
            const estOptimalHours = [9, 10, 11, 13, 14, 15, 19, 20, 21]; // Peak hours in EST (UTC-5)
            const estOffsetMinutes = -5 * 60; // EST is UTC-5
            const userOptimalHours = userTimezone !== null
              ? estOptimalHours.map(h => {
                // Convert EST hour to user's timezone
                const estInMinutes = h * 60;
                const utcInMinutes = estInMinutes - estOffsetMinutes;
                const userInMinutes = utcInMinutes + userTimezone;
                const userHour = Math.floor((userInMinutes % (24 * 60)) / 60);
                return userHour < 0 ? userHour + 24 : userHour >= 24 ? userHour - 24 : userHour;
              })
              : estOptimalHours;

            // Check if user posts during optimal times
            const postsInOptimalTime = postingHours.filter(h => userOptimalHours.includes(h)).length;
            const optimalTimeRatio = (postsInOptimalTime / postingHours.length) * 100;

            // Analyze average score by posting hour
            const hourScores = {};
            userPosts.forEach(post => {
              const date = new Date(post.created_utc * 1000);
              if (userTimezone !== null) {
                date.setMinutes(date.getMinutes() + userTimezone);
              }
              const hour = date.getHours();
              if (!hourScores[hour]) {
                hourScores[hour] = { total: 0, count: 0 };
              }
              hourScores[hour].total += post.score || 0;
              hourScores[hour].count++;
            });

            const bestPostingHours = Object.entries(hourScores)
              .map(([hour, data]) => ({
                hour: parseInt(hour),
                avgScore: data.total / data.count,
                count: data.count,
              }))
              .sort((a, b) => b.avgScore - a.avgScore)
              .slice(0, 3);

            postingTimeAnalysis = {
              totalPosts: userPosts.length,
              mostActiveHours: mostActiveHours.map(item => ({
                hour: item.hour,
                hourFormatted: `${item.hour}:00`,
                count: item.count,
                percentage: ((item.count / userPosts.length) * 100).toFixed(1),
              })),
              optimalTimeRatio: Math.round(optimalTimeRatio),
              isPostingAtOptimalTime: optimalTimeRatio > 30,
              bestPostingHours: bestPostingHours.map(item => ({
                hour: item.hour,
                hourFormatted: `${item.hour}:00`,
                avgScore: Math.round(item.avgScore),
                count: item.count,
              })),
              recommendation: optimalTimeRatio > 30
                ? "Great! You're posting during optimal times when Reddit is most active."
                : "Consider posting during peak hours (9-11 AM, 1-3 PM, 7-9 PM in your timezone) for better engagement.",
            };
          }
        }
      } catch (error) {
        console.warn("Failed to fetch user posts:", error.message);
        // Continue without posts data
      }

      // Fetch user's comments for analysis
      try {
        const commentsUrl = `https://www.reddit.com/user/${usernameLower}/comments.json?limit=100`;
        const commentsResponse = await axios.get(commentsUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
          },
          timeout: 10000,
        });

        if (commentsResponse.data?.data?.children) {
          const userComments = commentsResponse.data.data.children
            .map(child => child.data)
            .filter(comment => comment.score !== undefined);

          if (userComments.length > 0) {
            const totalScore = userComments.reduce((sum, c) => sum + (c.score || 0), 0);
            const avgScore = Math.round(totalScore / userComments.length);

            const topComments = userComments
              .sort((a, b) => b.score - a.score)
              .slice(0, 5)
              .map(comment => ({
                body: comment.body?.substring(0, 200) || '',
                subreddit: comment.subreddit,
                score: comment.score,
                createdUtc: comment.created_utc,
                url: `https://reddit.com${comment.permalink}`,
              }));

            // Simple sentiment analysis (basic keyword matching)
            let positiveCount = 0;
            let negativeCount = 0;
            const positiveWords = ['good', 'great', 'awesome', 'love', 'thanks', 'helpful', 'amazing', 'excellent', 'perfect', 'best'];
            const negativeWords = ['bad', 'hate', 'terrible', 'worst', 'awful', 'horrible', 'stupid', 'dumb', 'sucks', 'disappointed'];

            userComments.forEach(comment => {
              const text = (comment.body || '').toLowerCase();
              const posMatches = positiveWords.filter(word => text.includes(word)).length;
              const negMatches = negativeWords.filter(word => text.includes(word)).length;
              if (posMatches > negMatches) positiveCount++;
              else if (negMatches > posMatches) negativeCount++;
            });

            commentsAnalysis = {
              totalComments: userComments.length,
              avgScore,
              topComments,
              sentiment: {
                positive: Math.round((positiveCount / userComments.length) * 100),
                negative: Math.round((negativeCount / userComments.length) * 100),
                neutral: Math.round(((userComments.length - positiveCount - negativeCount) / userComments.length) * 100),
              },
            };
          }
        }
      } catch (error) {
        console.warn("Failed to fetch user comments:", error.message);
        // Continue without comments data
      }

      // Calculate metrics
      const totalKarma = redditData.total_karma || 0;
      const postKarma = redditData.link_karma || 0;
      const commentKarma = redditData.comment_karma || 0;
      const accountAge = redditData.created_utc ? Math.floor((Date.now() / 1000 - redditData.created_utc) / 86400) : 0;
      const isGold = redditData.is_gold || false;
      const isVerified = redditData.verified || false;
      const hasVerifiedEmail = redditData.has_verified_email || false;
      const commentKarmaRatio = totalKarma > 0 ? (commentKarma / totalKarma) * 100 : 0;
      const postKarmaRatio = totalKarma > 0 ? (postKarma / totalKarma) * 100 : 0;
      const karmaPerDay = accountAge > 0 ? (totalKarma / accountAge) : 0;

      // Calculate "coolness" score (0-100)
      let coolnessScore = 0;

      // Karma contribution (40 points max)
      const karmaScore = Math.min(40, (totalKarma / 10000) * 40);
      coolnessScore += karmaScore;

      // Account age contribution (20 points max)
      const ageScore = Math.min(20, (accountAge / 365) * 20);
      coolnessScore += ageScore;

      // Activity balance (15 points max) - balanced between posts and comments
      const balanceScore = 15 - Math.abs(commentKarmaRatio - 50) / 50 * 15;
      coolnessScore += balanceScore;

      // Karma per day efficiency (15 points max)
      const efficiencyScore = Math.min(15, (karmaPerDay / 10) * 15);
      coolnessScore += efficiencyScore;

      // Premium features (10 points max)
      const premiumScore = (isGold ? 5 : 0) + (isVerified ? 3 : 0) + (hasVerifiedEmail ? 2 : 0);
      coolnessScore += premiumScore;

      coolnessScore = Math.min(100, Math.max(0, Math.round(coolnessScore)));

      // Determine level
      let level, levelEmoji, levelColor;
      if (coolnessScore >= 90) {
        level = "Legend";
        levelEmoji = "👑";
        levelColor = "#FFD700";
      } else if (coolnessScore >= 75) {
        level = "Expert";
        levelEmoji = "⭐";
        levelColor = "#FF6B6B";
      } else if (coolnessScore >= 60) {
        level = "Advanced";
        levelEmoji = "🔥";
        levelColor = "#4ECDC4";
      } else if (coolnessScore >= 40) {
        level = "Active";
        levelEmoji = "💪";
        levelColor = "#95E1D3";
      } else if (coolnessScore >= 20) {
        level = "Beginner";
        levelEmoji = "🌱";
        levelColor = "#F38181";
      } else {
        level = "Newbie";
        levelEmoji = "🌿";
        levelColor = "#AA96DA";
      }

      // Generate recommendations
      const recommendations = [];

      if (accountAge < 30) {
        recommendations.push({
          type: "info",
          title: "New Account",
          message: "Your account is brand new! Keep being active and your karma will grow.",
          action: "Post quality content regularly",
        });
      }

      if (postKarmaRatio < 20 && totalKarma > 100) {
        recommendations.push({
          type: "warning",
          title: "Not Enough Posts",
          message: `Only ${postKarmaRatio.toFixed(1)}% of your karma comes from posts. Posts give more karma!`,
          action: "Create more posts in popular subreddits",
        });
      }

      if (commentKarmaRatio < 20 && totalKarma > 100) {
        recommendations.push({
          type: "warning",
          title: "Not Enough Comments",
          message: `Only ${commentKarmaRatio.toFixed(1)}% of your karma comes from comments. Comments help build reputation!`,
          action: "Actively comment in discussions",
        });
      }

      if (karmaPerDay < 1 && accountAge > 90) {
        recommendations.push({
          type: "warning",
          title: "Low Activity",
          message: `You're getting less than 1 karma per day. Increase your activity!`,
          action: "Post content daily",
        });
      }

      if (karmaPerDay > 50) {
        recommendations.push({
          type: "success",
          title: "Excellent Activity!",
          message: `You're getting ${karmaPerDay.toFixed(1)} karma per day - that's excellent!`,
          action: "Keep up the great work",
        });
      }

      if (totalKarma > 10000) {
        recommendations.push({
          type: "success",
          title: "High Karma",
          message: `You have ${totalKarma.toLocaleString()} karma! You're already an experienced Redditor.`,
          action: "Help newcomers and share your experience",
        });
      }

      if (!hasVerifiedEmail) {
        recommendations.push({
          type: "info",
          title: "Verify Email",
          message: "Email verification increases trust in your account",
          action: "Verify your email in Reddit settings",
        });
      }

      if (accountAge > 365 && totalKarma < 1000) {
        recommendations.push({
          type: "warning",
          title: "Room for Improvement",
          message: "With an account this old, you could have more karma",
          action: "Check out our courses for karma growth",
        });
      }

      // Add posting time recommendations
      if (postingTimeAnalysis) {
        if (!postingTimeAnalysis.isPostingAtOptimalTime) {
          recommendations.push({
            type: "warning",
            title: "Posting Time Optimization",
            message: postingTimeAnalysis.recommendation,
            action: `Try posting at ${postingTimeAnalysis.bestPostingHours[0]?.hourFormatted || 'peak hours'} for better engagement`,
          });
        } else {
          recommendations.push({
            type: "success",
            title: "Great Posting Times!",
            message: postingTimeAnalysis.recommendation,
            action: "Your timing strategy is working well",
          });
        }
      }

      // Calculate strengths
      const strengths = [];
      if (postKarma > commentKarma * 2) {
        strengths.push("Strong Content Creator");
      }
      if (commentKarma > postKarma * 2) {
        strengths.push("Active Commenter");
      }
      if (karmaPerDay > 20) {
        strengths.push("High Activity");
      }
      if (accountAge > 365) {
        strengths.push("Experienced User");
      }
      if (isGold) {
        strengths.push("Premium Member");
      }

      const result = {
        username: redditData.name,
        totalKarma,
        postKarma,
        commentKarma,
        accountAge,
        accountAgeFormatted: `${Math.floor(accountAge / 365)} years, ${Math.floor((accountAge % 365) / 30)} months`,
        karmaPerDay: Math.round(karmaPerDay * 10) / 10,
        commentKarmaRatio: Math.round(commentKarmaRatio * 10) / 10,
        postKarmaRatio: Math.round(postKarmaRatio * 10) / 10,
        isGold,
        isVerified,
        hasVerifiedEmail,
        coolnessScore,
        level,
        levelEmoji,
        levelColor,
        recommendations,
        strengths,
        avatar: redditData.icon_img ? (redditData.icon_img.startsWith('http') ? redditData.icon_img : `https://www.reddit.com${redditData.icon_img}`) : null,
        postingTimeAnalysis,
        topPosts,
        subredditAnalysis,
        karmaGrowthData,
        activityByDay,
        commentsAnalysis,
        cached: false,
      };

      // Cache disabled - don't save to cache
      // await saveCachedRedditData(usernameLower, result, 24);

      console.log(`✅ Reddit data fetched for: ${username}`);
      res.json(result);
    } catch (error) {
      console.error("Error analyzing Reddit user:", error);
      sendError(res, 500, "Failed to analyze Reddit user: " + error.message);
    }
  }
);

// Forum API Endpoints

// Get all categories
app.get("/api/forum/categories", async (req, res) => {
  try {
    console.log("📥 GET /api/forum/categories");
    const categories = await forum.getCategories();
    console.log(`✅ Sending ${categories.length} categories to client`);
    // Categories change rarely, cache for 5 minutes
    res.set('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
    res.json(categories);
  } catch (error) {
    console.error("❌ Error in /api/forum/categories:", error);
    console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    sendError(res, 500, "Failed to get categories: " + (error.message || "Unknown error"));
  }
});

// Create category (admin only)
app.post("/api/forum/categories", verifyFirebaseToken, async (req, res) => {
  try {
    const adminEmail = req.user.email;
    if (!(await isAdminEmail(adminEmail))) {
      return sendError(res, 403, "Only admin can create categories");
    }

    const { name, description, icon, order } = req.body;
    if (!name) {
      return sendError(res, 400, "Category name is required");
    }

    const category = await forum.createCategory({
      name,
      description: description || "",
      icon: icon || "💬",
      order: order || 0,
    });

    res.json({ success: true, category });
  } catch (error) {
    console.error("Error creating category:", error);
    sendError(res, 500, "Failed to create category");
  }
});

// Get topics
app.get("/api/forum/topics", async (req, res) => {
  try {
    console.log("📥 GET /api/forum/topics", req.query);
    const { categoryId, sortBy, limit, startAfter } = req.query;
    const filters = {
      categoryId: categoryId || null,
      sortBy: sortBy || "newest",
      limit: limit ? parseInt(limit) : 20,
      startAfter: startAfter || null,
    };

    const topics = await forum.getTopics(filters);

    // Get user likes if authenticated
    let userLikes = [];
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const idToken = authHeader.replace("Bearer ", "");
        const decoded = await admin.auth().verifyIdToken(idToken);
        const topicIds = topics.map((t) => t.id);
        if (topicIds.length > 0) {
          userLikes = await forum.getUserLikes(decoded.uid, "topic", topicIds);
        }
      } catch (e) {
        // Not authenticated, continue without likes
        console.warn("⚠️ Auth error (non-critical):", e.message);
      }
    }

    console.log(`✅ Sending ${topics.length} topics to client`);
    // Add cache headers for better performance
    res.set('Cache-Control', 'public, max-age=30'); // Cache for 30 seconds
    res.json({ topics, userLikes });
  } catch (error) {
    console.error("❌ Error in /api/forum/topics:", error);
    console.error("Full error:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    sendError(res, 500, "Failed to get topics: " + (error.message || "Unknown error"));
  }
});

// Get single topic
app.get("/api/forum/topics/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return sendError(res, 400, "Topic ID is required");
    }

    const topic = await forum.getTopicById(id);

    if (!topic) {
      return sendError(res, 404, "Topic not found");
    }

    if (topic.isDeleted) {
      return sendError(res, 404, "Topic has been deleted");
    }

    // Get comments
    const comments = await forum.getCommentsByTopicId(id);

    // Get user likes
    let userLiked = false;
    let userCommentLikes = [];
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      try {
        const idToken = authHeader.replace("Bearer ", "");
        const decoded = await admin.auth().verifyIdToken(idToken);
        const likedTopics = await forum.getUserLikes(decoded.uid, "topic", [id]);
        userLiked = likedTopics.includes(id);

        const commentIds = comments.map((c) => c.id);
        if (commentIds.length > 0) {
          try {
            userCommentLikes = await forum.getUserLikes(decoded.uid, "comment", commentIds);
          } catch (likeError) {
            console.warn("Error getting user likes for comments:", likeError.message);
            userCommentLikes = [];
          }
        }
      } catch (e) {
        // Not authenticated or token invalid - continue without likes
        console.warn("Auth error (non-critical):", e.message);
      }
    }

    res.json({ topic, comments, userLiked, userCommentLikes });
  } catch (error) {
    console.error("Error getting topic:", error);
    sendError(res, 500, "Failed to get topic: " + error.message);
  }
});

// Create topic
app.post(
  "/api/forum/topics",
  verifyFirebaseToken,
  [
    body("title").trim().isLength({ min: 3, max: 200 }).withMessage("Title must be between 3 and 200 characters"),
    body("content").trim().isLength({ min: 10, max: 10000 }).withMessage("Content must be between 10 and 10000 characters"),
    body("categoryId").trim().notEmpty().withMessage("Category ID is required"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, content, categoryId, tags } = req.body;
      const userId = req.user.uid;
      const userName = req.user.name || req.user.email;

      // Check if user is blocked
      const isBlocked = await forum.isUserBlocked(userId);
      if (isBlocked) {
        return sendError(res, 403, "Your account has been blocked. You cannot create topics.");
      }

      const topic = await forum.createTopic({
        title,
        content,
        authorId: userId,
        authorName: userName,
        authorEmail: req.user.email,
        categoryId,
        tags: tags || [],
      });

      res.json({ success: true, topic });
    } catch (error) {
      console.error("Error creating topic:", error);
      sendError(res, 500, "Failed to create topic");
    }
  }
);

// Update topic
app.put("/api/forum/topics/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const adminEmail = req.user.email;

    const topic = await forum.getTopicById(id);
    if (!topic || topic.isDeleted) {
      return sendError(res, 404, "Topic not found");
    }

    if (topic.authorId !== userId && !(await isAdminEmail(adminEmail))) {
      return sendError(res, 403, "You can only edit your own topics");
    }

    const { title, content, tags } = req.body;
    const updateData = {};
    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (tags) updateData.tags = tags;

    const updated = await forum.updateTopic(id, updateData);
    res.json({ success: true, topic: updated });
  } catch (error) {
    console.error("Error updating topic:", error);
    sendError(res, 500, "Failed to update topic");
  }
});

// Delete topic
app.delete("/api/forum/topics/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const adminEmail = req.user.email;

    console.log("🗑️ Delete topic request:", { id, userId, adminEmail });

    const topic = await forum.getTopicById(id);
    if (!topic || topic.isDeleted) {
      return sendError(res, 404, "Topic not found");
    }

    const isAdmin = await isAdminEmail(adminEmail);
    if (topic.authorId !== userId && !isAdmin) {
      console.warn("❌ Delete topic forbidden:", {
        topicAuthor: topic.authorId,
        userId,
        adminEmail,
        isAdmin,
      });
      return sendError(res, 403, "You can only delete your own topics");
    }

    await forum.deleteTopic(id);
    console.log("✅ Topic deleted (soft):", { id });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting topic:", error);
    sendError(res, 500, "Failed to delete topic");
  }
});

// Create comment
app.post(
  "/api/forum/topics/:topicId/comments",
  verifyFirebaseToken,
  [
    body("content").trim().isLength({ min: 1, max: 5000 }).withMessage("Comment must be between 1 and 5000 characters"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { topicId } = req.params;
      const { content, parentId } = req.body;
      const userId = req.user.uid;
      const userName = req.user.name || req.user.email;

      // Check if user is blocked
      const isBlocked = await forum.isUserBlocked(userId);
      if (isBlocked) {
        return sendError(res, 403, "Your account has been blocked. You cannot post comments.");
      }

      const topic = await forum.getTopicById(topicId);
      if (!topic || topic.isDeleted) {
        return sendError(res, 404, "Topic not found");
      }

      if (topic.isLocked) {
        return sendError(res, 403, "Topic is locked");
      }

      const comment = await forum.createComment({
        topicId,
        content,
        authorId: userId,
        authorName: userName,
        authorEmail: req.user.email,
        parentId: parentId || null,
      });

      res.json({ success: true, comment });
    } catch (error) {
      console.error("Error creating comment:", error);
      sendError(res, 500, "Failed to create comment");
    }
  }
);

// Update comment
app.put("/api/forum/comments/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const adminEmail = req.user.email;

    const commentDoc = await admin.firestore().collection("forum_comments").doc(id).get();
    if (!commentDoc.exists) {
      return sendError(res, 404, "Comment not found");
    }

    const comment = commentDoc.data();
    if (comment.authorId !== userId && !(await isAdminEmail(adminEmail))) {
      return sendError(res, 403, "You can only edit your own comments");
    }

    const { content } = req.body;
    const updated = await forum.updateComment(id, { content });
    res.json({ success: true, comment: updated });
  } catch (error) {
    console.error("Error updating comment:", error);
    sendError(res, 500, "Failed to update comment");
  }
});

// Delete comment
app.delete("/api/forum/comments/:id", verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.uid;
    const adminEmail = req.user.email;

    console.log("🗑️ Delete comment request:", { id, userId, adminEmail });

    const commentDoc = await admin.firestore().collection("forum_comments").doc(id).get();
    if (!commentDoc.exists) {
      return sendError(res, 404, "Comment not found");
    }

    const comment = commentDoc.data();
    const isAdmin = await isAdminEmail(adminEmail);
    if (comment.authorId !== userId && !isAdmin) {
      console.warn("❌ Delete comment forbidden:", {
        commentAuthor: comment.authorId,
        userId,
        adminEmail,
        isAdmin,
      });
      return sendError(res, 403, "You can only delete your own comments");
    }

    await forum.deleteComment(id, comment.topicId);
    console.log("✅ Comment deleted (soft):", { id, topicId: comment.topicId });
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting comment:", error);
    sendError(res, 500, "Failed to delete comment");
  }
});

// Toggle like
app.post("/api/forum/like", verifyFirebaseToken, async (req, res) => {
  try {
    const { targetType, targetId } = req.body;
    const userId = req.user.uid;

    if (!["topic", "comment"].includes(targetType)) {
      return sendError(res, 400, "Invalid target type");
    }

    if (userId === targetId) {
      return sendError(res, 400, "Cannot like your own content");
    }

    const result = await forum.toggleLike(userId, targetType, targetId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error toggling like:", error);
    sendError(res, 500, "Failed to toggle like");
  }
});

// Get batch likes (for multiple topics/comments)
app.post("/api/forum/likes/batch", verifyFirebaseToken, async (req, res) => {
  try {
    const { targetType, targetIds } = req.body;
    const userId = req.user.uid;

    if (!["topic", "comment"].includes(targetType)) {
      return sendError(res, 400, "Invalid target type");
    }

    if (!Array.isArray(targetIds) || targetIds.length === 0) {
      return sendError(res, 400, "targetIds must be a non-empty array");
    }

    const likedIds = await forum.getUserLikes(userId, targetType, targetIds);
    res.json({ success: true, likedIds });
  } catch (error) {
    console.error("Error getting batch likes:", error);
    sendError(res, 500, "Failed to get likes");
  }
});

// Search topics
app.get("/api/forum/search", async (req, res) => {
  try {
    const { q, categoryId, sortBy, limit } = req.query;
    if (!q || q.trim().length < 2) {
      return sendError(res, 400, "Search query must be at least 2 characters");
    }

    const results = await forum.searchTopics(q, {
      categoryId: categoryId || null,
      sortBy: sortBy || "newest",
      limit: limit ? parseInt(limit) : 50,
    });

    res.json({ results });
  } catch (error) {
    console.error("Error searching topics:", error);
    sendError(res, 500, "Failed to search topics");
  }
});

// Get notifications
app.get("/api/forum/notifications", verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user.uid;
    const emailLower = (req.user.email || "").toLowerCase();
    const limit = parseInt(req.query.limit) || 20;

    // Fetch notifications by uid and by email (for admin email-based notifications)
    const byId = await forum.getNotifications(userId, limit);
    const byEmail = emailLower
      ? await forum.getNotifications(emailLower, limit)
      : [];

    // Merge and dedupe
    const all = [...byId, ...byEmail];
    const seen = new Set();
    const merged = [];
    for (const n of all) {
      if (!seen.has(n.id)) {
        seen.add(n.id);
        merged.push(n);
      }
    }

    res.json({ notifications: merged });
  } catch (error) {
    console.error("Error getting notifications:", error);
    sendError(res, 500, "Failed to get notifications");
  }
});

// Mark notification as read
app.put("/api/forum/notifications/:id/read", verifyFirebaseToken, async (req, res) => {
  try {
    const { id } = req.params;
    const notificationDoc = await admin.firestore().collection("forum_notifications").doc(id).get();
    if (!notificationDoc.exists) {
      return sendError(res, 404, "Notification not found");
    }

    await forum.markNotificationAsRead(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    sendError(res, 500, "Failed to mark notification as read");
  }
});

// Get popular tags
app.get("/api/forum/tags", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const tags = await forum.getPopularTags(limit);
    res.json({ tags });
  } catch (error) {
    console.error("Error getting tags:", error);
    sendError(res, 500, "Failed to get tags");
  }
});

// Moderation actions
app.post("/api/forum/moderate", verifyFirebaseToken, async (req, res) => {
  try {
    const adminEmail = req.user.email;
    if (!(await isAdminEmail(adminEmail))) {
      return sendError(res, 403, "Only admin can moderate");
    }

    const { action, targetType, targetId, data } = req.body;

    if (targetType === "topic") {
      const topic = await forum.getTopicById(targetId);
      if (!topic) {
        return sendError(res, 404, "Topic not found");
      }

      switch (action) {
        case "pin":
          await forum.updateTopic(targetId, { isPinned: true });
          break;
        case "unpin":
          await forum.updateTopic(targetId, { isPinned: false });
          break;
        case "lock":
          await forum.updateTopic(targetId, { isLocked: true });
          break;
        case "unlock":
          await forum.updateTopic(targetId, { isLocked: false });
          break;
        case "move":
          if (data?.categoryId) {
            await forum.updateTopic(targetId, { categoryId: data.categoryId });
          }
          break;
        case "delete":
          // Admin hard-delete (soft flag in Firestore)
          await forum.deleteTopic(targetId);
          break;
        default:
          return sendError(res, 400, "Invalid action");
      }
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error moderating:", error);
    sendError(res, 500, "Failed to moderate");
  }
});

// Admin management endpoints
app.get("/api/admin/forum-admins", verifyFirebaseToken, async (req, res) => {
  try {
    const adminEmail = req.user.email;
    if (!(await isAdminEmail(adminEmail))) {
      return sendError(res, 403, "Only admin can view admins");
    }

    const admins = await forum.getAdmins();
    res.json({ success: true, admins });
  } catch (error) {
    console.error("Error getting admins:", error);
    sendError(res, 500, "Failed to get admins");
  }
});

app.post("/api/admin/forum-admins", verifyFirebaseToken, async (req, res) => {
  try {
    const adminEmail = req.user.email;
    if (!(await isAdminEmail(adminEmail))) {
      return sendError(res, 403, "Only admin can add admins");
    }

    const { email } = req.body;
    if (!email || !email.includes("@")) {
      return sendError(res, 400, "Valid email is required");
    }

    const result = await forum.addAdmin(email, adminEmail);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error adding admin:", error);
    sendError(res, 500, "Failed to add admin");
  }
});

app.delete("/api/admin/forum-admins/:email", verifyFirebaseToken, async (req, res) => {
  try {
    const adminEmail = req.user.email;
    if (!(await isAdminEmail(adminEmail))) {
      return sendError(res, 403, "Only admin can remove admins");
    }

    const { email } = req.params;
    const emailLower = decodeURIComponent(email).toLowerCase();

    // Prevent removing yourself
    if (emailLower === adminEmail.toLowerCase()) {
      return sendError(res, 400, "Cannot remove yourself");
    }

    const result = await forum.removeAdmin(emailLower);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error removing admin:", error);
    sendError(res, 500, "Failed to remove admin");
  }
});

// User blocking endpoints
app.get("/api/admin/forum-blocked-users", verifyFirebaseToken, async (req, res) => {
  try {
    const adminEmail = req.user.email;
    if (!(await isAdminEmail(adminEmail))) {
      return sendError(res, 403, "Only admin can view blocked users");
    }

    const blockedUsers = await forum.getBlockedUsers();
    res.json({ success: true, blockedUsers });
  } catch (error) {
    console.error("Error getting blocked users:", error);
    sendError(res, 500, "Failed to get blocked users");
  }
});

app.post("/api/admin/forum-block-user", verifyFirebaseToken, async (req, res) => {
  try {
    const adminEmail = req.user.email;
    if (!(await isAdminEmail(adminEmail))) {
      return sendError(res, 403, "Only admin can block users");
    }

    const { userId, reason } = req.body;
    if (!userId) {
      return sendError(res, 400, "User ID is required");
    }

    const result = await forum.blockUser(userId, adminEmail, reason || "");
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error blocking user:", error);
    sendError(res, 500, "Failed to block user");
  }
});

app.post("/api/admin/forum-unblock-user", verifyFirebaseToken, async (req, res) => {
  try {
    const adminEmail = req.user.email;
    if (!(await isAdminEmail(adminEmail))) {
      return sendError(res, 403, "Only admin can unblock users");
    }

    const { userId } = req.body;
    if (!userId) {
      return sendError(res, 400, "User ID is required");
    }

    const result = await forum.unblockUser(userId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error("Error unblocking user:", error);
    sendError(res, 500, "Failed to unblock user");
  }
});

// Manual payment processing endpoint (for testing or alternative payment methods)
// This endpoint can be called after manual payment verification
app.post("/api/payments/process",
  [
    body("userEmail").trim().isEmail().withMessage("Valid email is required"),
    body("courseId").trim().notEmpty().withMessage("Course ID is required"),
    body("paymentId").optional().trim(),
    body("amount").optional().isFloat({ min: 0 }),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userEmail, courseId, paymentId, amount } = req.body;

      // Find course
      const course = courseStorage.find((c) => c.id === courseId);
      if (!course) {
        return sendError(res, 404, "Course not found");
      }

      // Grant course access
      if (!userCourseAccess.has(userEmail)) {
        userCourseAccess.set(userEmail, new Set());
      }
      userCourseAccess.get(userEmail).add(courseId);

      // Save to file
      await saveUserAccess(userCourseAccess);

      console.log(`✅ Manual payment processed: ${userEmail} -> ${courseId} (Payment ID: ${paymentId || 'N/A'})`);

      // If this is a free course (amount === 0) and SMTP is configured, send congratulations email to user
      if (mailTransporter && Number(amount) === 0) {
        try {
          await mailTransporter.sendMail({
            from: process.env.SMTP_FROM || process.env.SMTP_USER,
            to: userEmail,
            subject: `You now have access to ${course.title}`,
            text: `Hi!\n\nGreat news — you now have access to the course "${course.title}".\n\nYou can log in to your RedditGoldmine account and open the "My Courses" section to start watching the lessons.\n\nEnjoy the course and happy learning!\n\nRedditGoldmine Team`,
          });
          console.log(`📧 Free course welcome email sent to ${userEmail}`);
        } catch (emailError) {
          console.error("Error sending free course email:", emailError);
        }
      }
      return res.json({
        success: true,
        message: "Payment processed and access granted",
        userEmail,
        courseId,
        paymentId
      });
    } catch (error) {
      console.error("Error processing manual payment:", error);
      return sendError(res, 500, "Failed to process payment");
    }
  }
);

// Payment access request endpoint - user clicks "I already paid"
app.post(
  "/api/payments/request-access",
  verifyFirebaseToken,
  [
    body("courseId").trim().notEmpty().withMessage("Course ID is required"),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const userEmail = req.user.email;
      const { courseId } = req.body;

      console.log("📥 Access request received:", {
        email: userEmail,
        courseId,
        at: new Date().toISOString(),
      });

      // Create in-app notifications for admins (forum notification system)
      try {
        const admins = await forum.getAdmins(); // returns [{ email, ... }]
        const notifPromises = admins.map((adminInfo) =>
          forum.createNotification({
            userId: adminInfo.email, // use admin email as userId key in notifications
            type: "payment_request",
            title: "New payment access request",
            message: `User ${userEmail} clicked "I already paid – request access" for course: ${courseId}.`,
            link: "/admin", // where admin can manage access
            read: false,
          })
        );
        await Promise.all(notifPromises);
        console.log(`🔔 Created ${notifPromises.length} admin notifications for access request`);
      } catch (notifError) {
        console.error("Error creating admin notifications:", notifError);
      }

      // Send email notification to admins if SMTP is configured
      if (mailTransporter) {
        try {
          const adminEmails = (process.env.ADMIN_EMAILS || "")
            .split(",")
            .map((e) => e.trim())
            .filter(Boolean);

          if (adminEmails.length > 0) {
            await mailTransporter.sendMail({
              from: process.env.SMTP_FROM || process.env.SMTP_USER,
              to: adminEmails,
              subject: `💰 Payment Request: ${courseId}`,
              html: `
                <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                  <h2 style="color: #FF4500; margin-top: 0;">New Access Request</h2>
                  <p><strong>User:</strong> ${userEmail}</p>
                  <p><strong>Course:</strong> ${courseId}</p>
                  <p>The user clicked <em>"I already paid - request access"</em>.</p>
                  <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                  <p><strong>Action Required:</strong></p>
                  <ol>
                    <li>Verify payment in deStream.</li>
                    <li>Grant access via Admin Panel.</li>
                  </ol>
                </div>
              `,
            });
            console.log("📧 Access request email notification sent to admins");
          } else {
            console.warn("Access request received but ADMIN_EMAILS is empty");
          }
        } catch (emailError) {
          console.error("Error sending access request email:", emailError);
        }
      }

      return res.json({
        success: true,
        message:
          "Thanks! We received your request. We will verify your payment and activate course access as soon as possible.",
      });
    } catch (error) {
      console.error("Error handling access request:", error);
      return sendError(res, 500, "Failed to submit access request");
    }
  }
);

// Admin: Get payment access requests
app.get("/api/admin/payment-requests", verifyFirebaseToken, async (req, res) => {
  try {
    const adminEmail = req.user.email;
    if (!(await isAdminEmail(adminEmail))) {
      return sendError(res, 403, "Only admin can view payment requests");
    }

    // Query forum_notifications for payment_request type
    const snapshot = await admin.firestore()
      .collection("forum_notifications")
      .where("type", "==", "payment_request")
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const requests = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    }));

    res.json({ success: true, requests });
  } catch (error) {
    console.error("Error getting payment requests:", error);
    sendError(res, 500, "Failed to get payment requests");
  }
});


app.use((req, res, next) => {
  console.log("Unmatched request:", req.method, req.path);
  sendError(res, 404, "Route not found");
});

app.use((req, res, next) => {
  console.log("Unmatched request:", req.method, req.path);
  sendError(res, 404, "Route not found");
});

app.listen(PORT, async () => {
  console.log(`RedditGoldmine API running on http://localhost:${PORT}`);
  // Wait a bit for data to load
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log(`Server ready. Courses: ${courseStorage.length}, User access entries: ${userCourseAccess.size}`);
});

