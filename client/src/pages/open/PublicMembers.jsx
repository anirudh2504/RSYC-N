import { useState } from 'react';
import { useFetch } from '../../context/Session.jsx';
import { MemberAvatar, Icon } from '../../components/Ornaments.jsx';
import { Empty, ErrorState, Loading, PageHead, Rule } from '../../components/ui.jsx';

/**
 * The public members board.
 *
 * A face and a name, and nothing else. Phone numbers, amounts and payment
 * status all stay behind the club PIN — the whole village can see who is in
 * the club without being handed everyone's contact details.
 */

function MemberCard({ member }) {
  const [failed, setFailed] = useState(false);
  const showPhoto = member.photoUrl && !failed;

  return (
    <div className="member-card">
      <div className="member-photo">
        {showPhoto ? (
          <img src={member.photoUrl} alt={member.name} onError={() => setFailed(true)} />
        ) : (
          <MemberAvatar name={member.name} />
        )}
      </div>
      <p className="member-name">{member.name}</p>
    </div>
  );
}

export default function PublicMembers() {
  const { data, loading, error, reload } = useFetch('/open/members');

  if (loading) return <Loading rows={4} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

  const phone = data.contactPhone;
  const message = `Namaste, I would like to become a member of ${data.groupName}.`;

  return (
    <>
      <PageHead
        eyebrow="सदस्य · Members"
        title="Club members"
        sub={`${data.members.length} members of the club`}
      />

      {data.members.length === 0 ? (
        <Empty title="No members yet" />
      ) : (
        <div className="member-grid">
          {data.members.map((m) => (
            <MemberCard key={m.id} member={m} />
          ))}
        </div>
      )}

      <div style={{ margin: '30px 0 14px' }}>
        <Rule label="Join the club" />
      </div>

      <div className="join-card">
        <p className="section-title">Become a member</p>
        <p className="devanagari muted small" style={{ marginTop: 2 }}>
          सदस्य बनना चाहते हैं?
        </p>
        <p className="small" style={{ color: 'var(--ink-2)', margin: '10px auto 0', maxWidth: '46ch' }}>
          Anyone from the village can join. Contact an admin and they will take it from there.
        </p>

        {phone ? (
          <div className="btn-row" style={{ marginTop: 16, justifyContent: 'center' }}>
            <a href={`tel:+91${phone}`} className="btn btn-ghost">
              <Icon.phone />
              Call
            </a>
            <a
              href={`https://wa.me/91${phone}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-saffron"
            >
              <Icon.whatsapp />
              WhatsApp
            </a>
          </div>
        ) : null}

        {phone ? (
          <p className="tiny muted num" style={{ marginTop: 12 }}>
            +91 {phone}
          </p>
        ) : null}
      </div>
    </>
  );
}
