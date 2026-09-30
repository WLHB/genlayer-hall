import { NextResponse } from "next/server";
import { getLeaderboard } from "@/lib/stats-store";

export const dynamic = "force-dynamic";

// 积分排行榜（按钱包地址积分降序）
export async function GET(req: Request) {
  const limit = Number(new URL(req.url).searchParams.get("limit") || 50);
  const lb = await getLeaderboard(Math.min(Math.max(limit, 1), 200));
  return NextResponse.json(lb);
}
