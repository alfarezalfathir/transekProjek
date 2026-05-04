const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();

const mysql = require("mysql2");

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "", // default Laragon kosong
  database: "money_detector",
});

db.connect((err) => {
  if (err) {
    console.error("Koneksi gagal:", err);
  } else {
    console.log("MySQL Connected!");
  }
});

// middleware
app.use(cors());
// app.use(express.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(express.static("frontend"));
app.use(express.static(path.join(__dirname, "public")));

// route utama (test)
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/frontend/index.html");
});

// TEST KONEKSI
app.get("/test-db", (req, res) => {
  db.query("SELECT 1", (err, result) => {
    if (err) {
      res.send("Database error");
    } else {
      res.send("Database connected!");
    }
  });
});

// Tambahkan API Insertdata hasil scan ke database
app.get("/test-insert", (req, res) => {
  const sql = "INSERT INTO scans (image, result, confidence) VALUES (?, ?, ?)";

  db.query(sql, ["test_image", "asli", 0.9], (err, result) => {
    if (err) {
      console.error(err);
      res.send("Gagal insert data");
    } else {
      res.send("Data berhasil disimpan!");
    }
  });
});

// API untuk menerima hasil scan dari frontend
app.post("/scan-uang", (req, res) => {
  const { image } = req.body;

  // dummy hasil dulu
  const hasil = "kemungkinan asli";
  const confidence = 0.8;

  const sql = "INSERT INTO scans (image, result, confidence) VALUES (?, ?, ?)";

  db.query(sql, [image, hasil, confidence], (err, resultDB) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Gagal simpan data" });
    }

    res.json({
      hasil: hasil,
      confidence: confidence,
    });
  });
});

// API untuk ambil history scan
app.get("/history", (req, res) => {
  const sql = "SELECT * FROM scans ORDER BY created_at DESC";

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Gagal ambil data" });
    }

    res.json(results);
  });
});

// API untuk ambil summary hasil scan
app.get("/pos-summary", (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) as total_scan,
      SUM(CASE WHEN result LIKE '%asli%' THEN 1 ELSE 0 END) as total_asli,
      SUM(CASE WHEN result LIKE '%palsu%' THEN 1 ELSE 0 END) as total_palsu
    FROM scans
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Gagal ambil data POS" });
    }

    res.json(result[0]);
  });
});

// jalankan server
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
