"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/context/auth-context";
import { apiRequest } from "@/lib/api";

type Beat = { id: number; title: string; base_price: string };
type License = { id: number; name: string };
type Order = { id: number; total_price: string; status: string };

export default function OrdersPage() {
  const { token } = useAuth();
  const [beats, setBeats] = useState<Beat[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [beatId, setBeatId] = useState<number | null>(null);
  const [licenseId, setLicenseId] = useState<number | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      try {
        const [beatData, licenseData] = await Promise.all([apiRequest<Beat[]>("/beats/"), apiRequest<License[]>("/beats/licenses/")]);
        setBeats(beatData);
        setLicenses(licenseData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load checkout data");
      }
    };
    void run();
  }, []);

  const canCreate = useMemo(() => Boolean(token && beatId && licenseId), [token, beatId, licenseId]);

  const onCreateOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !beatId || !licenseId) {
      return;
    }
    setError(null);
    setMessage(null);
    try {
      const data = await apiRequest<Order>("/orders/create/", {
        method: "POST",
        token,
        body: {
          items: [{ product_type: "beat", product_id: beatId, license_id: licenseId }],
        },
      });
      setOrder(data);
      setMessage(`Order #${data.id} created.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    }
  };

  return (
    <div className="space-y-6">
      <section className="surface-panel rounded-xl p-4">
        <h1 className="text-2xl font-semibold">Cart and Checkout</h1>
        <p className="mt-1 text-sm text-white/60">Empty and filled cart states are aligned with reference cart screens.</p>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="surface-panel rounded-xl p-4">
          <h2 className="text-lg font-semibold">Cart Items</h2>
          <form onSubmit={onCreateOrder} className="mt-3 space-y-3">
            <select
              className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80"
              value={beatId ?? ""}
              onChange={(event) => setBeatId(Number(event.target.value) || null)}
            >
              <option value="">Select beat</option>
              {beats.map((beat) => (
                <option key={beat.id} value={beat.id}>
                  {beat.title} - Rs {beat.base_price}
                </option>
              ))}
            </select>
            <select
              className="h-10 w-full rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/80"
              value={licenseId ?? ""}
              onChange={(event) => setLicenseId(Number(event.target.value) || null)}
            >
              <option value="">Select license</option>
              {licenses.map((license) => (
                <option key={license.id} value={license.id}>
                  {license.name}
                </option>
              ))}
            </select>
            <button type="submit" disabled={!canCreate} className="brand-btn w-full px-3 py-2.5 text-sm disabled:opacity-50">
              Add to Cart
            </button>
          </form>

          {order ? (
            <div className="mt-4 rounded-md border border-white/10 bg-[#131625] p-3">
              <p className="font-semibold">Order #{order.id}</p>
              <p className="text-sm text-white/60">
                Status: {order.status} • Total: Rs {order.total_price}
              </p>
            </div>
          ) : (
            <div className="mt-4 rounded-md border border-dashed border-white/15 bg-white/[0.03] p-4 text-sm text-white/55">
              Cart is currently empty. Add a beat and license to start checkout.
            </div>
          )}
        </div>

        <aside className="surface-panel rounded-xl p-4">
          <h2 className="text-lg font-semibold">Order Summary</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between text-white/65">
              <span>Subtotal</span>
              <span>Rs --</span>
            </div>
            <div className="flex items-center justify-between text-white/65">
              <span>Platform Fee</span>
              <span>Rs --</span>
            </div>
            <div className="flex items-center justify-between text-white/65">
              <span>Discount</span>
              <span>Rs --</span>
            </div>
            <div className="mt-2 border-t border-white/10 pt-2">
              <div className="flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>{order ? `Rs ${order.total_price}` : "Rs --"}</span>
              </div>
            </div>
          </div>
          <button type="button" className="brand-btn mt-4 w-full px-3 py-2.5 text-sm">
            Proceed to Checkout
          </button>
        </aside>
      </section>

      {message ? <p className="text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}
