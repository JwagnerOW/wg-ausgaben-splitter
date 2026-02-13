import { useState, useRef } from "react";

export default function Scanner({ onResult }) {
  const [status, setStatus] = useState(null); // null | "loading" | "error" | "done"
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(null);
  const [rawText, setRawText] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  async function handleFile(file) {
    const isImage = file?.type?.startsWith("image/");
    const isPdf = file?.type === "application/pdf";
    if (!file || (!isImage && !isPdf)) {
      setError("Bitte ein Bild (JPG, PNG, …) oder eine PDF-Datei hochladen.");
      setStatus("error");
      return;
    }

    // Show preview
    const url = URL.createObjectURL(file);
    setPreview(url);
    setStatus("loading");
    setError("");
    setRawText("");

    try {
      const form = new FormData();
      form.append("receipt", file);

      const res = await fetch("/api/scan", { method: "POST", body: form });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Scan fehlgeschlagen");

      setRawText(data.rawText || "");
      setStatus("done");
      onResult(data.items, data.receiptTotal);
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  function onInputChange(e) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="card">
      <h2>
        <span className="icon">&#128247;</span> Kassenzettel scannen
      </h2>

      <div
        className={`drop-zone ${dragOver ? "drag-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          onChange={onInputChange}
          style={{ display: "none" }}
        />
        <div className="icon-upload">&#128206;</div>
        <p>
          <strong>Bild oder PDF hochladen</strong> oder hierher ziehen
        </p>
        <p>JPG, PNG oder PDF – gut belichtetes Foto oder Scan des Kassenzettels</p>
      </div>

      {preview && <img src={preview} alt="Vorschau" className="preview-img" />}

      {status === "loading" && (
        <div className="scan-status loading">
          <div className="spinner" />
          Kassenzettel wird gescannt und analysiert …
        </div>
      )}

      {status === "error" && (
        <div className="scan-status error">{error}</div>
      )}

      {status === "done" && (
        <div className="scan-status loading" style={{ color: "var(--accent)" }}>
          Scan abgeschlossen! Artikel wurden geladen. Du kannst sie unten bearbeiten.
        </div>
      )}

      {rawText && (
        <div className="raw-text-toggle">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setShowRaw(!showRaw)}
          >
            {showRaw ? "OCR-Text ausblenden" : "OCR-Rohtext anzeigen"}
          </button>
          {showRaw && <div className="raw-text-box">{rawText}</div>}
        </div>
      )}
    </div>
  );
}
