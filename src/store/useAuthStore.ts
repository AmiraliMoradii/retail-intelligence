import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types";

const SESSION_FLAG = "ri-session-active";

interface AuthState {
  user: User | null;
  remember: boolean;
  signedInAt: string | null;
  signIn: (user: User, remember: boolean) => void;
  signOut: () => void;
}

/**
 * Simulated authentication only — no credentials are stored. "Remember me" keeps the demo session
 * across browser restarts; otherwise the session ends when the browser tab session ends.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      remember: false,
      signedInAt: null,
      signIn: (user, remember) => {
        sessionStorage.setItem(SESSION_FLAG, "1");
        set({ user, remember, signedInAt: new Date().toISOString() });
      },
      signOut: () => {
        sessionStorage.removeItem(SESSION_FLAG);
        set({ user: null, signedInAt: null });
      },
    }),
    {
      name: "ri-auth",
      onRehydrateStorage: () => (state) => {
        if (state?.user && !state.remember && !sessionStorage.getItem(SESSION_FLAG)) {
          state.signOut();
        }
      },
    },
  ),
);
