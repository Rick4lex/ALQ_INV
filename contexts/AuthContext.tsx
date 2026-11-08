import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole, AuthUser, AuthState } from '../types';
import { syncService } from '../services/syncService';
import { useInactivityTimer } from '../hooks/useInactivityTimer';

interface AuthContextType extends AuthState {
  isLoading: boolean;
  login: (pin: string, requestedRole?: UserRole) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  lock: () => void;
  unlock: (pin: string) => Promise<{ success: boolean; message?: string }>;
}

const STORAGE_KEY = 'alquima_mizu_session';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Cargar sesión persistida en sessionStorage al montar
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const now = Date.now();
        if (parsed.expiresAt && parsed.expiresAt > now && parsed.token && parsed.user) {
          setUser(parsed.user);
          setToken(parsed.token);
          setExpiresAt(parsed.expiresAt);
          setIsAuthenticated(true);
          setIsLocked(!!parsed.isLocked);
        } else {
          sessionStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch (err) {
      console.warn('Error leyendo sesión previa:', err);
      sessionStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Actualizar sessionStorage cuando cambia el estado
  const persistSession = useCallback((
    newUser: AuthUser | null,
    newToken: string | null,
    newExpiresAt: number | null,
    newLocked: boolean
  ) => {
    if (newUser && newToken && newExpiresAt) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        user: newUser,
        token: newToken,
        expiresAt: newExpiresAt,
        isLocked: newLocked
      }));
    } else {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // Bloqueo de sesión (por inactividad o manual)
  const lock = useCallback(() => {
    if (!isAuthenticated) return;
    setIsLocked(true);
    if (user && token && expiresAt) {
      persistSession(user, token, expiresAt, true);
    }
  }, [isAuthenticated, user, token, expiresAt, persistSession]);

  // Hook de inactividad: 15 minutos sin interacción bloquea la pantalla
  useInactivityTimer({
    isEnabled: isAuthenticated && !isLocked,
    timeoutMinutes: 15,
    onTimeout: lock
  });

  // Login inicial
  const login = async (pin: string, requestedRole?: UserRole): Promise<{ success: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      const res = await syncService.login(pin, requestedRole);
      if (res && res.success) {
        const authUser: AuthUser = {
          role: res.role || requestedRole || 'vendedor',
          email: res.userEmail
        };
        const expiry = res.expiresAt || (Date.now() + 12 * 60 * 60 * 1000);
        
        setUser(authUser);
        setToken(res.token || `token_${Date.now()}`);
        setExpiresAt(expiry);
        setIsAuthenticated(true);
        setIsLocked(false);

        persistSession(authUser, res.token, expiry, false);
        return { success: true };
      } else {
        return {
          success: false,
          message: res?.message || 'PIN o contraseña incorrecta.'
        };
      }
    } catch (err) {
      console.error('Error durante autenticación:', err);
      return {
        success: false,
        message: 'Error de conexión con el servicio de autenticación.'
      };
    } finally {
      setIsLoading(false);
    }
  };

  // Desbloqueo tras inactividad
  const unlock = async (pin: string): Promise<{ success: boolean; message?: string }> => {
    if (!user) return { success: false, message: 'No hay usuario autenticado.' };
    setIsLoading(true);
    try {
      const res = await syncService.login(pin, user.role);
      if (res && res.success && res.role === user.role) {
        setIsLocked(false);
        persistSession(user, token, expiresAt, false);
        return { success: true };
      } else {
        return { success: false, message: 'PIN incorrecto para reanudar esta sesión.' };
      }
    } catch (err) {
      console.error('Error al desbloquear sesión:', err);
      return { success: false, message: 'Error al verificar credenciales.' };
    } finally {
      setIsLoading(false);
    }
  };

  // Cierre de sesión
  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    setIsLocked(false);
    setExpiresAt(null);
    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        isLocked,
        expiresAt,
        isLoading,
        login,
        logout,
        lock,
        unlock
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};
