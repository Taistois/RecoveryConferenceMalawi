app.post("/register", async (req, res) => {
  const { name, gender, email, contact } = req.body;

  try {
    // Check for duplicate email
    const existing = await db.collection("registrations")
      .where("email", "==", email)
      .get();

    if (!existing.empty) {
      return res.status(400).json({ message: "You've already registered with this email." });
    }

    // Save to Firestore
    await db.collection("registrations").add({
      name,
      gender,
      email,
      contact,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ message: "Registration successful!" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong!" });
  }
});
