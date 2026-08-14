import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSession, TenantId, Permission, UserRole } from '../types/fsm';
import { FsmApiClient } from './apiClient';

interface AuthContextType {
  session: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, mfaCode?: string) => Promise<any>;
  verifyMfa: (tempToken: string, mfaCode: string) => Promise<any>;
  logout: () => Promise<void>;
  loginAsDemoUser: (userId: string) => Promise<void>;
  switchTenant: (tenantId: TenantId) => void;
  hasPermission: (permission: Permission) => boolean;
  hasRole: (...roles: UserRole[]) => boolean;
  registerBank: (data: any) => Promise<void>;
  verifyInvite: (code: string) => Promise<any>;
  redeemInvite: (data: any) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<any>;
  resetPassword: (email: string, resetCode: string, newPass: string) => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<UserSession | null>(FsmApiClient.getSession());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const init = async () => {
      FsmApiClient.initializeAuth();
      const existing = FsmApiClient.getSession();
      setSession(existing?.jwtToken ? existing : null);
      setIsLoading(false);
    };

    init();
  }, []);

  const login = async (email: string, password: string, mfaCode?: string) => {
    const result = await FsmApiClient.login(email, password, mfaCode);
    if (result.session) {
      setSession(result.session);
    }
    return result;
  };

  const verifyMfa = async (tempToken: string, mfaCode: string) => {
    const result = await FsmApiClient.verifyMfa(tempToken, mfaCode);
    if (result.session) {
      setSession(result.session);
    }
    return result;
  };

  const loginAsDemoUser = async () => {
    throw new Error('Demo persona switching is disabled in production. Use an authorized account.');
  };

  const logout = async () => {
    await FsmApiClient.logout();
    setSession(null);
  };

  const switchTenant = (tenantId: TenantId) => {
    if (session && session.allowedTenantIds.includes(tenantId)) {
      const updated: UserSession = { ...session, activeTenantId: tenantId };
      FsmApiClient.setSession(updated);
      setSession(updated);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!session) return false;
    if (session.role === 'PIONEER_SUPER_ADMIN' || session.role === 'SYSTEM_ADMIN') return true;
    return session.permissions?.includes(permission) ?? false;
  };

  const hasRole = (...roles: UserRole[]): boolean => {
    if (!session) return false;
    return roles.includes(session.role);
  };

  const registerBank = async (data: any) => {
    const res = await FsmApiClient.registerBank(data);
    setSession(res.session);
  };

  const verifyInvite = async (code: string) => {
    return await FsmApiClient.verifyInvite(code);
  };

  const redeemInvite = async (data: any) => {
    const res = await FsmApiClient.redeemInvite(data);
    setSession(res.session);
  };

  const requestPasswordReset = async (email: string) => {
    return await FsmApiClient.requestPasswordReset(email);
  };

  const resetPassword = async (email: string, resetCode: string, newPass: string) => {
    return await FsmApiClient.resetPassword(email, resetCode, newPass);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        isAuthenticated: !!session,
        isLoading,
        login,
        verifyMfa,
        logout,
        loginAsDemoUser,
        switchTenant,
        hasPermission,
        hasRole,
        registerBank,
        verifyInvite,
        redeemInvite,
        requestPasswordReset,
        resetPassword,
      }}
    >
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

export const RequirePermission: React.FC<{
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}> = ({ permission, children, fallback = null }) => {
  const { hasPermission } = useAuth();
  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
};
