import { NextResponse } from "next/server";
import { publicView } from "@/lib/game";
import { pollRoom } from "@/lib/room-io";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 轮询房间状态（按 token 返回个性化视图）
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const token = new URL(req.url).searchParams.get("token") || "";
  const state = await pollRoom(params.id, token);
  if (!state) {
    return NextResponse.json({ error: "房间不存在或已结束" }, { status: 404 });
  }
  return NextResponse.json(publicView(state, token));
}
