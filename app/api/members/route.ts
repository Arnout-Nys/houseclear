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

  const { data, error } = await getSupabaseAdmin()
    .from("members")
    .select("id,name,is_decision_maker")
    .order("is_decision_maker", { ascending: false })
    .order("name");

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
