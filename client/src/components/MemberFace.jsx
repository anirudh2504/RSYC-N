import { useState } from 'react';
import { imageUrl } from '../lib/upload.js';
import { MemberAvatar } from './Ornaments.jsx';
import { initials } from '../lib/format.js';

/**
 * A member's face in a small round frame.
 *
 * Three steps down, in order of how much they tell you: the photograph, then
 * the drawn medallion, then their initials. The photograph is worth reaching
 * for — a list of thirty names in a village where half share a surname is much
 * easier to read by face than by text.
 *
 * The fallback also covers a photo that fails to load. Cloudinary is reliable,
 * but a member whose picture 404s should still look like a member rather than
 * a broken image icon.
 */
export default function MemberFace({ member, size = 38, plain = false }) {
  const [failed, setFailed] = useState(false);
  const photo = member.photoUrl && !failed ? member.photoUrl : null;

  return (
    <span className="avatar" style={{ width: size, height: size }} aria-hidden="true">
      {photo ? (
        <img
          src={imageUrl(photo, { width: size })}
          alt=""
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : plain ? (
        initials(member.name)
      ) : (
        <MemberAvatar name={member.name} />
      )}
    </span>
  );
}
