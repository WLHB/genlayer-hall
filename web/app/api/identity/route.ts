import { NextResponse } from "next/server";
import { readHonors, IDENTITY_MINT_MIN_GAMES } from "@/lib/identity";
import { getMyStats } from "@/lib/stats-store";

export const dynamic = "force-dynamic";

// 读取某地址的荣誉集合 + 铸造资格（直接读链上，保证与自动铸造成就一致）
export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address") || "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }

  const honors = await readHonors(address);
  const { stats } = await getMyStats(address);
  return NextResponse.json({
    honors,
    minted: honors.length > 0,
    eligible: stats.games >= IDENTITY_MINT_MIN_GAMES,
    minGames: IDENTITY_MINT_MIN_GAMES,
    stats,
  });
}
