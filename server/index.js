import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { pdf } from "pdf-to-img";
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
    if (file.mimetype.startsWith("image/") || file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("Nur Bilder (JPG, PNG, …) oder PDF sind erlaubt."));
  },
});

/** PDF: erste Seite als PNG extrahieren, Pfad zurückgeben. Sonst original path. */
async function toImagePath(filePath, mimetype) {
  if (mimetype !== "application/pdf") return filePath;
  const outPath = filePath + ".page1.png";
  const doc = pdf(filePath, { scale: 2 });
  for await (const img of doc) {
    await fs.promises.writeFile(outPath, img);
    return outPath;
  }
  throw new Error("PDF enthält keine Seiten.");
}

// --- API: Scan receipt ---
app.post("/api/scan", upload.single("receipt"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Kein Bild oder PDF hochgeladen." });

  let imagePath = req.file.path;
  let tempPdfImage = null;

  try {
    if (req.file.mimetype === "application/pdf") {
      console.log(`[OCR] PDF erkannt, konvertiere erste Seite …`);
      imagePath = await toImagePath(req.file.path, req.file.mimetype);
      tempPdfImage = imagePath;
    }
    console.log(`[OCR] Verarbeite ${req.file.filename} …`);
    const rawText = await runOCR(imagePath);
    console.log(`[OCR] Text extrahiert (${rawText.length} Zeichen)`);

    const { items, receiptTotal } = parseReceipt(rawText);
    console.log(`[Parser] ${items.length} Artikel erkannt, Belegsumme: ${receiptTotal}`);

    res.json({ items, rawText, receiptTotal });
  } catch (err) {
    console.error("[Scan-Fehler]", err);
    res.status(500).json({ error: "Fehler beim Scannen: " + err.message });
  } finally {
    if (tempPdfImage) await fs.promises.unlink(tempPdfImage).catch(() => {});
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

const server = app.listen(PORT, () =>
  console.log(`[Server] Läuft auf http://localhost:${PORT}`)
);
server.timeout = 60000; // 60 s für OCR (Railway-Proxy-Timeout ggf. separat erhöhen)
