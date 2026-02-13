/**
 * Receipt Parser – extracts structured items from raw OCR text.
 *
 * Handles:
 *  - Standard German receipt formats (Lidl, Aldi, Rewe, Edeka, Penny, Netto …)
 *  - Quantity multipliers  (e.g. "1,95 x 2" or "0,25 x 12")
 *  - Discount fusion       (Rabattaktion, Preisvorteil, Aktionsnachlass → merged)
 *  - Pfand detection        (Einwegpfand / Pfand lines)
 *  - Pfandrückgabe          (deposit return as negative credit)
 *  - OCR digit correction   (leading 0↔8, 0↔9 are common Tesseract errors)
 *  - Extracts receipt total ("zu zahlen") for cross-checking
 *  - Auto-corrects prices with leading 8/9 using receipt total as reference
 */

// ── Patterns ──────────────────────────────────────────────────────────

const PRICE_RE = /(-?\d{1,4}[,.]\d{2,3})\s*[AB8]?\s*$/;
const QTY_INLINE_RE = /(\d{1,4}[,.]\d{1,3})\s*[xX×:]\s*(\d{1,4})/;
const DISCOUNT_RE =
  /rabattaktion|preisvorteil|aktionsnachlass|preisreduz|aktionsrabatt|coupon|gutschein/i;
const PFAND_RE = /\bpfand\b/i;
const PFAND_RETURN_RE = /pfandr[uü]ckgabe|leergut/i;
const TOTAL_RE =
  /^(summe|gesamt|gesamtsumme|endbetrag|zu zahlen|total\b|zwischensumme|bar\b|kartenzahlung|mastercard|visa|ec[- ]?karte|bezahlung|girocard|bezahlt|gegeben|r[uü]ckgeld|kreditkarte)/i;
const TOTAL_PATTERNS = [
  { re: /zu zahlen\s*[:]?\s*(-?\d{1,6}[,.]\d{2})/i },
  { re: /endbetrag\s*[:]?\s*(-?\d{1,6}[,.]\d{2})/i },
  { re: /gesamtsumme\s*[:]?\s*(-?\d{1,6}[,.]\d{2})/i },
  { re: /(?:^|\s)gesamt\s*[:]?\s*(-?\d{1,6}[,.]\d{2})/i },
  { re: /total\s*[:]?\s*(-?\d{1,6}[,.]\d{2})/i },
  { re: /(?:bar|ec[- ]?karte|kartenzahlung|girocard)\s+(-?\d{1,6}[,.]\d{2})/i },
  { re: /(?<!zwischen)summe\s*[:]?\s*(-?\d{1,6}[,.]\d{2})/i },
];
const SKIP_RE =
  /^(ust|mwst|steuer|netto|brutto|datum|uhr(?:zeit)?|kasse|bon\b|beleg\b|filiale|markt\b|tel[.:]|fax|www\.|http|vielen dank|tse|ust-id|str\.|plz|scheck|trinkgeld|eur$|\*{3,}|={3,}|-{5,}|_{3,})/i;
const NOISE_RE = /^-?\d{1,3}\s*[xX×]\s+\d/;
const TAX_SUFFIX_RE = /\s+[AB8]\s*$/;

// ── Helpers ───────────────────────────────────────────────────────────

function parseGermanFloat(str) {
  let clean = str.replace(",", ".");
  const dot = clean.indexOf(".");
  if (dot !== -1 && clean.length - dot - 1 > 2) {
    clean = clean.substring(0, dot + 3);
  }
  return parseFloat(clean);
}

function cleanDesc(raw) {
  return raw.replace(TAX_SUFFIX_RE, "").replace(/\s{2,}/g, " ").trim();
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function formatEur(n) {
  const sign = n < 0 ? "\u2212" : "+";
  return sign + Math.abs(n).toFixed(2).replace(".", ",") + " \u20AC";
}

/**
 * OCR correction candidates for discount amounts (used during parsing).
 * Only leading 8/9 → 0 (most reliable pattern).
 */
function discountCandidates(absVal) {
  const s = absVal.toFixed(2);
  const candidates = [];
  if (s[0] === "8" || s[0] === "9") {
    candidates.push(parseFloat("0" + s.substring(1)));
  }
  return candidates.filter((c) => !isNaN(c) && c >= 0);
}

/**
 * Unit-price candidates for qty lines (OCR often reads 0,29 as 6,29).
 */
function qtyUnitCandidates(unitPrice) {
  const s = Math.abs(unitPrice).toFixed(2);
  const candidates = [];
  if (s[0] === "6" && s.length >= 4) {
    candidates.push(parseFloat("0" + s.substring(1)));
  }
  if (s[0] === "8" || s[0] === "9") {
    candidates.push(parseFloat("0" + s.substring(1)));
  }
  return candidates.filter((c) => !isNaN(c) && c >= 0);
}

/**
 * OCR correction candidates for item prices (used in auto-correct pass).
 * Conservative: only the most reliable patterns to avoid false positives.
 *
 * Patterns:
 *  - Leading 8/9 → 0  (most common Tesseract error: 0 resembles 8/9)
 *  - Multi-digit "8X.YZ" → "X.YZ" → "0.YZ" (e.g. 83.95→3.95→0.95)
 */
function priceCandidates(val) {
  const s = Math.abs(val).toFixed(2);
  const candidates = [];

  // Leading 8/9 → 0 (most common Tesseract error)
  if (s[0] === "8" || s[0] === "9") {
    candidates.push(parseFloat("0" + s.substring(1)));
  }

  // Multi-digit: "83.95" → "3.95", then "0.95"
  if (s.length > 4 && (s[0] === "8" || s[0] === "9")) {
    const rest = s.substring(1);
    if (rest.includes(".")) {
      candidates.push(parseFloat(rest));
      if (rest[0] !== "0") {
        candidates.push(parseFloat("0" + rest.substring(1)));
      }
    }
  }

  // First decimal digit 9 → 0 (e.g. 1,99 → 1,09, typ. bei H-Milch etc.)
  if (s.length >= 4 && s[1] === "." && s[2] === "9") {
    candidates.push(parseFloat(s.substring(0, 2) + "0" + s[3]));
  }

  return candidates.filter((c) => !isNaN(c) && c >= 0);
}

/**
 * Validate a qty line: unit × qty ≈ total.
 * Returns { price, validated: true } if cross-check passes.
 */
function validateQtyLine(line, extractedTotal) {
  const qtyMatch = line.match(QTY_INLINE_RE);
  if (!qtyMatch) return { price: extractedTotal, validated: false };

  const unitRaw = qtyMatch[1];
  const qty = parseInt(qtyMatch[2], 10);
  const unitPrice = parseGermanFloat(unitRaw);

  // Direct match
  if (Math.abs(round2(unitPrice * qty) - extractedTotal) < 0.02) {
    return { price: extractedTotal, validated: true };
  }

  // Try correcting unit price (6→0 and 8/9→0 are common OCR errors)
  for (const c of qtyUnitCandidates(unitPrice)) {
    if (Math.abs(round2(c * qty) - extractedTotal) < 0.02) {
      return { price: extractedTotal, validated: true };
    }
  }
  for (const c of discountCandidates(unitPrice)) {
    if (Math.abs(round2(c * qty) - extractedTotal) < 0.02) {
      return { price: extractedTotal, validated: true };
    }
  }

  // Try correcting total
  for (const ct of priceCandidates(extractedTotal)) {
    if (Math.abs(round2(unitPrice * qty) - ct) < 0.02) {
      return { price: ct, validated: true };
    }
    for (const cu of qtyUnitCandidates(unitPrice)) {
      if (Math.abs(round2(cu * qty) - ct) < 0.02) {
        return { price: ct, validated: true };
      }
    }
    for (const cu of discountCandidates(unitPrice)) {
      if (Math.abs(round2(cu * qty) - ct) < 0.02) {
        return { price: ct, validated: true };
      }
    }
  }

  return { price: extractedTotal, validated: false };
}

function extractReceiptTotal(text) {
  for (const { re } of TOTAL_PATTERNS) {
    const m = text.match(re);
    if (m) return parseGermanFloat(m[1]);
  }
  // Fallback: "zu zahlen" / "gesamt" etc. may be split across lines (OCR)
  for (const kw of [/\bzu zahlen\b/i, /\bgesamtsumme\b/i, /\bendbetrag\b/i, /\btotal\b/i]) {
    const idx = text.search(kw);
    if (idx >= 0) {
      const tail = text.slice(idx).replace(kw, "").replace(/^\s*[:]?\s*/, "");
      const numMatch = tail.match(/^(-?\d{1,6}[,.]\d{2})/m);
      if (numMatch) return parseGermanFloat(numMatch[1]);
    }
  }
  return null;
}

/**
 * Auto-correct standalone prices (not qty-validated, not pfand, not discount-fused)
 * using the receipt total as reference.
 *
 * Strategy:
 *  1. Greedy: correct items with leading 8/9 that reduce total error
 *  2. Pairs: find canceling pairs that together reduce total error
 */
function autoCorrectPrices(items, receiptTotal) {
  if (receiptTotal === null || receiptTotal <= 0) return items;

  const currentSum = round2(items.reduce((s, it) => s + it.price, 0));
  if (Math.abs(currentSum - receiptTotal) < 0.02) return items;

  let bestItems = items.map((it) => ({ ...it }));
  let bestDiff = Math.abs(currentSum - receiptTotal);

  // ── Greedy pass ──────────────────────────────────────────────────
  // Each item can only be corrected ONCE to prevent cascading errors.
  const correctedSet = new Set();

  for (let pass = 0; pass < 30 && bestDiff > 0.02; pass++) {
    const sum = round2(bestItems.reduce((s, it) => s + it.price, 0));
    let bestCandidate = null;

    for (let i = 0; i < bestItems.length; i++) {
      if (correctedSet.has(i)) continue; // Already corrected → skip
      const item = bestItems[i];
      if (item.qtyValidated || item.pfand || item.note) continue;

      const candidates = item.pfandReturn
        ? priceCandidates(Math.abs(item.price)).map((c) => -c)
        : priceCandidates(item.price);

      for (const c of candidates) {
        const newSum = round2(sum - item.price + c);
        const newDiff = Math.abs(newSum - receiptTotal);

        if (newDiff < bestDiff - 0.005) {
          if (!bestCandidate || newDiff < bestCandidate.diff) {
            bestCandidate = { index: i, price: c, diff: newDiff };
          }
        }
      }
    }

    if (!bestCandidate) break;
    const item = bestItems[bestCandidate.index];
    bestItems[bestCandidate.index] = { ...item, price: bestCandidate.price, ocrCorrected: true };
    correctedSet.add(bestCandidate.index);
    bestDiff = bestCandidate.diff;
  }

  // ── Pair correction pass ────────────────────────────────────────
  if (bestDiff > 0.02) {
    const sum = round2(bestItems.reduce((s, it) => s + it.price, 0));
    const deficit = receiptTotal - sum;

    const options = [];
    for (let i = 0; i < bestItems.length; i++) {
      const item = bestItems[i];
      if (item.qtyValidated || item.pfand || item.note || item.ocrCorrected) continue;

      const candidates = item.pfandReturn
        ? priceCandidates(Math.abs(item.price)).map((c) => -c)
        : priceCandidates(item.price);

      for (const c of candidates) {
        options.push({ index: i, price: c, delta: round2(c - item.price) });
      }
    }

    let bestPair = null;
    let bestPairDiff = bestDiff;

    for (let a = 0; a < options.length; a++) {
      for (let b = a + 1; b < options.length; b++) {
        if (options[a].index === options[b].index) continue;
        const combined = options[a].delta + options[b].delta;
        const newDiff = Math.abs(deficit - combined);
        if (newDiff < bestPairDiff - 0.005) {
          bestPair = [options[a], options[b]];
          bestPairDiff = newDiff;
        }
      }
    }

    if (bestPair) {
      for (const opt of bestPair) {
        const item = bestItems[opt.index];
        bestItems[opt.index] = { ...item, price: opt.price, ocrCorrected: true };
      }
      bestDiff = Math.abs(round2(bestItems.reduce((s, it) => s + it.price, 0)) - receiptTotal);
    }
  }

  // ── Residual absorption (e.g. 0,09 € OCR/rounding) ─────────────────
  if (bestDiff >= 0.01 && bestDiff <= 0.50) {
    const sum = round2(bestItems.reduce((s, it) => s + it.price, 0));
    const deficit = round2(receiptTotal - sum);
    for (let i = 0; i < bestItems.length; i++) {
      const item = bestItems[i];
      if (item.qtyValidated || item.pfand || item.note) continue;
      const newPrice = round2(item.price + deficit);
      if (newPrice >= -0.01) {
        bestItems[i] = { ...item, price: newPrice, ocrCorrected: true };
        break;
      }
    }
  }

  return bestItems;
}

// ── Main Parser ───────────────────────────────────────────────────────

export function parseReceipt(text) {
  if (!text || typeof text !== "string") return { items: [], receiptTotal: null };

  const receiptTotal = extractReceiptTotal(text);
  console.log(`  [Parser] Detected receipt total: ${receiptTotal ?? "not found"}`);

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];
  let reachedTotal = false;
  let lastSkippedLine = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (SKIP_RE.test(line)) {
      lastSkippedLine = null;
      continue;
    }
    if (NOISE_RE.test(line)) continue;

    if (TOTAL_RE.test(line)) {
      lastSkippedLine = null;
      if (PFAND_RETURN_RE.test(line)) {
        const pm = line.match(PRICE_RE);
        if (pm) {
          const pv = parseGermanFloat(pm[1]);
          items.push({
            desc: "Pfandrückgabe",
            price: pv < 0 ? pv : -Math.abs(pv),
            pfandReturn: true,
          });
        }
      }
      reachedTotal = true;
      continue;
    }
    if (reachedTotal) {
      if (PFAND_RETURN_RE.test(line)) {
        const pm = line.match(PRICE_RE);
        if (pm) {
          const pv = parseGermanFloat(pm[1]);
          items.push({
            desc: "Pfandrückgabe",
            price: pv < 0 ? pv : -Math.abs(pv),
            pfandReturn: true,
          });
        }
      }
      continue;
    }

    const priceMatch = line.match(PRICE_RE);
    if (!priceMatch) {
      if (line.length > 2 && /[a-zA-Z\u00C0-\u024F]/.test(line)) {
        lastSkippedLine = line;
      }
      continue;
    }

    let price = parseGermanFloat(priceMatch[1]);
    let desc = line.substring(0, priceMatch.index).trim();

    // ── Discount fusion ───────────────────────────────────────────
    if (DISCOUNT_RE.test(line) || DISCOUNT_RE.test(desc)) {
      let discount = price;
      if (discount > 0) discount = -discount;
      const absDisc = Math.abs(discount);

      if (lastSkippedLine != null) {
        items.push({
          desc: cleanDesc(lastSkippedLine),
          price: -absDisc,
          note: (cleanDesc(desc) || "Rabatt") + ` (${formatEur(discount)})`,
        });
        lastSkippedLine = null;
        continue;
      }
      if (items.length > 0) {
        const prev = items[items.length - 1];
        if (prev.price + discount < 0) {
          for (const c of discountCandidates(absDisc)) {
            if (prev.price - c >= 0) {
              discount = -c;
              break;
            }
          }
        }
        prev.price = round2(prev.price + discount);
        prev.note = (cleanDesc(desc) || "Rabatt") + ` (${formatEur(discount)})`;
      }
      continue;
    }

    // ── Negative price (implicit discount) ────────────────────────
    if (price < 0 && items.length > 0 && !PFAND_RETURN_RE.test(line)) {
      let discount = price;
      const absDisc = Math.abs(discount);

      if (lastSkippedLine != null) {
        items.push({
          desc: cleanDesc(lastSkippedLine),
          price: -absDisc,
          note: (cleanDesc(desc) || "Rabatt") + ` (${formatEur(discount)})`,
        });
        lastSkippedLine = null;
        continue;
      }
      const prev = items[items.length - 1];
      if (prev.price + discount < 0) {
        for (const c of discountCandidates(absDisc)) {
          if (prev.price - c >= 0) {
            discount = -c;
            break;
          }
        }
      }
      prev.price = round2(prev.price + discount);
      prev.note = (cleanDesc(desc) || "Rabatt") + ` (${formatEur(discount)})`;
      continue;
    }

    // ── Pfandrückgabe ─────────────────────────────────────────────
    if (PFAND_RETURN_RE.test(line) || PFAND_RETURN_RE.test(desc)) {
      lastSkippedLine = null;
      items.push({
        desc: "Pfandrückgabe",
        price: price < 0 ? price : -Math.abs(price),
        pfandReturn: true,
      });
      continue;
    }

    // ── Pfand ─────────────────────────────────────────────────────
    if (PFAND_RE.test(line) || PFAND_RE.test(desc)) {
      lastSkippedLine = null;
      items.push({
        desc: cleanDesc(desc) || "Pfand",
        price: Math.abs(price),
        pfand: true,
      });
      continue;
    }

    // ── Validate qty lines ────────────────────────────────────────
    let qtyValidated = false;
    if (QTY_INLINE_RE.test(line)) {
      const result = validateQtyLine(line, price);
      price = result.price;
      qtyValidated = result.validated;
    }

    // ── Clean description ─────────────────────────────────────────
    desc = cleanDesc(desc);
    const qtyInline = desc.match(QTY_INLINE_RE);
    if (qtyInline) {
      desc = desc.substring(0, qtyInline.index).trim();
    }
    desc = desc.replace(/\d[,:;]\d+\s*(Kg|kg|St|st|Stk|stk)[;,.]?\s*\d*$/, "").trim();

    if (!desc) continue;

    lastSkippedLine = null;
    items.push({ desc, price, qtyValidated });
  }

  // ── Auto-correct using receipt total ────────────────────────────
  const corrected = autoCorrectPrices(items, receiptTotal);

  // Clean up internal flags from output
  const result = corrected.map(({ qtyValidated, ...rest }) => rest);

  const finalSum = round2(result.reduce((s, it) => s + it.price, 0));
  console.log(`  [Parser] Items: ${result.length}, Sum: ${finalSum}, Target: ${receiptTotal}`);

  return { items: result, receiptTotal };
}
