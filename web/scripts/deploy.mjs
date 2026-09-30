// 用你自己的钱包部署合约（不依赖 CLI 的 keystore）
// 用法：cd web && PRIVATE_KEY=0x你的私钥 node scripts/deploy.mjs
import { readFileSync } from "node:fs";
import { createClient, createAccount } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) {
  console.error("请先设置私钥环境变量：PRIVATE_KEY=0x... node scripts/deploy.mjs");
  process.exit(1);
}

const code = readFileSync(
  new URL("../../contracts/undercover.py", import.meta.url),
  "utf8"
);

const account = createAccount(PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`);
const client = createClient({
  chain: studionet,
  account,
  endpoint: process.env.GENLAYER_RPC || "https://studio.genlayer.com/api",
});

console.log("部署账户:", account.address);
const hash = await client.deployContract({ code, args: [] });
console.log("交易哈希:", hash);

const receipt = await client.waitForTransactionReceipt({
  hash,
  status: TransactionStatus.ACCEPTED,
  retries: 240,
  interval: 2000,
});

const contractAddress = receipt.data?.contract_address;
if (!contractAddress) {
  console.error("部署失败，未拿到合约地址。receipt:", receipt);
  process.exit(1);
}

console.log("✅ 合约地址:", contractAddress);
console.log(
  `\n下一步：把该地址填入 web/.env 的 NEXT_PUBLIC_GAME_CONTRACT_ADDRESS，然后重新构建部署。`
);
