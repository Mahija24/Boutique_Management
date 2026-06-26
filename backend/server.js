import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";

import authRoutes from "./routes/authRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import calendarRoutes from "./routes/calendarRoutes.js";
import appointmentRoutes from "./routes/appointmentRoutes.js";
import galleryRoutes from "./routes/galleryRoutes.js";

dotenv.config();

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://boutique-management-lake.vercel.app",
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS policy: Origin not allowed"), false);
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());

// MongoDB Atlas Connection
// Configure mongoose and connect with retry logic so the server doesn't crash
mongoose.set("strictQuery", false);

const connectWithRetry = async (retries = 5, delay = 5000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("MongoDB connected successfully");
      try {
        await mongoose.connection.collection("loginrequests").dropIndex("approvalToken_1");
        console.log("Stale loginrequests index approvalToken_1 dropped successfully");
      } catch (err) {
        // Index does not exist or already dropped
      }
      return;
    } catch (error) {
      console.error(
        `MongoDB connection attempt ${attempt} failed: ${error.message}`,
      );
      if (attempt < retries) {
        console.log(`Retrying in ${delay}ms...`);
        // eslint-disable-next-line no-await-in-loop
        await new Promise((res) => setTimeout(res, delay));
      } else {
        console.error(
          "MongoDB connection failed after multiple attempts. Continuing without DB — some features may not work.",
        );
        // Do not exit the process; allow the server to run so nodemon can pick up fixes.
      }
    }
  }
};

connectWithRetry();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/gallery", galleryRoutes);

app.get("/", (req, res) => {
  res.send("Boutique Management API is running");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server started on port ${PORT}`);
});