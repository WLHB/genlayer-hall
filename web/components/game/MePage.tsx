"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@/hooks/useWallet";
import { useIdentity } from "@/hooks/useIdentity";
import { HonorBadge } from "./HonorBadge";
import { shortAddr, identiconFor } from "@/lib/format";
import type { PlayerStats, GameRecord } from "@/lib/stats-store";

const PAGE_SIZE = 10;

export function MePage() {
  const router = useRouter();
  const { address, connecting, connect, disconnect } = useWallet();
  const identity = useIdentity(address || "");
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [history, setHistory] = useState<GameRecord[]>([]);
  const [rank, setRank] = useState<number | null>(null);
  const [visible, setVisible] = useState(PAGE_SIZE);

  useEffect(() => {
    if (!address) return;
    let stop = false;
    (async () => {
      const lbRes = await fetch("/api/stats/leaderboard");
      const lb = (await lbRes.json()) as { address: string; points: number }[];
      if (stop) return;
      const idx = lb.findIndex(
        (x) => x.address.toLowerCase() === address.toLowerCase()
      );
      setRank(idx >= 0 ? idx + 1 : null);

      const meRes = await fetch(`/api/stats/me?address=${address}`);
      const me = (await meRes.json()) as {
        stats?: PlayerStats;
        history?: GameRecord[];
      };
      if (stop) return;
      if (me.stats) {
        setStats(me.stats);
        setHistory(me.history || []);
      }
    })();
    return () => {
      stop = true;
    };
  }, [address]);

  const handleDisconnect = () => {
    disconnect();
    router.push("/");
  };

  const honors = identity.status?.honors ?? [];
  const rankHonor = honors.find((h) => h.id === "rank");
  const hasRank = !!rankHonor;

  return (
    <div className="game-root">
      <div className="gr-container gr-me">
        <div className="gr-me-top">
          <button
            className="gr-back"
            onClick={() => router.push("/")}
            aria-label="返回大厅"
          >
            ← 大厅
          </button>
          {address && (
            <button className="gr-wallet-pill" onClick={handleDisconnect}>
              断开钱包
            </button>
          )}
        </div>

        {!address ? (
          <div className="gr-me-empty">
            <div className="gr-me-empty-text">连接钱包，查看你的荣誉与战绩</div>
            <button className="gr-cta" onClick={connect} disabled={connecting}>
              {connecting ? "连接中…" : "🔗 连接钱包"}
            </button>
          </div>
        ) : (
          <>
            {/* 档案卡 */}
            <div className="gr-me-hero">
              <img
                className="gr-me-hero-avatar"
                src={identiconFor(address)}
                alt=""
                aria-hidden
              />
              <div className="gr-me-title">我的</div>
              <div className="gr-me-addr">{shortAddr(address)}</div>
              {rankHonor ? (
                <div className="gr-me-hero-rank">🎖 {rankHonor.title}</div>
              ) : identity.status?.eligible ? (
                <button
                  className="gr-me-hero-mint"
                  disabled={identity.busy}
                  onClick={() => identity.mint()}
                >
                  {identity.busy ? "链上铸造中…" : "🎖 铸造专属称号"}
                </button>
              ) : (
                <div className="gr-me-hero-norank">
                  玩满 {identity.status?.minGames ?? 5} 局解锁称号
                </div>
              )}
            </div>

            {/* 荣誉墙 */}
            <section className="gr-me-section">
              <div className="gr-me-section-title">
                🎖 荣誉
                {honors.length > 0 && (
                  <span className="gr-me-count">{honors.length}</span>
                )}
              </div>
              {honors.length > 0 ? (
                <div className="gr-honor-wall gr-me-honor-wall">
                  {honors.map((h) => (
                    <HonorBadge key={h.id} honor={h} />
                  ))}
                </div>
              ) : (
                <div className="gr-my-empty">还没有荣誉，去打一局吧</div>
              )}
            </section>

            {/* 战绩 */}
            <section className="gr-me-section">
              <div className="gr-me-section-title">📊 战绩</div>
                {stats && (
                  <div className="gr-me-stats">
                    <div className="gr-my-stat">
                      <span className="k">积分</span>
                      <span className="v">{stats.points}</span>
                    </div>
                    <div className="gr-my-stat">
                      <span className="k">排名</span>
                      <span className="v">{rank ? `#${rank}` : "50+"}</span>
                    </div>
                    <div className="gr-my-stat">
                      <span className="k">胜率</span>
                      <span className="v">
                        {stats.games
                          ? Math.round((stats.wins / stats.games) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="gr-my-stat">
                      <span className="k">局数</span>
                      <span className="v">{stats.games}</span>
                    </div>
                  </div>
                )}
              </section>

              <section className="gr-me-section">
                <div className="gr-me-section-title">📜 过往战绩</div>
                {history.length > 0 ? (
                  <>
                    <div className="gr-my-hist">
                      {history.slice(0, visible).map((h, i) => (
                        <div key={i} className="gr-my-hist-row">
                          <span className="gr-my-hist-result">
                            {h.won ? "🏆" : "💔"}
                          </span>
                          <span className="gr-my-hist-role">{h.role}</span>
                          <span className="gr-my-hist-points">+{h.points}</span>
                        </div>
                      ))}
                    </div>
                    {visible < history.length && (
                      <button
                        className="gr-my-more"
                        onClick={() => setVisible((v) => v + PAGE_SIZE)}
                      >
                        加载更多（还剩 {history.length - visible} 条）
                      </button>
                    )}
                  </>
                ) : (
                  <div className="gr-my-empty">还没有战绩，去打一局吧</div>
                )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
