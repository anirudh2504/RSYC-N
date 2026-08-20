/**
 * Two things the browser will not tell you straight.
 */

/**
 * Is this a phone or tablet?
 *
 * There is no feature test for "will a upi:// link open anything", because a
 * URL scheme handler is invisible to the page. Only the operating system knows,
 * and it never says. So this is user-agent sniffing — normally a bad habit, but
 * the right tool here, since the alternative is showing a laptop user a button
 * that silently does nothing.
 *
 * iPadOS reports itself as a Mac, hence the touch-point check.
 */
export function isMobileDevice() {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';
  if (/Android|iPhone|iPod|Windows Phone|webOS|BlackBerry|Opera Mini|IEMobile/i.test(ua)) {
    return true;
  }
  // iPad on iPadOS 13+ pretends to be a desktop Mac.
  if (/iPad/i.test(ua)) return true;
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;

  return false;
}

/**
 * Copy text to the clipboard, and actually say whether it worked.
 *
 * navigator.clipboard only exists in a secure context — HTTPS or localhost. The
 * moment this app is opened from another device over the LAN on plain http, or
 * ever served without TLS, that API is simply undefined. So there is a fallback
 * through a hidden textarea, which works on insecure origins, and a boolean
 * result either way so the caller can tell the user when neither worked.
 */
export async function copyText(text) {
  const value = String(text || '');
  if (!value) return false;

  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Permission refused or the document was not focused — fall through.
    }
  }

  try {
    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    // Off-screen but still selectable. `fixed` avoids scrolling the page.
    field.style.position = 'fixed';
    field.style.top = '-1000px';
    field.style.opacity = '0';
    document.body.appendChild(field);

    field.select();
    field.setSelectionRange(0, value.length); // iOS needs the explicit range

    const ok = document.execCommand('copy');
    document.body.removeChild(field);
    return ok;
  } catch {
    return false;
  }
}
