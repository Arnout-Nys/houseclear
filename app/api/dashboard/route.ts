import { NextResponse } from "next/server";
import { isSessionValid } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  if (!(await isSessionValid())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const db = getSupabaseAdmin();

  const { data: items, error } = await db
    .from("items")
    .select(
      "id,destination,status,votes(level)"
    );

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  const all = items || [];

  const wantCount = (item: any) =>
    (item.votes || []).filter(
      (v: any) => v.level === "want"
    ).length;

  const stats = {
    total: all.length,

    undecided: all.filter(
      (x: any) =>
        !x.destination ||
        x.destination === "undecided"
    ).length,

    conflicts: all.filter(
      (x: any) =>
        wantCount(x) > 1
    ).length,

    unclaimed: all.filter(
      (x: any) =>
        wantCount(x) === 0
    ).length,

    allocated: all.filter(
      (x: any) =>
        x.destination === "family"
    ).length,

    sell: all.filter(
      (x: any) =>
        x.destination === "sell"
    ).length,

    donate: all.filter(
      (x: any) =>
        x.destination === "donate"
    ).length,

    clearance: all.filter(
      (x: any) =>
        x.destination === "clearance"
    ).length,

    removed: all.filter(
      (x: any) =>
        x.status === "removed"
    ).length
  };

  return NextResponse.json(stats);
}
