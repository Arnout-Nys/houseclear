import { NextResponse } from "next/server";
import { isSessionValid } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: Request) {
  if (!(await isSessionValid())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const roomId = new URL(req.url).searchParams.get("room_id");
  const db = getSupabaseAdmin();
  let q = db.from("items").select("*, rooms(id,name,floor), votes(member_id,level,members(id,name)), item_photos(id,url,sort_order)").order("created_at", { ascending: false });
  if (roomId) q = q.eq("room_id", roomId);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  if (!(await isSessionValid())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const db=getSupabaseAdmin();
  const { data, error } = await db.from("items").insert({
    room_id: body.room_id,
    title: body.title || "Untitled item",
    description: body.description || null,
    photo_url: body.photo_url || null
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if(body.photo_url) await db.from("item_photos").insert({item_id:data.id,url:body.photo_url,sort_order:0});
  return NextResponse.json(data);
}
