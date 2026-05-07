const express = require("express");
const cors = require("cors");
const path = require("path");
const mysql = require("mysql2");
const { spawn } = require("child_process");

const app = express();

// ================= DATABASE =================

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "money_detector",
});

db.connect((err) => {
  if (err) {
    console.error("Koneksi gagal:", err);
  } else {
    console.log("MySQL Connected!");
  }
});

// ================= MIDDLEWARE =================

app.use(cors());

app.use(express.json({ limit: "50mb" }));

app.use(
  express.urlencoded({
    limit: "50mb",
    extended: true,
  }),
);

app.use(express.static("frontend"));

app.use(express.static(path.join(__dirname, "public")));

// ================= ROUTE =================

// halaman utama
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/frontend/index.html");
});

// ================= TEST DATABASE =================

app.get("/test-db", (req, res) => {
  db.query("SELECT 1", (err) => {
    if (err) {
      return res.send("Database error");
    }

    res.send("Database connected!");
  });
});

// ================= SCAN UANG =================

app.post("/scan-uang", (req, res) => {
  const { image } = req.body;

  const py = spawn("python", ["detect.py"]);

  py.stdin.write(
    JSON.stringify({
      image: image,
    }),
  );

  py.stdin.end();

  let data = "";

  py.stdout.on("data", (chunk) => {
    data += chunk.toString();
  });

  py.stderr.on("data", (err) => {
    console.error("Python error:", err.toString());
  });

  py.on("close", () => {
    try {
      const result = JSON.parse(data);

      const sql =
        "INSERT INTO scans (image, result, confidence) VALUES (?, ?, ?)";

      db.query(sql, [image, result.hasil, result.confidence], (err) => {
        if (err) {
          console.error(err);

          return res.status(500).json({
            error: "Gagal simpan data",
          });
        }

        res.json(result);
      });
    } catch (err) {
      console.error("Parse error:", err);

      res.json({
        hasil: "error deteksi",
        confidence: 0,
      });
    }
  });
});

// ================= HISTORY =================

app.get("/history", (req, res) => {
  const sql = "SELECT * FROM scans ORDER BY created_at DESC";

  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        error: "Gagal ambil data",
      });
    }

    res.json(results);
  });
});

// ================= SUMMARY =================

app.get("/summary", (req, res) => {
  const sql = `
    SELECT
      COUNT(*) as total,

      SUM(
        CASE
          WHEN result = 'asli'
          THEN 1
          ELSE 0
        END
      ) as asli,

      SUM(
        CASE
          WHEN result = 'kemungkinan asli'
          THEN 1
          ELSE 0
        END
      ) as kemungkinan,

      SUM(
        CASE
          WHEN result = 'palsu'
          THEN 1
          ELSE 0
        END
      ) as palsu

    FROM scans
  `;

  db.query(sql, (err, result) => {
    if (err) {
      console.error(err);

      return res.status(500).json({
        error: "Gagal ambil summary",
      });
    }

    res.json(result[0]);
  });
});

// ================= PAYMENT =================

app.get("/payment-summary", (req, res) => {
  res.json({
    cash: 12,
    debit: 8,
    digital: 15,
  });
});

// ================= RUN SERVER =================

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
