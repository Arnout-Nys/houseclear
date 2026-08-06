import { NextResponse } from "next/server";
import { isSessionValid } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(_: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isSessionValid())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const { data, error } = await getSupabaseAdmin().from("items")
    .select("*, rooms(id,name,floor), votes(member_id,level,members(id,name))")
    .eq("id", id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isSessionValid())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const body = await req.json();
  const allowed = ["title","description","destination","assigned_member_id","status","room_id"];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) if (key in body) update[key] = body[key];
  const { data, error } = await getSupabaseAdmin().from("items").update(update).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
