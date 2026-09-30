import { NextResponse } from "next/server";
import { startGame, publicView } from "@/lib/game";
import { mutateRoom } from "@/lib/room-io";
import { removeLobbyId } from "@/lib/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const token = body.token || "";

  const r = await mutateRoom(params.id, async (state) => {
    if (state.hostToken !== token) return { error: "只有房主能开始" };
    return startGame(state);
  });
  if (!r) return NextResponse.json({ error: "房间忙，请重试" }, { status: 409 });
  if (r.result.error) {
    return NextResponse.json({ error: r.result.error }, { status: 400 });
  }
  await removeLobbyId(params.id);
  return NextResponse.json(publicView(r.state, token));
}
