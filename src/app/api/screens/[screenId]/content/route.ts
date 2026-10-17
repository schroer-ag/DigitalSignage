import { NextResponse } from "next/server";
import { getDisplayContent } from "@/lib/display-content";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ screenId: string }> }
) {
  const { screenId } = await params;
  const content = await getDisplayContent(screenId, { heartbeat: true });

  if (!content) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(content, { headers: { "Cache-Control": "no-store" } });
}
