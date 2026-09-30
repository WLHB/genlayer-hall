"use client";

import { useCallback, useEffect, useState } from "react";
import { connectWallet } from "@/lib/genlayer";

const KEY = "undercover_wallet";
const REF_BOUND_KEY = "undercover_ref_bound";

function isAddress(s: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(s);
}

/** 首次进入时若有 ?ref=邀请人地址，绑定邀请关系（钱包即邀请码，幂等） */
async function tryBindReferral(a: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (!ref || !isAddress(ref) || ref.toLowerCase() === a.toLowerCase()) return;
    const flagKey = `${a.toLowerCase()}:${ref.toLowerCase()}`;
    if (localStorage.getItem(REF_BOUND_KEY) === flagKey) return;
    const res = await fetch("/api/referral/bind", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: a, ref }),
    });
    if (res.ok) localStorage.setItem(REF_BOUND_KEY, flagKey);
  } catch {
    /* 忽略网络抖动 */
  }
}

export function useWallet() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const a = localStorage.getItem(KEY);
    if (a) {
      setAddress(a);
      tryBindReferral(a);
    }
  }, []);

  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const a = await connectWallet();
      setAddress(a);
      localStorage.setItem(KEY, a);
      tryBindReferral(a);
      return a;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    localStorage.removeItem(KEY);
  }, []);

  return { address, connecting, connect, disconnect };
}
