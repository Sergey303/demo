import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getAuthSession,
  loginAuth,
  logoutAuth,
  type AuthSession,
} from "./authApi";
import { clearForbidden } from "./authBoundary";
import { clearMutationDurabilityPartition, configureMutationDurabilityPartition } from "../generated-ts/runtime/mutationDurabilityRuntime";

interface AuthContextValue {
  session: AuthSession | null;
  loading: boolean;
  login(login: string, password: string): Promise<void>;
  logout(): Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [session, setSession] = useState<AuthSession | null>(
    () => getAuthSession(),
  );

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    configureMutationDurabilityPartition(session?.user.id ?? null);
  }, [session]);

  useEffect(() => {
    const refresh = () => {
      const nextSession = getAuthSession();

      if (!nextSession) {
        queryClient.clear();
      }

      setSession(nextSession);
    };

    window.addEventListener("appforge-auth-changed", refresh);

    return () => {
      window.removeEventListener("appforge-auth-changed", refresh);
    };
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(() => ({
    session,
    loading,

    async login(login: string, password: string) {
      setLoading(true);
      queryClient.clear();
      clearForbidden();

      const previousPartition = session?.user.id ?? null;
      if (previousPartition) {
        configureMutationDurabilityPartition(null);
      }
      try {
        const nextSession = await loginAuth(login, password);
        if (previousPartition && previousPartition !== nextSession.user.id) {
          await clearMutationDurabilityPartition(previousPartition);
        }
        configureMutationDurabilityPartition(nextSession.user.id);
        setSession(nextSession);
      }
      catch (error) {
        if (previousPartition) {
          configureMutationDurabilityPartition(previousPartition);
        }
        throw error;
      }
      finally {
        setLoading(false);
      }
    },

    async logout() {
      setLoading(true);
      const partitionToClear = session?.user.id ?? null;
      configureMutationDurabilityPartition(null);

      try {
        await logoutAuth();
        if (partitionToClear) {
          await clearMutationDurabilityPartition(partitionToClear);
        }
        queryClient.clear();
        clearForbidden();
        setSession(null);
      }
      finally {
        setLoading(false);
      }
    },
  }), [loading, queryClient, session]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("AuthProvider is missing.");
  }

  return value;
}
