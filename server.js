const express = require('express');
const multer = require('multer');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Set static folder
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Set view folder
app.use(express.static('views'));

// Multer setup for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// POST route for form submission
app.post('/register', upload.single('proof'), (req, res) => {
  const data = req.body;
  const file = req.file;

  console.log('Form submitted:');
  console.log('Data:', data);
  console.log('Uploaded file:', file);

  res.send(`<h2>Thank you, ${data.name}! Your registration is complete.</h2>`);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
