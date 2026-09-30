"use client";

import type { Honor } from "@/lib/identity";

const EMOJI: Record<string, string> = {
  rank: "🏅",
  first_win: "🥇",
  spy_master: "🃏",
  veteran: "🎴",
  rich: "💰",
};

export function HonorBadge({ honor }: { honor: Honor }) {
  return (
    <div className="gr-honor-badge" title={honor.desc}>
      <div className="gr-honor-badge-emoji">{EMOJI[honor.id] ?? "🏅"}</div>
      <div className="gr-honor-badge-title">{honor.title}</div>
      <div className="gr-honor-badge-desc">{honor.desc}</div>
    </div>
  );
}
