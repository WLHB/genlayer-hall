import { NextResponse } from "next/server";
import { joinRoom } from "@/lib/game";
import { mutateRoom } from "@/lib/room-io";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  let body: { name?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const r = await mutateRoom(params.id, (state) => joinRoom(state, body.name || ""));
  if (!r) return NextResponse.json({ error: "房间忙，请重试" }, { status: 409 });
  if ("error" in r.result) {
    return NextResponse.json({ error: r.result.error }, { status: 409 });
  }
  return NextResponse.json({
    roomId: params.id,
    token: r.result.token,
    name: r.result.name,
  });
}
