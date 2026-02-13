import { useState, useCallback } from "react";
import Scanner from "./components/Scanner";
import Members from "./components/Members";
import ItemTable from "./components/ItemTable";
import Settlement from "./components/Settlement";
import { Impressum, Datenschutz } from "./components/Legal";

export default function App() {
  const [members, setMembers] = useState(["Max", "Erika", "Tom"]);
  const [buyer, setBuyer] = useState(0);
  const [items, setItems] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [quantities, setQuantities] = useState({});
  const [receiptTotal, setReceiptTotal] = useState(null);
  const [legalPage, setLegalPage] = useState(null);

  // ── Member management ───────────────────────────────────────────
  const addMember = useCallback(
    (name) => {
      const trimmed = name.trim();
      if (!trimmed || members.includes(trimmed)) return;
      setMembers((prev) => [...prev, trimmed]);
    },
    [members]
  );

  const removeMember = useCallback(
    (index) => {
      setMembers((prev) => prev.filter((_, i) => i !== index));
      // Adjust buyer
      setBuyer((prev) => {
        if (prev === index) return 0;
        if (prev > index) return prev - 1;
        return prev;
      });
      // Remove member from assignments
      setAssignments((prev) => {
        const next = {};
        for (const [k, set] of Object.entries(prev)) {
          const newSet = new Set();
          for (const mi of set) {
            if (mi === index) continue;
            newSet.add(mi > index ? mi - 1 : mi);
          }
          next[k] = newSet;
        }
        return next;
      });
      setQuantities((prev) => {
        const next = {};
        for (const [itemIdx, per] of Object.entries(prev)) {
          if (!per || typeof per !== "object") continue;
          const newPer = {};
          for (const [mi, val] of Object.entries(per)) {
            const m = parseInt(mi, 10);
            if (m === index) continue;
            newPer[m > index ? m - 1 : m] = val;
          }
          next[itemIdx] = newPer;
        }
        return next;
      });
    },
    []
  );

  // ── Items from scanner ──────────────────────────────────────────
  const handleScanResult = useCallback((newItems, detectedTotal) => {
    setItems(newItems);
    setAssignments({});
    setQuantities({});
    if (detectedTotal !== null && detectedTotal !== undefined) {
      setReceiptTotal(detectedTotal);
    }
  }, []);

  // ── Item editing ────────────────────────────────────────────────
  const updateItem = useCallback((index, field, value) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    );
  }, []);

  const removeItem = useCallback(
    (index) => {
      setItems((prev) => prev.filter((_, i) => i !== index));
      setAssignments((prev) => {
        const next = {};
        for (const [k, set] of Object.entries(prev)) {
          const ki = parseInt(k, 10);
          if (ki === index) continue;
          const newKey = ki > index ? ki - 1 : ki;
          next[newKey] = set;
        }
        return next;
      });
      setQuantities((prev) => {
        const next = {};
        for (const [k, v] of Object.entries(prev)) {
          const ki = parseInt(k, 10);
          if (ki === index) continue;
          next[ki > index ? ki - 1 : ki] = v;
        }
        return next;
      });
    },
    []
  );

  const addItem = useCallback((desc, price) => {
    setItems((prev) => [...prev, { desc, price }]);
  }, []);

  // ── Assignment logic ────────────────────────────────────────────
  const toggleAssign = useCallback((itemIndex, memberIndex) => {
    setAssignments((prev) => {
      const set = new Set(prev[itemIndex] || []);
      if (set.has(memberIndex)) set.delete(memberIndex);
      else set.add(memberIndex);
      return { ...prev, [itemIndex]: set };
    });
  }, []);

  const assignAll = useCallback(
    (itemIndex) => {
      setAssignments((prev) => ({
        ...prev,
        [itemIndex]: new Set(members.map((_, i) => i)),
      }));
    },
    [members]
  );

  const assignNone = useCallback((itemIndex) => {
    setAssignments((prev) => ({ ...prev, [itemIndex]: new Set() }));
    setQuantities((prev) => {
      const next = { ...prev };
      delete next[itemIndex];
      return next;
    });
  }, []);

  const setItemQuantities = useCallback((itemIndex, perMember) => {
    if (perMember == null) {
      setQuantities((prev) => {
        const next = { ...prev };
        delete next[itemIndex];
        return next;
      });
      return;
    }
    setQuantities((prev) => ({ ...prev, [itemIndex]: { ...perMember } }));
    const whoIn = Object.entries(perMember)
      .filter(([, n]) => Number(n) > 0)
      .map(([mi]) => parseInt(mi, 10));
    setAssignments((prev) => ({
      ...prev,
      [itemIndex]: new Set(whoIn),
    }));
  }, []);

  if (legalPage === "impressum") {
    return (
      <div className="app">
        <Impressum onBack={() => setLegalPage(null)} />
        <footer className="app-footer">
          <button type="button" className="footer-link" onClick={() => setLegalPage("impressum")}>
            Impressum
          </button>
          <span className="footer-sep">·</span>
          <button type="button" className="footer-link" onClick={() => setLegalPage("datenschutz")}>
            Datenschutz
          </button>
        </footer>
      </div>
    );
  }
  if (legalPage === "datenschutz") {
    return (
      <div className="app">
        <Datenschutz onBack={() => setLegalPage(null)} />
        <footer className="app-footer">
          <button type="button" className="footer-link" onClick={() => setLegalPage("impressum")}>
            Impressum
          </button>
          <span className="footer-sep">·</span>
          <button type="button" className="footer-link" onClick={() => setLegalPage("datenschutz")}>
            Datenschutz
          </button>
        </footer>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>WG-Ausgaben-Splitter</h1>
        <p>
          Kassenzettel scannen, Artikel zuweisen, Abrechnung berechnen.
        </p>
      </header>

      <Scanner onResult={handleScanResult} />

      <Members
        members={members}
        buyer={buyer}
        onAdd={addMember}
        onRemove={removeMember}
        onBuyerChange={setBuyer}
      />

      <ItemTable
        items={items}
        members={members}
        assignments={assignments}
        quantities={quantities}
        receiptTotal={receiptTotal}
        onUpdateItem={updateItem}
        onRemoveItem={removeItem}
        onAddItem={addItem}
        onToggleAssign={toggleAssign}
        onAssignAll={assignAll}
        onAssignNone={assignNone}
        onSetQuantities={setItemQuantities}
      />

      <Settlement
        items={items}
        members={members}
        buyer={buyer}
        assignments={assignments}
        quantities={quantities}
      />

      <footer className="app-footer">
        <button type="button" className="footer-link" onClick={() => setLegalPage("impressum")}>
          Impressum
        </button>
        <span className="footer-sep">·</span>
        <button type="button" className="footer-link" onClick={() => setLegalPage("datenschutz")}>
          Datenschutz
        </button>
      </footer>
    </div>
  );
}
