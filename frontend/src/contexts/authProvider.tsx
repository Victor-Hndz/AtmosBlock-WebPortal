import React, { ReactNode } from "react";
import { Provider } from "react-redux";
import { store } from "@/redux/store";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  return <Provider store={store}>{children}</Provider>;
};

export default AuthProvider;
