// 验证荣誉合约：generate_title + mint(地址, 完整荣誉数组JSON) 落链 + get 读回（关键风险）
// 用法：OPERATOR_PRIVATE_KEY=0x... IDENTITY_CONTRACT_ADDRESS=0x... node scripts/test-identity.mjs 0x玩家地址
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const RPC = process.env.GENLAYER_RPC || "https://studio.genlayer.com/api";
const ADDR =
  process.env.IDENTITY_CONTRACT_ADDRESS ||
  process.env.NEXT_PUBLIC_IDENTITY_CONTRACT_ADDRESS;
const PK = process.env.OPERATOR_PRIVATE_KEY;
const player = process.argv[2];

if (!PK) {
  console.error("请设置 OPERATOR_PRIVATE_KEY=0x...");
  process.exit(1);
}
if (!ADDR || ADDR === "0x0000000000000000000000000000000000000000") {
  console.error("请设置 IDENTITY_CONTRACT_ADDRESS=0x...（荣誉合约地址）");
  process.exit(1);
}
if (!player) {
  console.error("请传入玩家地址：node scripts/test-identity.mjs 0x玩家地址");
  process.exit(1);
}

const account = createAccount(PK.startsWith("0x") ? PK : `0x${PK}`);
const client = createClient({ chain: studionet, account, endpoint: RPC });

console.log("荣誉合约:", ADDR);
console.log("玩家地址:", player);
console.log("operator:", account.address, "\n");

// 1. 生成称号（simulateWriteContract，leader-only）
let title = "";
try {
  const t0 = Date.now();
  const raw = await client.simulateWriteContract({
    address: ADDR,
    functionName: "generate_title",
    args: ["8", "5", "160"],
    leaderOnly: true,
  });
  title = (typeof raw === "string" ? raw : String(raw?.data ?? "")).trim();
  console.log(`✅ 称号：${title}（${Date.now() - t0}ms）\n`);
} catch (e) {
  console.log(`❌ generate_title 失败：${e?.message || String(e)}`);
  process.exit(1);
}

// 2. 读当前荣誉数组
let honors = [];
try {
  const raw = await client.readContract({
    address: ADDR,
    functionName: "get",
    args: [player],
  });
  const s = typeof raw === "string" ? raw : String(raw ?? "");
  honors = s ? JSON.parse(s) : [];
} catch {
  honors = [];
}
const honor = {
  id: "rank",
  title,
  desc: "战绩称号",
  games: 8,
  wins: 5,
  points: 160,
  at: Date.now(),
};
const idx = honors.findIndex((h) => h.id === "rank");
if (idx >= 0) honors[idx] = honor;
else honors.push(honor);

// 3. mint 落链（确定性写整个数组）
console.log("→ mint 铸造中…");
try {
  const t0 = Date.now();
  const hash = await client.writeContract({
    address: ADDR,
    functionName: "mint",
    args: [player, JSON.stringify(honors)],
    value: 0n,
  });
  console.log("交易哈希:", hash);
  await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 240,
    interval: 2000,
  });
  console.log(`✅ mint 已确认（${Date.now() - t0}ms）\n`);
} catch (e) {
  console.log(`❌ mint 失败：${e?.message || String(e)}`);
  process.exit(1);
}

// 4. get 读回（验证持久化）
console.log("→ get 读回…");
try {
  const raw = await client.readContract({
    address: ADDR,
    functionName: "get",
    args: [player],
  });
  const s = typeof raw === "string" ? raw : JSON.stringify(raw);
  console.log("链上荣誉:", s);
  if (s.includes('"title"') && s.includes("[")) {
    console.log("\n✅ 持久化验证通过：荣誉数组已写入链上且可读回");
  } else {
    console.log("\n⚠️ 读回内容未包含荣誉数组，请检查 mint 是否真正落链");
  }
} catch (e) {
  console.log(`❌ get 失败：${e?.message || String(e)}`);
}
