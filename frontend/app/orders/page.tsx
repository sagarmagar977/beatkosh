"use client";

import { Pencil, ShieldCheck, ShoppingCart, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { OrdersPageSkeleton } from "@/app/page-skeletons";
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

    const rankLicense = (license: License) => {
      if (license.is_exclusive) return 3;
      if (license.includes_stems) return 2;
      return 1;
    };

    return [...editBeat.licenses]
      .sort((a, b) => rankLicense(a) - rankLicense(b) || a.name.localeCompare(b.name))
      .map((license) => {
        const price = license.is_exclusive
          ? editBeat.exclusive_license_fee || editBeat.base_price
          : license.includes_stems
            ? editBeat.non_exclusive_stems_fee || editBeat.base_price
            : editBeat.non_exclusive_wav_fee || editBeat.base_price;
        return { id: license.id, label: license.name, price };
      });
  }, [editBeat]);
  const selectedLicense = licenseOptions.find((item) => item.id === selectedLicenseId) ?? null;
  const editBeatCoverUrl = editBeat?.cover_art_obj ? resolveMediaUrl(editBeat.cover_art_obj) : null;

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

  if (loading) {
    return <OrdersPageSkeleton />;
  }

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
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <section>
        <h1 className="theme-text-main text-3xl font-bold uppercase tracking-tight">My Cart</h1>
      </section>
      <section className="grid min-h-0 flex-1 gap-5 xl:grid-cols-[minmax(0,1.72fr)_320px]">
        <div className="theme-surface flex min-h-0 flex-col overflow-hidden rounded-[28px] p-5 xl:h-full">
          <div className="theme-text-faint grid grid-cols-[minmax(0,1.95fr)_190px_170px_96px] gap-4 border-b pb-3 text-[13px]" style={{ borderColor: "var(--line)" }}>
            <span className="pl-2">Items</span>
            <span className="text-center">License</span>
            <span className="text-center">Fee Only</span>
            <span className="text-center">Actions</span>
          </div>
          <div className="no-scrollbar flex-1 overflow-y-auto pt-4 pr-1">
            {!loading && cart && cart.items.length === 0 ? <p className="theme-text-muted py-6 text-sm">Cart is empty. Add some beats first.</p> : null}

            <div className="space-y-4">
              {cart?.items.map((item) => {
                const coverUrl = resolveMediaUrl(item.product.cover_art_obj);
                return (
                  <article key={item.id} className="theme-soft grid grid-cols-[minmax(0,1.95fr)_190px_170px_96px] items-center gap-4 rounded-[18px] px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      {coverUrl ? (
                        <img src={coverUrl} alt={item.product_title} className="h-12 w-12 rounded-lg object-cover" />
                      ) : (
                        <div className="theme-avatar flex h-12 w-12 items-center justify-center rounded-lg text-[10px] font-semibold">
                          {item.product_title.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="theme-text-main line-clamp-1 text-[1.35rem] font-semibold leading-tight">{item.product_title}</p>
                        <div className="theme-text-muted mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px]">
                          <span>{item.product.producer_name || "Producer"}</span>
                          {item.product.product_badge ? <span className="theme-pill rounded-full px-1.5 py-0.5 text-[8px] uppercase tracking-[0.16em]">{item.product.product_badge}</span> : null}
                          {item.product.bpm ? <span className="font-semibold text-[#d5c17c]">{item.product.bpm} BPM</span> : null}
                        </div>
                      </div>
                    </div>
                    <div className="flex w-[190px] justify-center">
                      <span className="theme-soft inline-flex min-w-[142px] items-center justify-center rounded-lg border-[#5eb5ff]/50 px-3 py-2 text-[15px] font-semibold text-[#8cc5ff]">{item.license_name || "Standard"}</span>
                    </div>
                    <div className="flex w-[170px] justify-center">
                      <span className="theme-text-main whitespace-nowrap text-[1.4rem] font-semibold">{cartPrice(item.price_display, item.price)}</span>
                    </div>
                    <div className="theme-text-soft flex w-[96px] items-center justify-center gap-2.5">
                      <button type="button" disabled={busyItemId === item.id || item.product_type !== "beat"} onClick={() => void openEdit(item)} className="disabled:opacity-40">
                        <Pencil className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      </button>
                      <button type="button" disabled={busyItemId === item.id} onClick={() => void removeItem(item.id)} className="disabled:opacity-40">
                        <Trash2 className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
        <aside className="theme-surface h-fit self-start rounded-[24px] p-4">
          <div className="space-y-4">
            <div className="space-y-3 text-lg">
              <div className="flex items-center justify-between gap-4"><span className="theme-text-muted">Total of Beats</span><span className="theme-text-main font-semibold">{cartPrice(cart?.beat_total_display, cart?.beat_total)}</span></div>
              <div className="flex items-center justify-between gap-4"><span className="theme-text-muted">Total of Sound kits</span><span className="theme-text-main font-semibold">{cartPrice(cart?.soundkit_total_display, cart?.soundkit_total)}</span></div>
              <div className="flex items-center justify-between gap-4 border-t pt-4" style={{ borderColor: "var(--line)" }}><span className="theme-text-main font-semibold">Total Fee</span><span className="text-[1.9rem] font-semibold text-[#35f04b]">{cartPrice(cart?.total_display, cart?.total)}</span></div>
            </div>
            <button type="button" disabled={!cart?.item_count || busyItemId === -1} onClick={() => void handleCheckout()} className="inline-flex w-full items-center justify-center gap-3 rounded-xl bg-[#27cc33] px-4 py-4 text-lg font-black uppercase tracking-wide text-black disabled:opacity-50">
              <ShieldCheck className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              Checkout with eSewa
            </button>
          </div>
        </aside>
      </section>

      {message ? <div className="fixed bottom-24 right-6 z-[140] rounded-2xl border border-emerald-400/30 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-200 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">{message}</div> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {editItem && editBeat ? (
        <div className="theme-overlay fixed inset-0 z-[150] flex items-start justify-center px-4 pt-24 backdrop-blur-sm" onClick={() => { setEditItem(null); setEditBeat(null); }}>
          <section className="theme-floating w-full max-w-[980px] rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(28,23,34,0.98)_0%,rgba(21,17,28,0.98)_100%)] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)]" onClick={(event) => event.stopPropagation()}>
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <div>
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <p className="theme-text-muted text-xs font-semibold uppercase tracking-[0.28em]">Choose a license</p>
                    <h3 className="theme-text-main mt-3 text-4xl font-bold leading-tight">Select License Type</h3>
                    <p className="theme-text-muted mt-2 text-base">Pick the version that fits your release and usage goals.</p>
                  </div>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]" style={{ borderColor: "var(--line)" }}>
                  {licenseOptions.map((item) => (
                    <button key={item.id} type="button" onClick={() => setSelectedLicenseId(item.id)} className={`block w-full border-b px-5 py-4 text-left transition ${selectedLicenseId === item.id ? "bg-[linear-gradient(90deg,#6f1dff_0%,#b238ff_100%)] text-white" : "theme-text-soft bg-transparent hover:bg-white/[0.03]"}`} style={{ borderColor: "var(--line)" }}>
                      <span className="block text-[1.9rem] font-semibold leading-none">{item.label}</span>
                      <span className={`mt-2 block text-sm ${selectedLicenseId === item.id ? "text-white/80" : "theme-text-muted"}`}>{currency(item.price)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <button type="button" onClick={() => { setEditItem(null); setEditBeat(null); }} className="theme-text-soft float-right inline-flex items-center justify-center"><X className="h-6 w-6" strokeWidth={1.8} aria-hidden="true" /></button>
                <div className="mb-6 flex items-center gap-4 pr-10">
                  {editBeatCoverUrl ? (
                    <img src={editBeatCoverUrl} alt={editBeat.title} className="h-24 w-24 rounded-2xl object-cover shadow-[0_14px_30px_rgba(0,0,0,0.28)]" />
                  ) : (
                    <div className="theme-avatar flex h-24 w-24 items-center justify-center rounded-2xl text-xl font-bold">
                      {editBeat.title.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="theme-text-main text-[3rem] font-bold leading-none">{editBeat.title}</p>
                    <p className="theme-text-muted mt-2 text-xl">{editBeat.producer_username}</p>
                    <p className="theme-text-muted mt-3 text-sm uppercase tracking-[0.22em]">{selectedLicense?.label || "WAV"} license selected</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.04] p-5">
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-lg">
                    <p className="theme-text-muted text-base">License Usage</p><p className="theme-text-main text-right text-[1.15rem] font-semibold">Unlimited Streaming</p>
                    <p className="theme-text-muted text-base">Format & Files</p><p className="theme-text-main text-right text-[1.15rem] font-semibold">{selectedLicense?.label || "WAV"}</p>
                    <p className="theme-text-muted text-base">Nature</p><p className="theme-text-main text-right text-[1.15rem] font-semibold">{selectedLicense?.label?.toLowerCase().includes("exclusive") ? "Exclusive" : "Non-Exclusive"}</p>
                    <p className="theme-text-muted text-base">Distribution</p><p className="theme-text-main text-right text-[1.15rem] font-semibold">Unlimited Copies</p>
                  </div>
                </div>
                <div className="mt-5 flex justify-end">
                  <button type="button" onClick={() => void saveLicense()} className="brand-btn inline-flex items-center gap-3 rounded-2xl px-8 py-4 text-3xl font-bold shadow-[0_18px_36px_rgba(102,30,255,0.32)]">
                    <ShoppingCart className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
                    {currency(selectedLicense?.price || editBeat.base_price)}
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



