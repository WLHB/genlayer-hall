"use client";

import { useCallback, useEffect, useState } from "react";

export interface LobbyHuman {
  name: string;
  isHost: boolean;
  connected: boolean;
  isYou: boolean;
}

export interface LobbyView {
  id: string;
  status: "lobby";
  config: { total: number; aiFill: number };
  now: number;
  me: { name: string; isHost: boolean } | null;
  humans: LobbyHuman[];
  humanSlots: number;
  aiAtStart: number;
}

export interface SeatView {
  seat: number;
  name: string;
  isAI: boolean;
  alive: boolean;
  connected: boolean;
  description?: string;
  voted?: number;
  role?: "平民" | "卧底";
  word?: string;
}

export interface GameView {
  id: string;
  status: "playing" | "ended";
  config: { total: number; aiFill: number };
  now: number;
  round: number;
  phase: "describe" | "vote" | "reveal";
  phaseEndsAt: number;
  speakerSeat: number | null;
  hint: string;
  winner: "平民" | "卧底" | null;
  verdict?: string;
  eliminated: { seat: number; name: string; isSpy: boolean }[];
  me: {
    seat: number;
    name: string;
    word: string;
    isHost: boolean;
    alive: boolean;
  } | null;
  seats: SeatView[];
  civilianWord?: string;
  spyWord?: string;
}

export type RoomView = LobbyView | GameView;

const SESSION_KEY = "undercover_session";

function loadSession(): { roomId: string; token: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw);
    if (j && j.roomId && j.token) return { roomId: j.roomId, token: j.token };
  } catch {
    /* ignore */
  }
  return null;
}

function saveSession(roomId: string, token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify({ roomId, token }));
}

function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}

async function postJson(
  url: string,
  body: unknown
): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    return { ok: res.ok, data };
  } catch (e) {
    return { ok: false, data: { error: e instanceof Error ? e.message : "网络错误" } };
  }
}

export function useRoom() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<RoomView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // 恢复会话
  useEffect(() => {
    const s = loadSession();
    if (s) {
      setRoomId(s.roomId);
      setToken(s.token);
    }
  }, []);

  // 轮询
  useEffect(() => {
    if (!roomId || !token) return;
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetch(
          `/api/room/${roomId}?token=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        if (stop) return;
        if (res.status === 404) {
          clearSession();
          setView(null);
          setError("房间已结束或不存在");
          setRoomId(null);
          setToken(null);
          return;
        }
        const data = (await res.json()) as
          | { error: string }
          | RoomView;
        if (stop) return;
        if ("error" in data) {
          setError(data.error);
          return;
        }
        if (data.status === "ended") {
          clearSession();
          setView(null);
          setError("对局已结束");
          setRoomId(null);
          setToken(null);
          return;
        }
        setView(data);
        setError(null);
      } catch {
        /* 网络抖动，下一轮重试 */
      }
    };
    poll();
    const iv = setInterval(poll, 1500);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [roomId, token]);

  const create = useCallback(
    async (opts: { total: number; aiFill: number; name: string; game?: string }) => {
      setBusy(true);
      const { ok, data } = await postJson("/api/room", opts);
      setBusy(false);
      if (!ok || typeof data.roomId !== "string" || typeof data.token !== "string") {
        setError((data.error as string) || "创建失败");
        return;
      }
      setRoomId(data.roomId);
      setToken(data.token);
      saveSession(data.roomId, data.token);
      setError(null);
    },
    []
  );

  const join = useCallback(async (rid: string, name: string) => {
    setBusy(true);
    const { ok, data } = await postJson(`/api/room/${rid}/join`, { name });
    setBusy(false);
    if (!ok || typeof data.token !== "string") {
      setError((data.error as string) || "加入失败");
      return;
    }
    setRoomId(rid);
    setToken(data.token);
    saveSession(rid, data.token);
    setError(null);
  }, []);

  const start = useCallback(async () => {
    if (!roomId || !token) return;
    setBusy(true);
    const { ok, data } = await postJson(`/api/room/${roomId}/start`, { token });
    setBusy(false);
    if (!ok || "error" in data) {
      setError((data.error as string) || "开始失败");
      return;
    }
    setView(data as unknown as RoomView);
  }, [roomId, token]);

  const describe = useCallback(
    async (text: string) => {
      if (!roomId || !token) return;
      setBusy(true);
      const { ok, data } = await postJson(`/api/room/${roomId}/describe`, {
        token,
        text,
      });
      setBusy(false);
      if (!ok || "error" in data) {
        setError((data.error as string) || "发言失败");
        return;
      }
      setView(data as unknown as RoomView);
    },
    [roomId, token]
  );

  const vote = useCallback(
    async (target: number) => {
      if (!roomId || !token) return;
      setBusy(true);
      const { ok, data } = await postJson(`/api/room/${roomId}/vote`, {
        token,
        target,
      });
      setBusy(false);
      if (!ok || "error" in data) {
        setError((data.error as string) || "投票失败");
        return;
      }
      setView(data as unknown as RoomView);
    },
    [roomId, token]
  );

  const again = useCallback(async () => {
    if (!roomId || !token) return;
    setBusy(true);
    const { ok, data } = await postJson(`/api/room/${roomId}/again`, { token });
    setBusy(false);
    if (!ok || "error" in data) {
      setError((data.error as string) || "操作失败");
      return;
    }
    setView(data as unknown as RoomView);
  }, [roomId, token]);

  const leave = useCallback(async () => {
    if (roomId && token) {
      await postJson(`/api/room/${roomId}/leave`, { token });
    }
    clearSession();
    setRoomId(null);
    setToken(null);
    setView(null);
    setError(null);
  }, [roomId, token]);

  const reset = useCallback(() => {
    clearSession();
    setRoomId(null);
    setToken(null);
    setView(null);
    setError(null);
  }, []);

  return {
    roomId,
    view,
    error,
    busy,
    create,
    join,
    start,
    describe,
    vote,
    again,
    leave,
    reset,
  };
}
