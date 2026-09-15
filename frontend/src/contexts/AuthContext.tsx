import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../config/api';

export interface User {
  userId: string;
  name: string;
  role: 'PROFESSOR' | 'STUDENT' | 'TA';
  email?: string;
  studentNumber?: string;
  taId?: string;
  token?: string;
}

interface AuthContextType {
  user: User | null;
  login: (userData: User) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Validate or restore session from server HttpOnly cookie on mount
  useEffect(() => {
    let isMounted = true;
    const checkAuth = async () => {
      try {
        const res = await api.get('/auth/me');
        if (isMounted && res.data?.data) {
          const fetchedUser = res.data.data;
          setUser((prev) => {
            const updated = { ...(prev || {}), ...fetchedUser };
            localStorage.setItem('user', JSON.stringify(updated));
            return updated;
          });
        }
      } catch (err: unknown) {
        const e = err as { response?: { status?: number } };
        // If 401 unauthorized, cookie is invalid/expired
        if (e.response?.status === 401 && isMounted) {
          setUser(null);
          localStorage.removeItem('user');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    checkAuth();
    return () => {
      isMounted = false;
    };
  }, []);

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/me');
      if (res.data?.data) {
        const fetchedUser = res.data.data;
        setUser((prev) => {
          const updated = { ...(prev || {}), ...fetchedUser };
          localStorage.setItem('user', JSON.stringify(updated));
          return updated;
        });
      }
    } catch (err: unknown) {
      const e = err as { response?: { status?: number } };
      if (e.response?.status === 401) {
        setUser(null);
        localStorage.removeItem('user');
      }
    }
  };

  const login = (userData: User) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors during logout
    } finally {
      setUser(null);
      localStorage.removeItem('user');
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user, isLoading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
