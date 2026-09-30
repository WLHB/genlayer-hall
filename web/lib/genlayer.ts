import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { CalldataAddress } from "genlayer-js/types";

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://studio.genlayer.com/api";
// 注意：GenLayer Studio 对合约地址大小写敏感，必须用 EIP-55 checksum 格式，
// 不能 toLowerCase()，否则 gen_call 会报「Contract not found」。
export const GAME_CONTRACT_ADDRESS = (process.env
  .NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || "") as `0x${string}`;

export const IDENTITY_CONTRACT_ADDRESS = (process.env
  .NEXT_PUBLIC_IDENTITY_CONTRACT_ADDRESS || "") as `0x${string}`;

export const CHAIN_ID = 61999;
export const CHAIN_ID_HEX = "0xf22f";
export const EXPLORER_URL = "https://genlayer-explorer.vercel.app";

// EIP-1193 最小类型（window.ethereum）
type EIP1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, cb: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, cb: (...args: unknown[]) => void) => void;
};

export function getProvider(): EIP1193Provider | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { ethereum?: EIP1193Provider }).ethereum;
}

export function isGameContractConfigured(): boolean {
  return (
    GAME_CONTRACT_ADDRESS.length > 0 &&
    GAME_CONTRACT_ADDRESS !== "0x0000000000000000000000000000000000000000"
  );
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * genlayer-js 里 address 类型参数必须用 CalldataAddress 对象传，
 * 直接传字符串会被编码成 string 类型导致合约报「invalid parameters」。
 */
export function toCalldataAddress(address: string): CalldataAddress {
  return new CalldataAddress(hexToBytes(address));
}

/** 连接钱包，返回当前账户地址 */
export async function connectWallet(): Promise<`0x${string}`> {
  const provider = getProvider();
  if (!provider) {
    throw new Error("No wallet detected. Please install Rabby or MetaMask.");
  }
  const accounts = (await provider.request({
    method: "eth_requestAccounts",
  })) as string[];
  if (!accounts || accounts.length === 0) {
    throw new Error("Wallet access was denied.");
  }
  return accounts[0] as `0x${string}`;
}

/** 确保钱包切换到 Studionet 网络 */
export async function ensureStudionet(): Promise<void> {
  const provider = getProvider();
  if (!provider) throw new Error("No wallet detected.");
  const chainId = (await provider.request({ method: "eth_chainId" })) as string;
  if (chainId.toLowerCase() !== CHAIN_ID_HEX) {
    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CHAIN_ID_HEX }],
      });
    } catch {
      await provider.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: CHAIN_ID_HEX,
            chainName: "Genlayer Studio Network",
            nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
            rpcUrls: [RPC_URL],
            blockExplorerUrls: ["https://genlayer-explorer.vercel.app"],
          },
        ],
      });
    }
  }
}

/** 浏览器端客户端：传字符串地址，签名由 window.ethereum 完成 */
export function getClient(address?: `0x${string}`) {
  return createClient({
    chain: studionet,
    account: address,
    endpoint: RPC_URL,
  });
}

/** 服务端只读客户端（无需账户） */
export function getReadClient() {
  return createClient({
    chain: studionet,
    endpoint: RPC_URL,
  });
}

export { studionet };
