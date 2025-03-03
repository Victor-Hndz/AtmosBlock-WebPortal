import { useEffect, useState } from "react";
import { User } from "@Types/userTypes";
import { fetchAuthUser } from "@services/userService";

export const useAuthLogin = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeUser = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        setUser(await fetchAuthUser(token));
      }
      setLoading(false);
    };
    initializeUser();
  }, []);

  const login = async (token: string) => {
    setLoading(true);
    try {
      localStorage.setItem("token", token);
      const userData = await fetchAuthUser(token);
      setUser(userData);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
  };

  return { user, loading, login, logout };
};
