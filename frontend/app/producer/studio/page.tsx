"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProducerStudioPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/producer/profile");
  }, [router]);

  return <div className="theme-surface rounded-[28px] p-6 text-sm theme-text-muted">Redirecting to your producer profile analytics...</div>;
}
