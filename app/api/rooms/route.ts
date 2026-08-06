import { NextResponse } from "next/server";
import { isSessionValid } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  if (!(await isSessionValid())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("rooms").select("id,name,floor,sort_order,items(count)").order("sort_order");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const rooms = (data || []).map((r: any) => ({ ...r, item_count: r.items?.[0]?.count || 0, items: undefined }));
  return NextResponse.json(rooms);
}

export async function POST(req: Request) {
  if (!(await isSessionValid())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("rooms").insert({ name: body.name, floor: body.floor || null }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
