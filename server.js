require("dotenv").config(); // Load .env variables
const express = require("express");
const admin = require("firebase-admin");
const path = require("path");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

console.log("🔐 Initializing Firebase Admin...");

// ✅ Use the raw service account file (place it in the same folder as server.js)
const serviceAccount = require("/etc/secrets/serviceAccountKey.json");

// ✅ Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ✅ Middleware
app.use(cors());
app.use(express.json()); // Built-in body parser
app.use(express.static("public")); // To serve index.html and static assets

// 🧾 Serve Frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 📨 Registration endpoint
app.post("/register", async (req, res) => {
  const { name, gender, email, contact } = req.body;

  try {
    const existing = await db.collection("registrations")
      .where("email", "==", email)
      .get();

    if (!existing.empty) {
      return res.status(400).json({ message: "You've already registered with this email." });
    }

    await db.collection("registrations").add({
      name,
      gender,
      email,
      contact,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ message: "Registration successful!" });
  } catch (error) {
    console.error("❌ Firestore error:", error);
    return res.status(500).json({ message: "An error occurred while registering. Try again." });
  }
});

// 🔐 Admin dashboard data route
app.get("/admin/registrations", async (req, res) => {
  try {
    const snapshot = await db.collection("registrations").orderBy("timestamp", "desc").get();
    const data = snapshot.docs.map(doc => ({
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate().toISOString() || "N/A"
    }));
    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching registrations:", err);
    res.status(500).json({ error: "Failed to fetch data." });
  }
});

// 🚀 Start Server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
