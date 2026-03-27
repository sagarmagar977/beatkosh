"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { apiRequest } from "@/lib/api";

const ESEWA_PENDING_PAYMENT_KEY = "beatkosh_esewa_pending_payment";

type EsewaCompleteResponse = {
  payment_id: number;
  status: string;
  gateway_status?: string;
  order_id: number;
  idempotent?: boolean;
};

type Phase = "loading" | "success" | "pending" | "failed";

type PendingEsewaPayment = {
  paymentId?: number;
  orderId?: number;
  buyerId?: number | null;
  buyerUsername?: string | null;
  createdAt?: string;
};

function readPendingEsewaPayment(): PendingEsewaPayment | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(ESEWA_PENDING_PAYMENT_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as PendingEsewaPayment;
  } catch {
    return null;
  }
}

export default function EsewaReturnPage() {
  const params = useParams<{ paymentId: string }>();
  const searchParams = useSearchParams();
  const { token, user } = useAuth();
  const [phase, setPhase] = useState<Phase>("loading");
  const [message, setMessage] = useState("Verifying your eSewa payment with the server...");

  const paymentId = params.paymentId;
  const data = searchParams.get("data");
  const pendingPayment = useMemo(() => readPendingEsewaPayment(), []);
  const hasAccountMismatch = Boolean(
    pendingPayment?.paymentId &&
      paymentId &&
      String(pendingPayment.paymentId) === String(paymentId) &&
      pendingPayment.buyerId &&
      user?.id &&
      pendingPayment.buyerId !== user.id,
  );

  const blockingMessage = useMemo(() => {
    if (!paymentId) {
      return "Missing payment reference. We cannot verify this payment.";
    }
    if (!token) {
      return "Login is required to verify the payment and unlock your purchase.";
    }
    if (hasAccountMismatch) {
      const expectedUser = pendingPayment?.buyerUsername
        ? ` as ${pendingPayment.buyerUsername}`
        : " with the account that started checkout";
      return `This payment was started by a different BeatKosh account. Please sign out and sign back in${expectedUser}, then open this return link again.`;
    }
    if (!data) {
      return "eSewa did not return the signed payment payload.";
    }
    return null;
  }, [data, hasAccountMismatch, paymentId, pendingPayment?.buyerUsername, token]);

  useEffect(() => {
    if (blockingMessage || !paymentId || !data || !token) {
      return;
    }

    const run = async () => {
      try {
        const result = await apiRequest<EsewaCompleteResponse>("/payments/esewa/complete/", {
          method: "POST",
          token,
          body: { payment_id: Number(paymentId), data },
        });

        if (result.status === "success") {
          if (typeof window !== "undefined") {
            window.sessionStorage.removeItem(ESEWA_PENDING_PAYMENT_KEY);
          }
          setPhase("success");
          setMessage("Payment verified. Your order is now marked paid, downloads are unlocked, and producer settlement has been recorded.");
          return;
        }

        if (result.gateway_status === "PENDING" || result.gateway_status === "AMBIGUOUS") {
          setPhase("pending");
          setMessage(`eSewa returned ${result.gateway_status}. The payment record is still pending, so access has not been granted yet.`);
          return;
        }

        setPhase("failed");
        setMessage("The server could not confirm a successful eSewa payment for this order.");
      } catch (err) {
        setPhase("failed");
        setMessage(err instanceof Error ? err.message : "Payment verification failed.");
      }
    };

    void run();
  }, [blockingMessage, data, paymentId, token]);

  const displayPhase: Phase = blockingMessage ? "failed" : phase;
  const displayMessage = blockingMessage ?? message;

  return (
    <div className="space-y-6 pb-24">
      <section className="rounded-[28px] border border-white/10 bg-[#17181d] p-6">
        <p className="text-xs uppercase tracking-[0.18em] text-white/45">eSewa return</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">
          {displayPhase === "loading" ? "Checking payment" : null}
          {displayPhase === "success" ? "Payment complete" : null}
          {displayPhase === "pending" ? "Payment still pending" : null}
          {displayPhase === "failed" ? "Payment not confirmed" : null}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-white/68">{displayMessage}</p>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-[#17181d] p-6 text-sm text-white/70">
        <p>
          What this page does: it takes the signed response returned by eSewa, sends it to your backend, and your backend verifies it before granting purchase access.
        </p>
      </section>

      <div className="flex flex-wrap gap-3 text-sm font-medium">
        <Link href="/orders" className="rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-white/78 hover:bg-white/[0.06]">
          Back to cart
        </Link>
        <Link href="/library" className="rounded-full bg-[#27cc33] px-5 py-2.5 text-black">
          Open library
        </Link>
        <Link href="/wallet" className="rounded-full border border-white/12 bg-white/[0.03] px-5 py-2.5 text-white/78 hover:bg-white/[0.06]">
          Open wallet
        </Link>
      </div>
    </div>
  );
}
