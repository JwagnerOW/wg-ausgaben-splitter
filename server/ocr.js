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

  const minWidth = 1500;
  const maxHeight = 3500;
  let targetW = w;
  let targetH = h;
  if (w < minWidth) {
    const scale = minWidth / w;
    targetW = minWidth;
    targetH = Math.round(h * scale);
  } else if (w > 3500) {
    targetW = 3500;
    targetH = Math.round(h * 3500 / w);
  }
  if (targetH > maxHeight) {
    targetH = maxHeight;
    targetW = Math.round(targetW * maxHeight / targetH);
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
