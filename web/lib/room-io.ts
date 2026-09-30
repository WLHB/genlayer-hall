import { getState, setState, acquireLock, releaseLock, getLobbyIds } from "./store";
import { RoomState, ROOM_TTL_SECONDS, advance } from "./game";

export const roomKey = (id: string) => `room:${id}`;

export interface OpenRoomSummary {
  id: string;
  game: string;
  humans: number;
  total: number;
  aiFill: number;
  host: string;
  updatedAt: number;
}

/** 列出当前等待加入的公开房间（lobby 状态），按最近活跃排序 */
export async function listOpenRooms(): Promise<OpenRoomSummary[]> {
  const ids = await getLobbyIds();
  const out: OpenRoomSummary[] = [];
  for (const id of ids) {
    const state = await getState<RoomState>(roomKey(id));
    if (!state || state.status !== "lobby") continue;
    out.push({
      id: state.id,
      game: state.game,
      humans: state.lobby.length,
      total: state.config.total,
      aiFill: state.config.aiFill,
      host: state.lobby.find((p) => p.isHost)?.name ?? "",
      updatedAt: state.updatedAt,
    });
  }
  out.sort((a, b) => b.updatedAt - a.updatedAt);
  return out;
}

export async function loadRoom(id: string): Promise<RoomState | null> {
  return getState<RoomState>(roomKey(id));
}

export async function saveRoom(id: string, state: RoomState): Promise<void> {
  await setState(roomKey(id), state, ROOM_TTL_SECONDS);
}

/** 读-改-写（带锁）。拿不到锁返回 null。 */
export async function mutateRoom<T>(
  id: string,
  fn: (state: RoomState) => T | Promise<T>
): Promise<{ state: RoomState; result: T } | null> {
  const key = roomKey(id);
  if (!(await acquireLock(key, 60000))) return null;
  try {
    const state = await loadRoom(id);
    if (!state) return null;
    const result = await fn(state);
    await saveRoom(id, state);
    return { state, result };
  } finally {
    await releaseLock(key);
  }
}

/** 轮询：刷 lastSeenAt + 惰性推进状态机；拿不到锁就返回快照 */
export async function pollRoom(
  id: string,
  token: string
): Promise<RoomState | null> {
  const key = roomKey(id);
  if (await acquireLock(key, 60000)) {
    try {
      const state = await loadRoom(id);
      if (!state) return null;
      touch(state, token);
      await advance(state);
      await saveRoom(id, state);
      return state;
    } finally {
      await releaseLock(key);
    }
  }
  return loadRoom(id);
}

function touch(state: RoomState, token: string): void {
  if (!token) return;
  if (state.status === "lobby") {
    const p = state.lobby.find((p) => p.token === token);
    if (p) p.lastSeenAt = Date.now();
  } else {
    const p = state.players.find((p) => p.token === token);
    if (p && !p.isAI) p.lastSeenAt = Date.now();
  }
}
