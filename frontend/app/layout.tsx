import type { Metadata } from "next";

import { AppShell } from "@/app/app-shell";
import { AuthProvider } from "@/app/auth-context";
import { PlayerProvider } from "@/context/player-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "BeatKosh",
  description: "Marketplace and collaboration frontend for beats, licensing, and producer hiring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <PlayerProvider>
            <AppShell>{children}</AppShell>
          </PlayerProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
