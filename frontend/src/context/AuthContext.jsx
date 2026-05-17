import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("jurisai_token"));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("jurisai_user");
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (token) localStorage.setItem("jurisai_token", token);
    else localStorage.removeItem("jurisai_token");
  }, [token]);

  useEffect(() => {
    if (user) localStorage.setItem("jurisai_user", JSON.stringify(user));
    else localStorage.removeItem("jurisai_user");
  }, [user]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    setToken(data.token);
    setUser(data.user);
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
    }),
    [token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
