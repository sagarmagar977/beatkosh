"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { apiCachedRequest } from "@/lib/api";

type CartSummary = {
  item_count: number;
};

type CartContextType = {
  itemCount: number;
  refreshCart: () => Promise<void>;
  setItemCount: (value: number) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [itemCount, setItemCount] = useState(0);

  const refreshCart = useCallback(async () => {
    if (!token) {
      return;
    }
    try {
      const cart = await apiCachedRequest<CartSummary>("/orders/cart/me/", { token }, { ttlMs: 15_000, scope: "session" });
      setItemCount(cart.item_count ?? 0);
    } catch {
      setItemCount(0);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }
    const timeoutId = window.setTimeout(() => {
      void refreshCart();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshCart, token]);

  return <CartContext.Provider value={{ itemCount: token ? itemCount : 0, refreshCart, setItemCount }}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
