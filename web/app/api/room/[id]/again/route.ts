import { NextResponse } from "next/server";
import { resetToLobby, publicView } from "@/lib/game";
import { mutateRoom } from "@/lib/room-io";
import { addLobbyId } from "@/lib/store";

export const dynamic = "force-dynamic";

// 房主「再来一局」：回到大厅，保留原班真人
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

  const r = await mutateRoom(params.id, (state) => {
    if (state.hostToken !== token) return { error: "只有房主能再来一局" };
    if (state.status === "lobby") return { error: "对局未开始" };
    resetToLobby(state);
    return {};
  });
  if (!r) return NextResponse.json({ error: "房间忙，请重试" }, { status: 409 });
  if (r.result.error) {
    return NextResponse.json({ error: r.result.error }, { status: 400 });
  }
  if (r.state.status === "lobby") await addLobbyId(params.id);
  return NextResponse.json(publicView(r.state, token));
}
