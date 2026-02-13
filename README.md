# WG-Ausgaben-Splitter

Interaktive Web-App zum Aufteilen von Einkäufen in einer WG. Kassenzettel fotografieren, Artikel zuweisen, Abrechnung berechnen.

## Features

- **OCR-Scanner**: Kassenzettel fotografieren oder hochladen – Artikel werden automatisch erkannt
- **Rabatt-Fusion**: Rabattaktion / Preisvorteil wird automatisch mit dem Artikel verrechnet
- **Pfand-Logik**: Pfand als positive Beträge, Pfandrückgabe als Gutschrift
- **Mitglieder-Verwaltung**: Beliebig viele WG-Mitglieder anlegen
- **Interaktive Zuweisung**: Artikel per Checkbox einer oder mehreren Personen zuweisen
- **Dynamisches Splitting**: Automatische Aufteilung bei mehreren Personen
- **Abrechnung**: Klare Bilanz "Wer schuldet wem wie viel?"

## Schnellstart

```bash
# Dependencies installieren
npm run install:all

# Entwicklungsserver starten (Backend + Frontend)
npm run dev
```

App öffnet sich unter **http://localhost:5173**

## Produktion

```bash
npm run build
npm start
```

App läuft dann unter **http://localhost:3001**

## Docker

```bash
docker build -t wg-splitter .
docker run -p 3001:3001 wg-splitter
```

## Technologie

- **Backend**: Node.js, Express, Tesseract.js (OCR), Sharp (Bildverarbeitung)
- **Frontend**: React, Vite
- **OCR**: Tesseract.js mit deutscher Spracherkennung – läuft komplett lokal
