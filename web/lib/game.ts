import {
  newRound,
  npcDescribe,
  npcVote,
  judge,
  parseJson,
  NpcVote,
} from "./undercover";
import { recordGameResult, computePoints, settleReferral, getMyStats } from "./stats-store";
import { settleHonors } from "./identity";
import { isAddress } from "./format";

export type Role = "平民" | "卧底";
export type Phase = "describe" | "vote" | "reveal";
export type RoomStatus = "lobby" | "playing" | "ended";

export interface LobbyPlayer {
  token: string;
  name: string;
  isHost: boolean;
  lastSeenAt: number;
}

export interface SeatedPlayer {
  seat: number;
  token: string;
  name: string;
  isAI: boolean;
  alive: boolean;
  lastSeenAt: number;
}

export interface Elimination {
  seat: number;
  name: string;
  isSpy: boolean;
}

export interface RoomState {
  id: string;
  game: string;
  status: RoomStatus;
  hostToken: string;
  config: { total: number; aiFill: number };
  lobby: LobbyPlayer[];
  players: SeatedPlayer[];
  round: number;
  phase: Phase;
  phaseEndsAt: number;
  hint: string;
  civilianWord: string;
  spyWord: string;
  roles: Record<number, Role>;
  words: Record<number, string>;
  descriptions: Record<number, string>;
  votes: Record<number, number>;
  said: string[];
  eliminated: Elimination[];
  verdict?: string;
  winner: Role | null;
  statsRecorded: boolean;
  updatedAt: number;
}

export const PHASE_MS = 60_000;
export const ROOM_TTL_SECONDS = 2 * 60 * 60;
const SEEN_TTL_MS = 30_000;

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// 词对库：c = 平民词（更常见），s = 卧底词（相近但不同），h = 主题提示
const WORD_PAIRS: { c: string; s: string; h: string }[] = [
  { c: "比特币", s: "以太坊", h: "一种加密货币" },
  { c: "现货", s: "合约", h: "一种交易方式" },
  { c: "CEX", s: "DEX", h: "一种交易场所" },
  { c: "冷钱包", s: "热钱包", h: "一种存币方式" },
  { c: "空投", s: "ICO", h: "一种发币方式" },
  { c: "K线", s: "均线", h: "一种看盘工具" },
  { c: "质押", s: "流动性挖矿", h: "一种赚收益方式" },
  { c: "公链", s: "联盟链", h: "一种区块链" },
  { c: "meme币", s: "价值币", h: "一种代币" },
  { c: "稳定币", s: "算法稳定币", h: "一种稳定币" },
  { c: "杠杆", s: "保证金", h: "一种放大仓位方式" },
  { c: "做多", s: "做空", h: "一种交易方向" },
  { c: "矿工", s: "验证者", h: "一种网络维护角色" },
  { c: "钱包", s: "交易所", h: "一种存币地方" },
  { c: "白皮书", s: "路线图", h: "一种项目文档" },
  { c: "主网", s: "测试网", h: "一种网络环境" },
  { c: "硬分叉", s: "软分叉", h: "一种升级方式" },
  { c: "智能合约", s: "预言机", h: "一种链上组件" },
  { c: "NFT", s: "域名", h: "一种数字资产" },
  { c: "Gas费", s: "手续费", h: "一种链上成本" },
  { c: "私钥", s: "助记词", h: "一种密钥" },
  { c: "二层", s: "侧链", h: "一种扩容方案" },
  { c: "DeFi", s: "CeFi", h: "一种金融服务" },
  { c: "流动性", s: "深度", h: "一种市场指标" },
  { c: "滑点", s: "点差", h: "一种交易损耗" },
  { c: "合约地址", s: "钱包地址", h: "一种地址" },
];

// 发词主题方向：每局随机一个，喂给链上 AI 让它出新词对
const THEMES = [
  "DeFi 借贷",
  "NFT 与数字艺术",
  "链上安全与钱包",
  "交易与做市",
  "稳定币",
  "Layer2 与扩容",
  "Meme 与社区文化",
  "空投与打新",
  "MEV 与套利",
  "去中心化治理",
  "质押与收益",
  "跨链与桥",
  "隐私与匿名币",
  "链上数据与预言机",
  "链上游戏与元宇宙",
];

export function genCode(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return s;
}

export function genToken(): string {
  return crypto.randomUUID();
}

export function validConfig(total: number, aiFill: number): boolean {
  if (!Number.isInteger(total) || !Number.isInteger(aiFill)) return false;
  if (total < 4 || total > 8) return false;
  if (aiFill < 0 || aiFill >= total) return false;
  return true;
}

export function createRoom(
  total: number,
  aiFill: number,
  hostName: string,
  game = "undercover"
): RoomState {
  const token = genToken();
  return {
    id: genCode(),
    game,
    status: "lobby",
    hostToken: token,
    config: { total, aiFill },
    lobby: [
      {
        token,
        name: hostName.trim() || "玩家1",
        isHost: true,
        lastSeenAt: Date.now(),
      },
    ],
    players: [],
    round: 1,
    phase: "describe",
    phaseEndsAt: 0,
    hint: "",
    civilianWord: "",
    spyWord: "",
    roles: {},
    words: {},
    descriptions: {},
    votes: {},
    said: [],
    eliminated: [],
    winner: null,
    statsRecorded: false,
    updatedAt: Date.now(),
  };
}

export function joinRoom(
  state: RoomState,
  name: string
): { token: string; name: string } | { error: string } {
  if (state.status !== "lobby") return { error: "对局已开始" };
  const humanSlots = state.config.total - state.config.aiFill;
  if (state.lobby.length >= humanSlots) return { error: "房间已满" };
  const token = genToken();
  const playerName = name.trim() || `玩家${state.lobby.length + 1}`;
  state.lobby.push({
    token,
    name: playerName,
    isHost: false,
    lastSeenAt: Date.now(),
  });
  state.updatedAt = Date.now();
  return { token, name: playerName };
}

export function leaveRoom(state: RoomState, token: string): void {
  if (state.status === "lobby") {
    state.lobby = state.lobby.filter((p) => p.token !== token);
    if (state.lobby.length === 0) {
      state.status = "ended";
    } else if (token === state.hostToken) {
      state.hostToken = state.lobby[0].token;
      state.lobby[0].isHost = true;
    }
  } else {
    // 对局中离场：该座位交给 AI 接管
    const p = state.players.find((p) => p.token === token);
    if (p && !p.isAI) {
      p.isAI = true;
      p.name = "AI·接管";
    }
  }
  state.updatedAt = Date.now();
}

export function resetToLobby(state: RoomState): void {
  const humans = state.players
    .filter((p) => !p.isAI)
    .map((p) => ({
      token: p.token,
      name: p.name,
      isHost: p.seat === 0,
      lastSeenAt: Date.now(),
    }));
  if (humans.length === 0) {
    state.status = "ended";
    return;
  }
  state.status = "lobby";
  state.hostToken = humans[0].token;
  humans[0].isHost = true;
  state.lobby = humans;
  state.players = [];
  state.round = 1;
  state.phase = "describe";
  state.phaseEndsAt = 0;
  state.hint = "";
  state.civilianWord = "";
  state.spyWord = "";
  state.roles = {};
  state.words = {};
  state.descriptions = {};
  state.votes = {};
  state.said = [];
  state.eliminated = [];
  state.winner = null;
  state.statsRecorded = false;
  state.verdict = undefined;
  state.updatedAt = Date.now();
}

export async function startGame(
  state: RoomState
): Promise<{ error?: string }> {
  if (state.status !== "lobby") return { error: "对局已开始" };

  const humans = state.lobby.slice(); // 房主在前，之后按加入顺序
  const seats: SeatedPlayer[] = [];
  humans.forEach((h, i) => {
    seats.push({
      seat: i,
      token: h.token,
      name: h.name,
      isAI: false,
      alive: true,
      lastSeenAt: h.lastSeenAt,
    });
  });
  let aiIdx = 1;
  for (let s = humans.length; s < state.config.total; s++) {
    seats.push({
      seat: s,
      token: genToken(),
      name: `AI·${aiIdx++}`,
      isAI: true,
      alive: true,
      lastSeenAt: Date.now(),
    });
  }

  // 发词：优先让链上 AI 生成（带随机主题方向）；失败时回退词对库
  let words: { civilian_word: string; spy_word: string; hint: string };
  try {
    const theme = THEMES[Math.floor(Math.random() * THEMES.length)];
    const raw = await newRound(theme);
    const parsed = parseJson<{
      civilian_word: string;
      spy_word: string;
      hint: string;
    }>(raw);
    if (parsed && parsed.civilian_word && parsed.spy_word) {
      words = parsed;
    } else {
      throw new Error("parse failed");
    }
  } catch {
    const pair = WORD_PAIRS[Math.floor(Math.random() * WORD_PAIRS.length)];
    words = { civilian_word: pair.c, spy_word: pair.s, hint: pair.h };
  }

  const spySeat = seats[Math.floor(Math.random() * seats.length)].seat;
  const roles: Record<number, Role> = {};
  const wordMap: Record<number, string> = {};
  for (const p of seats) {
    const isSpy = p.seat === spySeat;
    roles[p.seat] = isSpy ? "卧底" : "平民";
    wordMap[p.seat] = isSpy ? words.spy_word : words.civilian_word;
  }

  state.players = seats;
  state.status = "playing";
  state.round = 1;
  state.phase = "describe";
  state.phaseEndsAt = Date.now() + PHASE_MS;
  state.hint = words.hint;
  state.civilianWord = words.civilian_word;
  state.spyWord = words.spy_word;
  state.roles = roles;
  state.words = wordMap;
  state.descriptions = {};
  state.votes = {};
  state.said = [];
  state.eliminated = [];
  state.winner = null;
  state.verdict = undefined;
  state.updatedAt = Date.now();
  return {};
}

// ---------- 状态机（每次请求惰性推进） ----------

export async function advance(state: RoomState): Promise<RoomState> {
  if (state.status !== "playing" || state.phase === "reveal") return state;
  const now = Date.now();
  const aliveHumans = state.players.filter((p) => p.alive && !p.isAI);

  if (state.phase === "describe") {
    // 按座位顺序依次发言：轮到 AI 时一次推进一个（渐进式，避免长时间阻塞）
    const speaker = currentSpeaker(state);
    if (speaker && speaker.isAI) {
      const history = state.said.join("；").slice(-1500);
      const angle = ANGLES[speaker.seat % ANGLES.length];
      state.descriptions[speaker.seat] = await aiDescribe(
        state.words[speaker.seat],
        history,
        angle
      );
      state.said.push(state.descriptions[speaker.seat]);
      if (!currentSpeaker(state)) {
        state.phase = "vote";
        state.phaseEndsAt = Date.now() + PHASE_MS;
        state.votes = {};
      }
      state.updatedAt = Date.now();
      return state;
    }
    if (!speaker) {
      state.phase = "vote";
      state.phaseEndsAt = Date.now() + PHASE_MS;
      state.votes = {};
      state.updatedAt = Date.now();
    } else if (now >= state.phaseEndsAt) {
      await fillRemaining(state);
      state.phase = "vote";
      state.phaseEndsAt = Date.now() + PHASE_MS;
      state.votes = {};
      state.updatedAt = Date.now();
    }
    return state;
  }

  if (state.phase === "vote") {
    const allVoted = aliveHumans.every(
      (p) => state.votes[p.seat] !== undefined
    );
    if (allVoted || now >= state.phaseEndsAt) {
      await fillVotes(state);
      const eliminated = tallyAndEliminate(state);
      state.eliminated.push(eliminated);
      const winner = computeWinner(state, eliminated);
      state.verdict = await judgeVerdict(state, eliminated, winner);
      if (winner) {
        state.winner = winner;
        state.phase = "reveal";
        if (!state.statsRecorded) {
          await recordGameResults(state, winner);
          state.statsRecorded = true;
        }
      } else {
        state.round += 1;
        state.phase = "describe";
        state.phaseEndsAt = Date.now() + PHASE_MS;
        state.descriptions = {};
      }
      state.updatedAt = Date.now();
    }
    return state;
  }

  return state;
}

const ANGLES = [
  "它主要用来做什么",
  "它值不值钱、价格大概如何",
  "它是什么时候、怎么出现的",
  "谁在用、什么场景下用",
  "它有什么风险或门槛",
  "大家现在对它是什么看法",
  "它和同类东西比有什么不同",
];

async function aiDescribe(
  word: string,
  history: string,
  angle: string
): Promise<string> {
  try {
    return (await npcDescribe(word, history, angle)).trim();
  } catch {
    return "（没接上话）";
  }
}

export function currentSpeaker(state: RoomState): SeatedPlayer | null {
  const alive = state.players
    .filter((p) => p.alive)
    .sort((a, b) => a.seat - b.seat);
  return alive.find((p) => !state.descriptions[p.seat]) ?? null;
}

async function fillRemaining(state: RoomState): Promise<void> {
  const alive = state.players
    .filter((p) => p.alive)
    .sort((a, b) => a.seat - b.seat);
  let aiIndex = 0;
  for (const p of alive) {
    if (state.descriptions[p.seat]) continue;
    if (p.isAI) {
      const history = state.said.join("；").slice(-1500);
      const angle = ANGLES[aiIndex % ANGLES.length];
      aiIndex++;
      state.descriptions[p.seat] = await aiDescribe(
        state.words[p.seat],
        history,
        angle
      );
    } else {
      state.descriptions[p.seat] = "（超时，没说话）";
    }
    state.said.push(state.descriptions[p.seat]);
  }
}

function randomOther(aliveSeats: number[], self: number): number {
  const opts = aliveSeats.filter((s) => s !== self);
  return opts[Math.floor(Math.random() * opts.length)] ?? self;
}

async function aiVote(
  descriptions: string,
  word: string,
  aliveSeats: number[],
  self: number
): Promise<number> {
  try {
    const raw = await npcVote(descriptions, word);
    const v = parseJson<NpcVote>(raw);
    if (v && typeof v.index === "number" && aliveSeats.includes(v.index)) {
      return v.index;
    }
  } catch {
    /* fallthrough */
  }
  return randomOther(aliveSeats, self);
}

async function fillVotes(state: RoomState): Promise<void> {
  const alive = state.players.filter((p) => p.alive);
  const aliveSeats = alive.map((p) => p.seat);
  const descriptionsStr = alive
    .map((p) => `${p.seat}: ${state.descriptions[p.seat] ?? ""}`)
    .join("\n");
  const pending = alive.filter((p) => state.votes[p.seat] === undefined);
  await Promise.all(
    pending.map(async (p) => {
      if (p.isAI) {
        state.votes[p.seat] = await aiVote(
          descriptionsStr,
          state.words[p.seat],
          aliveSeats,
          p.seat
        );
      } else {
        state.votes[p.seat] = randomOther(aliveSeats, p.seat);
      }
    })
  );
}

function tallyAndEliminate(state: RoomState): Elimination {
  const counts = new Map<number, number>();
  for (const to of Object.values(state.votes)) {
    counts.set(to, (counts.get(to) ?? 0) + 1);
  }
  let seat = -1;
  let max = -1;
  for (const [s, c] of [...counts.entries()].sort((a, b) => a[0] - b[0])) {
    if (c > max) {
      max = c;
      seat = s;
    }
  }
  const p = state.players.find((p) => p.seat === seat)!;
  p.alive = false;
  return { seat, name: p.name, isSpy: state.roles[seat] === "卧底" };
}

function computeWinner(
  state: RoomState,
  eliminated: Elimination
): Role | null {
  if (eliminated.isSpy) return "平民";
  const remaining = state.players.filter((p) => p.alive).length;
  if (remaining <= 2) return "卧底";
  return null;
}

async function judgeVerdict(
  state: RoomState,
  eliminated: Elimination,
  winner: Role | null
): Promise<string> {
  try {
    return await judge(
      eliminated.name,
      eliminated.isSpy ? "是" : "否",
      winner ?? "继续"
    );
  } catch {
    return "";
  }
}

// ---------- 积分记账 ----------

async function recordGameResults(state: RoomState, winner: Role): Promise<void> {
  const humans = state.players.filter((p) => !p.isAI && isAddress(p.name));

  // 1. 记录战绩（并行）
  await Promise.all(
    humans.map(async (p) => {
      const role = state.roles[p.seat];
      const won = role === winner;
      const referralBonus = await settleReferral(p.name);
      await recordGameResult(p.name, {
        role,
        won,
        points: computePoints(won, role) + referralBonus,
        civilianWord: state.civilianWord,
        spyWord: state.spyWord,
        round: state.round,
        at: Date.now(),
      });
    })
  );

  // 2. 结算荣誉（串行，避免 operator nonce 冲突；失败不阻断）
  for (const p of humans) {
    try {
      const { stats } = await getMyStats(p.name);
      await settleHonors(p.name, {
        games: stats.games,
        wins: stats.wins,
        points: stats.points,
        spyWins: stats.spyWins,
      });
    } catch {
      /* 荣誉铸造失败不影响对局 */
    }
  }
}

// ---------- 个性化视图 ----------

export function publicView(state: RoomState, token: string) {
  const now = Date.now();

  if (state.status === "lobby") {
    const me = state.lobby.find((p) => p.token === token);
    return {
      id: state.id,
      game: state.game,
      status: state.status,
      config: state.config,
      now,
      me: me ? { name: me.name, isHost: me.isHost } : null,
      humans: state.lobby.map((p) => ({
        name: p.name,
        isHost: p.isHost,
        connected: now - p.lastSeenAt < SEEN_TTL_MS,
        isYou: p.token === token,
      })),
      humanSlots: state.config.total - state.config.aiFill,
      aiAtStart: state.config.aiFill,
    };
  }

  const reveal = state.phase === "reveal" || state.status === "ended";
  const me = state.players.find((p) => p.token === token);
  return {
    id: state.id,
    status: state.status,
    config: state.config,
    now,
    round: state.round,
    phase: state.phase,
    phaseEndsAt: state.phaseEndsAt,
    speakerSeat: currentSpeaker(state)?.seat ?? null,
    hint: state.hint,
    winner: state.winner,
    verdict: state.verdict,
    eliminated: state.eliminated,
    me: me
      ? {
          seat: me.seat,
          name: me.name,
          word: state.words[me.seat],
          isHost: me.seat === 0,
          alive: me.alive,
        }
      : null,
    seats: state.players.map((p) => ({
      seat: p.seat,
      name: p.name,
      isAI: p.isAI,
      alive: p.alive,
      connected: p.isAI || now - p.lastSeenAt < SEEN_TTL_MS,
      description: state.descriptions[p.seat],
      voted: state.votes[p.seat] !== undefined ? state.votes[p.seat] : undefined,
      role: reveal ? state.roles[p.seat] : undefined,
      word: reveal ? state.words[p.seat] : undefined,
    })),
    civilianWord: reveal ? state.civilianWord : undefined,
    spyWord: reveal ? state.spyWord : undefined,
  };
}
