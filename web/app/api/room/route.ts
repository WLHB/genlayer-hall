import { NextResponse } from "next/server";
import { createRoom, validConfig } from "@/lib/game";
import { loadRoom, saveRoom } from "@/lib/room-io";
import { addLobbyId } from "@/lib/store";

export const dynamic = "force-dynamic";

// 创建房间
export async function POST(req: Request) {
  let body: { total?: number; aiFill?: number; name?: string; game?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const total = body.total ?? 6;
  const aiFill = body.aiFill ?? 3;
  const game = body.game || "undercover";
  if (!validConfig(total, aiFill)) {
    return NextResponse.json({ error: "人数配置不合法（4-8 人，AI 数 < 总人数）" }, { status: 400 });
  }

  let state = createRoom(total, aiFill, body.name || "", game);
  for (let i = 0; i < 10; i++) {
    if (!(await loadRoom(state.id))) break;
    state = createRoom(total, aiFill, body.name || "", game);
  }
  await saveRoom(state.id, state);
  await addLobbyId(state.id);

  return NextResponse.json({
    roomId: state.id,
    token: state.lobby[0].token,
    name: state.lobby[0].name,
  });
}
