app.post("/register", async (req, res) => {
  const { name, gender, email, contact } = req.body;

  console.log("Received data:", req.body); // 👈 Check incoming data

  try {
    const existing = await db.collection("registrations")
      .where("email", "==", email)
      .get();

    if (!existing.empty) {
      console.log("Duplicate email found.");
      return res.status(400).json({ message: "You've already registered with this email." });
    }

    await db.collection("registrations").add({
      name,
      gender,
      email,
      contact,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log("✅ Registration saved!");
    return res.status(200).json({ message: "Registration successful!" });
  } catch (error) {
    console.error("🔥 Firestore Save Error:", error); // 👈 LOG THIS
    return res.status(500).json({ message: "An error occurred while registering. Try again." });
  }
});
