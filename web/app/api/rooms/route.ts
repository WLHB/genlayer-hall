import { NextResponse } from "next/server";
import { listOpenRooms } from "@/lib/room-io";

export const dynamic = "force-dynamic";

// 公开房间列表：当前正在等人加入的房间
export async function GET() {
  const rooms = await listOpenRooms();
  return NextResponse.json({ rooms });
}
