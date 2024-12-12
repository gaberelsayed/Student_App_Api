const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const path = require("path");
  
dotenv.config();

// Import the routes
const authRoutes = require("./routes/auth");
const adminRoutes = require("./routes/admin");
const visaApplicationRoutes = require("./routes/visaApplication");
const studentRoutes = require("./routes/student");
const { protect, roleAuth, assignUser } = require("./middlewares/auth");
const applicationRoutes = require("./routes/application");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware to serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Set up session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: { maxAge: 180 * 60 * 1000 }, // 3 hours
  })
);

// Middleware to parse application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// Middleware for JSON parsing
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware to assign session variables to locals
app.use(assignUser, (req, res, next) => {
  res.locals.request = req;
  res.locals.notification = req.session.notification || null;
  res.locals.currentUser = req.user || null;
  res.locals.errors = req.session.errors || null;
  next();
});

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/visa", visaApplicationRoutes);
app.use("/auth", authRoutes);
app.use("/admin", protect, roleAuth("admin"), adminRoutes);
app.use("/user", protect, roleAuth("user"), studentRoutes);

app.use("/api/admin", adminRoutes); // Admin routes
app.use("/api/application", applicationRoutes); // Application routes

// Catch-all route for redirecting
app.use("/", protect, (req, res) => {
  console.log(req.originalUrl);
  if (req.originalUrl == "/")
    return res.redirect(`/${req.user.role}/dashboard`);
  return res.render("404", { title: "Page Not Found" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
