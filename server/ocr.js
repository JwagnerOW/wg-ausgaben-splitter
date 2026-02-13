import { createWorker } from "tesseract.js";
import sharp from "sharp";
import fs from "fs/promises";

/**
 * Pre-process receipt image for OCR (one variant for speed).
 * Grayscale, normalize, sharpen; no threshold to preserve 0 vs 8.
 */
async function preprocessImage(imagePath) {
  const meta = await sharp(imagePath).metadata();
  const w = meta.width || 800;
  const h = meta.height || 600;
  console.log(`  [Sharp] Original: ${w}x${h}`);

  const minWidth = 2000;
  const maxPixels = 2000 * 4000; // OOM auf Railway vermeiden
  let targetW = w;
  let targetH = h;
  if (w < minWidth) {
    const scale = Math.ceil(minWidth / w);
    targetW = w * scale;
    targetH = h * scale;
  } else if (w > 4000) {
    targetW = 3000;
    targetH = Math.round(h * 3000 / w);
  }
  if (targetW * targetH > maxPixels) {
    const scale = Math.sqrt(maxPixels / (targetW * targetH));
    targetW = Math.round(targetW * scale);
    targetH = Math.round(targetH * scale);
  }
  console.log(`  [Sharp] Target: ${targetW}x${targetH}`);
  const outPath = imagePath + ".ocr.png";
  await sharp(imagePath)
    .resize(targetW, targetH, { kernel: sharp.kernel.lanczos3 })
    .grayscale()
    .normalize()
    .sharpen({ sigma: 1.0 })
    .toFile(outPath);
  return outPath;
}

/**
 * Run Tesseract OCR on a receipt image (single pass for speed, avoids 30s timeout).
 */
export async function runOCR(imagePath) {
  const preprocessedPath = await preprocessImage(imagePath);

  try {
    const worker = await createWorker("deu", 1, {
      logger: (m) => {
        if (m.status === "recognizing text") {
          const pct = Math.round((m.progress || 0) * 100);
          if (pct % 25 === 0) console.log(`  [Tesseract] ${pct}%`);
        }
      },
    });

    await worker.setParameters({
      tessedit_pageseg_mode: "6",
      preserve_interword_spaces: "1",
    });

    const { data: { text } } = await worker.recognize(preprocessedPath);
    await worker.terminate();

    console.log(`  [OCR] Text: ${text.length} Zeichen`);
    return text;
  } finally {
    await fs.unlink(preprocessedPath).catch(() => {});
  }
}
