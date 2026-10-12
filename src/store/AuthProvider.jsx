import { useEffect, useMemo, useRef, useState } from 'react';
import { AuthContext, MIN_PASSWORD } from './useAuth';
import { DEFAULT_ADMIN } from '../data/defaultAdmin';
import { createCredential, verifyPassword } from '../lib/password';

/*
 * Staff accounts live in this browser only (localStorage) until the project has a backend,
 * so the sign-in is a convenience gate rather than real security.
 */
const STORAGE_KEY = 'mc-prestige-salon/staff/v1';
const RETIRED_KEYS = ['mc-prestige-salon/auth/v1'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normaliseEmail = (email) => String(email || '').trim().toLowerCase();

const nextAccountId = (accounts) =>
  `ACC${String(accounts.reduce((max, a) => Math.max(max, Number.parseInt(a.id.slice(3), 10) || 0), 0) + 1).padStart(4, '0')}`;

/**
 * Makes sure the built-in administrator (src/data/defaultAdmin.js) exists in this browser and
 * carries the credentials defined there, so a password changed in code takes effect everywhere.
 */
function withBuiltInAdmin(accounts) {
  if (!DEFAULT_ADMIN) return accounts;
  const email = normaliseEmail(DEFAULT_ADMIN.email);
  const credential = { salt: DEFAULT_ADMIN.salt, hash: DEFAULT_ADMIN.hash, algorithm: DEFAULT_ADMIN.algorithm };
  if (accounts.some((a) => a.email === email)) {
    return accounts.map((a) => (a.email === email ? { ...a, ...credential } : a));
  }
  return [
    ...accounts,
    { id: nextAccountId(accounts), name: DEFAULT_ADMIN.name, email, createdAt: new Date().toISOString(), ...credential },
  ];
}

function load() {
  let stored = { accounts: [], sessionId: null };
  try {
    RETIRED_KEYS.forEach((key) => window.localStorage.removeItem(key));
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (parsed && Array.isArray(parsed.accounts)) stored = { accounts: parsed.accounts, sessionId: parsed.sessionId || null };
  } catch {
    // Unreadable storage starts with no accounts.
  }
  const accounts = withBuiltInAdmin(stored.accounts);
  return { accounts, sessionId: accounts.some((a) => a.id === stored.sessionId) ? stored.sessionId : null };
}

/** Field-level problems with a new administrator's details, or null when they are fine. */
function validateDetails({ name, email, password }) {
  if (!String(name || '').trim()) return { field: 'name', message: 'Enter your full name.' };
  if (!EMAIL.test(normaliseEmail(email))) return { field: 'email', message: 'Enter a valid email address.' };
  if (String(password || '').length < MIN_PASSWORD) {
    return { field: 'password', message: `Use at least ${MIN_PASSWORD} characters.` };
  }
  return null;
}

export function AuthProvider({ children }) {
  const [store, setStore] = useState(load);
  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Storage unavailable — the session lasts until the tab closes.
    }
  }, [store]);

  const account = useMemo(() => store.accounts.find((a) => a.id === store.sessionId) || null, [store]);
  const hasAdmin = store.accounts.length > 0;

  const api = useMemo(
    () => ({
      /** Only when no built-in administrator is defined: the first visit creates one. */
      async createAdmin(details) {
        if (storeRef.current.accounts.length > 0) {
          return { ok: false, field: 'email', message: 'An administrator account already exists.' };
        }
        const problem = validateDetails(details);
        if (problem) return { ok: false, ...problem };
        const credential = await createCredential(details.password);
        const id = nextAccountId(storeRef.current.accounts);
        const created = {
          id,
          name: details.name.trim(),
          email: normaliseEmail(details.email),
          createdAt: new Date().toISOString(),
          ...credential,
        };
        setStore({ accounts: [created], sessionId: id });
        return { ok: true };
      },

      async signIn({ email, password }) {
        const found = storeRef.current.accounts.find((a) => a.email === normaliseEmail(email));
        const valid = found ? await verifyPassword(String(password || ''), found) : false;
        // One message for both cases, so the form does not reveal which emails are registered.
        if (!valid) return { ok: false, message: 'Email or password is incorrect.' };
        setStore((current) => ({ ...current, sessionId: found.id }));
        return { ok: true };
      },

      signOut: () => setStore((current) => ({ ...current, sessionId: null })),
    }),
    [],
  );

  const user = useMemo(() => {
    if (!account) return null;
    // Credentials never leave the provider.
    const { salt: _salt, hash: _hash, algorithm: _algorithm, ...publicFields } = account;
    return publicFields;
  }, [account]);

  const value = useMemo(() => ({ user, hasAdmin, ...api }), [user, hasAdmin, api]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
