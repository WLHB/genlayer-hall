"use client";

import type { Honor } from "@/lib/identity";
import { EXPLORER_URL } from "@/lib/genlayer";

export function HonorCard({
  honor,
  address,
}: {
  honor: Honor;
  address: string;
}) {
  const share = () => {
    const text = `我在「AI 卧底局」拿到了荣誉「${honor.title}」，链上 AI 亲自认证。来赢一个：`;
    const url = `${window.location.origin}/?ref=${address}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        text
      )}&url=${encodeURIComponent(url)}`,
      "_blank"
    );
  };

  const hasStats =
    honor.games !== undefined ||
    honor.wins !== undefined ||
    honor.points !== undefined;

  return (
    <div className="gr-identity-card">
      <div className="gr-identity-eyebrow">🏅 荣誉勋章</div>
      <div className="gr-identity-title">{honor.title}</div>
      {honor.desc && <div className="gr-identity-desc">{honor.desc}</div>}

      {hasStats && (
        <div className="gr-identity-stats">
          {honor.games !== undefined && (
            <span className="gr-identity-stat">
              局数 <b>{honor.games}</b>
            </span>
          )}
          {honor.wins !== undefined && (
            <span className="gr-identity-stat">
              胜场 <b>{honor.wins}</b>
            </span>
          )}
          {honor.points !== undefined && (
            <span className="gr-identity-stat">
              积分 <b>{honor.points}</b>
            </span>
          )}
        </div>
      )}

      <div className="gr-identity-actions">
        <button className="gr-share-btn" onClick={share} aria-label="分享荣誉">
          𝕏
        </button>
        <a
          className="gr-identity-link"
          href={EXPLORER_URL}
          target="_blank"
          rel="noreferrer"
        >
          链上已验证 ↗
        </a>
      </div>
    </div>
  );
}
