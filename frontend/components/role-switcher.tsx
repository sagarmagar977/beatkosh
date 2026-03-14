"use client";

import { useState } from "react";

import { useAuth } from "@/context/auth-context";

export function RoleSwitcher() {
  const { user, switchRole } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !(user.is_artist && user.is_producer)) {
    return null;
  }

  const onSwitch = async (role: "artist" | "producer") => {
    if (role === user.active_role) return;
    setSubmitting(true);
    setError(null);
    try {
      await switchRole(role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role switch failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="inline-flex rounded-full border border-white/12 bg-white/5 p-1">
        {(["artist", "producer"] as const).map((role) => {
          const active = user.active_role === role;
          return (
            <button
              key={role}
              type="button"
              onClick={() => void onSwitch(role)}
              disabled={submitting}
              className={`rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
                active ? "bg-[#f6b067] text-[#20150e]" : "text-white/70 hover:bg-white/6"
              }`}
            >
              {role}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-xs text-[#ffb4a9]">{error}</p> : null}
    </div>
  );
}
