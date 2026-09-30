import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";
import { getAddress } from "viem";
import { IDENTITY_CONTRACT_ADDRESS, RPC_URL } from "./genlayer";

/** 统一成 EIP-55 校验和格式，避免链上 TreeMap 键因大小写不匹配读不到 */
function normalizeAddress(address: string): string {
  try {
    return getAddress(address);
  } catch {
    return address;
  }
}

export interface Honor {
  id: string;
  title: string;
  desc: string;
  games?: number;
  wins?: number;
  points?: number;
  at: number;
}

/** 玩满多少局可铸造「战绩称号」荣誉 */
export const IDENTITY_MINT_MIN_GAMES = 5;

/** 服务端 operator 客户端：代用户写链（不持用户私钥） */
function getOperatorClient() {
  const pk = process.env.OPERATOR_PRIVATE_KEY;
  if (!pk) throw new Error("OPERATOR_PRIVATE_KEY 未配置");
  const key = (pk.startsWith("0x") ? pk : `0x${pk}`) as `0x${string}`;
  const account = createAccount(key);
  return createClient({ chain: studionet, account, endpoint: RPC_URL });
}

function toStr(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "data" in raw) {
    return String((raw as { data: unknown }).data);
  }
  return String(raw ?? "");
}

function parseHonors(raw: string): Honor[] {
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr.filter(
        (h): h is Honor => !!h && typeof h.id === "string" && typeof h.title === "string"
      );
    }
  } catch {
    /* ignore */
  }
  return [];
}

/** 读取链上荣誉集合（视图，免签名） */
export async function readHonors(address: string): Promise<Honor[]> {
  if (!IDENTITY_CONTRACT_ADDRESS) return [];
  const client = createClient({ chain: studionet, endpoint: RPC_URL });
  const raw = await client.readContract({
    address: IDENTITY_CONTRACT_ADDRESS,
    functionName: "get",
    args: [normalizeAddress(address)],
  });
  return parseHonors(toStr(raw));
}

/** 链上 AI 生成「战绩称号」（leader-only，免共识） */
export async function generateTitle(stats: {
  games: number;
  wins: number;
  points: number;
}): Promise<string> {
  if (!IDENTITY_CONTRACT_ADDRESS) throw new Error("荣誉合约未配置");
  const client = createClient({ chain: studionet, endpoint: RPC_URL });
  const raw = await client.simulateWriteContract({
    address: IDENTITY_CONTRACT_ADDRESS,
    functionName: "generate_title",
    args: [String(stats.games), String(stats.wins), String(stats.points)],
    leaderOnly: true,
  });
  const title = toStr(raw).trim();
  return title || "局中王者";
}

/** 读-改-写：把一枚荣誉按 id 去重/更新后，整体写回链上 */
export async function mintHonor(
  address: string,
  honor: Honor
): Promise<{ honors: Honor[]; txHash: string }> {
  if (!IDENTITY_CONTRACT_ADDRESS) throw new Error("荣誉合约未配置");

  const honors = await readHonors(address);
  const idx = honors.findIndex((h) => h.id === honor.id);
  if (idx >= 0) honors[idx] = honor;
  else honors.push(honor);

  const json = JSON.stringify(honors);
  const client = getOperatorClient();
  const hash = await client.writeContract({
    address: IDENTITY_CONTRACT_ADDRESS,
    functionName: "mint",
    args: [normalizeAddress(address), json],
    value: 0n,
  });
  await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 240,
    interval: 2000,
  });
  return { honors, txHash: hash as string };
}

// ---------- 成就目录 ----------

export interface Achievement {
  id: string;
  title: string;
  desc: string;
  check: (s: {
    games: number;
    wins: number;
    points: number;
    spyWins: number;
  }) => boolean;
}

/** 固定成就（对局结束自动铸；rank「战绩称号」由手动「铸造荣誉」处理） */
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_win", title: "首胜", desc: "赢得第一局", check: (s) => s.wins >= 1 },
  { id: "spy_master", title: "卧底王", desc: "卧底身份获胜", check: (s) => s.spyWins >= 1 },
  { id: "veteran", title: "老江湖", desc: "累计 20 局", check: (s) => s.games >= 20 },
  { id: "rich", title: "积分达人", desc: "累计 500 分", check: (s) => s.points >= 500 },
];

/** 结算荣誉：读链上 → 铸新解锁的固定成就 → 写回（一次写整个数组） */
export async function settleHonors(
  address: string,
  stats: { games: number; wins: number; points: number; spyWins: number }
): Promise<Honor[]> {
  if (!IDENTITY_CONTRACT_ADDRESS) return [];
  const honors = await readHonors(address);
  const byId = new Map(honors.map((h) => [h.id, h]));
  let changed = false;

  for (const a of ACHIEVEMENTS) {
    if (byId.has(a.id) || !a.check(stats)) continue;
    byId.set(a.id, { id: a.id, title: a.title, desc: a.desc, at: Date.now() });
    changed = true;
  }

  if (!changed) return honors;

  const next = [...byId.values()];
  const json = JSON.stringify(next);
  const client = getOperatorClient();
  const hash = await client.writeContract({
    address: IDENTITY_CONTRACT_ADDRESS,
    functionName: "mint",
    args: [normalizeAddress(address), json],
    value: 0n,
  });
  await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 240,
    interval: 2000,
  });
  return next;
}
