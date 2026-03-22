import type { Metadata } from "next";

import { AppShell } from "@/app/app-shell";
import { Providers } from "@/app/providers";
import { CartProvider } from "@/context/cart-context";
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
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>
          <CartProvider>
            <AppShell>{children}</AppShell>
          </CartProvider>
        </Providers>
      </body>
    </html>
  );
}
