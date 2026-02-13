/**
 * Quick verification: parse Lidl-style receipt text and check sum.
 * Run: node server/parser-verify.js
 */
import { parseReceipt } from "./parser.js";

// Simulated OCR output for Lidl receipt (34,99 €) with typical errors:
// - 0,29 read as 6,29 on qty lines
// - Optional: Sandwich without price then Lidl Plus Rabatt
const lidlText = `
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

const { items, receiptTotal } = parseReceipt(lidlText);
const sum = items.reduce((s, it) => s + it.price, 0);
const sumRounded = Math.round(sum * 100) / 100;
const target = 34.99;
const ok = Math.abs(sumRounded - target) < 0.02 && receiptTotal === target;

console.log("Receipt total (parsed):", receiptTotal);
console.log("Items sum:", sumRounded);
console.log("Target:", target);
console.log("Match:", ok ? "OK" : "FAIL");
if (!ok) {
  console.log("Items count:", items.length);
  process.exit(1);
}
console.log("Verification passed.");