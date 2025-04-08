const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const admin = require("firebase-admin");
const app = express();
const PORT = 3000;

// Initialize Firebase Admin
const serviceAccount = require("./serviceAccountKey.json"); // from Firebase Console
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

app.use(cors());
app.use(bodyParser.json());

app.post("/register", async (req, res) => {
  const { name, gender, email, contact, accommodation, paymentOption, proofUrl } = req.body;

  try {
    // Check for duplicates
    const existing = await db.collection("registrations")
      .where("email", "==", email)
      .get();

    if (!existing.empty) {
      return res.status(400).json({ message: "You've already registered with this email." });
    }

    // Save new record
    await db.collection("registrations").add({
      name,
      gender,
      email,
      contact,
      accommodation,
      paymentOption,
      proofUrl: proofUrl || "",
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ message: "Registration successful!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong!" });
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
