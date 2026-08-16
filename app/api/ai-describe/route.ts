import { NextResponse } from "next/server";
import { isSessionValid } from "@/lib/session";
import { analyseHouseClearImage } from "@/lib/ai-item-analysis";

export async function POST(req: Request) {
  if (!(await isSessionValid())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { image_url } = await req.json();
    if (!image_url) return NextResponse.json({ error: "Missing image_url" }, { status: 400 });
    const analysis = await analyseHouseClearImage(image_url);
    return NextResponse.json(analysis);
  } catch (error: any) {
    console.error("AI describe error:", error);
    return NextResponse.json({ error: error?.message || "AI analysis failed" }, { status: 500 });
  }
}
