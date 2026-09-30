// 非部署校验：调用 Studionet 的 gen_getContractSchemaForCode RPC，
// 验证合约代码合法性（runner 哈希 + API + schema），不产生任何链上交易。
import { readFileSync } from "node:fs";

const RPC = process.env.GENLAYER_RPC || "https://studio.genlayer.com/api";
const CONTRACT = process.argv[2] || "contracts/explainer.py";

const code = readFileSync(CONTRACT, "utf8");
const codeHex = "0x" + Buffer.from(code, "utf8").toString("hex");

const res = await fetch(RPC, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "gen_getContractSchemaForCode",
    params: [codeHex],
  }),
});

const text = await res.text();
console.log("HTTP", res.status);
try {
  const json = JSON.parse(text);
  if (json.error) {
    console.error("❌ 合约校验失败：");
    console.error(JSON.stringify(json.error, null, 2));
    process.exit(1);
  }
  console.log("✅ 合约校验通过，schema：");
  console.log(JSON.stringify(json.result, null, 2));
} catch {
  console.log(text);
}
