import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { EmptyMark, Icon } from './Ornaments.jsx';

/* ------------------------------------------------------------------ shell */

export function Card({ children, className = '', ...rest }) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHead({ title, action }) {
  return (
    <div className="card-head">
      <h2 className="card-title">{title}</h2>
      {action}
    </div>
  );
}

export function PageHead({ eyebrow, title, sub, children }) {
  return (
    <header className="page-head">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1 className="page-title">{title}</h1>
      {sub ? <p className="page-sub">{sub}</p> : null}
      {children}
    </header>
  );
}

export function Rule({ label }) {
  return (
    <div className="rule">
      {label ? <span>{label}</span> : null}
    </div>
  );
}

/* ---------------------------------------------------------------- buttons */

export function Button({ variant = '', block, size, className = '', children, ...rest }) {
  const classes = [
    'btn',
    variant ? `btn-${variant}` : '',
    block ? 'btn-block' : '',
    size === 'sm' ? 'btn-sm' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ forms */

export function Field({ label, hint, error, children, id }) {
  return (
    <div className="field">
      {label ? (
        <label className="label" htmlFor={id}>
          {label}
        </label>
      ) : null}
      {children}
      {error ? <p className="error-text">{error}</p> : null}
      {hint && !error ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function Notice({ kind = 'info', children }) {
  if (!children) return null;
  return <div className={`notice-box notice-${kind}`}>{children}</div>;
}

/**
 * A masked field with a reveal toggle, exactly like a password box. Used for
 * the club PIN so it is not readable over someone's shoulder by default.
 */
export function SecretInput({ className = 'input', ...rest }) {
  const [shown, setShown] = useState(false);
  return (
    <span className="input-wrap">
      <input {...rest} type={shown ? 'text' : 'password'} className={className} />
      <button
        type="button"
        className="reveal-btn"
        onClick={() => setShown((s) => !s)}
        aria-label={shown ? 'Hide' : 'Show'}
        title={shown ? 'Hide' : 'Show'}
      >
        {shown ? <Icon.eyeOff /> : <Icon.eye />}
      </button>
    </span>
  );
}

/** Yes / no, for anything that writes money. */
export function Confirm({ open, title, children, confirmLabel = 'Yes', busy, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="confirm-backdrop" role="dialog" aria-modal="true" onClick={onCancel}>
      <div className="confirm" onClick={(e) => e.stopPropagation()}>
        <h2 className="confirm-title">{title}</h2>
        {children}
        <div className="btn-row" style={{ marginTop: 18 }}>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            No
          </Button>
          <Button onClick={onConfirm} disabled={busy}>
            {busy ? 'Saving…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ state */

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <EmptyMark className="empty-mark" />
      <p className="empty-title">{title}</p>
      {children ? <p className="small" style={{ marginTop: 4 }}>{children}</p> : null}
    </div>
  );
}

export function Loading({ rows = 3 }) {
  return (
    <div className="stack-sm" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: i === 0 ? 76 : 56 }} />
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  if (!error) return null;
  return (
    <Card className="card-pad">
      <p style={{ fontWeight: 600, marginBottom: 4 }}>Could not load this</p>
      <p className="small muted">{error.message}</p>
      {onRetry ? (
        <Button variant="ghost" size="sm" style={{ marginTop: 12 }} onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </Card>
  );
}

/* ------------------------------------------------------------ bottom sheet */

export function Sheet({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Menu'}
      onClick={onClose}
    >
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" />
        {title ? <h2 className="sheet-title">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}

export function SheetItem({ icon, onClick, danger, children }) {
  return (
    <button type="button" className={`sheet-item${danger ? ' danger' : ''}`} onClick={onClick}>
      {icon ? <span className="k">{icon}</span> : null}
      <span style={{ flex: 1 }}>{children}</span>
      <span className="chevron">
        <Icon.chevron />
      </span>
    </button>
  );
}

/* ----------------------------------------------------------------- toasts */

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const show = useCallback((message, kind = 'ok') => {
    setToast({ message, kind, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <div className="toast-wrap">
          <div className={`toast ${toast.kind}`} role="status">
            {toast.message}
          </div>
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

/* ------------------------------------------------------------------ misc */

export function Progress({ value, max, light }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`progress${light ? ' progress-lite' : ''}`} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Chip({ kind = 'outline', children }) {
  return <span className={`chip chip-${kind}`}>{children}</span>;
}

export function Stat({ label, value }) {
  return (
    <div className="stat">
      <p className="stat-k">{label}</p>
      <p className="stat-v num">{value}</p>
    </div>
  );
}
