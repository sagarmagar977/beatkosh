"use client";

import { Pencil, ShieldCheck, ShoppingCart, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { useCart } from "@/context/cart-context";
import { apiRequest, resolveMediaUrl } from "@/lib/api";

type CartProduct = {
  id: number;
  title: string;
  producer_name?: string;
  bpm?: number | null;
  cover_art_obj?: string | null;
  product_badge?: string;
};

type CartItem = {
  id: number;
  product_type: string;
  product_id: number;
  product_title: string;
  license_name?: string | null;
  price: string;
  product: CartProduct;
};

type Cart = {
  items: CartItem[];
  beat_total: string;
  soundkit_total: string;
  discount_total: string;
  platform_fee: string;
  subtotal: string;
  total: string;
  item_count: number;
};

type License = {
  id: number;
  name: string;
  includes_stems?: boolean;
  is_exclusive?: boolean;
  includes_wav?: boolean;
};

type BeatDetail = {
  id: number;
  title: string;
  producer_username: string;
  base_price: string;
  non_exclusive_wav_fee?: string;
  non_exclusive_stems_fee?: string;
  exclusive_license_fee?: string;
  cover_art_obj?: string | null;
  licenses?: License[];
};

function currency(value?: string) {
  return `Rs ${value ?? "0.00"}`;
}

export default function OrdersPage() {
  const { token } = useAuth();
  const { refreshCart } = useCart();
  const [cart, setCart] = useState<Cart | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyItemId, setBusyItemId] = useState<number | null>(null);
  const [editItem, setEditItem] = useState<CartItem | null>(null);
  const [editBeat, setEditBeat] = useState<BeatDetail | null>(null);
  const [selectedLicenseId, setSelectedLicenseId] = useState<number | null>(null);

  const loadCart = useCallback(async () => {
    if (!token) {
      setCart(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest<Cart>("/orders/cart/me/", { token });
      setCart(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cart");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const licenseOptions = useMemo(() => {
    if (!editBeat?.licenses) return [] as Array<{ id: number; label: string; price: string }>;
    return editBeat.licenses.map((license) => {
      const price = license.is_exclusive
        ? editBeat.exclusive_license_fee || editBeat.base_price
        : license.includes_stems
          ? editBeat.non_exclusive_stems_fee || editBeat.base_price
          : editBeat.non_exclusive_wav_fee || editBeat.base_price;
      return { id: license.id, label: license.name, price };
    });
  }, [editBeat]);

  const openEdit = async (item: CartItem) => {
    if (!token || item.product_type !== "beat") {
      return;
    }
    setBusyItemId(item.id);
    try {
      const beat = await apiRequest<BeatDetail>(`/beats/${item.product_id}/`, { token });
      setEditBeat(beat);
      setEditItem(item);
      const matched = beat.licenses?.find((license) => license.name === item.license_name);
      setSelectedLicenseId(matched?.id ?? beat.licenses?.[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load beat licenses");
    } finally {
      setBusyItemId(null);
    }
  };

  const removeItem = async (itemId: number) => {
    if (!token) return;
    setBusyItemId(itemId);
    try {
      const updated = await apiRequest<Cart>(`/orders/cart/items/${itemId}/`, { method: "DELETE", token });
      setCart(updated);
      setMessage("Item removed from cart.");
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove item");
    } finally {
      setBusyItemId(null);
    }
  };

  const saveLicense = async () => {
    if (!token || !editItem || !selectedLicenseId) return;
    setBusyItemId(editItem.id);
    try {
      const updated = await apiRequest<Cart>(`/orders/cart/items/${editItem.id}/`, {
        method: "PATCH",
        token,
        body: { license_id: selectedLicenseId },
      });
      setCart(updated);
      setMessage("License updated successfully.");
      setEditItem(null);
      setEditBeat(null);
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update license");
    } finally {
      setBusyItemId(null);
    }
  };

  const handleCheckout = async () => {
    if (!token) return;
    setBusyItemId(-1);
    try {
      const order = await apiRequest<{ id: number; total_price: string }>("/orders/cart/checkout/", {
        method: "POST",
        token,
        body: {},
      });
      setMessage(`Cart checked out into order #${order.id}. eSewa is the next step.`);
      await loadCart();
      await refreshCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to checkout cart");
    } finally {
      setBusyItemId(null);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <section className="rounded-[28px] border border-white/10 bg-[#17181d] p-5">
        <h1 className="text-3xl font-semibold uppercase tracking-tight">My Cart</h1>
        <p className="mt-2 text-sm text-white/60">Select licenses, review prices, and prepare the cart for checkout.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <div className="rounded-[28px] border border-white/10 bg-[#17181d] p-5">
          <div className="grid grid-cols-[1.3fr_0.7fr_0.5fr_0.4fr_0.5fr_0.3fr] gap-4 border-b border-white/10 pb-3 text-sm text-white/55">
            <span>Items</span>
            <span>License</span>
            <span>License Fee</span>
            <span>Discount</span>
            <span>Net Fee</span>
            <span>Actions</span>
          </div>

          {loading ? <p className="py-6 text-sm text-white/60">Loading cart...</p> : null}
          {!loading && cart && cart.items.length === 0 ? <p className="py-6 text-sm text-white/60">Cart is empty. Add some beats first.</p> : null}

          <div className="space-y-4 pt-4">
            {cart?.items.map((item) => {
              const coverUrl = resolveMediaUrl(item.product.cover_art_obj);
              return (
                <article key={item.id} className="grid grid-cols-[1.3fr_0.7fr_0.5fr_0.4fr_0.5fr_0.3fr] items-center gap-4">
                  <div className="flex items-center gap-3">
                    {coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={coverUrl} alt={item.product_title} className="h-14 w-14 rounded-md object-cover" />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-md bg-gradient-to-br from-[#3a3157] to-[#14141a] text-sm font-semibold text-white/80">
                        {item.product_title.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-2xl font-semibold leading-none">{item.product_title}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/65">
                        <span>{item.product.producer_name || "Producer"}</span>
                        {item.product.product_badge ? <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider">{item.product.product_badge}</span> : null}
                        {item.product.bpm ? <span className="font-semibold text-[#d5c17c]">{item.product.bpm} BPM</span> : null}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="inline-flex rounded-xl border border-[#5eb5ff] px-4 py-2 text-lg font-semibold text-[#5eb5ff]">{item.license_name || "Standard"}</span>
                  </div>
                  <div className="text-xl font-semibold">{currency(item.price)}</div>
                  <div className="text-xl font-semibold">Rs 0</div>
                  <div className="text-xl font-semibold">{currency(item.price)}</div>
                  <div className="flex items-center gap-3 text-white/80">
                    <button type="button" disabled={busyItemId === item.id || item.product_type !== "beat"} onClick={() => void openEdit(item)} className="disabled:opacity-40">
                      <Pencil className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                    </button>
                    <button type="button" disabled={busyItemId === item.id} onClick={() => void removeItem(item.id)} className="disabled:opacity-40">
                      <Trash2 className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className="rounded-[28px] border border-white/10 bg-[#1f2024] p-5">
          <button type="button" className="brand-btn w-full px-4 py-3 text-lg font-semibold">Apply Coupon Code</button>

          <div className="mt-8 space-y-5 text-xl">
            <div className="flex items-center justify-between"><span>Total of Beats</span><span>{currency(cart?.beat_total)}</span></div>
            <div className="flex items-center justify-between"><span>Total of Sound kits</span><span>{currency(cart?.soundkit_total)}</span></div>
            <div className="border-t border-white/15 pt-5">
              <div className="flex items-center justify-between font-semibold"><span>Sub total</span><span>{currency(cart?.subtotal)}</span></div>
              <div className="mt-4 flex items-center justify-between text-[#9d8fff]"><span>Discount on Beats</span><span>Rs 0</span></div>
              <div className="mt-3 flex items-center justify-between text-[#9d8fff]"><span>Discount on Sound kits</span><span>Rs 0</span></div>
              <div className="mt-4 flex items-center justify-between"><span>Platform Fee</span><span>{currency(cart?.platform_fee)}</span></div>
            </div>
            <div className="border-t border-white/15 pt-5">
              <div className="flex items-center justify-between text-[28px] font-semibold text-[#35f04b]"><span>Total</span><span>{currency(cart?.total)}</span></div>
            </div>
          </div>

          <button type="button" disabled={!cart?.item_count || busyItemId === -1} onClick={() => void handleCheckout()} className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-[#27cc33] px-4 py-4 text-xl font-black uppercase tracking-wide text-black disabled:opacity-50">
            <ShieldCheck className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            Checkout
          </button>

          <div className="mt-5 rounded-2xl bg-[linear-gradient(180deg,#0c63ff_0%,#0941a8_100%)] p-4 text-white">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-10 w-10" strokeWidth={1.8} aria-hidden="true" />
              <div>
                <p className="text-xl font-semibold">Secured by 14-Day Purchase Protection Policy</p>
                <p className="mt-1 text-sm text-white/88 underline underline-offset-2">Learn more</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {message ? <div className="fixed bottom-24 right-6 z-[140] rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">{message}</div> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {editItem && editBeat ? (
        <div className="fixed inset-0 z-[150] flex items-start justify-center bg-black/70 px-4 pt-24 backdrop-blur-sm" onClick={() => { setEditItem(null); setEditBeat(null); }}>
          <section className="w-full max-w-[980px] rounded-2xl border border-white/15 bg-[#1d1f2a] p-5" onClick={(event) => event.stopPropagation()}>
            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              <div>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="text-4xl font-semibold">Select License Type</h3>
                    <p className="text-white/65">Understand Licensing here!</p>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-white/10">
                  {licenseOptions.map((item) => (
                    <button key={item.id} type="button" onClick={() => setSelectedLicenseId(item.id)} className={`block w-full border-b border-white/10 px-4 py-3 text-left text-2xl ${selectedLicenseId === item.id ? "bg-[#8b28ff] text-white" : "bg-transparent text-white/90"}`}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <button type="button" onClick={() => { setEditItem(null); setEditBeat(null); }} className="float-right inline-flex items-center justify-center text-white/70"><X className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" /></button>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-20 w-20 items-center justify-center rounded-md border border-white/10 bg-gradient-to-br from-[#2a3546] to-[#11151d] text-sm font-bold text-white/80">
                    {editBeat.title.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-4xl font-semibold">{editBeat.title}</p>
                    <p className="text-xl text-white/70">{editBeat.producer_username}</p>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-black/20 p-4 text-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <p className="text-white/70">License Usage</p><p className="text-right">Unlimited Streaming</p>
                    <p className="text-white/70">Format & Files</p><p className="text-right">{licenseOptions.find((item) => item.id === selectedLicenseId)?.label || "WAV"}</p>
                    <p className="text-white/70">Nature</p><p className="text-right">{licenseOptions.find((item) => item.id === selectedLicenseId)?.label?.toLowerCase().includes("exclusive") ? "Exclusive" : "Non-Exclusive"}</p>
                    <p className="text-white/70">Distribution</p><p className="text-right">Unlimited Copies</p>
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <button type="button" onClick={() => void saveLicense()} className="brand-btn inline-flex items-center gap-2 px-8 py-3 text-3xl font-semibold">
                    <ShoppingCart className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                    {currency(licenseOptions.find((item) => item.id === selectedLicenseId)?.price || editBeat.base_price)}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
