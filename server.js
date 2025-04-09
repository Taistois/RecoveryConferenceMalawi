require("dotenv").config();
const express = require("express");
const admin = require("firebase-admin");
const path = require("path");
const cors = require("cors");
const nodemailer = require("nodemailer");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

console.log("🔐 Initializing Firebase Admin...");
const serviceAccount = require("/etc/secrets/serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.post("/register", async (req, res) => {
  const { name, gender, email, contact, sop, others = [] } = req.body;

  try {
    const existing = await db.collection("registrations").where("email", "==", email).get();
    if (!existing.empty) {
      return res.status(400).json({ message: "You've already registered with this email." });
    }

    await db.collection("registrations").add({
      name,
      gender,
      email,
      contact,
      sop,
      others,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    const templatePath = path.join(__dirname, "emailTemplate.html");
    let rawTemplate = fs.readFileSync(templatePath, "utf8");

    const othersList = others.length > 0 
      ? `<p><strong>You also registered the following:</strong><br>${others.map(o => `• ${o}`).join("<br>")}</p>`
      : "";

    const customizedHTML = rawTemplate
      .replace("{{name}}", name)
      .replace("{{sop}}", sop)
      .replace("{{others}}", othersList);

    const mailOptions = {
      from: `"Recovery Conference" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "✅ Recovery Conference Registration Confirmation",
      html: customizedHTML,
    };

    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: "Registration successful!" });

  } catch (error) {
    console.error("❌ Firestore error:", error);
    return res.status(500).json({ message: "An error occurred while registering. Try again." });
  }
});

app.get("/admin/registrations", async (req, res) => {
  try {
    const snapshot = await db.collection("registrations").orderBy("timestamp", "desc").get();
    const registrations = [];

    snapshot.forEach(doc => {
      registrations.push({ id: doc.id, ...doc.data() });
    });

    res.json(registrations);
  } catch (error) {
    console.error("❌ Failed to fetch registrations:", error);
    res.status(500).json({ message: "Error loading registrations" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
