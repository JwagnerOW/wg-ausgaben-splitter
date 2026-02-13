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
  let p = sharp(imagePath);
  if (w < minWidth) {
    const scale = Math.ceil(minWidth / w);
    p = p.resize({
      width: w * scale,
      height: h * scale,
      kernel: sharp.kernel.lanczos3,
    });
  } else if (w > 4000) {
    p = p.resize({ width: 3000 });
  }
  const outPath = imagePath + ".ocr.png";
  await p.grayscale().normalize().sharpen({ sigma: 1.0 }).toFile(outPath);
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
