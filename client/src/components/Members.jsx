import { useState } from "react";

export default function Members({
  members,
  buyer,
  onAdd,
  onRemove,
  onBuyerChange,
}) {
  const [input, setInput] = useState("");

  function handleAdd() {
    if (input.trim()) {
      onAdd(input);
      setInput("");
    }
  }

  return (
    <div className="card">
      <h2>
        <span className="icon">&#128101;</span> WG-Mitglieder & Käufer
      </h2>

      <div className="row member-add-row">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Name eingeben"
          className="member-input"
        />
        <button type="button" className="btn btn-primary" onClick={handleAdd}>
          Hinzufügen
        </button>
      </div>

      <div className="member-chips">
        {members.map((name, i) => (
          <span className="member-chip" key={i}>
            {name}
            <button
              type="button"
              title="Entfernen"
              onClick={() => onRemove(i)}
            >
              &times;
            </button>
          </span>
        ))}
        {members.length === 0 && (
          <span className="empty-state">Noch keine Mitglieder.</span>
        )}
      </div>

      {members.length > 0 && (
        <div className="buyer-row">
          <label htmlFor="buyer-select">Wer hat bezahlt?</label>
          <select
            id="buyer-select"
            value={buyer}
            onChange={(e) => onBuyerChange(parseInt(e.target.value, 10))}
          >
            {members.map((name, i) => (
              <option key={i} value={i}>
                {name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
