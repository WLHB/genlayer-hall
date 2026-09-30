"use client";

import { useEffect, useState } from "react";
import { shortAddr } from "@/lib/format";
import { Avatar } from "./Avatar";

export function LeaderboardModal({
  address,
  onClose,
}: {
  address: string;
  onClose: () => void;
}) {
  const [lb, setLb] = useState<{ address: string; points: number }[]>([]);

  useEffect(() => {
    let stop = false;
    (async () => {
      const res = await fetch("/api/stats/leaderboard");
      const data = (await res.json()) as { address: string; points: number }[];
      if (!stop) setLb(data);
    })();
    return () => {
      stop = true;
    };
  }, []);

  return (
    <div className="gr-overlay">
      <div className="gr-modal gr-lb-modal">
        <div className="gr-lb-head">
          <div className="gr-lb-title">🏆 排行榜</div>
          <button className="gr-lb-close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>

        <div className="gr-lb-rules">
          积分规则：参与 +10 · 获胜 +30 · 卧底获胜额外 +20 · 邀请好友 +20
        </div>

        <div className="gr-lb-list">
          {lb.map((p, i) => (
            <div
              key={p.address}
              className={`gr-lb-row${
                p.address.toLowerCase() === address.toLowerCase() ? " me" : ""
              }`}
            >
              <span className={`gr-lb-rank${i < 3 ? " top" : ""}`}>{i + 1}</span>
              <span className="gr-lb-avatar">
                <Avatar name={p.address} isAI={false} />
              </span>
              <span className="gr-lb-addr">{shortAddr(p.address)}</span>
              <span className="gr-lb-points">{p.points}</span>
            </div>
          ))}
          {lb.length === 0 && (
            <div className="gr-lb-empty">还没有人上榜，来打第一局吧</div>
          )}
        </div>

        <button className="gr-ghost" onClick={onClose}>
          关闭
        </button>
      </div>
    </div>
  );
}
