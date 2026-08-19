/**
 * One thin wrapper around fetch.
 *
 * Vite proxies /api to the Express server during development, so requests are
 * same-origin and the session cookies need no special handling.
 */

class ApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request(path, { method = 'GET', body, signal } = {}) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new ApiError('Could not reach the server. Is it running?', 0, 'network');
  }

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!res.ok) {
    const message = (data && data.message) || 'Something went wrong.';
    throw new ApiError(message, res.status, data && data.error);
  }

  return data;
}

export const api = {
  get: (path, opts) => request(path, opts),
  post: (path, body, opts) => request(path, { ...opts, method: 'POST', body: body || {} }),
  patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body: body || {} }),
  put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body: body || {} }),
  del: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};

export { ApiError };
