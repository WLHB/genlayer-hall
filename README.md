# 链上桌游厅 · AI 卧底局

crypto 版「谁是卧底」+ 多游戏平台骨架。链上 AI 当裁判（GenLayer 智能合约），钱包即身份，免 gas 开局。

**当前内容**：
- 🃏 **AI 卧底局**（live）—— 真人组局 + AI 候补，链上 AI 发牌 / 发言 / 投票 / 裁决
- 🎖 **链上身份 NFT**（灵魂绑定 SBT）—— 玩满 5 局铸造专属 AI 称号，永久上链、可验证
- 🔗 **邀请裂变** —— 钱包即邀请码，好友首局双方加分
- 🕵️ 海龟汤 / 🏆 答题王 / 🐺 狼人杀（开发中占位，游戏大厅已铺好）

---

## 目录结构

```
.
├── contracts/
│   ├── undercover.py              # 卧底局合约（new_round / npc_describe / npc_vote / judge）
│   └── identity.py                # 链上身份合约（generate_title / mint / get）
├── scripts/validate_contract.mjs  # 合约 schema 校验
└── web/                           # Next.js 全栈
    ├── app/api/room/              # 建/加入/开始/发言/投票/离开/再来一局
    ├── app/api/rooms/             # 公开房间列表（等人加入）
    ├── app/api/stats/             # 排行榜 / 我的战绩
    ├── app/api/identity/          # 铸造 / 读取链上身份
    ├── app/api/referral/bind/     # 绑定邀请关系
    ├── components/game/           # 大厅 / 对局 / 身份卡 / 排行榜等
    ├── hooks/                     # useRoom / useWallet / useIdentity
    ├── lib/
    │   ├── game.ts                # 卧底局房间状态机（惰性推进）
    │   ├── games/registry.ts      # 游戏注册表（多游戏入口）
    │   ├── undercover.ts          # 卧底局合约调用（simulate）
    │   ├── identity.ts            # 身份合约调用（simulate + writeContract）
    │   ├── stats-store.ts         # 积分 / 排行榜 / 历史 / 邀请奖励
    │   ├── store.ts               # KV 抽象（Redis / dev 内存）
    │   └── room-io.ts             # 房间读改写 + 锁
    └── scripts/
        ├── deploy.mjs             # 部署卧底局合约
        ├── deploy-identity.mjs    # 部署身份合约
        ├── test-game-simulate.mjs # 卧底局合约冒烟测试
        └── test-identity.mjs      # 身份合约落链测试
```

---

## 一、部署合约

两个合约都部署在 **Studionet**（免 gas）。需要你有任意一个有钱包私钥（部署用）。

### 1. 卧底局合约

```bash
cd web
PRIVATE_KEY=0x你的私钥 node scripts/deploy.mjs
```

拿到地址后填入 `.env` 的 `NEXT_PUBLIC_GAME_CONTRACT_ADDRESS`。

### 2. 身份合约

```bash
cd web
PRIVATE_KEY=0x你的私钥 node scripts/deploy-identity.mjs
```

拿到地址后填入 `.env` 的 `NEXT_PUBLIC_IDENTITY_CONTRACT_ADDRESS`。

> 部署用的私钥和 operator 私钥**可以是同一个，也可以分开**。建议 operator 用一个独立的、余额很少的专用钱包（风险隔离）。

---

## 二、环境变量（`web/.env`）

从 `.env.example` 复制，然后填：

| 变量 | 说明 | 是否公开 |
|---|---|---|
| `NEXT_PUBLIC_GAME_CONTRACT_ADDRESS` | 卧底局合约地址 | ✅ 公开 |
| `NEXT_PUBLIC_IDENTITY_CONTRACT_ADDRESS` | 身份合约地址 | ✅ 公开 |
| `OPERATOR_PRIVATE_KEY` | 服务端代写「铸造身份」用的 operator 私钥 | ❌ **服务端专用** |
| `NEXT_PUBLIC_RPC_URL` | GenLayer Studionet RPC | ✅ 公开 |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | 生产（Vercel serverless）房间/战绩存储；本地 dev 可留空 | ❌ 服务端 |

⚠️ **安全红线**：
- `OPERATOR_PRIVATE_KEY` **绝对不能**加 `NEXT_PUBLIC_` 前缀——加了会被打进前端 bundle，等于把钱包送人。
- `.env` 已 gitignore，别提交；`.env.example` 只放占位符。
- 私钥别贴进聊天、别写进代码/文档。

---

## 三、运行

```bash
cd web
npm install
npm run dev        # http://localhost:3009
```

生产构建：`npm run build && npm run start`（固定 3009）。

本地 dev 无 Upstash 时，房间/战绩/邀请关系回退到**单进程内存**（`globalThis` 挂载，跨路由共享）。生产 Vercel serverless 必须配 Upstash Redis。

---

## 四、玩法 / 使用

### 卧底局
1. 首页「链上桌游厅」→ 点「AI 卧底局」→ 连接钱包（钱包地址即昵称）。
2. 创建房间（定总人数 + AI 候补数）或凭 6 位房号 / 公开房间列表加入。
3. 房主开局 → 每轮发言（60s）→ 投票（60s）→ 得票最多者出局 → 揭晓。
4. 投出卧底平民胜；卧底撑到只剩 2 人卧底胜。

### 链上身份（Soulbound NFT）
- 玩满 **5 局**后，结算页出现「🎖 铸造链上身份」。
- 点击后：链上 AI 生成专属中文称号（如「卧底猎手」「链上猎手」）→ 确定性写链 → 身份卡展示称号 + 战绩 + 「⚡ 链上已验证」。
- 可重复铸造**升级**（战绩增长后称号随之变化）。
- 排行榜「我的战绩」tab 也能查看 / 铸造。
- 身份不可转移（SBT），一地址一条记录，Explorer 可查。

### 邀请裂变
- 大厅点「🔗 邀请」复制你的邀请链接（`?ref=你的地址`）。
- 好友打开链接 + 连钱包 + 打完**第一局** → 你 +20 分、好友 +10 分（自动绑定，首邀归因）。

---

## 五、积分规则

| 行为 | 积分 |
|---|---|
| 参与一局 | +10 |
| 获胜 | +30 |
| 卧底获胜（更难） | 额外 +20 |
| 邀请好友（好友首局） | +20 |
| 被邀请（首局） | +10 |

---

## 六、测试（改合约后必做）

```bash
# 合约 schema 校验（头两行 + __init__ 等）
node scripts/validate_contract.mjs contracts/undercover.py
node scripts/validate_contract.mjs contracts/identity.py

# 卧底局合约冒烟测试（四方法 exec_prompt）
cd web && node scripts/test-game-simulate.mjs 0x卧底局合约地址

# 身份合约落链测试（generate_title → mint → get 读回）
cd web && OPERATOR_PRIVATE_KEY=0x... IDENTITY_CONTRACT_ADDRESS=0x... node scripts/test-identity.mjs 0x玩家地址

# 前端类型检查
cd web && npx tsc --noEmit
```

---

## 七、关键坑（踩过的，写新合约/方法前必读）

- **合约头两行**：`# v0.1.0` + `# { "Depends": "py-genlayer:<固定哈希>" }` 缺一不可；**必须有 `__init__`**（否则 schema 校验报 `__init__ is absent`）。
- **`exec_prompt` 必须包在 `gl.eq_principle.prompt_comparative` 内**。
- **两类 principle**：
  - 生成类（发词、描述、称号）：输出天生不确定，principle 约束**性质**（同主题/同难度/不泄底），不能要求逐字相等。
  - 判定类（投票、裁决）：principle 约束**事实等价**（同一个 index、同一胜负）。
- **票数统计在前端做确定性算术**，别让 LLM 数票。
- ⚠️ **`exec_prompt` 和写持久化状态不能放同一个 `writeContract`**：验证者各自生成不同结果 → 写进状态不一致 → 共识失败 `MAJORITY_DISAGREE`。正确做法是**拆两步**：`generate_xxx`（exec_prompt，走 `simulateWriteContract` leader-only）+ `mint`（纯确定性写，走 `writeContract`）。这是身份合约踩出来的坑。
- `simulateWriteContract({ leaderOnly: true })` 免签名秒回；需要**真正落链**时才用 `writeContract`（服务端 operator 私钥代写）。
- 合约地址必须 **EIP-55 checksum**（不能 toLowerCase，否则「Contract not found」）。
- `tsconfig` 需 `"target": "ES2020"`（viem/genlayer-js 用 BigInt）。
