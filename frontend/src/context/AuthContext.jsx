/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const subject = localStorage.getItem('authSubject');
    if (token && subject) {
      setUser({ subject });
    }
    setLoading(false);
  }, []);

  const login = async (subject) => {
    try {
      const response = await apiClient.post(`/auth/token?subject=${subject}`);
      const token = response.data.token;
      localStorage.setItem('authToken', token);
      localStorage.setItem('authSubject', subject);
      setUser({ subject });
      return true;
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authSubject');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
