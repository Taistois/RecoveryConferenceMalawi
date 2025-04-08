const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Firebase Admin SDK setup using env var
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Serve frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Register endpoint
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
    console.error("🔥 Firestore error:", error);
    return res.status(500).json({ message: "An error occurred while registering. Try again." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
