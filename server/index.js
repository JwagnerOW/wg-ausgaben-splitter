import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { runOCR } from "./ocr.js";
import { parseReceipt } from "./parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, "uploads");
fs.mkdirSync(uploadsDir, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// --- File upload config ---
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (_req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname}`),
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Nur Bilddateien sind erlaubt."));
  },
});

// --- API: Scan receipt ---
app.post("/api/scan", upload.single("receipt"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Kein Bild hochgeladen." });

  try {
    console.log(`[OCR] Verarbeite ${req.file.filename} …`);
    const rawText = await runOCR(req.file.path);
    console.log(`[OCR] Text extrahiert (${rawText.length} Zeichen)`);

    const { items, receiptTotal } = parseReceipt(rawText);
    console.log(`[Parser] ${items.length} Artikel erkannt, Belegsumme: ${receiptTotal}`);

    res.json({ items, rawText, receiptTotal });
  } catch (err) {
    console.error("[Scan-Fehler]", err);
    res.status(500).json({ error: "Fehler beim Scannen: " + err.message });
  }
});

// --- API: Parse raw text (manual paste) ---
app.post("/api/parse", express.text(), (req, res) => {
  try {
    const { items, receiptTotal } = parseReceipt(req.body);
    res.json({ items, receiptTotal });
  } catch (err) {
    res.status(500).json({ error: "Parser-Fehler: " + err.message });
  }
});

// --- Serve React build in production ---
if (process.env.NODE_ENV === "production") {
  const clientDist = path.join(__dirname, "..", "client", "dist");
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.listen(PORT, () =>
  console.log(`[Server] Läuft auf http://localhost:${PORT}`)
);
