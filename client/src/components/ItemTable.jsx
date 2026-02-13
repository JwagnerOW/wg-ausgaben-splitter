import { useState, useMemo } from "react";

function formatPrice(p) {
  const sign = p < 0 ? "\u2212" : "";
  return sign + Math.abs(p).toFixed(2).replace(".", ",") + " \u20AC";
}

function EditableCell({ value, onSave, type = "text", className = "" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  function start() {
    setDraft(type === "number" ? String(value).replace(".", ",") : value);
    setEditing(true);
  }

  function save() {
    setEditing(false);
    if (type === "number") {
      const parsed = parseFloat(String(draft).replace(",", "."));
      if (!isNaN(parsed)) onSave(Math.round(parsed * 100) / 100);
    } else {
      if (draft.trim()) onSave(draft.trim());
    }
  }

  if (editing) {
    return (
      <input
        className={`edit-input ${className}`}
        type="text"
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <span className="editable" onClick={start}>
      {type === "number" ? formatPrice(value) : value}
    </span>
  );
}

export default function ItemTable({
  items,
  members,
  assignments,
  quantities = {},
  receiptTotal: detectedTotal,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
  onToggleAssign,
  onAssignAll,
  onAssignNone,
  onSetQuantities,
}) {
  const [newDesc, setNewDesc] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [receiptTotalInput, setReceiptTotalInput] = useState("");

  // Auto-populate from OCR-detected total
  const receiptTotal =
    receiptTotalInput.trim() !== ""
      ? receiptTotalInput
      : detectedTotal !== null && detectedTotal !== undefined
        ? String(detectedTotal).replace(".", ",")
        : "";

  const calculatedTotal = useMemo(
    () => Math.round(items.reduce((sum, it) => sum + it.price, 0) * 100) / 100,
    [items]
  );

  const receiptTotalNum = useMemo(() => {
    if (!receiptTotal.trim()) return null;
    const parsed = parseFloat(receiptTotal.replace(",", "."));
    return isNaN(parsed) ? null : Math.round(parsed * 100) / 100;
  }, [receiptTotal]);

  const totalDiff =
    receiptTotalNum !== null
      ? Math.round((calculatedTotal - receiptTotalNum) * 100) / 100
      : null;

  function handleAdd() {
    const desc = newDesc.trim();
    const price = parseFloat(newPrice.replace(",", "."));
    if (!desc || isNaN(price)) return;
    onAddItem(desc, Math.round(price * 100) / 100);
    setNewDesc("");
    setNewPrice("");
  }

  if (items.length === 0 && !members.length) {
    return (
      <div className="card">
        <h2>
          <span className="icon">&#128722;</span> Artikel & Zuweisung
        </h2>
        <p className="empty-state">
          Kassenzettel scannen oder Artikel manuell hinzufügen.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>
        <span className="icon">&#128722;</span> Artikel & Zuweisung
      </h2>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th className="col-desc">Artikel</th>
              <th className="col-price">Preis</th>
              <th className="col-assign">Zuweisung</th>
              <th className="col-actions"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const assigned = assignments[idx] || new Set();
              const q = quantities[idx];
              const quantityMode = q && typeof q === "object";
              const priceClass = item.price < 0 ? "price-neg" : "price-pos";

              function enableQuantityMode() {
                const per = {};
                members.forEach((_, mi) => {
                  per[mi] = assigned.has(mi) ? 1 : 0;
                });
                onSetQuantities(idx, per);
              }

              function setQty(mi, val) {
                const n = Math.max(0, parseInt(val, 10) || 0);
                const next = { ...q };
                next[mi] = n;
                onSetQuantities(idx, next);
              }

              return (
                <tr key={idx}>
                  <td className="col-desc">
                    <EditableCell
                      value={item.desc}
                      onSave={(v) => onUpdateItem(idx, "desc", v)}
                    />
                    {item.pfand && <span className="badge badge-pfand">Pfand</span>}
                    {item.pfandReturn && (
                      <span className="badge badge-return">Pfandrückgabe</span>
                    )}
                    {item.note && (
                      <span className="badge badge-rabatt">{item.note}</span>
                    )}
                    {item.ocrCorrected && (
                      <span className="badge badge-ocr">OCR-korrigiert</span>
                    )}
                  </td>
                  <td className={`col-price ${priceClass}`}>
                    <EditableCell
                      value={item.price}
                      type="number"
                      className="edit-input-price"
                      onSave={(v) => onUpdateItem(idx, "price", v)}
                    />
                  </td>
                  <td className="col-assign">
                    <div className="assign-cells">
                      {quantityMode ? (
                        <>
                          {members.map((name, mi) => (
                            <span key={mi} className="assign-qty-wrap">
                              <label>{name}</label>
                              <input
                                type="number"
                                min={0}
                                value={q[mi] ?? 0}
                                onChange={(e) => setQty(mi, e.target.value)}
                                className="assign-qty-input"
                              />
                            </span>
                          ))}
                          <span className="assign-qty-sum">
                            Σ {Object.values(q).reduce((s, n) => s + (Number(n) || 0), 0)}
                          </span>
                          <div className="assign-btns">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => onSetQuantities(idx, null)}
                              title="Zurück zu Checkbox-Zuweisung"
                            >
                              Gleich
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          {members.map((name, mi) => (
                            <label
                              key={mi}
                              className={assigned.has(mi) ? "checked" : ""}
                            >
                              <input
                                type="checkbox"
                                checked={assigned.has(mi)}
                                onChange={() => onToggleAssign(idx, mi)}
                              />
                              {name}
                            </label>
                          ))}
                          <div className="assign-btns">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => onAssignAll(idx)}
                            >
                              Alle
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => onAssignNone(idx)}
                            >
                              Keine
                            </button>
                            {onSetQuantities && (
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={enableQuantityMode}
                                title="Stück pro Person (z.B. 1, 3, 0)"
                              >
                                Anteile
                              </button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="col-actions">
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      title="Artikel entfernen"
                      onClick={() => onRemoveItem(idx)}
                    >
                      &times;
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Gesamtkosten-Abgleich ──────────────────────────────── */}
      {items.length > 0 && (
        <div className="total-bar">
          <div className="total-bar-left">
            <span className="total-label">Berechnete Summe:</span>
            <span className="total-value">{formatPrice(calculatedTotal)}</span>
          </div>
          <div className="total-bar-right">
            <label className="total-label" htmlFor="receipt-total-input">
              Summe lt. Kassenzettel:
            </label>
            <input
              id="receipt-total-input"
              type="text"
              placeholder="z.B. 114,11"
              value={receiptTotal}
              onChange={(e) => setReceiptTotalInput(e.target.value)}
              style={{ width: 110 }}
            />
            {totalDiff !== null && (
              <span
                className={`total-diff ${
                  Math.abs(totalDiff) < 0.02
                    ? "diff-ok"
                    : "diff-warn"
                }`}
              >
                {Math.abs(totalDiff) < 0.02
                  ? "Stimmt!"
                  : `Differenz: ${formatPrice(totalDiff)}`}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="add-item-row">
        <input
          type="text"
          placeholder="Artikel hinzufügen …"
          value={newDesc}
          onChange={(e) => setNewDesc(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <input
          type="text"
          placeholder="Preis (z.B. 2,99)"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          style={{ width: 120 }}
        />
        <button type="button" className="btn btn-primary" onClick={handleAdd}>
          Hinzufügen
        </button>
      </div>
    </div>
  );
}
