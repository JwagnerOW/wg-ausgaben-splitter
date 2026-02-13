/**
 * Test all three receipt types:
 * - Receipt 1 & 2: Lidl 34,99 € (Stuttgart-Feuerbach)
 * - Receipt 3: Lidl 114,11 € (long receipt with Rabattaktion, Preisvorteil, Pfand)
 *
 * Run: node server/test-all-receipts.js [img1.png img2.png img3.png]
 * If image paths are given, runs full OCR + parse. Otherwise uses simulated OCR text.
 */
import { runOCR } from "./ocr.js";
import { parseReceipt } from "./parser.js";
import path from "path";
import fs from "fs/promises";

const RECEIPT_1_TEXT = `
Gemüsezwiebeln 1,49 A
Picco Pizzi 3Käse 2,49 x 3 7,47 A
Sandwichs Cheddar 2,69 A
Lidl Plus Rabatt -0,90
Sandwich Emmentaler 2,69 A
Lidl Plus Rabatt -0,90
Baguettes Kräuter 1,95 A
Rabatt Baguette -0,46
Baguettee Knoblauch 1,95 A
Rabatt Baguette -0,46
Ananas Scheiben 2,55 A
KongStrong Juneberry 6,29 x 15 4,35 B
Pfand 0,25 EM 0,25 x 15 3,75 B
KongStr. Kokos-Blaube 6,29 x 13 3,77 B
Pfand 0,25 EM 0,25 x 13 3,25 B
Happy Hippo Cacao 2,39 A
RABATT 20% -0,48
Croissant Schin 0,79 A
Küchentücher 3-lagig 2,75 B
Supers. Teachentücher 2,85 B
Pfandrückgabe -6,50
zu zahlen 34,99
`;

const RECEIPT_2_TEXT = `
Gemüsezwiebeln 1,49 A
Picco Pizzi 3Käse 2,49 x 3 7,47 A
Sandwich Cheddar 2,69 A
Lidl Plus Rabatt -0,90
Sandwich Emmentaler 2,69 A
Lidl Plus Rabatt -0,90
Baguettes Kräuter 1,95 A
Rabatt Baguette -0,46
Baguettes Knoblauch 1,95 A
Rabatt Baguette -0,46
Ananas Scheiben 2,55 A
KongStrong Juneberry 0,29 x 15 4,35 B
Pfand 0,25 EM 0,25 x 15 3,75 B
KongStr. Kokos-Blaube 0,29 x 13 3,77 B
Pfand 0,25 EM 0,25 x 13 3,25 B
Happy Hippo Cacao 2,39 A
RABATT 20% -0,48
Croissant Schin 8,79 A
Küchentücher 3-lagig 2,75 B
Supers. Taschentücher 2,85 B
Pfandrückgabe -6,50
zu zahlen 34,99
`;

const RECEIPT_3_TEXT = `
Iglo Freibad Pommes 1,99 A
Bio Kaisergemüse 2,69 A
Pizzateig m. Sauce 1,99 x 2 3,98 A
Rabattaktion -0,20
Feine Buabaspitzle 1,79 x 2 3,58 A
Gratinkäse ger.clas. 1,99 x 3 5,97 A
Vegan. Rostbratwürst. 1,79 x 3 5,37 A
TanteFanny Flammkuch 2,89 x 2 5,78 A
Bioland Tofu natur 2,19 A
Bioland Tofu geräu. 2,19 A
Kinder Milchschnitte 2,19 A
Halloumi g.U. 2,49 x 2 4,98 A
Schmand 0,99 x 5 4,95 A
Rabattaktion -0,50
Pommes-Sauce 1,59 x 2 3,18 A
Eier Bodenhalt. 18er 3,39 A
Jodsalz mit Fluorid 0,29 A
Rapsöl 11 1,49 A
Fusilli 0,79 x 2 1,58 A
Olivenöl 5,99 A
H-Milch 3,5% 1,99 A
Schmelzkäse Toast 1,79 x 2 3,58 A
Preisvorteil -0,60
Bioland Apfelessig 1,55 A
Bio Apfel o. Zucker 0,85 A
Ananas Scheiben 2,55 x 2 5,10 A
Sonnenmais 0,99 A
Kokusnuss-Mil Normal 1,19 A
Weinsauerkraut 0,79 A
Zitronensaft 0,79 B
Mineralwasser 0,29 x 12 3,48 B
Pfand 0,25 EM 0,25 x 12 3,00 B
Schwip Schwap Lem.Ze 0,88 x 18 15,84 B
Pfand 0,25 M 0,25 x 18 4,50 B
Orangenlimonade Zero 0,65 x 12 7,80 B
Pfand 0,25 EM 0,25 x 12 3,00 B
Energy KokosBlaub. 0,39 x 7 2,73 B
Pfand 0,25 EM 0,25 x 7 1,75 B
Weizen Sandwi. Toast 1,09 A
Baguette Brötch. 6er 0,69 x 3 2,07 A
Küchentücher 2lagigl 3,89 B
Backpapier 0,95 B
Softlan Ultr.Windfr. 3,25 B
Mundspülung X-Tra 0,85 B
Pfandrückgabe -0,25 A
Pfandrückgabe -16,25 B
zu zahlen 114,11
`;

// Simulated OCR: one price wrong by 0,09 (2,69 → 2,60), sum would be 34,90
const RECEIPT_009_DIFF = `
Gemüsezwiebeln 1,49 A
Picco Pizzi 3Käse 2,49 x 3 7,47 A
Sandwich Cheddar 2,60 A
Lidl Plus Rabatt -0,90
Sandwich Emmentaler 2,69 A
Lidl Plus Rabatt -0,90
Baguettes Kräuter 1,95 A
Rabatt Baguette -0,46
Baguettes Knoblauch 1,95 A
Rabatt Baguette -0,46
Ananas Scheiben 2,55 A
KongStrong Juneberry 0,29 x 15 4,35 B
Pfand 0,25 EM 0,25 x 15 3,75 B
KongStr. Kokos-Blaube 0,29 x 13 3,77 B
Pfand 0,25 EM 0,25 x 13 3,25 B
Happy Hippo Cacao 2,39 A
RABATT 20% -0,48
Croissant Schin 0,79 A
Küchentücher 3-lagig 2,75 B
Supers. Taschentücher 2,85 B
Pfandrückgabe -6,50
zu zahlen 34,99
`;

const TESTS = [
  { name: "Receipt 1 (34,99 €, OCR 6,29)", text: RECEIPT_1_TEXT, expected: 34.99 },
  { name: "Receipt 2 (34,99 €, OCR 8,79 Croissant)", text: RECEIPT_2_TEXT, expected: 34.99 },
  { name: "Receipt 3 (114,11 €)", text: RECEIPT_3_TEXT, expected: 114.11 },
  { name: "0,09 € Differenz (Rest-Korrektur)", text: RECEIPT_009_DIFF, expected: 34.99 },
];

function runOne(name, text, expected) {
  const { items, receiptTotal } = parseReceipt(text);
  const sum = Math.round(items.reduce((s, it) => s + it.price, 0) * 100) / 100;
  const ok = Math.abs(sum - expected) < 0.02 && receiptTotal !== null && Math.abs((receiptTotal || 0) - expected) < 0.02;
  return { name, sum, receiptTotal, expected, ok, itemCount: items.length };
}

async function runWithImage(imagePath, expected) {
  const rawText = await runOCR(imagePath);
  const { items, receiptTotal } = parseReceipt(rawText);
  const sum = Math.round(items.reduce((s, it) => s + it.price, 0) * 100) / 100;
  const ok = Math.abs(sum - expected) < 0.02 && receiptTotal !== null && Math.abs((receiptTotal || 0) - expected) < 0.02;
  return { sum, receiptTotal, expected, ok, itemCount: items.length, rawTextLength: rawText.length };
}

async function main() {
  const args = process.argv.slice(2);
  const useImages = args.length >= 3;

  console.log("=== WG-Ausgaben-Splitter – Belegtests ===\n");

  if (useImages) {
    const paths = args.slice(0, 3);
    const expected = [34.99, 34.99, 114.11];
    for (let i = 0; i < 3; i++) {
      const p = path.resolve(paths[i]);
      try {
        await fs.access(p);
      } catch {
        console.log(`Bild nicht gefunden: ${p}`);
        process.exit(1);
      }
      console.log(`Test ${i + 1}: ${path.basename(p)} (erwartet ${expected[i]} €)`);
      const result = await runWithImage(p, expected[i]);
      console.log(`  Summe: ${result.sum} € | Belegsumme: ${result.receiptTotal} € | Artikel: ${result.itemCount}`);
      console.log(`  ${result.ok ? "OK" : "FEHLER"}\n`);
      if (!result.ok) process.exit(1);
    }
    console.log("Alle drei Bild-Tests bestanden.");
    return;
  }

  let failed = 0;
  for (const t of TESTS) {
    const result = runOne(t.name, t.text, t.expected);
    console.log(`${result.name}`);
    console.log(`  Summe: ${result.sum} € | Belegsumme: ${result.receiptTotal} € | Artikel: ${result.itemCount}`);
    console.log(`  ${result.ok ? "OK" : "FEHLER"}\n`);
    if (!result.ok) failed++;
  }

  if (failed > 0) {
    console.log(`${failed} Test(s) fehlgeschlagen.`);
    process.exit(1);
  }
  console.log("Alle drei Beleg-Tests bestanden.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
