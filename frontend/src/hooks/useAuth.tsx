import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { loginUser, registerUser, logoutUser, clearError as clearErrorAction } from "@/redux/slices/authSlice";
import { User } from "@/types/User";

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => void;
  register: (name: string, email: string, password: string) => void;
  logout: () => void;
  clearError: () => void;
}

export const useAuth = (): UseAuthReturn => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading, error } = useAppSelector(state => state.auth);

  const login = useCallback(
    (email: string, password: string) => {
      dispatch(loginUser({ email, password }));
    },
    [dispatch]
  );

  const register = useCallback(
    (name: string, email: string, password: string) => {
      dispatch(registerUser({ name, email, password }));
    },
    [dispatch]
  );

  const logout = useCallback(() => {
    dispatch(logoutUser());
  }, [dispatch]);

  const clearError = useCallback(() => {
    dispatch(clearErrorAction());
  }, [dispatch]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
  };
};
