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
  price_display?: string;
  product: CartProduct;
};

type Cart = {
  items: CartItem[];
  beat_total: string;
  beat_total_display?: string;
  soundkit_total: string;
  soundkit_total_display?: string;
  discount_total: string;
  discount_total_display?: string;
  platform_fee: string;
  platform_fee_display?: string;
  subtotal: string;
  subtotal_display?: string;
  total: string;
  total_display?: string;
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

type PaymentInitiateResponse = {
  id: number;
  order: number;
  gateway: string;
  status: string;
  amount: string;
  external_ref: string;
  metadata?: {
    checkout_url?: string;
    form_fields?: Record<string, string>;
    environment?: string;
  };
};

function currency(value?: string) {
  return `Rs ${value ?? "0.00"}`;
}

function cartPrice(displayValue?: string, rawValue?: string) {
  return currency(displayValue ?? rawValue);
}

function submitEsewaForm(checkoutUrl: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = checkoutUrl;
  form.style.display = "none";

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  document.body.appendChild(form);
  form.submit();
  form.remove();
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
    setError(null);
    setMessage("Creating order and preparing eSewa UAT payment...");
    try {
      const order = await apiRequest<{ id: number; total_price: string }>("/orders/cart/checkout/", {
        method: "POST",
        token,
        body: {},
      });
      const payment = await apiRequest<PaymentInitiateResponse>("/payments/initiate/", {
        method: "POST",
        token,
        body: { order_id: order.id, gateway: "esewa" },
      });
      const checkoutUrl = payment.metadata?.checkout_url;
      const formFields = payment.metadata?.form_fields;
      if (!checkoutUrl || !formFields) {
        throw new Error("eSewa checkout data was not generated by the server.");
      }
      await refreshCart();
      submitEsewaForm(checkoutUrl, formFields);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to checkout cart");
      setMessage(null);
    } finally {
      setBusyItemId(null);
    }
  };

  return (
    <div className="space-y-6 pb-24">
      <section className="theme-surface rounded-[28px] p-5">
        <h1 className="theme-text-main text-3xl font-semibold uppercase tracking-tight">My Cart</h1>
        <p className="theme-text-muted mt-2 text-sm">Select licenses, review prices, and continue to eSewa UAT checkout.</p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.45fr_0.55fr]">
        <div className="theme-surface rounded-[28px] p-5">
          <div className="theme-text-faint grid grid-cols-[1.3fr_0.7fr_0.5fr_0.4fr_0.5fr_0.3fr] gap-4 border-b pb-3 text-sm" style={{ borderColor: "var(--line)" }}>
            <span>Items</span>
            <span>License</span>
            <span>License Fee</span>
            <span>Discount</span>
            <span>Net Fee</span>
            <span>Actions</span>
          </div>

          {loading ? <p className="theme-text-muted py-6 text-sm">Loading cart...</p> : null}
          {!loading && cart && cart.items.length === 0 ? <p className="theme-text-muted py-6 text-sm">Cart is empty. Add some beats first.</p> : null}

          <div className="space-y-4 pt-4">
            {cart?.items.map((item) => {
              const coverUrl = resolveMediaUrl(item.product.cover_art_obj);
              return (
                <article key={item.id} className="theme-soft grid grid-cols-[1.3fr_0.7fr_0.5fr_0.4fr_0.5fr_0.3fr] items-center gap-4 rounded-[22px] p-4">
                  <div className="flex items-center gap-3">
                    {coverUrl ? (
                      <img src={coverUrl} alt={item.product_title} className="h-14 w-14 rounded-md object-cover" />
                    ) : (
                      <div className="theme-avatar flex h-14 w-14 items-center justify-center rounded-md text-sm font-semibold">
                        {item.product_title.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="theme-text-main text-2xl font-semibold leading-none">{item.product_title}</p>
                      <div className="theme-text-muted mt-2 flex flex-wrap items-center gap-2 text-sm">
                        <span>{item.product.producer_name || "Producer"}</span>
                        {item.product.product_badge ? <span className="theme-pill rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider">{item.product.product_badge}</span> : null}
                        {item.product.bpm ? <span className="font-semibold text-[#d5c17c]">{item.product.bpm} BPM</span> : null}
                      </div>
                    </div>
                  </div>
                  <div>
                    <span className="theme-soft inline-flex rounded-xl border-[#5eb5ff]/50 px-4 py-2 text-lg font-semibold text-[#8cc5ff]">{item.license_name || "Standard"}</span>
                  </div>
                  <div className="theme-text-main text-xl font-semibold">{cartPrice(item.price_display, item.price)}</div>
                  <div className="theme-text-main text-xl font-semibold">Rs 0</div>
                  <div className="theme-text-main text-xl font-semibold">{cartPrice(item.price_display, item.price)}</div>
                  <div className="theme-text-soft flex items-center gap-3">
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

        <aside className="theme-surface rounded-[28px] p-5">
          <button type="button" className="brand-btn w-full px-4 py-3 text-lg font-semibold">Apply Coupon Code</button>

          <div className="theme-text-main mt-8 space-y-5 text-xl">
            <div className="flex items-center justify-between"><span>Total of Beats</span><span>{cartPrice(cart?.beat_total_display, cart?.beat_total)}</span></div>
            <div className="flex items-center justify-between"><span>Total of Sound kits</span><span>{cartPrice(cart?.soundkit_total_display, cart?.soundkit_total)}</span></div>
            <div className="border-t pt-5" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center justify-between font-semibold"><span>Sub total</span><span>{cartPrice(cart?.subtotal_display, cart?.subtotal)}</span></div>
              <div className="mt-4 flex items-center justify-between text-[#9d8fff]"><span>Discount on Beats</span><span>Rs 0</span></div>
              <div className="mt-3 flex items-center justify-between text-[#9d8fff]"><span>Discount on Sound kits</span><span>Rs 0</span></div>
              <div className="mt-4 flex items-center justify-between"><span>Platform Fee</span><span>{cartPrice(cart?.platform_fee_display, cart?.platform_fee)}</span></div>
            </div>
            <div className="border-t pt-5" style={{ borderColor: "var(--line)" }}>
              <div className="flex items-center justify-between text-[28px] font-semibold text-[#35f04b]"><span>Total</span><span>{cartPrice(cart?.total_display, cart?.total)}</span></div>
            </div>
          </div>

          <button type="button" disabled={!cart?.item_count || busyItemId === -1} onClick={() => void handleCheckout()} className="mt-7 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-[#27cc33] px-4 py-4 text-xl font-black uppercase tracking-wide text-black disabled:opacity-50">
            <ShieldCheck className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            Checkout with eSewa UAT
          </button>

          <p className="theme-text-quiet mt-3 text-xs uppercase tracking-[0.18em]">This sends the exact cart total to eSewa test mode and waits for verified success before granting downloads.</p>

          <div className="mt-5 rounded-2xl bg-[linear-gradient(180deg,#0c63ff_0%,#0941a8_100%)] p-4 text-white">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-1 h-10 w-10" strokeWidth={1.8} aria-hidden="true" />
              <div>
                <p className="theme-text-main text-xl font-semibold">Secured by 14-Day Purchase Protection Policy</p>
                <p className="mt-1 text-sm text-white/88 underline underline-offset-2">Learn more</p>
              </div>
            </div>
          </div>
        </aside>
      </section>

      {message ? <div className="fixed bottom-24 right-6 z-[140] rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">{message}</div> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {editItem && editBeat ? (
        <div className="theme-overlay fixed inset-0 z-[150] flex items-start justify-center px-4 pt-24 backdrop-blur-sm" onClick={() => { setEditItem(null); setEditBeat(null); }}>
          <section className="theme-floating w-full max-w-[980px] rounded-2xl p-5" onClick={(event) => event.stopPropagation()}>
            <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
              <div>
                <div className="mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="theme-text-main text-4xl font-semibold">Select License Type</h3>
                    <p className="theme-text-muted">Understand Licensing here!</p>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--line)" }}>
                  {licenseOptions.map((item) => (
                    <button key={item.id} type="button" onClick={() => setSelectedLicenseId(item.id)} className={`block w-full border-b px-4 py-3 text-left text-2xl ${selectedLicenseId === item.id ? "bg-[#8b28ff] text-white" : "theme-text-soft bg-transparent"}`} style={{ borderColor: "var(--line)" }}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <button type="button" onClick={() => { setEditItem(null); setEditBeat(null); }} className="theme-text-soft float-right inline-flex items-center justify-center"><X className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" /></button>
                <div className="mb-4 flex items-center gap-3">
                  <div className="theme-avatar flex h-20 w-20 items-center justify-center rounded-md text-sm font-bold">
                    {editBeat.title.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="theme-text-main text-4xl font-semibold">{editBeat.title}</p>
                    <p className="theme-text-muted text-xl">{editBeat.producer_username}</p>
                  </div>
                </div>
                <div className="theme-surface-muted rounded-xl p-4 text-lg">
                  <div className="grid grid-cols-2 gap-3">
                    <p className="theme-text-muted">License Usage</p><p className="theme-text-main text-right">Unlimited Streaming</p>
                    <p className="theme-text-muted">Format & Files</p><p className="theme-text-main text-right">{licenseOptions.find((item) => item.id === selectedLicenseId)?.label || "WAV"}</p>
                    <p className="theme-text-muted">Nature</p><p className="theme-text-main text-right">{licenseOptions.find((item) => item.id === selectedLicenseId)?.label?.toLowerCase().includes("exclusive") ? "Exclusive" : "Non-Exclusive"}</p>
                    <p className="theme-text-muted">Distribution</p><p className="theme-text-main text-right">Unlimited Copies</p>
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

