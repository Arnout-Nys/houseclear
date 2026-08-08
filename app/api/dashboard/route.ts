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

  const [
    { data: items, error },
    {
      data: decisionMakers,
      error: memberError
    }
  ] = await Promise.all([
    db
      .from("items")
      .select(
        "id,destination,status,votes(member_id,level)"
      ),

    db
      .from("members")
      .select("id")
      .eq("is_decision_maker", true)
  ]);

  if (error || memberError) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          memberError?.message
      },
      { status: 500 }
    );
  }

  const all = items || [];

  const decisionIds = new Set(
    (decisionMakers || []).map(
      (member: any) => member.id
    )
  );

  const decisionTotal =
    decisionIds.size;

  const wantCount = (item: any) =>
    (item.votes || []).filter(
      (vote: any) =>
        vote.level === "want"
    ).length;

  const decisionVoteCount = (
    item: any
  ) =>
    new Set(
      (item.votes || [])
        .filter(
          (vote: any) =>
            decisionIds.has(
              vote.member_id
            )
        )
        .map(
          (vote: any) =>
            vote.member_id
        )
    ).size;

  const unresolved = (item: any) =>
    !item.destination ||
    item.destination === "undecided";

  const stats = {
    total: all.length,

    needs_review: all.filter(
      (item: any) =>
        unresolved(item) &&
        decisionVoteCount(item) <
          decisionTotal
    ).length,

    ready: all.filter(
      (item: any) =>
        unresolved(item) &&
        decisionTotal > 0 &&
        decisionVoteCount(item) ===
          decisionTotal
    ).length,

    conflicts: all.filter(
      (item: any) =>
        wantCount(item) > 1
    ).length,

    unclaimed: all.filter(
      (item: any) =>
        wantCount(item) === 0
    ).length,

    allocated: all.filter(
      (item: any) =>
        item.destination === "family"
    ).length,

    sell: all.filter(
      (item: any) =>
        item.destination === "sell"
    ).length,

    clearance: all.filter(
      (item: any) =>
        item.destination ===
          "clearance"
    ).length,

    removed: all.filter(
      (item: any) =>
        item.status === "removed"
    ).length
  };

  return NextResponse.json(stats);
}
