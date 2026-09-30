// 验证卧底局合约四方法能否跑通 exec_prompt 并返回真实 AI 文本 / 可解析 JSON（关键风险）
// 用法：node scripts/test-game-simulate.mjs 0x合约地址
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const RPC = process.env.GENLAYER_RPC || "https://studio.genlayer.com/api";
const ADDR = process.argv[2] || process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS;

if (!ADDR || ADDR === "0x0000000000000000000000000000000000000000") {
  console.error("请提供合约地址：node scripts/test-game-simulate.mjs 0x...");
  process.exit(1);
}

const client = createClient({ chain: studionet, endpoint: RPC });

function parseJson(raw) {
  const s = String(raw).replace(/```json/g, "").replace(/```/g, "").trim();
  const m = s.match(/\{[\s\S]*\}/);
  return m ? JSON.parse(m[0]) : null;
}

async function call(name, args) {
  const t0 = Date.now();
  try {
    const raw = await client.simulateWriteContract({
      address: ADDR,
      functionName: name,
      args,
      leaderOnly: true,
    });
    const ms = Date.now() - t0;
    console.log(`✅ ${name}（${ms}ms）：`);
    console.log("----");
    console.log(typeof raw === "string" ? raw : JSON.stringify(raw, null, 2));
    console.log("----");
    return raw;
  } catch (e) {
    const ms = Date.now() - t0;
    console.log(`❌ ${name}（${ms}ms）：`);
    console.log(e?.message || String(e));
    console.log("----");
    return null;
  }
}

console.log("合约:", ADDR, "\n");

const wordsRaw = await call("new_round", [""]);
await call("npc_describe", ["比特币", "", "它主要用来做什么"]);
await call("npc_vote", [
  "0: 一种很值钱的东西\n1: 一种加密货币",
  "比特币",
]);
await call("judge", ["庄家", "否", "继续"]);

const words = wordsRaw ? parseJson(wordsRaw) : null;
if (words && words.civilian_word && words.spy_word) {
  console.log(
    `\n✅ 发词成功：平民词「${words.civilian_word}」 卧底词「${words.spy_word}」 提示「${words.hint}」`
  );
} else {
  console.log("\n⚠️ new_round 未解析出合法词对");
}
