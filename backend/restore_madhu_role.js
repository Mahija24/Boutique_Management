import mongoose from "mongoose";
import User from "./models/User.js";

const MONGO_URI = "mongodb://127.0.0.1:27017/boutique_mgmt";

async function run() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    const updated = await User.findOneAndUpdate(
      { name: "madhu" },
      { role: "Staff" },
      { new: true }
    );

    if (updated) {
      console.log("SUCCESS: madhu's role restored back to Staff locally!", updated);
    } else {
      console.log("WARNING: madhu was not found in the local database.");
    }

    process.exit(0);
  } catch (err) {
    console.error("Failed to restore user role:", err);
    process.exit(1);
  }
}

run();
