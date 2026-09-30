"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useIdentity } from "@/hooks/useIdentity";
import { shortAddr, identiconFor } from "@/lib/format";
import { GAMES } from "@/lib/games/registry";
import { LeaderboardModal } from "./LeaderboardModal";

export function GameHall({ onSelect }: { onSelect: (gameId: string) => void }) {
  const router = useRouter();
  const { address, connecting, connect, disconnect } = useWallet();
  const identity = useIdentity(address || "");
  const [showLb, setShowLb] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyInvite = () => {
    if (!address) return;
    const url = `${window.location.origin}/?ref=${address}`;
    if (navigator.clipboard) navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="gr-home gr-hall">
      <div className="gr-top-bar">
        <span className="gr-neon">链上桌游厅</span>
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
              className="gr-profile-pill"
              onClick={() => router.push("/me")}
              title="我的战绩与荣誉"
            >
              <img
                className="gr-profile-identicon"
                src={identiconFor(address)}
                alt=""
                aria-hidden
              />
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

      <h1 className="gr-title gr-hall-title">
        链上<span className="gr-title-spy">桌游厅</span>
      </h1>
      <p className="gr-hall-sub">
        链上 AI 当裁判 · 钱包即身份 · 免 gas 开局
      </p>

      <div className="gr-hall-grid">
        {GAMES.map((g) => {
          const live = g.status === "live";
          return (
            <button
              key={g.id}
              className={`gr-game-card${live ? " live" : " soon"}`}
              disabled={!live}
              onClick={() => live && onSelect(g.id)}
              title={live ? `进入 ${g.title}` : `${g.title} 开发中`}
            >
              <span className="gr-game-emoji">{g.emoji}</span>
              <span className="gr-game-title">{g.title}</span>
              <span className="gr-game-tagline">{g.tagline}</span>
              <span className="gr-game-desc">{g.desc}</span>
              <span className={`gr-game-badge${live ? " live" : ""}`}>
                {live ? "▶ 进入" : "🚧 开发中"}
              </span>
            </button>
          );
        })}
      </div>

      {/* 个人中心：邀请裂变 + 链上身份 */}
      <div className="gr-hall-me">
        <div className="gr-hall-me-title">🎖 我的 · 身份 & 邀请</div>
        <div className="gr-hall-me-grid">
          <div className="gr-hall-invite">
            <div className="gr-hall-invite-emoji">🔗</div>
            <div className="gr-hall-invite-title">邀请好友</div>
            <div className="gr-hall-invite-desc">
              好友首局，你 <b>+20</b> · TA <b>+10</b>
            </div>
            {address ? (
              <button className="gr-cta small" onClick={copyInvite}>
                {copied ? "已复制 ✓" : "复制邀请链接"}
              </button>
            ) : (
              <button
                className="gr-cta small"
                onClick={connect}
                disabled={connecting}
              >
                {connecting ? "连接中…" : "连接钱包"}
              </button>
            )}
          </div>

          <div className="gr-hall-identity">
            {identity.status && identity.status.honors.length > 0 ? (
              <>
                <div className="gr-hall-identity-emoji">🎖</div>
                <div className="gr-hall-identity-title">
                  已获 {identity.status.honors.length} 枚荣誉
                </div>
                <div className="gr-hall-identity-desc">
                  「{identity.status.honors.find((h) => h.id === "rank")?.title ?? identity.status.honors[0]?.title}
                  」等 · 点头像看全部
                </div>
              </>
            ) : (
              <>
                <div className="gr-hall-identity-emoji">🎖</div>
                <div className="gr-hall-identity-title">荣誉</div>
                <div className="gr-hall-identity-desc">
                  {address
                    ? identity.status?.eligible
                      ? `已玩满 ${identity.status.minGames} 局，可铸造专属荣誉`
                      : `玩满 ${identity.status?.minGames ?? 5} 局解锁荣誉`
                    : "连接钱包解锁荣誉"}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="gr-hall-foot">
        更多游戏正在路上
      </div>

      {showLb && (
        <LeaderboardModal
          address={address || ""}
          onClose={() => setShowLb(false)}
        />
      )}
    </div>
  );
}
