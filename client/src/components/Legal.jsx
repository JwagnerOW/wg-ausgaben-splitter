/**
 * Rechtliche Seiten: Impressum & Datenschutz
 * Verantwortlich: Jan Wagner (Privatperson)
 */
export function Impressum({ onBack }) {
  return (
    <div className="legal-page">
      <button type="button" className="btn btn-ghost back-link" onClick={onBack}>
        ← Zurück zur App
      </button>
      <h1>Impressum</h1>
      <p className="legal-note">
        Angaben gemäß § 5 TMG / § 18 MStV (Deutschland).
      </p>
      <section>
        <h2>Diensteanbieter</h2>
        <p>
          <strong>WG-Ausgaben-Splitter</strong><br />
          Jan Wagner<br />
          Triebweg 109<br />
          70469 Stuttgart
        </p>
      </section>
      <section>
        <h2>Kontakt</h2>
        <p>
          E-Mail: janwagner811@gmail.com
        </p>
      </section>
      <section>
        <h2>Verantwortlich für den Inhalt</h2>
        <p>Jan Wagner, Triebweg 109, 70469 Stuttgart</p>
      </section>
      <section>
        <h2>Haftungsausschluss</h2>
        <p>
          Die Inhalte dieser Anwendung dienen der privaten Nutzung (Kassenzettel aufteilen). 
          Wir übernehmen keine Haftung für die Richtigkeit der OCR-Erkennung oder berechneten Beträge. 
          Die Nutzung erfolgt auf eigene Verantwortung.
        </p>
      </section>
    </div>
  );
}

export function Datenschutz({ onBack }) {
  return (
    <div className="legal-page">
      <button type="button" className="btn btn-ghost back-link" onClick={onBack}>
        ← Zurück zur App
      </button>
      <h1>Datenschutzerklärung</h1>
      <p className="legal-note">
        Informationen zum Umgang mit Ihren Daten (DSGVO).
      </p>

      <section>
        <h2>1. Verantwortlicher</h2>
        <p>
          Jan Wagner · Triebweg 109 · 70469 Stuttgart<br />
          E-Mail: janwagner811@gmail.com
        </p>
      </section>

      <section>
        <h2>2. Welche Daten werden verarbeitet?</h2>
        <p>
          <strong>Kassenzettel-Bilder:</strong> Wenn Sie ein Foto hochladen, wird es ausschließlich zur Texterkennung (OCR) 
          und Berechnung auf unserem Server verarbeitet. Die Bilder werden nicht dauerhaft gespeichert und nicht an Dritte weitergegeben.
        </p>
        <p>
          <strong>Nutzungsdaten im Browser:</strong> Die von Ihnen eingegebenen Namen, Artikel und Zuweisungen verbleiben 
          nur in Ihrem Gerät (local state) und werden nicht an unseren Server übertragen, außer das Belegbild beim Scannen.
        </p>
      </section>

      <section>
        <h2>3. Zweck und Rechtsgrundlage</h2>
        <p>
          Die Verarbeitung dient dem Betrieb der Anwendung (Kassenzettel scannen und aufteilen). 
          Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung/Nutzung des Dienstes) bzw. Ihr Einverständnis beim Upload.
        </p>
      </section>

      <section>
        <h2>4. Speicherdauer</h2>
        <p>
          Hochgeladene Bilder werden nur für die Dauer der Verarbeitung (OCR) genutzt und danach verworfen. 
          Wir speichern keine personenbezogenen Nutzerkonten oder Belegdaten auf dem Server.
        </p>
      </section>

      <section>
        <h2>5. Hosting</h2>
        <p>
          Die Anwendung wird bei einem Hosting-Anbieter betrieben. Dabei können technisch bedingt IP-Adressen 
          und Zugriffszeiten anfallen. Bitte prüfen Sie die Datenschutzinformationen Ihres genutzten Hosters.
        </p>
      </section>

      <section>
        <h2>6. Cookies und Tracking</h2>
        <p>
          Derzeit setzt die Anwendung keine Cookies zu Werbe- oder Trackingzwecken. 
          Falls später Werbung (z. B. Banner) eingebunden wird, wird dies in dieser Erklärung ergänzt und 
          eine Einwilligung eingeholt, soweit erforderlich.
        </p>
      </section>

      <section>
        <h2>7. Ihre Rechte</h2>
        <p>
          Sie haben das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), 
          Einschränkung der Verarbeitung (Art. 18) und Datenübertragbarkeit (Art. 20). 
          Sie können sich bei einer Aufsichtsbehörde beschweren (Art. 77 DSGVO).
        </p>
      </section>

      <section>
        <h2>8. Änderungen</h2>
        <p>
          Diese Datenschutzerklärung kann bei Bedarf angepasst werden. Die aktuelle Version ist auf dieser Seite abrufbar.
        </p>
      </section>
    </div>
  );
}
