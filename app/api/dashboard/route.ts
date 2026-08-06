import { NextResponse } from "next/server";
import { isSessionValid } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  if (!(await isSessionValid())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin();
  const { data: items, error } = await db.from("items").select("id,destination,status,votes(level)");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const all = items || [];
  const wantCounts = all.map((x: any) => (x.votes || []).filter((v: any) => v.level === "want").length);
  const stats = {
    total: all.length,
    undecided: all.filter((x: any) => x.destination === "undecided").length,
    conflicts: wantCounts.filter((n: number) => n > 1).length,
    unclaimed: wantCounts.filter((n: number) => n === 0).length,
    allocated: all.filter((x: any) => x.destination === "family").length,
    sell: all.filter((x: any) => x.destination === "sell").length,
    donate: all.filter((x: any) => x.destination === "donate").length,
    clearance: all.filter((x: any) => x.destination === "clearance").length,
    removed: all.filter((x: any) => x.status === "removed").length
  };
  return NextResponse.json(stats);
}
