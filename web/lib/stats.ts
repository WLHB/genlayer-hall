export interface Stats {
  games: number;
  wins: number;
  spyGames: number;
  spyWins: number;
  caughtSpy: number;
}

const KEY = "undercover_stats";
const LAST_ROOM_KEY = "undercover_stats_last_room";

function empty(): Stats {
  return { games: 0, wins: 0, spyGames: 0, spyWins: 0, caughtSpy: 0 };
}

export function loadStats(): Stats {
  if (typeof window === "undefined") return empty();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...empty(), ...(JSON.parse(raw) as Partial<Stats>) };
  } catch {
    /* ignore */
  }
  return empty();
}

/** 每局只记一次（按 roomId 去重，避免结算页重复挂载/刷新重复累计） */
export function recordGameOnce(
  roomId: string,
  iWon: boolean,
  myRole?: "平民" | "卧底"
): Stats {
  if (typeof window === "undefined") return loadStats();
  if (localStorage.getItem(LAST_ROOM_KEY) === roomId) return loadStats();

  const s = loadStats();
  s.games += 1;
  if (iWon) s.wins += 1;
  if (myRole === "卧底") {
    s.spyGames += 1;
    if (iWon) s.spyWins += 1;
  } else if (myRole === "平民" && iWon) {
    s.caughtSpy += 1;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
    localStorage.setItem(LAST_ROOM_KEY, roomId);
  } catch {
    /* ignore */
  }
  return s;
}
