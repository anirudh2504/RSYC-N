import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api.js';

/**
 * Who is looking at the app.
 *
 *   viewer  someone who entered the club PIN, or any signed-in admin
 *   admin   a signed-in admin or master account
 *
 * Both live in httpOnly cookies, so the browser never reads them directly —
 * we ask the server what it sees.
 */

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [state, setState] = useState({
    loading: true,
    viewer: false,
    admin: null,
    setupNeeded: false,
  });

  const refresh = useCallback(async () => {
    try {
      const data = await api.get('/access/session');
      setState({
        loading: false,
        viewer: !!data.viewer,
        admin: data.admin || null,
        setupNeeded: !!data.setupNeeded,
      });
      return data;
    } catch {
      setState({ loading: false, viewer: false, admin: null, setupNeeded: false });
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unlock = useCallback(
    async (pin) => {
      await api.post('/access/unlock', { pin });
      await refresh();
    },
    [refresh],
  );

  const lock = useCallback(async () => {
    await api.post('/access/lock');
    await refresh();
  }, [refresh]);

  const login = useCallback(
    async (email, password) => {
      await api.post('/auth/login', { email, password });
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await api.post('/auth/logout');
    await refresh();
  }, [refresh]);

  /** One time only: found the club and become its master admin. */
  const setup = useCallback(
    async (fields) => {
      await api.post('/auth/setup', fields);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      ...state,
      isAdmin: !!state.admin,
      isMaster: !!state.admin && state.admin.role === 'master',
      refresh,
      unlock,
      lock,
      login,
      logout,
      setup,
    }),
    [state, refresh, unlock, lock, login, logout, setup],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}

/** Small data-fetching hook. Enough for an app this size. */
export function useFetch(path, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: null }));

    api
      .get(path, { signal: controller.signal })
      .then((data) => {
        if (alive) setState({ loading: false, data, error: null });
      })
      .catch((error) => {
        if (error.name === 'AbortError' || !alive) return;
        setState({ loading: false, data: null, error });
      });

    return () => {
      alive = false;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, nonce, ...deps]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);

  return { ...state, reload };
}
