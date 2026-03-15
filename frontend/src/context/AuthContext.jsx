import { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { API_URL } from "../config";

const AuthContext = createContext({ 
  user: null, 
  loading: true, 
  login: () => {}, 
  logout: () => {}, 
  getToken: () => null 
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const syncUserFromToken = (token) => {
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const decoded = jwtDecode(token);
      // Check if expired
      if (decoded.exp * 1000 < Date.now()) {
        localStorage.removeItem("auth_token");
        setUser(null);
      } else {
        setUser(decoded);
      }
    } catch (e) {
      console.error("Invalid token", e);
      localStorage.removeItem("auth_token");
      setUser(null);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    syncUserFromToken(token);
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem("auth_token", token);
    syncUserFromToken(token);
    // Explicitly set user if provided (to get immediate updates before token decode if needed)
    if (userData) {
      setUser((prev) => ({ ...prev, ...userData }));
    }
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    setUser(null);
  };

  const getToken = () => {
    return localStorage.getItem("auth_token");
  };
  
  // Backwards compatibility naming
  const getIdToken = async () => {
    return getToken();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, getToken, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);


