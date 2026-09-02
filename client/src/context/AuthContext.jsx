import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, tokenStorage } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => tokenStorage.get());
  const [loading, setLoading] = useState(true);

  // Restore authenticated session on application startup
  const restoreSession = useCallback(async () => {
    const storedToken = tokenStorage.get();
    if (!storedToken) {
      setLoading(false);
      return;
    }

    try {
      const response = await authApi.getCurrentUser(storedToken);
      if (response && response.success && response.data?.user) {
        setUser(response.data.user);
        setToken(storedToken);
      } else {
        // Invalid response structure, clean state
        tokenStorage.remove();
        setUser(null);
        setToken(null);
      }
    } catch (error) {
      console.warn('Session restoration failed:', error.message);
      // Clean storage if token is invalid or expired
      tokenStorage.remove();
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Login handler
  const login = async (email, password) => {
    try {
      const response = await authApi.login(email, password);
      if (response.success && response.data) {
        const { user: userData, token: newToken } = response.data;
        tokenStorage.set(newToken);
        setUser(userData);
        setToken(newToken);
        return { success: true, user: userData };
      }
      throw new Error(response.message || 'Login failed');
    } catch (error) {
      throw error;
    }
  };

  // Register handler
  const register = async (name, email, password) => {
    try {
      const response = await authApi.register(name, email, password);
      if (response.success && response.data) {
        const { user: userData, token: newToken } = response.data;
        tokenStorage.set(newToken);
        setUser(userData);
        setToken(newToken);
        return { success: true, user: userData };
      }
      throw new Error(response.message || 'Registration failed');
    } catch (error) {
      throw error;
    }
  };

  // Demo Login handler
  const loginDemo = async () => {
    try {
      const response = await authApi.loginDemo();
      if (response.success && response.data) {
        const { user: userData, token: newToken } = response.data;
        tokenStorage.set(newToken);
        setUser(userData);
        setToken(newToken);
        return { success: true, user: userData };
      }
      throw new Error(response.message || 'Demo login failed');
    } catch (error) {
      throw error;
    }
  };

  // Logout handler
  const logout = () => {
    tokenStorage.remove();
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    isDemo: !!user?.isDemo,
    login,
    loginDemo,
    register,
    logout,
    restoreSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
