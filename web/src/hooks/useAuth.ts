import { useState, useEffect, createContext, useContext } from 'react';
import { User, UserRole } from '@/types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    // Return default values when context is not available
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      // Try to load auth data from localStorage
      if (typeof window !== 'undefined') {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('authUser');
        
        if (storedToken && storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
          try {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser && typeof parsedUser === 'object') {
              setUser(parsedUser);
              setToken(storedToken);
            } else {
              throw new Error('Invalid user data');
            }
          } catch (error) {
            console.error('Error parsing stored user:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            localStorage.removeItem('userRole');
          }
        }
      }
      
      setIsLoading(false);
    }, []);

    const login = (newToken: string, newUser: User) => {
      setToken(newToken);
      setUser(newUser);
      if (typeof window !== 'undefined') {
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('authUser', JSON.stringify(newUser));
      }
    };

    const logout = () => {
      setToken(null);
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
      }
    };

    return {
      user,
      token,
      isAuthenticated: !!token && !!user,
      login,
      logout,
      isLoading
    };
  }
  return context;
};