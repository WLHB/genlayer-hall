import { GAME_CONTRACT_ADDRESS, getReadClient } from "./genlayer";

/** 从 LLM 返回的文本里提取 JSON（去掉 markdown 围栏，取第一个 {…}） */
export function parseJson<T>(raw: string): T | null {
  const s = raw.replace(/```json/g, "").replace(/```/g, "").trim();
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}

async function callUndercover(functionName: string, args: string[]): Promise<string> {
  const client = getReadClient();
  const raw = await client.simulateWriteContract({
    address: GAME_CONTRACT_ADDRESS,
    functionName,
    args,
    leaderOnly: true,
  });
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "data" in raw) {
    return String((raw as { data: unknown }).data);
  }
  return String(raw);
}

export interface RoundWords {
  civilian_word: string;
  spy_word: string;
  hint: string;
}

export interface NpcVote {
  index: number;
  reason: string;
}

/** 生成一对 crypto 词 + 主题提示 */
export function newRound(themeHint: string): Promise<string> {
  return callUndercover("new_round", [themeHint]);
}

/** NPC 给一句模糊描述（不知道自己的身份） */
export function npcDescribe(
  word: string,
  history: string,
  angle: string
): Promise<string> {
  return callUndercover("npc_describe", [word, history, angle]);
}

/** NPC 投最可疑的人（不知道自己的身份） */
export function npcVote(descriptions: string, myWord: string): Promise<string> {
  return callUndercover("npc_vote", [descriptions, myWord]);
}

/** 链上 AI 裁判裁决语 */
export function judge(
  eliminatedName: string,
  eliminatedIsSpy: "是" | "否",
  winner: "平民" | "卧底" | "继续"
): Promise<string> {
  return callUndercover("judge", [eliminatedName, eliminatedIsSpy, winner]);
}
