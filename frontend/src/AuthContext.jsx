import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { setUnauthorizedHandler } from "./api.js";

const STORAGE_KEY = "clf-auth";
const AuthContext = createContext(null);

// Reads the `exp` claim (seconds) from a JWT without verifying it — the server does that.
function tokenExpiry(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isValid(auth) {
  if (!auth?.token || !auth?.user) return false;
  const exp = tokenExpiry(auth.token);
  return exp === null || exp > Date.now();
}

function readStored() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (isValid(parsed)) return parsed;
  } catch {
    // corrupt or inaccessible storage — fall through
  }
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
  return null;
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(readStored);

  const login = useCallback((data) => {
    setAuth(data);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
  }, []);

  const logout = useCallback(() => {
    setAuth(null);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  // Any API call that comes back 401 with our token means the session is dead.
  useEffect(() => {
    setUnauthorizedHandler(logout);
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  // Log out automatically the moment the token expires.
  useEffect(() => {
    const exp = auth && tokenExpiry(auth.token);
    if (!exp) return;
    const ms = exp - Date.now();
    if (ms <= 0) { logout(); return; }
    const id = setTimeout(logout, Math.min(ms, 2 ** 31 - 1));
    return () => clearTimeout(id);
  }, [auth, logout]);

  // Keep tabs in sync: logging in/out in one tab applies to all.
  useEffect(() => {
    function onStorage(e) {
      if (e.key === STORAGE_KEY || e.key === null) setAuth(readStored());
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(
    () => ({ user: auth?.user || null, token: auth?.token || null, login, logout }),
    [auth, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
