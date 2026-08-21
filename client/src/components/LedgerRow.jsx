import { money, shortDate, periodLabel, periodShort, wasBackdated } from '../lib/format.js';

/**
 * One line of the ledger.
 *
 * A debit leads with its reason, because that is the whole point of the
 * feature. A reversed entry stays visible, struck through and tagged, so the
 * history is never quietly rewritten.
 */

function iconFor(entry) {
  if (entry.kind === 'opening') return { cls: 'icon-opening', glyph: '◈' };
  if (entry.kind === 'adjustment') return { cls: 'icon-adjust', glyph: '±' };
  if (entry.direction === 'credit') return { cls: 'icon-credit', glyph: '↓' };
  return { cls: 'icon-debit', glyph: '↑' };
}

function titleFor(entry) {
  if (entry.kind === 'opening') return 'Opening balance';
  if (entry.kind === 'adjustment') return 'Balance correction';
  if (entry.kind === 'reversal') return entry.reason || 'Reversal';
  if (entry.direction === 'debit') return entry.reason || 'Money out';
  if (entry.memberName) return entry.memberName;
  return entry.payerName || 'Received';
}

/**
 * Says in words what the money was for, so a row reads as
 * "Ramesh Kumar — contribution for Aug 2026 — +₹200" rather than a bare amount.
 */
function purposeOf(entry) {
  const alloc = entry.allocations || [];

  if (entry.kind === 'contribution') {
    if (alloc.length === 0) return 'Contribution';
    if (alloc.length === 1) return `Contribution for ${periodLabel(alloc[0].period)}`;
    if (alloc.length <= 3) {
      return `Contribution for ${alloc.map((a) => periodShort(a.period)).join(', ')} ${alloc[
        alloc.length - 1
      ].period.slice(0, 4)}`;
    }
    return `Contribution for ${alloc.length} months`;
  }

  if (entry.kind === 'donation') return 'Donation to the club';
  return null;
}

function metaFor(entry) {
  const bits = [];

  const purpose = purposeOf(entry);
  if (purpose) bits.push(purpose);

  bits.push(shortDate(entry.occurredOn));

  if (wasBackdated(entry)) bits.push(`recorded ${shortDate(entry.createdAt)}`);

  if (entry.takenBy) bits.push(`taken by ${entry.takenBy}`);
  if (entry.note) bits.push(entry.note);
  if (entry.recordedBy) bits.push(`by ${entry.recordedBy.split(' ')[0]}`);

  return bits.filter(Boolean).join(' · ');
}

export default function LedgerRow({ entry, footer }) {
  const icon = iconFor(entry);

  return (
    <div className={`ledger-row${entry.isReversed ? ' is-reversed' : ''}`}>
      <span className={`ledger-icon ${icon.cls}`} aria-hidden="true">
        {icon.glyph}
      </span>

      <div className="ledger-body">
        <p className="ledger-title">
          {titleFor(entry)}
          {entry.kind === 'adjustment' ? (
            <span className="mini-tag mini-adjust">Correction</span>
          ) : null}
          {entry.isReversed ? <span className="mini-tag mini-rev">Corrected</span> : null}
          {entry.kind === 'opening' ? <span className="mini-tag mini-royal">Start</span> : null}
        </p>

        <p className="ledger-meta">{metaFor(entry)}</p>

        {entry.isReversed && entry.reversalReason ? (
          <p className="ledger-meta" style={{ fontStyle: 'italic' }}>
            Reversed: {entry.reversalReason}
          </p>
        ) : null}

        {entry.eventTitle ? <p className="ledger-meta">For {entry.eventTitle}</p> : null}

        {footer}
      </div>

      <span className={`ledger-amount ${entry.direction === 'credit' ? 'amt-credit' : 'amt-debit'}`}>
        {entry.direction === 'credit' ? '+' : '−'}
        {money(entry.amount)}
      </span>
    </div>
  );
}
