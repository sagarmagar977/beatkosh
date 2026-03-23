"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: {
      accounts?: {
        id?: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, string | number>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "").trim();
let scriptPromise: Promise<void> | null = null;

function loadGoogleScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }
  if (scriptPromise) {
    return scriptPromise;
  }

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google sign-in script.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google sign-in script."));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

type GoogleAuthButtonProps = {
  onCredential: (credential: string) => Promise<void> | void;
  onError: (message: string) => void;
};

export function GoogleAuthButton({ onCredential, onError }: GoogleAuthButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!GOOGLE_CLIENT_ID) {
      return;
    }

    const render = async () => {
      try {
        await loadGoogleScript();
        if (cancelled || !containerRef.current || !window.google?.accounts?.id) {
          return;
        }

        containerRef.current.innerHTML = "";
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: ({ credential }) => {
            if (!credential) {
              onError("Google sign-in did not return a credential.");
              return;
            }
            void onCredential(credential);
          },
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: 360,
          logo_alignment: "left",
        });
        setReady(true);
      } catch (error) {
        if (!cancelled) {
          onError(error instanceof Error ? error.message : "Google sign-in could not be loaded.");
        }
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [onCredential, onError]);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="rounded-2xl border border-dashed border-white/15 px-4 py-3 text-sm text-white/60">
        Google sign-in will appear here after you add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` to the frontend env file.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {!ready ? <p className="text-sm text-white/60">Loading Google sign-in...</p> : null}
      <div ref={containerRef} className="flex min-h-[44px] justify-center" />
    </div>
  );
}
