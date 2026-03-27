"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Moon, Sun } from "lucide-react";

import { useAuth } from "@/app/auth-context";
import { useTheme } from "@/app/providers";
import { GoogleAuthButton } from "@/components/google-auth-button";

type Mode = "login" | "register";

export function AuthScreen({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { login, loginWithGoogle, register, user, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();

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
        <div className="flex items-start justify-between gap-4">
          <p className="eyebrow">Authentication</p>
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-soft theme-text-main inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition hover:scale-[1.03]"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun className="h-[18px] w-[18px]" strokeWidth={1.9} /> : <Moon className="h-[18px] w-[18px]" strokeWidth={1.9} />}
          </button>
        </div>
        <h1 className="theme-text-main mt-2 text-3xl font-semibold tracking-tight">{heading}</h1>

        <div className="mt-5">
          <GoogleAuthButton onCredential={handleGoogleLogin} onError={setError} />
        </div>

        <div className="theme-text-faint my-4 flex items-center gap-3 text-xs uppercase tracking-[0.24em]">
          <span className="h-px flex-1" style={{ backgroundColor: "var(--line)" }} />
          <span>or</span>
          <span className="h-px flex-1" style={{ backgroundColor: "var(--line)" }} />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="theme-input w-full rounded-2xl px-4 py-3 outline-none"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          {isRegister ? (
            <input
              className="theme-input w-full rounded-2xl px-4 py-3 outline-none"
              placeholder="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          ) : null}

          <input
            className="theme-input w-full rounded-2xl px-4 py-3 outline-none"
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

          {error ? <p className="break-words text-sm text-[#d84f6c]">{error}</p> : null}
        </form>

        <div className="theme-text-soft mt-4 flex items-center justify-between text-sm">
          {isRegister ? (
            <Link href="/auth/login" className="underline underline-offset-4 hover:text-[var(--text)]">
              Already have an account?
            </Link>
          ) : (
            <Link href="/auth/register" className="underline underline-offset-4 hover:text-[var(--text)]">
              Create an account
            </Link>
          )}
          <Link href="/" className="underline underline-offset-4 hover:text-[var(--text)]">
            Back to home
          </Link>
        </div>
      </section>
    </div>
  );
}
