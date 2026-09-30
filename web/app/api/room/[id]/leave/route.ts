import { NextResponse } from "next/server";
import { leaveRoom } from "@/lib/game";
import { mutateRoom } from "@/lib/room-io";

export const dynamic = "force-dynamic";

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

  const r = await mutateRoom(params.id, (state) => {
    leaveRoom(state, body.token || "");
    return {};
  });
  if (!r) return NextResponse.json({ error: "房间忙，请重试" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
