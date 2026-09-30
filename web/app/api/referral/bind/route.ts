import { NextResponse } from "next/server";
import { bindReferral } from "@/lib/stats-store";

export const dynamic = "force-dynamic";

// 绑定邀请关系：address 是被邀请人，ref 是邀请人（钱包即邀请码）
export async function POST(req: Request) {
  let body: { address?: string; ref?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const address = (body.address || "").trim();
  const ref = (body.ref || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(address) || !/^0x[a-fA-F0-9]{40}$/.test(ref)) {
    return NextResponse.json({ error: "invalid address" }, { status: 400 });
  }
  if (address.toLowerCase() === ref.toLowerCase()) {
    return NextResponse.json({ error: "不能邀请自己" }, { status: 400 });
  }

  await bindReferral(address, ref);
  return NextResponse.json({ ok: true });
}
