import { NextResponse } from "next/server";
import { getMyStats } from "@/lib/stats-store";

export const dynamic = "force-dynamic";

// 我的战绩 + 近期记录（按钱包地址）
export async function GET(req: Request) {
  const address = new URL(req.url).searchParams.get("address") || "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }
  const data = await getMyStats(address);
  return NextResponse.json(data);
}
