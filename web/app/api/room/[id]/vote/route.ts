import { NextResponse } from "next/server";
import { advance, publicView } from "@/lib/game";
import { mutateRoom } from "@/lib/room-io";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  let body: { token?: string; target?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const token = body.token || "";

  const r = await mutateRoom(params.id, async (state) => {
    if (state.status !== "playing") return { error: "对局未开始" };
    const me = state.players.find((p) => p.token === token && !p.isAI);
    if (!me) return { error: "不是本局玩家" };
    if (!me.alive) return { error: "你已出局" };
    if (state.phase !== "vote") return { error: "当前不是投票阶段" };
    if (state.votes[me.seat] !== undefined) return { error: "你已经投票了" };
    const target = Number(body.target);
    const targetPlayer = state.players.find((p) => p.seat === target);
    if (!targetPlayer || !targetPlayer.alive || target === me.seat) {
      return { error: "投票目标不合法" };
    }
    state.votes[me.seat] = target;
    await advance(state);
    return {};
  });
  if (!r) return NextResponse.json({ error: "房间忙，请重试" }, { status: 409 });
  if (r.result.error) {
    return NextResponse.json({ error: r.result.error }, { status: 400 });
  }
  return NextResponse.json(publicView(r.state, token));
}
