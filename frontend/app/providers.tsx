"use client";

import { AuthProvider } from "@/context/auth-context";
import { PlayerProvider } from "@/context/player-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PlayerProvider>{children}</PlayerProvider>
    </AuthProvider>
  );
}
