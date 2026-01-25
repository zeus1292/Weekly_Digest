import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface User {
  id: string;
  email: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  sessionId: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const response = await apiRequest("GET", "/api/auth/me");
      const data = await response.json();
      setUser(data.user);
      setSessionId(data.sessionId);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/login", { email, password });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Login failed");
    }
    const userData = await response.json();
    setUser(userData);
  };

  const register = async (email: string, password: string) => {
    const response = await apiRequest("POST", "/api/auth/register", { email, password });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Registration failed");
    }
    const userData = await response.json();
    setUser(userData);
  };

  const logout = async () => {
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    }
    setUser(null);
    await refreshUser(); // Get new session ID
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, sessionId, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
