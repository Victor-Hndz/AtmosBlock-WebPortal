import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { loginUser, registerUser, logoutUser, clearError as clearErrorAction } from "@/redux/slices/authSlice";
import { User } from "@/types/User";

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

/**
 * Custom hook to handle authentication functionality
 * Provides methods for login, registration, logout, and accessing auth state
 * @returns Authentication utilities and state
 */
export const useAuth = (): UseAuthReturn => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isLoading, error } = useAppSelector(state => state.auth);

  /**
   * Log in a user with email and password
   * @param email - User's email
   * @param password - User's password
   * @returns Promise that resolves when login is complete
   */
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      try {
        await dispatch(loginUser({ email, password })).unwrap();
      } catch (error) {
        console.error("Login error:", error);
      }
    },
    [dispatch]
  );

  /**
   * Register a new user
   * @param name - User's name
   * @param email - User's email
   * @param password - User's password
   * @returns Promise that resolves when registration is complete
   */
  const register = useCallback(
    async (name: string, email: string, password: string): Promise<void> => {
      try {
        await dispatch(registerUser({ name, email, password })).unwrap();
      } catch (error) {
        console.error("Registration error:", error);
      }
    },
    [dispatch]
  );

  /**
   * Log out the current user
   * @returns Promise that resolves when logout is complete
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      await dispatch(logoutUser()).unwrap();
    } catch (error) {
      console.error("Logout error:", error);
    }
  }, [dispatch]);

  /**
   * Clear any authentication errors
   */
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
