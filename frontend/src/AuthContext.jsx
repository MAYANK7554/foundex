import React, { createContext, useContext, useState, useCallback } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const raw = sessionStorage.getItem("clf-auth");
    return raw ? JSON.parse(raw) : null;
  });

  const login = useCallback((data) => {
    setAuth(data);
    sessionStorage.setItem("clf-auth", JSON.stringify(data));
  }, []);

  const logout = useCallback(() => {
    setAuth(null);
    sessionStorage.removeItem("clf-auth");
  }, []);

  return (
    <AuthContext.Provider value={{ user: auth?.user || null, token: auth?.token || null, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
