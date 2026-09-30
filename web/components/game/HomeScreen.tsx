"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { shortAddr } from "@/lib/format";
import { LeaderboardModal } from "./LeaderboardModal";

const SELL = ["⚡ 链上 AI 裁判", "🤖 AI 候补补位", "🃏 卧底推理"];
const STEPS = ["拿到词", "依次发言", "投票揪卧底"];

interface OpenRoom {
  id: string;
  humans: number;
  total: number;
  aiFill: number;
  host: string;
}

export function HomeScreen({
  busy,
  onCreate,
  onJoin,
  onBack,
}: {
  busy: boolean;
  onCreate: (o: { total: number; aiFill: number; name: string }) => void;
  onJoin: (rid: string, name: string) => void;
  onBack?: () => void;
}) {
  const { address, connecting, connect, disconnect } = useWallet();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [total, setTotal] = useState(6);
  const [aiFill, setAiFill] = useState(2);
  const [code, setCode] = useState("");
  const [showLb, setShowLb] = useState(false);
  const [rooms, setRooms] = useState<OpenRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const room = new URLSearchParams(window.location.search).get("room");
    if (room) {
      setMode("join");
      setCode(room.toUpperCase());
    }
  }, []);

  // 公开房间列表：进入「加入房间」页时拉取，并定时刷新
  useEffect(() => {
    if (mode !== "join") return;
    let stop = false;
    const load = async () => {
      try {
        const res = await fetch("/api/rooms", { cache: "no-store" });
        const data = (await res.json()) as { rooms?: OpenRoom[] };
        if (!stop) setRooms(data.rooms || []);
      } catch {
        /* 忽略网络抖动 */
      } finally {
        if (!stop) setRoomsLoading(false);
      }
    };
    setRoomsLoading(true);
    load();
    const iv = setInterval(load, 5000);
    return () => {
      stop = true;
      clearInterval(iv);
    };
  }, [mode]);

  const name = address || "";
  const needWallet = !address;

  const ctaText = needWallet
    ? "请先连接钱包"
    : busy
    ? mode === "create"
      ? "开局中…"
      : "加入中…"
    : mode === "create"
    ? "🎴 开局 · 发牌"
    : "🔑 入局 · 就座";

  return (
    <div className="gr-home">
      <div className="gr-top-bar">
        <div className="gr-top-left">
          {onBack && (
            <button className="gr-back" onClick={onBack} aria-label="返回大厅">
              ← 大厅
            </button>
          )}
          <span className="gr-neon">AI 卧底局</span>
        </div>
        <div className="gr-top-actions">
          <button
            className="gr-wallet-pill"
            onClick={() => setShowLb(true)}
            title="积分排行榜"
          >
            🏆 排行
          </button>
          {address ? (
            <button
              className="gr-wallet-pill"
              onClick={disconnect}
              title="断开钱包"
            >
              {shortAddr(address)}
            </button>
          ) : (
            <button
              className="gr-wallet-pill"
              onClick={connect}
              disabled={connecting}
            >
              {connecting ? "连接中…" : "🔗 连接钱包"}
            </button>
          )}
        </div>
      </div>

      {/* 牌扇：五张盖牌，一张是 Joker（卧底藏其中） */}
      <div className="gr-fan" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`gr-fan-card${i === 1 ? " joker" : ""}`}
            style={{
              transform: `rotate(${(i - 2) * 9}deg) translateY(${
                Math.abs(i - 2) * 6
              }px)`,
            }}
          >
            {i === 1 ? "🃏" : ""}
          </div>
        ))}
      </div>

      <h1 className="gr-title">
        AI <span className="gr-title-spy">卧底</span>局
      </h1>
      <div className="gr-action-card">
        <div className="gr-action-tabs">
          <button
            className={mode === "create" ? "on" : ""}
            onClick={() => setMode("create")}
          >
            创建房间
          </button>
          <button
            className={mode === "join" ? "on" : ""}
            onClick={() => setMode("join")}
          >
            加入房间
          </button>
        </div>

        {mode === "create" ? (
          <>
            <label className="gr-label">总人数</label>
            <div className="gr-seg">
              {[4, 5, 6, 7, 8].map((n) => (
                <button
                  key={n}
                  className={total === n ? "on" : ""}
                  onClick={() => {
                    setTotal(n);
                    setAiFill((a) => Math.min(a, n - 1));
                  }}
                >
                  {n}
                </button>
              ))}
            </div>

            <label className="gr-label">AI 候补数</label>
            <div className="gr-seg">
              {Array.from({ length: total }, (_, i) => i).map((n) => (
                <button
                  key={n}
                  className={aiFill === n ? "on" : ""}
                  onClick={() => setAiFill(Math.min(n, total - 1))}
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="gr-hint">
              {total - aiFill} 真人 + {aiFill} AI（真人不足时空位自动由 AI 补）
            </div>

            <button
              className="gr-cta"
              disabled={busy || needWallet}
              onClick={() => onCreate({ total, aiFill, name })}
            >
              {ctaText}
            </button>
          </>
        ) : (
          <>
            <label className="gr-label">房号</label>
            <input
              className="gr-input code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="6 位房号"
              maxLength={6}
            />

            <button
              className="gr-cta"
              disabled={busy || needWallet || code.trim().length < 4}
              onClick={() => onJoin(code.trim(), name)}
            >
              {ctaText}
            </button>

            <div className="gr-open-head">
              <span className="gr-open-title">👥 等人加入的房间</span>
              <span className="gr-open-refresh">
                {roomsLoading ? "刷新中…" : `${rooms.length} 间`}
              </span>
            </div>

            <div className="gr-open-list">
              {rooms.length === 0 && !roomsLoading && (
                <div className="gr-open-empty">暂时没有公开房间，开一桌吧</div>
              )}
              {rooms.map((r) => (
                <div className="gr-open-row" key={r.id}>
                  <div className="gr-open-code">{r.id}</div>
                  <div className="gr-open-meta">
                    <span className="gr-open-count">
                      {r.humans}/{r.total} 人
                    </span>
                    <span className="gr-open-ai">🤖 ×{r.aiFill}</span>
                  </div>
                  <button
                    className="gr-open-join"
                    disabled={busy || needWallet || r.humans >= r.total - r.aiFill}
                    onClick={() => onJoin(r.id, name)}
                  >
                    加入
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="gr-sell">
        {SELL.map((s) => (
          <span className="gr-sell-pill" key={s}>
            {s}
          </span>
        ))}
      </div>

      <div className="gr-steps">
        {STEPS.map((s, i) => (
          <span className="gr-step" key={s}>
            <span className="gr-step-num">{i + 1}</span>
            <span className="gr-step-text">{s}</span>
            {i < STEPS.length - 1 && <span className="gr-step-arrow">→</span>}
          </span>
        ))}
      </div>

      <div className="gr-foot-note">GenLayer Testnet</div>

      {showLb && (
        <LeaderboardModal
          address={address || ""}
          onClose={() => setShowLb(false)}
        />
      )}
    </div>
  );
}
