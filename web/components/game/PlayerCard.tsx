"use client";

import type { CSSProperties } from "react";
import type { SeatView } from "@/hooks/useRoom";
import { shortAddr } from "@/lib/format";
import { Avatar } from "./Avatar";

export function PlayerCard({
  seat,
  voteTargetName,
  onClick,
  votedByMe,
  isSpeaker,
  isMe,
  style,
}: {
  seat: SeatView;
  voteTargetName?: string;
  onClick?: () => void;
  votedByMe?: boolean;
  isSpeaker?: boolean;
  isMe?: boolean;
  style?: CSSProperties;
}) {
  const classes = [
    "gr-seat",
    seat.alive ? "" : "dead",
    isSpeaker ? "speaker" : "",
    votedByMe ? "voted" : "",
    isMe ? "me" : "",
    onClick ? "votable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const name = shortAddr(seat.name);
  const ariaLabel = seat.isAI
    ? `AI 玩家 ${name}${isSpeaker ? "，正在发言" : ""}`
    : `玩家 ${name}${isMe ? "（你）" : ""}${onClick ? "，点击投票" : ""}${
        seat.alive ? "" : "，已出局"
      }`;

  return (
    <div className={classes} style={style}>
      <button
        type="button"
        className={`gr-head${seat.isAI ? " ai" : ""}${
          onClick ? " clickable" : ""
        }`}
        onClick={onClick}
        disabled={!onClick}
        aria-label={ariaLabel}
      >
        <span className="gr-card-avatar">
          <Avatar name={seat.name} isAI={seat.isAI} />
        </span>
        <span className="gr-card-name">{name}</span>
        {seat.alive && !seat.description && !isSpeaker && (
          <span className="gr-thinking">
            <span className="gr-thinking-label">
              {seat.isAI ? "链上思考中" : "等待中"}
            </span>
            <span className="gr-thinking-dots">
              <span className="gr-dot-anim" />
              <span className="gr-dot-anim" />
              <span className="gr-dot-anim" />
            </span>
          </span>
        )}
        {!seat.alive && <span className="gr-out-tag">出局</span>}
      </button>
      {voteTargetName && (
        <span className="gr-vote-tag" aria-hidden>
          🎯
        </span>
      )}
    </div>
  );
}
