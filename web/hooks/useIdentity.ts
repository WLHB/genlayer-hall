"use client";

import { useCallback, useEffect, useState } from "react";
import type { Honor } from "@/lib/identity";

export interface IdentityStatus {
  honors: Honor[];
  minted: boolean;
  eligible: boolean;
  minGames: number;
  stats: { games: number; wins: number; points: number } | null;
}

export function useIdentity(address: string) {
  const [status, setStatus] = useState<IdentityStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) return;
    try {
      const res = await fetch(`/api/identity?address=${address}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as IdentityStatus;
      setStatus(data);
    } catch {
      /* 忽略网络抖动 */
    }
  }, [address]);

  useEffect(() => {
    load();
  }, [load]);

  const mint = useCallback(async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/identity/mint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address }),
      });
      const data = (await res.json()) as { honors?: Honor[] } | { error: string };
      if (res.ok && "honors" in data && data.honors) {
        setStatus((s) => (s ? { ...s, honors: data.honors as Honor[], minted: true } : s));
        return data.honors as Honor[];
      }
      return null;
    } finally {
      setBusy(false);
    }
  }, [address]);

  return { status, busy, mint, reload: load };
}
