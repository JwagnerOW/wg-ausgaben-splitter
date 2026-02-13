import { useMemo } from "react";

function formatPrice(p) {
  const sign = p < 0 ? "\u2212" : "";
  return sign + Math.abs(p).toFixed(2).replace(".", ",") + " \u20AC";
}

/**
 * Simplify debts: given balances, compute minimal set of transfers.
 * balance[i] > 0 → person i is owed money (creditor)
 * balance[i] < 0 → person i owes money (debtor)
 */
function simplifyDebts(balances) {
  const transfers = [];
  const debtors = [];
  const creditors = [];

  balances.forEach((b, i) => {
    if (b < -0.005) debtors.push({ i, amount: -b });
    else if (b > 0.005) creditors.push({ i, amount: b });
  });

  // Sort: largest debtor/creditor first for fewer transfers
  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  let di = 0,
    ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const d = debtors[di];
    const c = creditors[ci];
    const amount = Math.round(Math.min(d.amount, c.amount) * 100) / 100;

    if (amount >= 0.01) {
      transfers.push({ from: d.i, to: c.i, amount });
      d.amount -= amount;
      c.amount -= amount;
    }

    if (d.amount < 0.005) di++;
    if (c.amount < 0.005) ci++;
  }

  return transfers;
}

export default function Settlement({
  items,
  members,
  buyer,
  assignments,
  quantities = {},
}) {
  const { shares, totalReceipt, totalAssigned, balances, transfers } =
    useMemo(() => {
      if (members.length === 0 || items.length === 0) {
        return {
          shares: [],
          totalReceipt: 0,
          totalAssigned: 0,
          balances: [],
          transfers: [],
        };
      }

      const totalReceipt = items.reduce((sum, it) => sum + it.price, 0);
      const shares = Array(members.length).fill(0);
      let totalAssigned = 0;
      const allMemberIndices = new Set(members.map((_, i) => i));

      items.forEach((item, idx) => {
        const q = quantities[idx];
        const qSum =
          q && typeof q === "object"
            ? Object.values(q).reduce((s, n) => s + (Number(n) || 0), 0)
            : 0;

        if (qSum > 0) {
          totalAssigned += item.price;
          members.forEach((_, mi) => {
            const num = Number(q[mi]) || 0;
            if (num > 0) {
              const part = Math.round((item.price * (num / qSum)) * 100) / 100;
              shares[mi] += part;
            }
          });
          return;
        }

        const assigned = assignments[idx];
        const participants =
          !assigned || assigned.size === 0 ? allMemberIndices : assigned;
        const part = Math.round((item.price / participants.size) * 100) / 100;
        participants.forEach((mi) => {
          shares[mi] += part;
        });
        totalAssigned += item.price;
      });

      // Round shares
      shares.forEach((_, i) => {
        shares[i] = Math.round(shares[i] * 100) / 100;
      });

      // Balance = what you owe (share) minus what you paid
      const paid = Array(members.length).fill(0);
      paid[buyer] = totalReceipt;

      const balances = members.map((_, i) => {
        // positive = is owed money (paid more than share)
        // negative = owes money (share is more than paid)
        return Math.round((paid[i] - shares[i]) * 100) / 100;
      });

      const transfers = simplifyDebts(balances);

      return {
        shares,
        totalReceipt: Math.round(totalReceipt * 100) / 100,
        totalAssigned: Math.round(totalAssigned * 100) / 100,
        balances,
        transfers,
      };
    }, [items, members, buyer, assignments, quantities]);

  const hasAnyExplicitAssignment = Object.values(assignments).some(
    (s) => s && s.size > 0
  );

  return (
    <div className="card">
      <h2>
        <span className="icon">&#128176;</span> Abrechnung
      </h2>

      {members.length === 0 && (
        <p className="empty-state">
          Mitglieder anlegen um die Abrechnung zu sehen.
        </p>
      )}

      {members.length > 0 && items.length === 0 && (
        <p className="empty-state">
          Kassenzettel scannen oder Artikel hinzufügen.
        </p>
      )}

      {members.length > 0 && items.length > 0 && (
        <>
          <p className="hint">
            Nicht zugeteilte Artikel werden automatisch auf alle geteilt.
          </p>
          {/* Per-person overview */}
          <div className="balance-grid">
            {members.map((name, i) => (
              <div className="balance-card" key={i}>
                <div className="name">{name}</div>
                <div className="detail">
                  Anteil: {formatPrice(shares[i])}
                  {i === buyer && " | Bezahlt: " + formatPrice(totalReceipt)}
                </div>
                <div
                  className={`balance ${
                    balances[i] >= 0 ? "positive" : "negative"
                  }`}
                >
                  {balances[i] >= 0
                    ? "+" + formatPrice(balances[i])
                    : formatPrice(balances[i])}
                </div>
              </div>
            ))}
          </div>

          {/* Transfers */}
          {transfers.length > 0 ? (
            <ul className="settlement-list">
              {transfers.map((t, i) => (
                <li key={i}>
                  <strong>{members[t.to]}</strong> bekommt{" "}
                  <span className="amount">{formatPrice(t.amount)}</span> von{" "}
                  <strong>{members[t.from]}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Keine Überweisungen nötig.</p>
          )}

          <div className="summary-line">
            Gesamtbetrag Beleg: {formatPrice(totalReceipt)} &middot; Zugewiesen:{" "}
            {formatPrice(totalAssigned)}
            {Math.abs(totalReceipt - totalAssigned) > 0.01 && (
              <span>
                {" "}
                &middot;{" "}
                <strong style={{ color: "var(--warning)" }}>
                  {formatPrice(Math.abs(totalReceipt - totalAssigned))} nicht
                  zugewiesen
                </strong>
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
