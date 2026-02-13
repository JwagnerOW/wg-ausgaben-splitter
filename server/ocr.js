import { createWorker } from "tesseract.js";
import sharp from "sharp";
import fs from "fs/promises";

/**
 * Pre-process receipt images for optimal OCR.
 *
 * Strategy: produce TWO variants and let the caller pick the best.
 * Variant A: gentle (grayscale + normalize + sharpen, no threshold)
 * Variant B: aggressive (grayscale + normalize + sharpen + threshold)
 *
 * We run OCR on both and pick the one with more usable lines.
 */
async function preprocessVariants(imagePath) {
  const meta = await sharp(imagePath).metadata();
  const w = meta.width || 800;
  const h = meta.height || 600;
  console.log(`  [Sharp] Original: ${w}x${h}`);

  // Base pipeline: upscale small images
  function basePipeline() {
    let p = sharp(imagePath);
    if (w < 1000) {
      const scale = Math.ceil(1400 / w);
      p = p.resize({
        width: w * scale,
        height: h * scale,
        kernel: sharp.kernel.lanczos3,
      });
    } else if (w > 4000) {
      p = p.resize({ width: 3000 });
    }
    return p.grayscale().normalize().sharpen({ sigma: 1.0 });
  }

  // Variant A: no threshold (preserves subtle digit shapes like 0 vs 8)
  const pathA = imagePath + ".varA.png";
  await basePipeline().toFile(pathA);

  // Variant B: with threshold (cleaner but may confuse similar digits)
  const pathB = imagePath + ".varB.png";
  await basePipeline().threshold(160).toFile(pathB);

  return [pathA, pathB];
}

/**
 * Run OCR on a single image file.
 */
async function ocrOnImage(worker, imgPath) {
  const { data: { text } } = await worker.recognize(imgPath);
  return text;
}

/**
 * Heuristic: count how many lines look like receipt item lines (have a price).
 */
function scorePriceLines(text) {
  const priceRe = /\d[,.]\d{2}\s*[AB8]?\s*$/;
  return text.split("\n").filter((l) => priceRe.test(l.trim())).length;
}

/**
 * Run Tesseract OCR on a receipt image.
 * Produces two preprocessed variants and picks the better result.
 */
export async function runOCR(imagePath) {
  const variants = await preprocessVariants(imagePath);

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

    // OCR both variants
    const textA = await ocrOnImage(worker, variants[0]);
    const textB = await ocrOnImage(worker, variants[1]);

    await worker.terminate();

    const scoreA = scorePriceLines(textA);
    const scoreB = scorePriceLines(textB);

    console.log(`  [OCR] Variant A: ${textA.length} chars, ${scoreA} price lines`);
    console.log(`  [OCR] Variant B: ${textB.length} chars, ${scoreB} price lines`);

    // Pick variant with more price-bearing lines
    const best = scoreA >= scoreB ? textA : textB;
    console.log(`  [OCR] Picked variant ${scoreA >= scoreB ? "A (no-threshold)" : "B (threshold)"}`);
    return best;
  } finally {
    for (const p of variants) {
      await fs.unlink(p).catch(() => {});
    }
  }
}
