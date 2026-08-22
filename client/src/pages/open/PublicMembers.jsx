import { useState } from 'react';
import { useFetch } from '../../context/Session.jsx';
import { imageUrl } from '../../lib/upload.js';
import { MemberAvatar } from '../../components/Ornaments.jsx';
import { Empty, ErrorState, Loading, PageHead } from '../../components/ui.jsx';

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
          <img src={imageUrl(member.photoUrl, { width: 320 })} alt={member.name} loading="lazy" onError={() => setFailed(true)} />
        ) : (
          <MemberAvatar name={member.name} />
        )}
      </div>
      <div className="member-name">
        {member.name}
        {member.fatherName ? <span className="member-son">S/o {member.fatherName}</span> : null}
      </div>
    </div>
  );
}

export default function PublicMembers() {
  const { data, loading, error, reload } = useFetch('/open/members');

  if (loading) return <Loading rows={4} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return null;

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

    </>
  );
}
