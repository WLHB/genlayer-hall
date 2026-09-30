"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import type { LobbyView } from "@/hooks/useRoom";
import { shortAddr } from "@/lib/format";
import { Avatar } from "./Avatar";

const RULES = [
  "每人一个词，卧底词不同但相关",
  "轮流发言描述，别直接说，限 18 字",
  "发言完投票，得票最多者出局",
  "投出卧底平民胜，卧底撑到底卧底胜",
];

type LobbySeat =
  | { type: "human"; name: string; isHost: boolean; isYou: boolean; connected: boolean }
  | { type: "empty" }
  | { type: "ai" };

export function Lobby({
  view,
  busy,
  onStart,
  onLeave,
}: {
  view: LobbyView;
  busy: boolean;
  onStart: () => void;
  onLeave: () => void;
}) {
  const isHost = !!view.me?.isHost;
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(view.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const shareTwitter = () => {
    const url = `${window.location.origin}/?room=${view.id}`;
    const text = `来玩「AI 卧底局」——crypto 版谁是卧底，链上 AI 当裁判。房号 ${view.id}，点链接进房：`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
  };

  // 组装座位：真人（按加入顺序）+ 空位 + AI 候补
  const total = view.config.total;
  const seats: LobbySeat[] = [];
  for (let i = 0; i < total; i++) {
    if (i < view.humans.length) {
      const h = view.humans[i];
      seats.push({
        type: "human",
        name: h.name,
        isHost: h.isHost,
        isYou: h.isYou,
        connected: h.connected,
      });
    } else if (i < view.humanSlots) {
      seats.push({ type: "empty" });
    } else {
      seats.push({ type: "ai" });
    }
  }

  const posStyle = (i: number): CSSProperties => {
    const a = (i / total) * 2 * Math.PI - Math.PI / 2;
    const R = 40;
    return {
      left: `${50 + R * Math.cos(a)}%`,
      top: `${50 + R * Math.sin(a)}%`,
      transform: "translate(-50%, -50%)",
    };
  };

  return (
    <div className="gr-lobby">
      {/* 房号：霓虹招牌（精简为房号 + 分享图标） */}
      <div className="gr-room-head">
        <div className="gr-room-row">
          <button className="gr-room-code" onClick={copyCode} title="点击复制房号">
            {view.id}
          </button>
          <button
            className="gr-room-share"
            onClick={shareTwitter}
            title="分享到推特"
            aria-label="分享到推特"
          >
            𝕏
          </button>
        </div>
        {copied && <div className="gr-room-copied">已复制 ✓</div>}
      </div>

      {/* 圆桌等牌友 */}
      <div className="gr-table gr-lobby-table">
        <div className="gr-lobby-center">
          <div className="gr-lobby-count">
            {view.humans.length}
            <span> / {total} 人</span>
          </div>
          <div className="gr-lobby-status">
            {isHost ? "等待牌友加入…" : "等待房主开始…"}
          </div>
        </div>

        {seats.map((s, i) => (
          <div
            key={i}
            className={`gr-lobby-seat${s.type === "empty" ? " empty" : ""}${
              s.type === "ai" ? " ai" : ""
            }${s.type === "human" && s.isYou ? " you" : ""}`}
            style={posStyle(i)}
          >
            {s.type === "human" && (
              <>
                <div className="gr-lobby-seat-avatar">
                  <Avatar name={s.name} isAI={false} />
                </div>
                <div className="gr-lobby-seat-name">
                  {shortAddr(s.name)}
                  {s.isYou ? (
                    <i className="gr-lobby-seat-tag you">你</i>
                  ) : s.isHost ? (
                    <i className="gr-lobby-seat-tag host">房主</i>
                  ) : null}
                </div>
              </>
            )}
            {s.type === "empty" && (
              <>
                <div className="gr-lobby-seat-avatar empty">＋</div>
                <div className="gr-lobby-seat-name dim">空位</div>
              </>
            )}
            {s.type === "ai" && (
              <>
                <div className="gr-lobby-seat-avatar">🤖</div>
                <div className="gr-lobby-seat-name dim">AI 候补</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 操作 */}
      <div className="gr-lobby-actions">
        {isHost ? (
          <button className="gr-cta" disabled={busy} onClick={onStart}>
            {busy ? "链上发牌中…" : "🎴 开始对局"}
          </button>
        ) : (
          <div className="gr-lobby-waiting">
            <span className="gr-lobby-waiting-dot" />
            等待房主开始…
          </div>
        )}
        <button className="gr-ghost" onClick={onLeave}>
          离开房间
        </button>
      </div>

      {/* 玩法速览 */}
      <div className="gr-rules">
        <div className="gr-rules-title">玩法速览</div>
        <ol className="gr-rules-list">
          {RULES.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ol>
      </div>
    </div>
  );
}
