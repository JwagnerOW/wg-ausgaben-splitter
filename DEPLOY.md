# WG-Ausgaben-Splitter – Hosting & Go-Live

Kostengünstig und einfach live gehen. Vor dem ersten Deploy einmal durcharbeiten.

---

## 1. Vor dem Deploy (einmalig)

### E-Mail eintragen (Pflicht für Impressum)
In `client/src/components/Legal.jsx` die Platzhalter ersetzen:
- Suche: `[Ihre E-Mail-Adresse eintragen]` (kommt 2× vor: Impressum + Datenschutz)
- Ersetze durch deine echte E-Mail (z.B. eine Gmail-Adresse oder Adresse zu deiner Domain).

### Projekt bauen & lokal testen
```bash
npm run install:all
npm run build
```
Danach Production-Server lokal starten (Windows PowerShell):
```powershell
$env:NODE_ENV="production"; node server/index.js
```
Unter Linux/macOS:
```bash
NODE_ENV=production node server/index.js
```
Im Browser: http://localhost:3001 – die fertige App sollte laufen (inkl. Scannen).

---

## 2. Hosting-Optionen (kostengünstig & einfach)

### Option A: Railway (empfohlen für den Einstieg)
- **Kosten:** Free Tier (limitiert) oder ca. 5 €/Monat (Hobby).
- **Vorteil:** GitHub verbinden, Push = automatischer Deploy. Node + Build werden erkannt.
- **Schritte:**
  1. Projekt auf GitHub pushen (Repository anlegen, `git push`).
  2. Auf [railway.app](https://railway.app) anmelden, „New Project“ → „Deploy from GitHub“ → Repo wählen.
  3. Root-Verzeichnis: Projekt-Root (wo `package.json` liegt).
  4. **Build Command:** `npm run install:all && npm run build`  
     (oder: Root `npm install`, dann `cd client && npm install && npm run build` – je nachdem wie Railway das Root handhabt; bei einem gemeinsamen `install:all` im Root reicht oft `npm run install:all && npm run build`).
  5. **Start Command:** `npm run start` oder `NODE_ENV=production node server/index.js`.  
     Bei Railway wird `NODE_ENV` oft automatisch auf `production` gesetzt; falls nicht, in den Variables `NODE_ENV=production` eintragen.
  6. Unter „Settings“ eine Domain vergeben (z.B. `wg-split.up.railway.app`) oder eigene Domain verbinden.

**Hinweis:** Bei Free Tier kann der Service nach Inaktivität einschlafen; der erste Request dauert dann etwas länger.

---

### Option B: Render
- **Kosten:** Free Tier (mit Einschlafen) oder ca. 7 €/Monat (Web Service ohne Einschlafen).
- **Vorteil:** Ähnlich einfach wie Railway, gute Doku.
- **Schritte:**
  1. [render.com](https://render.com) → New → Web Service.
  2. Repo verbinden (GitHub).
  3. **Build Command:** `npm run install:all && npm run build`
  4. **Start Command:** `npm run start` oder `node server/index.js` (Render setzt oft automatisch NODE_ENV=production).
  5. **Port:** Render setzt `PORT` automatisch; der Server nutzt `process.env.PORT || 3001`.

---

### Option C: Eigener Server (z.B. Hetzner VPS)
- **Kosten:** ca. 4 €/Monat (CX22 o.ä.).
- **Vorteil:** Volle Kontrolle, günstig auf Dauer.
- **Aufwand:** Deutlich höher (SSH, Node installieren, Prozess-Manager z.B. PM2, Nginx als Reverse-Proxy, SSL mit Let’s Encrypt).
- **Kurz:** Server erstellen, Node (z.B. 20 LTS) installieren, Projekt per Git klonen, `install:all` + `build`, dann Server mit PM2 starten und Nginx auf Port 80/443 leiten. Genaue Anleitung z.B. in Hetzner-Doku oder „Node App deploy Ubuntu“.

---

## 3. Empfohlener Ablauf (maximal einfach)

1. **E-Mail** in `Legal.jsx` eintragen (siehe oben).
2. **GitHub-Repo** anlegen und Code pushen.
3. **Railway** (oder Render) verbinden und mit Build/Start-Commands wie oben deployen.
4. **Fertig:** Link teilen (z.B. `https://wg-split.up.railway.app`).
5. Optional: **Eigene Domain** bei Railway/Render eintragen und bei deinem Domain-Anbieter die angezeigten DNS-Einträge setzen.

---

## 4. Wichtige Punkte

- **Umgebungsvariable:** Auf dem Host `NODE_ENV=production` setzen (oder vom Anbieter gesetzt lassen), damit der Server das gebaute Frontend aus `client/dist` ausliefert.
- **Port:** Der Server hört auf `process.env.PORT || 3001`. Railway/Render setzen `PORT` automatisch.
- **Uploads:** Belegbilder landen im Ordner `server/uploads` und werden nur für die OCR-Verarbeitung genutzt (keine dauerhafte Speicherung nötig; bei Bedarf Cronjob zum Leeren alter Dateien möglich).
- **Recht:** Impressum & Datenschutz sind mit deinen Daten (Jan Wagner, Triebweg 109, 70469 Stuttgart) eingetragen – nur noch E-Mail ergänzen.

---

## 5. Kurz-Checkliste

- [ ] E-Mail in `client/src/components/Legal.jsx` ersetzt
- [ ] `npm run install:all` und `npm run build` laufen lokal durch
- [ ] Production-Start lokal getestet (NODE_ENV=production)
- [ ] Repo auf GitHub
- [ ] Railway (oder Render) mit Build- + Start-Command verbunden
- [ ] Nach Deploy: App im Browser testen (Seite + einmal Scannen)
- [ ] Optional: eigene Domain verbinden

Damit ist die Seite rechtssicher (mit deinen Angaben) und hostbar; der Rest ist optional (Domain, später Werbung/Freemium etc.).
