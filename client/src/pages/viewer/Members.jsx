import { useState } from 'react';
import { useFetch } from '../../context/Session.jsx';
import { MemberAvatar, Icon } from '../../components/Ornaments.jsx';
import { Empty, ErrorState, Loading, PageHead } from '../../components/ui.jsx';
import { periodLabel } from '../../lib/format.js';

/**
 * The club directory, behind the PIN.
 *
 * Same card as the public board — photo, name, S/o — with the contact details
 * added, because that is the reason a member opens this page. No money appears
 * here at all: what someone pays, and whether they are behind, lives on the
 * monthly contribution board and nowhere near their name in a directory.
 */

function MemberCard({ member }) {
  const [failed, setFailed] = useState(false);
  const showPhoto = member.photoUrl && !failed;

  // has-actions keeps these tweaks off the public board, which shares the same
  // base card and must not change.
  return (
    <div className="member-card has-actions">
      <div className="member-photo">
        {showPhoto ? (
          <img src={member.photoUrl} alt={member.name} onError={() => setFailed(true)} />
        ) : (
          <MemberAvatar name={member.name} />
        )}
      </div>

      <div className="member-name">
        {member.name}
        {member.fatherName ? <span className="member-son">S/o {member.fatherName}</span> : null}
        <span className="member-since">Member since {periodLabel(member.joinedPeriod)}</span>
        <span className="member-since num">{member.phone}</span>
      </div>

      <div className="member-actions">
        <a href={`tel:+91${member.phone}`} className="btn btn-ghost member-btn" aria-label={`Call ${member.name}`}>
          <Icon.phone />
          Call
        </a>
        <a
          href={`https://wa.me/91${member.phone}`}
          target="_blank"
          rel="noreferrer"
          className="btn btn-saffron member-btn"
          aria-label={`WhatsApp ${member.name}`}
        >
          <Icon.whatsapp />
          Chat
        </a>
      </div>
    </div>
  );
}

export default function Members() {
  const { data, loading, error, reload } = useFetch('/view/members');
  const [q, setQ] = useState('');

  if (loading) return <Loading rows={5} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const needle = q.trim().toLowerCase();
  const list = needle
    ? data.members.filter(
        (m) =>
          m.name.toLowerCase().includes(needle) ||
          (m.fatherName || '').toLowerCase().includes(needle) ||
          m.phone.includes(needle),
      )
    : data.members;

  return (
    <>
      <PageHead
        eyebrow="Club directory"
        title="Members"
        sub={`${data.totalCount} ${data.totalCount === 1 ? 'member' : 'members'} of the club`}
      />

      <input
        className="input"
        placeholder="Search by name, father's name or number"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ marginBottom: 14 }}
        aria-label="Search members"
      />

      {list.length === 0 ? (
        <Empty title="No one found">Try a different name.</Empty>
      ) : (
        <div className="member-grid">
          {list.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </div>
      )}
    </>
  );
}
