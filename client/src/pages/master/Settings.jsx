import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { useFetch } from '../../context/Session.jsx';
import {
  Button,
  Card,
  CardHead,
  ErrorState,
  Field,
  Loading,
  Notice,
  PageHead,
  Rule,
  useToast,
} from '../../components/ui.jsx';
import { money } from '../../lib/format.js';

/** One item per line, blanks dropped. */
const lines = (text) =>
  String(text || '')
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean);

export default function Settings() {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/admin/settings');
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (data && data.settings) {
      setForm({
        ...data.settings,
        rulesText: (data.settings.rules || []).join('\n'),
        purposeText: (data.settings.purposePoints || []).join('\n'),
        purposeTextHi: (data.settings.purposePointsHi || []).join('\n'),
        contribText: (data.settings.founderContribution || []).join('\n'),
        contribTextHi: (data.settings.founderContributionHi || []).join('\n'),
        defaultAmount: String(data.settings.defaultAmount || 0),
      });
    }
  }, [data]);

  if (loading || !form) return <Loading rows={5} />;
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    setBusy(true);
    setFormError('');
    try {
      await api.put('/admin/settings', {
        groupName: form.groupName,
        groupNameHi: form.groupNameHi,
        village: form.village,
        villageHi: form.villageHi,
        tagline: form.tagline,
        about: form.about,
        rules: lines(form.rulesText),
        bankAccountLabel: form.bankAccountLabel,
        upiId: form.upiId,
        aboutHi: form.aboutHi,
        paymentPhone: form.paymentPhone,
        whatsappGroupUrl: form.whatsappGroupUrl,
        contactPhone: form.contactPhone,
        notice: form.notice,
        founderName: form.founderName,
        founderNameHi: form.founderNameHi,
        founderYears: form.founderYears,
        founderPhotoUrl: form.founderPhotoUrl,
        founderAbout: form.founderAbout,
        founderAboutHi: form.founderAboutHi,
        purpose: form.purpose,
        purposeHi: form.purposeHi,
        purposePoints: lines(form.purposeText),
        purposePointsHi: lines(form.purposeTextHi),
        founderContribution: lines(form.contribText),
        founderContributionHi: lines(form.contribTextHi),
        showPaidBoard: form.showPaidBoard,
        defaultAmount: Math.round(Number(form.defaultAmount) || 0),
        viewerSessionDays: Number(form.viewerSessionDays) || 30,
      });
      toast('Settings saved', 'ok');
      reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHead eyebrow="Master admin" title="Club settings" />

      <div className="stack">
        <Notice kind="error">{formError}</Notice>

        <Card className="card-pad">
          <p className="section-title" style={{ marginBottom: 12 }}>
            Identity
          </p>
          <div className="stack">
            <Field label="Club name" id="s-name">
              <input id="s-name" className="input" value={form.groupName} onChange={set('groupName')} />
            </Field>
            <Field label="Club name in Hindi" id="s-name-hi">
              <input
                id="s-name-hi"
                className="input devanagari"
                value={form.groupNameHi || ''}
                onChange={set('groupNameHi')}
              />
            </Field>
            <div className="btn-row">
              <Field label="Village" id="s-village">
                <input id="s-village" className="input" value={form.village || ''} onChange={set('village')} />
              </Field>
              <Field label="In Hindi" id="s-village-hi">
                <input
                  id="s-village-hi"
                  className="input devanagari"
                  value={form.villageHi || ''}
                  onChange={set('villageHi')}
                />
              </Field>
            </div>
          </div>
        </Card>

        <Card className="card-pad">
          <p className="section-title" style={{ marginBottom: 12 }}>
            Noticeboard
          </p>
          <Field
            label="Notice"
            id="s-notice"
            hint="Shown at the top of the fund page. Leave empty to hide it."
          >
            <textarea id="s-notice" className="textarea" value={form.notice || ''} onChange={set('notice')} />
          </Field>
        </Card>

        <Card className="card-pad">
          <p className="section-title" style={{ marginBottom: 12 }}>
            About page
          </p>
          <div className="stack">
            <Field label="About the club — हिंदी" id="s-about-hi" hint="Shown by default.">
              <textarea
                id="s-about-hi"
                className="textarea devanagari"
                style={{ minHeight: 150 }}
                value={form.aboutHi || ''}
                onChange={set('aboutHi')}
              />
            </Field>
            <Field label="About the club — English" id="s-about">
              <textarea
                id="s-about"
                className="textarea"
                style={{ minHeight: 150 }}
                value={form.about || ''}
                onChange={set('about')}
              />
            </Field>
            <Field label="Rules" id="s-rules" hint="One rule per line.">
              <textarea
                id="s-rules"
                className="textarea"
                style={{ minHeight: 130 }}
                value={form.rulesText}
                onChange={set('rulesText')}
              />
            </Field>
          </div>
        </Card>

        <Card className="card-pad">
          <p className="section-title" style={{ marginBottom: 12 }}>
            Why the club exists
          </p>
          <div className="stack">
            <Field label="Purpose — हिंदी" id="s-purpose-hi" hint="Shown by default.">
              <textarea
                id="s-purpose-hi"
                className="textarea devanagari"
                value={form.purposeHi || ''}
                onChange={set('purposeHi')}
              />
            </Field>
            <Field label="Purpose — English" id="s-purpose">
              <textarea
                id="s-purpose"
                className="textarea"
                value={form.purpose || ''}
                onChange={set('purpose')}
              />
            </Field>
            <Field label="What we do — हिंदी" id="s-points-hi" hint="One point per line.">
              <textarea
                id="s-points-hi"
                className="textarea devanagari"
                style={{ minHeight: 150 }}
                value={form.purposeTextHi || ''}
                onChange={set('purposeTextHi')}
              />
            </Field>
            <Field label="What we do — English" id="s-points" hint="One point per line.">
              <textarea
                id="s-points"
                className="textarea"
                style={{ minHeight: 150 }}
                value={form.purposeText || ''}
                onChange={set('purposeText')}
              />
            </Field>
          </div>
        </Card>

        <Card className="card-pad">
          <p className="section-title" style={{ marginBottom: 12 }}>
            Money
          </p>
          <div className="stack">
            <Field
              label="Default monthly amount"
              id="s-default"
              hint={`Currently ${money(form.defaultAmount)}. Used when adding a new member.`}
            >
              <input
                id="s-default"
                className="input num"
                value={form.defaultAmount}
                onChange={set('defaultAmount')}
                inputMode="numeric"
              />
            </Field>
            <Field label="UPI ID" id="s-upi" hint="Shown on the fund page for members to pay into.">
              <input id="s-upi" className="input num" value={form.upiId || ''} onChange={set('upiId')} />
            </Field>
            <Field
              label="Phone number for payments"
              id="s-payphone"
              hint="Shown beside the UPI ID. Leave empty to hide it."
            >
              <input
                id="s-payphone"
                className="input num"
                value={form.paymentPhone || ''}
                onChange={set('paymentPhone')}
                inputMode="numeric"
                maxLength={10}
              />
            </Field>
            <Field
              label="Contact number for new members"
              id="s-contact"
              hint="Shown on the public members board under 'Become a member'."
            >
              <input
                id="s-contact"
                className="input num"
                value={form.contactPhone || ''}
                onChange={set('contactPhone')}
                inputMode="numeric"
                maxLength={10}
              />
            </Field>
            <Field
              label="Club WhatsApp group link"
              id="s-wa"
              hint="Optional. Members send their payment screenshot here."
            >
              <input
                id="s-wa"
                className="input"
                value={form.whatsappGroupUrl || ''}
                onChange={set('whatsappGroupUrl')}
                placeholder="https://chat.whatsapp.com/…"
              />
            </Field>
            <Field
              label="Bank account label"
              id="s-bank"
              hint="Display text only. Never a full account number."
            >
              <input
                id="s-bank"
                className="input"
                value={form.bankAccountLabel || ''}
                onChange={set('bankAccountLabel')}
              />
            </Field>
          </div>
        </Card>

        <Card className="card-pad">
          <p className="section-title" style={{ marginBottom: 12 }}>
            The name we carry
          </p>
          <div className="stack">
            <div className="btn-row">
              <Field label="Founder name" id="s-fname">
                <input
                  id="s-fname"
                  className="input"
                  value={form.founderName || ''}
                  onChange={set('founderName')}
                />
              </Field>
              <Field label="In Hindi" id="s-fname-hi">
                <input
                  id="s-fname-hi"
                  className="input devanagari"
                  value={form.founderNameHi || ''}
                  onChange={set('founderNameHi')}
                />
              </Field>
            </div>
            <Field label="Years" id="s-fyears">
              <input
                id="s-fyears"
                className="input"
                value={form.founderYears || ''}
                onChange={set('founderYears')}
                placeholder="1433 – 1488"
              />
            </Field>
            <Field
              label="Portrait image"
              id="s-fphoto"
              hint="A path under client/public, e.g. /rao-shekha-ji.jpg. If the file is missing the drawn portrait is used instead."
            >
              <input
                id="s-fphoto"
                className="input"
                value={form.founderPhotoUrl || ''}
                onChange={set('founderPhotoUrl')}
                placeholder="/rao-shekha-ji.jpg"
              />
            </Field>
            <Field
              label="About him — हिंदी"
              id="s-fabout-hi"
              hint="Shown by default. Please check this and put it in the club's own words."
            >
              <textarea
                id="s-fabout-hi"
                className="textarea devanagari"
                style={{ minHeight: 190 }}
                value={form.founderAboutHi || ''}
                onChange={set('founderAboutHi')}
              />
            </Field>
            <Field label="About him — English" id="s-fabout">
              <textarea
                id="s-fabout"
                className="textarea"
                style={{ minHeight: 170 }}
                value={form.founderAbout || ''}
                onChange={set('founderAbout')}
              />
            </Field>
            <Field
              label="His contribution — हिंदी"
              id="s-contrib-hi"
              hint="One line from history per line. Please have someone check these."
            >
              <textarea
                id="s-contrib-hi"
                className="textarea devanagari"
                style={{ minHeight: 170 }}
                value={form.contribTextHi || ''}
                onChange={set('contribTextHi')}
              />
            </Field>
            <Field label="His contribution — English" id="s-contrib" hint="One line per line.">
              <textarea
                id="s-contrib"
                className="textarea"
                style={{ minHeight: 170 }}
                value={form.contribText || ''}
                onChange={set('contribText')}
              />
            </Field>
          </div>
        </Card>

        <Card className="card-pad">
          <p className="section-title" style={{ marginBottom: 12 }}>
            Visibility
          </p>

          <div className="row-between" style={{ marginBottom: 12 }}>
            <div style={{ minWidth: 0, paddingRight: 12 }}>
              <p style={{ fontWeight: 600 }}>Monthly payment board</p>
              <p className="small muted">
                Shows every member with a tick or a cross for the month. Effective for collection,
                but it does visibly mark who has not paid.
              </p>
            </div>
            <div className="segmented" style={{ flex: 'none', width: 140 }}>
              <button
                type="button"
                className={form.showPaidBoard ? 'on-credit' : ''}
                onClick={() => setForm((f) => ({ ...f, showPaidBoard: true }))}
              >
                On
              </button>
              <button
                type="button"
                className={!form.showPaidBoard ? 'on-debit' : ''}
                onClick={() => setForm((f) => ({ ...f, showPaidBoard: false }))}
              >
                Off
              </button>
            </div>
          </div>

          <Field
            label="PIN session length (days)"
            id="s-days"
            hint="How long a villager stays unlocked on their phone before entering the PIN again."
          >
            <input
              id="s-days"
              className="input num"
              value={form.viewerSessionDays}
              onChange={set('viewerSessionDays')}
              inputMode="numeric"
            />
          </Field>
        </Card>

        <Button block onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save settings'}
        </Button>
      </div>

      <div style={{ margin: '26px 0 12px' }}>
        <Rule label="Data" />
      </div>

      <Card>
        <CardHead title="Demo mode" />
        <div className="card-pad">
          <p className="small muted">
            The app is running on in-memory dummy data. Nothing is written to disk, and every
            restart rebuilds the same seed. Set <code>MONGODB_URI</code> in <code>server/.env</code>{' '}
            to switch to your Atlas cluster — the schemas are already written in{' '}
            <code>server/src/models.js</code>.
          </p>
        </div>
      </Card>
    </>
  );
}
