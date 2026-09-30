import { Redis } from "@upstash/redis";

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// 生产走 Upstash Redis；本地 dev 无凭据时回退到单进程内存（`npm run dev` 单进程可用）
const redis =
  UPSTASH_URL && UPSTASH_TOKEN
    ? new Redis({ url: UPSTASH_URL, token: UPSTASH_TOKEN })
    : null;

// 用 globalThis 挂载，避免 Next.js 下不同路由 bundle 各自持有一份模块级 Map
const g = globalThis as unknown as {
  __undercoverStore?: Map<string, unknown>;
  __undercoverLocks?: Map<string, number>;
  __undercoverLobby?: Set<string>;
};
const mem = g.__undercoverStore ?? (g.__undercoverStore = new Map());
const memLocks = g.__undercoverLocks ?? (g.__undercoverLocks = new Map());
const lobbySet = g.__undercoverLobby ?? (g.__undercoverLobby = new Set());

export async function getState<T>(key: string): Promise<T | null> {
  if (redis) return (await redis.get<T>(key)) ?? null;
  return (mem.get(key) as T | undefined) ?? null;
}

export async function setState(
  key: string,
  value: unknown,
  ttlSeconds?: number
): Promise<void> {
  if (redis) {
    if (ttlSeconds) await redis.set(key, value as never, { ex: ttlSeconds });
    else await redis.set(key, value as never);
    return;
  }
  mem.set(key, value);
}

export async function delState(key: string): Promise<void> {
  if (redis) await redis.del(key);
  else mem.delete(key);
}

/** 尝试获取分布式/进程锁（非阻塞）；成功返回 true */
export async function acquireLock(key: string, ttlMs = 20000): Promise<boolean> {
  if (redis) {
    const ok = await redis.set(`lock:${key}`, "1", {
      nx: true,
      ex: Math.ceil(ttlMs / 1000),
    });
    return ok === "OK";
  }
  const now = Date.now();
  const exp = memLocks.get(key);
  if (exp && exp > now) return false;
  memLocks.set(key, now + ttlMs);
  return true;
}

export async function releaseLock(key: string): Promise<void> {
  if (redis) await redis.del(`lock:${key}`);
  else memLocks.delete(key);
}

// ---------- 大厅索引（公开房间列表） ----------

const LOBBY_INDEX_KEY = "lobby:index";

export async function getLobbyIds(): Promise<string[]> {
  if (redis) return (await redis.smembers(LOBBY_INDEX_KEY)) as string[];
  return [...lobbySet];
}

export async function addLobbyId(id: string): Promise<void> {
  if (redis) await redis.sadd(LOBBY_INDEX_KEY, id);
  else lobbySet.add(id);
}

export async function removeLobbyId(id: string): Promise<void> {
  if (redis) await redis.srem(LOBBY_INDEX_KEY, id);
  else lobbySet.delete(id);
}
