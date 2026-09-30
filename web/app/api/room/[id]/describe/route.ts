import { NextResponse } from "next/server";
import { advance, publicView, currentSpeaker } from "@/lib/game";
import { mutateRoom } from "@/lib/room-io";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  let body: { token?: string; text?: string };
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
    if (state.phase !== "describe") return { error: "当前不是发言阶段" };
    if (currentSpeaker(state)?.seat !== me.seat) return { error: "还没轮到你发言" };
    const text = (body.text || "").trim().slice(0, 40);
    if (!text) return { error: "描述不能为空" };
    if (state.descriptions[me.seat]) return { error: "你已经发言了" };
    state.descriptions[me.seat] = text;
    state.said.push(text);
    await advance(state);
    return {};
  });
  if (!r) return NextResponse.json({ error: "房间忙，请重试" }, { status: 409 });
  if (r.result.error) {
    return NextResponse.json({ error: r.result.error }, { status: 400 });
  }
  return NextResponse.json(publicView(r.state, token));
}
