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
  let { name, gender, email, contact, sop, joinSOP, others = [] } = req.body;

  try {
    // Ensure "others" is always an array
    if (typeof others === "string") {
      others = others.split(",").map(o => o.trim()).filter(Boolean);
    } else if (!Array.isArray(others)) {
      others = [];
    }

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
      joinSOP,
      others,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    const templatePath = path.join(__dirname, "emailTemplate.html");
    let rawTemplate = fs.readFileSync(templatePath, "utf8");

    const othersList = Array.isArray(others) && others.length > 0
      ? `<p><strong>You also registered the following:</strong><br>${others.map(o => `• ${o}`).join("<br>")}</p>`
      : "";

    const joinSOPText = joinSOP
      ? `<p><strong>Would like to join Son of Prophet (SOP):</strong> ${joinSOP}</p>`
      : "";

    const customizedHTML = rawTemplate
      .replace("{{name}}", name)
      .replace("{{sop}}", sop === "Yes" ? "Yes (Son of Prophet)" : sop)
      .replace("{{joinSOP}}", joinSOPText)
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

// ✅ Admin route with safe timestamp fix
app.get("/admin/registrations", async (req, res) => {
  try {
    const snapshot = await db.collection("registrations").orderBy("timestamp", "desc").get();
    const data = snapshot.docs.map(doc => {
      const d = doc.data();
      let formattedDate = "Not Available";

      if (d.timestamp && typeof d.timestamp.toDate === "function") {
        const dateObj = d.timestamp.toDate();
        if (!isNaN(dateObj.getTime())) {
          formattedDate = dateObj.toLocaleString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });
        }
      }

      return {
        name: d.name || "",
        gender: d.gender || "",
        email: d.email || "",
        contact: d.contact || "",
        sop: d.sop === "Yes" ? "Yes (Son of Prophet)" : d.sop || "",
        others: Array.isArray(d.others) ? d.others : [],
        timestamp: formattedDate,
      };
    });

    res.json(data);
  } catch (err) {
    console.error("❌ Error fetching admin registrations:", err);
    res.status(500).json({ message: "Failed to fetch registrations." });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
