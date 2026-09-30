import { NextResponse } from "next/server";
import { getMyStats } from "@/lib/stats-store";
import {
  mintHonor,
  generateTitle,
  Honor,
  IDENTITY_MINT_MIN_GAMES,
} from "@/lib/identity";
import { setState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 铸造/升级「战绩称号」荣誉（服务端 operator 代写）
export async function POST(req: Request) {
  let body: { address?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const address = (body.address || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }

  const { stats } = await getMyStats(address);
  if (stats.games < IDENTITY_MINT_MIN_GAMES) {
    return NextResponse.json(
      { error: `玩满 ${IDENTITY_MINT_MIN_GAMES} 局才能铸造荣誉` },
      { status: 409 }
    );
  }

  try {
    const title = await generateTitle({
      games: stats.games,
      wins: stats.wins,
      points: stats.points,
    });
    const honor: Honor = {
      id: "rank",
      title,
      desc: "战绩称号",
      games: stats.games,
      wins: stats.wins,
      points: stats.points,
      at: Date.now(),
    };
    const { honors } = await mintHonor(address, honor);
    await setState(`honors:${address.toLowerCase()}`, honors, 60 * 60 * 24);
    return NextResponse.json({ honors });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "铸造失败" },
      { status: 502 }
    );
  }
}
