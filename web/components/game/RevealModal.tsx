"use client";

import { useEffect, useState } from "react";
import type { GameView } from "@/hooks/useRoom";
import { shortAddr } from "@/lib/format";
import { GAME_CONTRACT_ADDRESS, EXPLORER_URL } from "@/lib/genlayer";
import { Avatar } from "./Avatar";
import { loadStats, recordGameOnce } from "@/lib/stats";
import { useIdentity } from "@/hooks/useIdentity";
import { HonorCard } from "./HonorCard";

export function RevealModal({
  view,
  busy,
  onAgain,
  onLeave,
}: {
  view: GameView;
  busy: boolean;
  onAgain: () => void;
  onLeave: () => void;
}) {
  const me = view.me!;
  const mySeat = view.seats.find((s) => s.seat === me.seat);
  const myRole = mySeat?.role;
  const iWon = view.winner ? myRole === view.winner : false;
  const myAliveRounds = mySeat ? (mySeat.alive ? view.round : view.round - 1) : 0;
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState(() => loadStats());
  const address = view.me?.name ?? "";
  const identity = useIdentity(address);

  useEffect(() => {
    setStats(recordGameOnce(view.id, iWon, myRole));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shareResult = () => {
    const text = `我在「AI 卧底局」${iWon ? "赢了" : "输了"}！链上 AI 当裁判，来玩：`;
    const t = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      text
    )}&url=${encodeURIComponent(window.location.origin)}`;
    window.open(t, "_blank");
  };

  const copyContract = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(GAME_CONTRACT_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="gr-overlay">
      <div className="gr-modal">
        <div className={`gr-banner ${iWon ? "win" : "lose"}`}>
          <div className="gr-banner-emoji">{iWon ? "🏆" : "💔"}</div>
          <div className="gr-banner-big">{iWon ? "你赢了" : "你输了"}</div>
          <div className="gr-banner-sub">
            {view.winner === "平民" ? "平民阵营获胜" : "卧底获胜"}
          </div>
        </div>

        <div className="gr-my-summary">
          <span className={`gr-my-summary-item${myRole === "卧底" ? " spy" : ""}`}>
            你的角色 <span className="v">{myRole}</span>
          </span>
          <span className="gr-my-summary-item">
            存活 <span className="v">{myAliveRounds}</span> 轮
          </span>
          <span className="gr-my-summary-item">
            结果 <span className="v">{iWon ? "胜" : "负"}</span>
          </span>
        </div>

        {stats.games > 0 && (
          <div className="gr-stats">
            <span className="gr-stats-item">
              历史战绩 <b>{stats.wins}</b> 胜 <b>{stats.games - stats.wins}</b> 负
            </span>
            <span className="gr-stats-item">
              胜率 <b>{Math.round((stats.wins / stats.games) * 100)}%</b>
            </span>
            {stats.spyGames > 0 && (
              <span className="gr-stats-item">
                卧底 <b>{stats.spyWins}</b>/<b>{stats.spyGames}</b>
              </span>
            )}
          </div>
        )}

        {identity.status && identity.status.honors.length > 0 && (
          <div className="gr-identity-section">
            <div className="gr-identity-section-title">🎖 我的荣誉</div>
            <div className="gr-honor-wall">
              {identity.status.honors.map((h) => (
                <HonorCard key={h.id} honor={h} address={address} />
              ))}
            </div>
          </div>
        )}

        {identity.status?.eligible &&
          !identity.status.honors.some((h) => h.id === "rank") && (
            <div className="gr-honor-unlock">
              <div className="gr-honor-unlock-emoji">🎖</div>
              <div className="gr-honor-unlock-title">荣誉解锁</div>
              <div className="gr-honor-unlock-desc">
                你已玩满 {identity.status.minGames} 局，可铸造专属荣誉
              </div>
              <button
                className="gr-honor-mint-btn"
                disabled={identity.busy}
                onClick={() => identity.mint()}
              >
                {identity.busy ? "链上铸造中…" : "🎖 铸造荣誉"}
              </button>
            </div>
          )}

        {view.verdict && (
          <div className="gr-verdict center">🧑‍⚖️ {view.verdict}</div>
        )}

        <div className="gr-wordpair">
          <div className="gr-wordbox">
            <span className="gr-wordbox-k">👤 平民词</span>
            <span className="gr-wordbox-v">{view.civilianWord}</span>
          </div>
          <div className="gr-wordbox spy-box">
            <span className="gr-wordbox-k">🃏 卧底词</span>
            <span className="gr-wordbox-v spy">{view.spyWord}</span>
          </div>
        </div>

        <div className="gr-reveal-title">玩家身份揭晓</div>
        <div className="gr-reveal">
          {view.seats.map((s, i) => (
            <div
              key={s.seat}
              className={`gr-reveal-row${s.role === "卧底" ? " spy" : ""}${
                s.seat === me.seat ? " me" : ""
              }`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span className="gr-reveal-avatar">
                <Avatar name={s.name} isAI={s.isAI} />
              </span>
              <span className="gr-reveal-name">
                {s.seat === me.seat ? "你" : shortAddr(s.name)}
              </span>
              <span className="gr-reveal-word">「{s.word}」</span>
              <span className="gr-reveal-role">
                {s.role === "卧底" ? "🃏 卧底" : "👤 平民"}
              </span>
            </div>
          ))}
        </div>

        <div className="gr-onchain">
          <span className="gr-onchain-badge">⚡ 链上 AI 裁决</span>
          <button
            className="gr-onchain-addr"
            onClick={copyContract}
            title="复制合约地址"
          >
            {copied ? "已复制 ✓" : `合约 ${shortAddr(GAME_CONTRACT_ADDRESS)}`}
          </button>
          <a
            className="gr-onchain-link"
            href={EXPLORER_URL}
            target="_blank"
            rel="noreferrer"
          >
            Explorer ↗
          </a>
        </div>

        <div className="gr-actions">
          {me.isHost && (
            <button className="gr-cta small" disabled={busy} onClick={onAgain}>
              再来一局
            </button>
          )}
          <button className="gr-share-btn" onClick={shareResult}>
            𝕏 分享战绩
          </button>
          <button className="gr-ghost" onClick={onLeave}>
            返回首页
          </button>
        </div>

      </div>
    </div>
  );
}
