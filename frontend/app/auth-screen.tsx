"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/app/auth-context";
import { GoogleAuthButton } from "@/components/google-auth-button";

type Mode = "login" | "register";

export function AuthScreen({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { login, loginWithGoogle, register, user, loading } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isRegister = mode === "register";
  const heading = useMemo(() => (isRegister ? "Create account" : "Login"), [isRegister]);
  const actionLabel = useMemo(() => (isRegister ? "Create account" : "Sign in"), [isRegister]);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, router, user]);

  const handleGoogleLogin = async (credential: string) => {
    setError(null);
    setSubmitting(true);

    try {
      await loginWithGoogle(credential);
      router.replace("/");
    } catch (err) {
      if (typeof err === "object" && err && "bodyText" in err) {
        setError(String((err as { bodyText?: string }).bodyText ?? "Google authentication failed"));
      } else {
        setError(err instanceof Error ? err.message : "Google authentication failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (isRegister) {
        await register({ username, email, password });
      } else {
        await login(username, password);
      }
      router.replace("/");
    } catch (err) {
      if (typeof err === "object" && err && "bodyText" in err) {
        setError(String((err as { bodyText?: string }).bodyText ?? "Authentication failed"));
      } else {
        setError(err instanceof Error ? err.message : "Authentication failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-[1240px] items-center justify-center px-4 py-10 lg:px-6">
      <section className="surface-panel w-full max-w-md rounded-[30px] p-6">
        <p className="eyebrow">Authentication</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">{heading}</h1>

        <div className="mt-5">
          <GoogleAuthButton onCredential={handleGoogleLogin} onError={setError} />
        </div>

        <div className="my-4 flex items-center gap-3 text-xs uppercase tracking-[0.24em] text-white/35">
          <span className="h-px flex-1 bg-white/10" />
          <span>or</span>
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          {isRegister ? (
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          ) : null}

          <input
            className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/35"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button
            disabled={submitting}
            className="w-full rounded-full bg-[#f6b067] px-4 py-3 font-medium text-[#20150e] disabled:opacity-60"
          >
            {submitting ? "Signing in..." : actionLabel}
          </button>

          {error ? <p className="text-sm text-[#ffb4a9] break-words">{error}</p> : null}
        </form>

        <div className="mt-4 flex items-center justify-between text-sm text-white/70">
          {isRegister ? (
            <Link href="/auth/login" className="underline underline-offset-4 hover:text-white">
              Already have an account?
            </Link>
          ) : (
            <Link href="/auth/register" className="underline underline-offset-4 hover:text-white">
              Create an account
            </Link>
          )}
          <Link href="/" className="underline underline-offset-4 hover:text-white">
            Back to home
          </Link>
        </div>
      </section>
    </div>
  );
}
