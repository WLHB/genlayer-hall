"use client";

import { useEffect, useRef, useState } from "react";
import { useRoom } from "@/hooks/useRoom";
import { GameHall } from "./GameHall";
import { HomeScreen } from "./HomeScreen";
import { Lobby } from "./Lobby";
import { GameBoard } from "./GameBoard";
import { RevealModal } from "./RevealModal";

export function GameApp() {
  const r = useRoom();
  const view = r.view;
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const wasInRoom = useRef(false);

  // 离场/对局结束（view 回到 null）时回到大厅
  useEffect(() => {
    if (view) wasInRoom.current = true;
    else if (wasInRoom.current) {
      wasInRoom.current = false;
      setSelectedGame(null);
    }
  }, [view]);

  // 回到大厅（没有房间且未选游戏）时显示游戏大厅
  const inLobby = !view && !selectedGame;

  const isWide = !view || view.status === "lobby" || view.status === "playing";

  return (
    <div className="game-root">
      <div className={`gr-container${isWide ? " wide" : ""}`}>
        {inLobby && <GameHall onSelect={setSelectedGame} />}

        {!view && selectedGame === "undercover" && (
          <HomeScreen
            busy={r.busy}
            onCreate={r.create}
            onJoin={r.join}
            onBack={() => setSelectedGame(null)}
          />
        )}

        {view && view.status === "lobby" && (
          <Lobby view={view} busy={r.busy} onStart={r.start} onLeave={r.leave} />
        )}

        {view && view.status === "playing" && view.phase !== "reveal" && (
          <GameBoard
            view={view}
            busy={r.busy}
            onDescribe={r.describe}
            onVote={r.vote}
          />
        )}

        {r.error && <div className="gr-error">{r.error}</div>}
      </div>

      {view && view.status === "playing" && view.phase === "reveal" && (
        <RevealModal
          view={view}
          busy={r.busy}
          onAgain={r.again}
          onLeave={r.leave}
        />
      )}
    </div>
  );
}
