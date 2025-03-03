import React, { createContext } from "react";
import { User } from "@Types/userTypes";
import { useAuthLogin } from "@hooks/useAuthLogin";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, login, logout } = useAuthLogin();

  const value = React.useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export { AuthContext };
