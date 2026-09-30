"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type { GameView } from "@/hooks/useRoom";
import { shortAddr } from "@/lib/format";
import { Countdown } from "./Countdown";
import { PlayerCard } from "./PlayerCard";
import { Avatar } from "./Avatar";

const R = 42; // 头像圆半径（%）

const PHASE_LABEL: Record<string, { text: string; icon: string }> = {
  describe: { text: "发言阶段", icon: "🎤" },
  vote: { text: "投票阶段", icon: "🗳" },
  reveal: { text: "揭晓阶段", icon: "🔓" },
};

export function GameBoard({
  view,
  busy,
  onDescribe,
  onVote,
}: {
  view: GameView;
  busy: boolean;
  onDescribe: (text: string) => void;
  onVote: (seat: number) => void;
}) {
  const me = view.me!;
  const mySeat = view.seats.find((s) => s.seat === me.seat)!;
  const [text, setText] = useState("");
  const [introSeen, setIntroSeen] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIntroSeen(!!localStorage.getItem("undercover_intro"));
    }
  }, []);
  const nameOf = (seat: number) =>
    shortAddr(view.seats.find((s) => s.seat === seat)?.name ?? "?");

  const isDescribing = view.phase === "describe";
  const isVoting = view.phase === "vote";
  const isMyTurn = view.speakerSeat === me.seat;

  const canDescribe = isDescribing && isMyTurn && me.alive && !busy;
  const canVote = isVoting && mySeat.voted === undefined && me.alive && !busy;
  const lastElim = view.eliminated.length
    ? view.eliminated[view.eliminated.length - 1]
    : null;

  // 投票进度：存活玩家中已投票人数 / 总存活人数
  const aliveSeats = view.seats.filter((s) => s.alive);
  const votedCount = aliveSeats.filter((s) => s.voted !== undefined).length;
  const aliveTotal = aliveSeats.length;

  // 投票确认状态
  const [pendingVote, setPendingVote] = useState<number | null>(null);
  const pendingSeat = pendingVote !== null
    ? view.seats.find((s) => s.seat === pendingVote)
    : null;

  // 阶段切换横幅
  const [phaseToast, setPhaseToast] = useState<{ text: string; icon: string } | null>(null);
  const lastPhase = useRef<string | null>(null);
  useEffect(() => {
    const prev = lastPhase.current;
    lastPhase.current = view.phase;
    if (prev && prev !== view.phase) {
      const label = PHASE_LABEL[view.phase];
      if (label) {
        setPhaseToast(label);
        const t = setTimeout(() => setPhaseToast(null), 2200);
        return () => clearTimeout(t);
      }
    }
  }, [view.phase]);

  const n = view.seats.length;
  const angleOf = (i: number) => (i / n) * 2 * Math.PI - Math.PI / 2;

  const seatStyle = (i: number): CSSProperties => {
    const a = angleOf(i);
    return {
      left: `${50 + R * Math.cos(a)}%`,
      top: `${50 + R * Math.sin(a)}%`,
      transform: "translate(-50%, -50%)",
    };
  };

  return (
    <div className="gr-board">
      {phaseToast && (
        <div className="gr-phase-toast" key={`${view.phase}-${view.round}`} role="status">
          <span className="gr-phase-toast-icon">{phaseToast.icon}</span>
          <span className="gr-phase-toast-text">{phaseToast.text}</span>
        </div>
      )}

      <div className="gr-top">
        <div className="gr-chip">
          第 {view.round} 轮 · {PHASE_LABEL[view.phase]?.icon}{" "}
          {PHASE_LABEL[view.phase]?.text}
        </div>
      </div>

      {view.round === 1 && me.alive && !introSeen && (
        <div className="gr-intro">
          <span>💡 描述你的词（别直接说），发言完投票揪出卧底</span>
          <button
            className="gr-intro-dismiss"
            onClick={() => {
              setIntroSeen(true);
              try {
                localStorage.setItem("undercover_intro", "1");
              } catch {
                /* ignore */
              }
            }}
            aria-label="知道了"
          >
            ✕
          </button>
        </div>
      )}

      {!me.alive && (
        <div className="gr-spectator">👀 你已出局，正在观战</div>
      )}

      <div className="gr-play-area">
        <div className="gr-table">
          <div className="gr-table-center">
            {me.alive && (
              <div className="gr-word-center">
                <div className="gr-word-center-label">你的词</div>
                <div className="gr-word-center-value">{me.word}</div>
              </div>
            )}
            <Countdown deadline={view.phaseEndsAt} />
            {isVoting && canVote && (
              <div className="gr-vote-cta">🎯 点一个最可疑的人</div>
            )}
          </div>

          {view.seats.map((s, i) => (
            <PlayerCard
              key={s.seat}
              seat={s}
              voteTargetName={s.voted !== undefined ? nameOf(s.voted) : undefined}
              votedByMe={mySeat.voted === s.seat}
              isSpeaker={isDescribing && s.seat === view.speakerSeat}
              isMe={s.seat === me.seat}
              style={seatStyle(i)}
              onClick={
                canVote && s.alive && s.seat !== me.seat
                  ? () => setPendingVote(s.seat)
                  : undefined
              }
            />
          ))}
        </div>

        {/* 发言记录列表（右侧，与圆桌左右并排） */}
        <div className="gr-speech-list">
          <div className="gr-speech-title">📝 发言记录</div>
          <div className="gr-speech-rows">
            {view.seats.map((s) => {
              const isSpeaking = isDescribing && s.seat === view.speakerSeat;
              return (
                <div
                  key={s.seat}
                  className={`gr-speech-row${isSpeaking ? " speaking" : ""}${!s.alive ? " dead" : ""}${s.seat === me.seat ? " me" : ""}`}
                >
                  <span className="gr-speech-avatar">
                    <Avatar name={s.name} isAI={s.isAI} />
                  </span>
                  <span className="gr-speech-name">
                    {s.seat === me.seat ? "你" : shortAddr(s.name)}
                  </span>
                  <span className="gr-speech-text">
                    {s.description
                      ? s.description
                      : s.alive
                      ? (isSpeaking ? "发言中…" : "等待中…")
                      : "已出局"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {canDescribe && (
        <div className="gr-say-card">
          <div className="gr-say-head">
            <span className="gr-say-label">🎤 轮到你发言</span>
            <span className="gr-say-count">{text.length}/18</span>
          </div>
          <div className="gr-say">
            <input
              className="gr-say-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="描述你的词，别泄底"
              maxLength={18}
              autoFocus
              onKeyDown={(e) =>
                e.key === "Enter" && text.trim() && onDescribe(text.trim())
              }
            />
            <button
              className="gr-submit"
              disabled={!text.trim() || busy}
              onClick={() => {
                onDescribe(text.trim());
                setText("");
              }}
            >
              提交
            </button>
          </div>
        </div>
      )}

      {isDescribing && !canDescribe && (
        <div className="gr-status">
          <span className="gr-spinner" />
          {!me.alive
            ? "观战中，等待其他人…"
            : isMyTurn
            ? "提交你的发言…"
            : "等待其他玩家发言…"}
        </div>
      )}

      {isVoting && !canVote && me.alive && (
        <div className="gr-vote-status">
          <span className="gr-vote-status-text">
            ✅ 已投 {mySeat.voted !== undefined ? nameOf(mySeat.voted) : ""}
          </span>
          <span className="gr-vote-progress">
            <span className="gr-vote-progress-bar" style={{ width: `${aliveTotal ? (votedCount / aliveTotal) * 100 : 0}%` }} />
            <span className="gr-vote-progress-text">{votedCount}/{aliveTotal}</span>
          </span>
        </div>
      )}

      {isVoting && canVote && (
        <div className="gr-vote-status">
          <span className="gr-vote-status-text">⏳ 等你投票</span>
          <span className="gr-vote-progress">
            <span className="gr-vote-progress-bar" style={{ width: `${aliveTotal ? (votedCount / aliveTotal) * 100 : 0}%` }} />
            <span className="gr-vote-progress-text">{votedCount}/{aliveTotal}</span>
          </span>
        </div>
      )}

      {lastElim && (
        <div className="gr-elim">
          <div className="gr-elim-title">淘汰结果</div>
          <div className="gr-elim-text">
            {shortAddr(lastElim.name)} 被投出
            {lastElim.isSpy ? "（卧底！）" : "（不是卧底）"}
          </div>
          {view.verdict && <div className="gr-verdict">🧑‍⚖️ {view.verdict}</div>}
        </div>
      )}

      {pendingSeat && (
        <div className="gr-confirm" role="dialog" aria-label="确认投票">
          <div className="gr-confirm-card">
            <div className="gr-confirm-icon">🗳</div>
            <div className="gr-confirm-title">确认投票</div>
            <div className="gr-confirm-target-card">
              <span className="gr-confirm-target-avatar">
                <Avatar name={pendingSeat.name} isAI={pendingSeat.isAI} />
              </span>
              <span className="gr-confirm-target-name">
                {pendingSeat.seat === me.seat ? "你" : shortAddr(pendingSeat.name)}
              </span>
            </div>
            <div className="gr-confirm-hint">⚠️ 提交后无法更改</div>
            <div className="gr-confirm-actions">
              <button
                className="gr-ghost"
                onClick={() => setPendingVote(null)}
                disabled={busy}
              >
                再想想
              </button>
              <button
                className="gr-cta small"
                onClick={() => {
                  onVote(pendingSeat.seat);
                  setPendingVote(null);
                }}
                disabled={busy}
              >
                确认投票
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
