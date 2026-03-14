"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/context/auth-context";

export default function RegisterPage() {
  const router = useRouter();
  const { register, user, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register({
        username,
        email,
        password,
      });
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="surface-panel mx-auto max-w-xl rounded-[30px] p-6">
      <p className="eyebrow">Join BeatKosh</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Create Account</h1>
      <p className="mt-2 text-sm text-white/65">
        Sign up once as an artist account. You can enable producer mode and set stage/producer names after login.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} required />
        <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button disabled={submitting} className="w-full rounded-full bg-[#f6b067] px-4 py-3 font-medium text-[#20150e] disabled:opacity-60">
          {submitting ? "Creating..." : "Create Account"}
        </button>
        {error ? <p className="text-sm text-[#ffb4a9]">{error}</p> : null}
      </form>
    </section>
  );
}
