import { Redis } from "@upstash/redis";

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const redis =
  UPSTASH_URL && UPSTASH_TOKEN
    ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN })
    : null;

// 内存回退（dev）：挂 globalThis 跨路由共享
const g = globalThis as unknown as {
  __uc_stats?: Map<string, Record<string, number>>;
  __uc_lb?: Map<string, number>;
  __uc_hist?: Map<string, string[]>;
  __uc_ref?: Map<string, string>;
};
const memStats = g.__uc_stats ?? (g.__uc_stats = new Map());
const memLb = g.__uc_lb ?? (g.__uc_lb = new Map());
const memHist = g.__uc_hist ?? (g.__uc_hist = new Map());
const memRef = g.__uc_ref ?? (g.__uc_ref = new Map());

export interface GameRecord {
  role: "平民" | "卧底";
  won: boolean;
  points: number;
  civilianWord: string;
  spyWord: string;
  round: number;
  at: number;
}

export interface PlayerStats {
  points: number;
  games: number;
  wins: number;
  spyGames: number;
  spyWins: number;
}

/** 积分规则：参与 +10，获胜 +30，卧底获胜额外 +20（卧底更难） */
export function computePoints(won: boolean, role: "平民" | "卧底"): number {
  return 10 + (won ? 30 : 0) + (role === "卧底" && won ? 20 : 0);
}

// ---------- 邀请裂变 ----------

export const REFERRAL_REFERRER_POINTS = 20;
export const REFERRAL_INVITEE_POINTS = 10;

/** 绑定邀请关系：address 是被邀请人，referrer 是邀请人（钱包即邀请码） */
export async function bindReferral(
  address: string,
  referrer: string
): Promise<void> {
  const k = address.toLowerCase();
  if (redis) await redis.set(`ref:${k}`, referrer);
  else memRef.set(k, referrer);
}

async function getReferrer(address: string): Promise<string | null> {
  const k = address.toLowerCase();
  if (redis) return (await redis.get<string>(`ref:${k}`)) ?? null;
  return memRef.get(k) ?? null;
}

/** 只加分（不动局数/历史），用于邀请奖励。地址键与 recordGameResult 保持一致。 */
async function awardPoints(address: string, points: number): Promise<void> {
  if (points <= 0) return;
  const sk = `stats:${address}`;
  if (redis) {
    await redis.hincrby(sk, "points", points);
    await redis.hincrby("lb", address, points);
  } else {
    const s = { ...(memStats.get(sk) ?? emptyStats()) };
    s.points += points;
    memStats.set(sk, s);
    memLb.set(address, (memLb.get(address) ?? 0) + points);
  }
}

/**
 * 首次对局结算邀请奖励：被邀请人额外 +10，邀请人 +20。
 * 返回被邀请人本局应额外加的分（0 表示无邀请或非首局）。
 */
export async function settleReferral(address: string): Promise<number> {
  const referrer = await getReferrer(address);
  if (!referrer) return 0;
  const { stats } = await getMyStats(address);
  if (stats.games > 0) return 0; // 非首局不重复发
  await awardPoints(referrer, REFERRAL_REFERRER_POINTS);
  return REFERRAL_INVITEE_POINTS;
}

function emptyStats(): PlayerStats {
  return { points: 0, games: 0, wins: 0, spyGames: 0, spyWins: 0 };
}

export async function recordGameResult(
  address: string,
  rec: GameRecord
): Promise<void> {
  const sk = `stats:${address}`;
  const hk = `hist:${address}`;
  if (redis) {
    await redis.hincrby(sk, "points", rec.points);
    await redis.hincrby(sk, "games", 1);
    if (rec.won) await redis.hincrby(sk, "wins", 1);
    if (rec.role === "卧底") await redis.hincrby(sk, "spyGames", 1);
    if (rec.role === "卧底" && rec.won) await redis.hincrby(sk, "spyWins", 1);
    await redis.hincrby("lb", address, rec.points);
    await redis.lpush(hk, JSON.stringify(rec));
    await redis.ltrim(hk, 0, 49);
  } else {
    const s = { ...(memStats.get(sk) ?? emptyStats()) };
    s.points += rec.points;
    s.games += 1;
    if (rec.won) s.wins += 1;
    if (rec.role === "卧底") s.spyGames += 1;
    if (rec.role === "卧底" && rec.won) s.spyWins += 1;
    memStats.set(sk, s);
    memLb.set(address, (memLb.get(address) ?? 0) + rec.points);
    const h = memHist.get(hk) ?? [];
    h.unshift(JSON.stringify(rec));
    if (h.length > 50) h.length = 50;
    memHist.set(hk, h);
  }
}

export async function getLeaderboard(
  limit = 50
): Promise<{ address: string; points: number }[]> {
  const lb: Record<string, number> = {};
  if (redis) {
    const raw = await redis.hgetall<Record<string, string>>("lb");
    if (raw) for (const [addr, p] of Object.entries(raw)) lb[addr] = Number(p);
  } else {
    for (const [addr, p] of memLb) lb[addr] = p;
  }
  return Object.entries(lb)
    .map(([address, points]) => ({ address, points }))
    .sort((a, b) => b.points - a.points)
    .slice(0, limit);
}

export async function getMyStats(address: string): Promise<{
  stats: PlayerStats;
  history: GameRecord[];
}> {
  let stats = emptyStats();
  let history: GameRecord[] = [];
  if (redis) {
    const raw = await redis.hgetall<Record<string, string>>(`stats:${address}`);
    if (raw) {
      stats = {
        points: Number(raw.points ?? 0),
        games: Number(raw.games ?? 0),
        wins: Number(raw.wins ?? 0),
        spyGames: Number(raw.spyGames ?? 0),
        spyWins: Number(raw.spyWins ?? 0),
      };
    }
    const histRaw = await redis.lrange(`hist:${address}`, 0, 49);
    history = parseHistory(histRaw);
  } else {
    stats = { ...(memStats.get(`stats:${address}`) ?? emptyStats()) };
    history = parseHistory(memHist.get(`hist:${address}`) ?? []);
  }
  return { stats, history };
}

function parseHistory(raw: string[]): GameRecord[] {
  return raw
    .map((s) => {
      try {
        return JSON.parse(s) as GameRecord;
      } catch {
        return null;
      }
    })
    .filter((x): x is GameRecord => !!x);
}
