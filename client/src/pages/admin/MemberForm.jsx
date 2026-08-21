import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { useFetch } from '../../context/Session.jsx';
import { BackLink } from '../../components/Layout.jsx';
import { MemberAvatar } from '../../components/Ornaments.jsx';
import FilePicker from '../../components/FilePicker.jsx';
import UploadTarget from '../../components/UploadTarget.jsx';
import { Button, Card, Field, Notice, PageHead, useToast } from '../../components/ui.jsx';
import { currentPeriod, money, onlyDigits, periodLabel } from '../../lib/format.js';
import { uploadImage } from '../../lib/upload.js';

/** Four things, as the club asked: name, phone, collection on or off, amount. */
export default function MemberForm() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const membersQuery = useFetch('/admin/members');

  const [name, setName] = useState(params.get('name') || '');
  const [fatherName, setFatherName] = useState(params.get('fatherName') || '');
  const [phone, setPhone] = useState(params.get('phone') || '');
  const [enabled, setEnabled] = useState(true);
  const [amount, setAmount] = useState('');
  const [joinedPeriod, setJoinedPeriod] = useState(currentPeriod());
  const [photo, setPhoto] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const pickPhoto = async (file) => {
    try {
      setPhoto(await uploadImage(file, { folder: 'rsyc/members' }));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const defaultAmount = membersQuery.data ? membersQuery.data.defaultAmount : 200;
  const effectiveAmount = amount === '' ? String(defaultAmount) : amount;

  const months = [];
  for (let i = 0; i < 13; i += 1) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await api.post('/admin/members', {
        name,
        fatherName,
        phone,
        isEnabled: enabled,
        amount: Math.round(Number(effectiveAmount) || 0),
        joinedPeriod,
        photoUrl: photo,
      });
      toast(`${name} added`, 'ok');
      navigate(`/admin/members/${res.member.memberId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <BackLink to="/admin/members">All members</BackLink>
      <PageHead eyebrow="New member" title="Add a member" />

      <Card className="card-pad">
        <form className="stack" onSubmit={submit}>
          <Notice kind="error">{error}</Notice>

          {/* Optional. Falls back to the drawn medallion if nothing is chosen. */}
          <div className="photo-pick">
            <div className="photo-pick-preview">
              {photo ? (
                <img src={photo} alt="" />
              ) : (
                <MemberAvatar name={name || 'नया सदस्य'} />
              )}
            </div>

            <div className="photo-pick-body">
              <p className="label">Photo</p>
              <p className="hint" style={{ marginBottom: 8 }}>
                {photo
                  ? 'Ready. It will be saved with the member.'
                  : 'Optional. Squared and shrunk automatically before it is uploaded.'}
              </p>
              <div className="wrap">
                <FilePicker onPick={pickPhoto}>
                  {photo ? 'Change photo' : 'Choose photo'}
                </FilePicker>
                {photo ? (
                  <Button variant="ghost" size="sm" onClick={() => setPhoto(null)}>
                    Remove
                  </Button>
                ) : null}
              </div>
              <div style={{ marginTop: 8 }}>
                <UploadTarget />
              </div>
            </div>
          </div>

          <Field label="Full name" id="m-name">
            <input
              id="m-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </Field>

          <Field label="Father's name" id="m-father" hint="Shown as “S/o …” beside their name.">
            <input
              id="m-father"
              className="input"
              value={fatherName}
              onChange={(e) => setFatherName(e.target.value)}
              required
            />
          </Field>

          <Field label="Mobile number" id="m-phone" hint="10 digits, without +91">
            <input
              id="m-phone"
              className="input num"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              maxLength={10}
              required
            />
          </Field>

          <div>
            <p className="label" style={{ marginBottom: 6 }}>
              Monthly contribution
            </p>
            <div className="segmented">
              <button
                type="button"
                className={enabled ? 'on-credit' : ''}
                onClick={() => setEnabled(true)}
              >
                On
              </button>
              <button
                type="button"
                className={!enabled ? 'on-debit' : ''}
                onClick={() => setEnabled(false)}
              >
                Off
              </button>
            </div>
          </div>

          {/* With contribution switched off there are no dues, so asking when
              they start would be a question with no meaning. */}
          {enabled ? (
            <>
              <Field
                label="Amount every month"
                id="m-amount"
                hint={`Club default is ${money(defaultAmount)}`}
              >
                <input
                  id="m-amount"
                  className="input num"
                  value={amount}
                  onChange={(e) => setAmount(onlyDigits(e.target.value))}
                  placeholder={String(defaultAmount)}
                  inputMode="numeric"
                />
              </Field>

              <Field
                label="Dues start from"
                id="m-from"
                hint="Pick an earlier month if they have been contributing for a while."
              >
                <select
                  id="m-from"
                  className="select"
                  value={joinedPeriod}
                  onChange={(e) => setJoinedPeriod(e.target.value)}
                >
                  {months.map((p) => (
                    <option key={p} value={p}>
                      {periodLabel(p)}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          ) : (
            <p className="hint">
              They will appear in the club members list as a full member, but nothing will be due
              from them and they will not show on the collection screens.
            </p>
          )}

          <Button type="submit" block disabled={busy}>
            {busy ? 'Adding…' : 'Add member'}
          </Button>
        </form>
      </Card>
    </>
  );
}
