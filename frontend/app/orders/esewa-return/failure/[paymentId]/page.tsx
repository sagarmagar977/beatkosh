"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

export default function EsewaFailurePage() {
  const params = useParams<{ paymentId: string }>();

  return (
    <div className="space-y-6 pb-24">
      <section className="rounded-[28px] border border-white/10 bg-[#17181d] p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-white/45">eSewa return</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Payment not confirmed</h1>
        <p className="mt-3 max-w-2xl text-sm text-white/68">
          eSewa returned to the failure page for payment #{params.paymentId}. Your cart should still be there, and no paid access has been granted.
        </p>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#17181d] p-6 text-sm text-white/70">
        <p>
          Simple meaning: the payment did not finish, so we keep your cart and let you try again later.
        </p>
      </section>

      <div className="flex flex-wrap gap-3 text-sm font-medium">
        <Link href="/orders" className="rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-white/78 hover:bg-white/[0.06]">
          Back to cart
        </Link>
        <Link href="/wallet" className="rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-white/78 hover:bg-white/[0.06]">
          Open wallet
        </Link>
      </div>
    </div>
  );
}
