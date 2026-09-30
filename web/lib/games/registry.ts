export type GameStatus = "live" | "soon";

export interface GameDef {
  id: string;
  title: string;
  tagline: string;
  emoji: string;
  status: GameStatus;
  desc: string;
}

/** 游戏注册表：平台上有哪些游戏。加新游戏 = 这里加一条 + 补状态机 + 专属 UI。 */
export const GAMES: GameDef[] = [
  {
    id: "undercover",
    title: "AI 卧底局",
    emoji: "🃏",
    status: "live",
    tagline: "crypto 版「谁是卧底」",
    desc: "链上 AI 发牌 · 当裁判，钱包即身份，揪出藏在你中间的卧底。",
  },
  {
    id: "blackstories",
    title: "海龟汤",
    emoji: "🕵️",
    status: "soon",
    tagline: "情境推理 · 链上出题",
    desc: "AI 生成谜题结局，轮流提问抽丝剥茧，真相由链上生成、无法预设。",
  },
  {
    id: "quiz",
    title: "答题王",
    emoji: "🏆",
    status: "soon",
    tagline: "crypto 快问快答",
    desc: "链上 AI 出题，抢答比正确率与手速，排行榜见真章。",
  },
  {
    id: "werewolf",
    title: "狼人杀",
    emoji: "🐺",
    status: "soon",
    tagline: "社交推理完全体",
    desc: "昼夜交替、技能与遗言，AI 补位 + 链上法官主持全场。",
  },
];

export function getGame(id: string): GameDef | undefined {
  return GAMES.find((g) => g.id === id);
}
