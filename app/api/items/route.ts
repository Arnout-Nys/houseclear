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
  const ai = body.ai || {};
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("items").insert({
    room_id: body.room_id,
    title: body.title || "Naamloos voorwerp",
    description: body.description || null,
    photo_url: body.photo_url || null,
    ai_category: ai.category || null,
    ai_material: ai.material || null,
    ai_condition: ai.condition || null,
    ai_value_min: ai.value_min ?? null,
    ai_value_max: ai.value_max ?? null,
    ai_value_currency: ai.currency || "EUR",
    ai_sale_potential: ai.sale_potential || null,
    ai_specialist_review: ai.specialist_review ?? false,
    ai_confidence: ai.confidence ?? null,
    ai_recommended_action: ai.recommended_action || null,
    ai_recommendation_reason: ai.recommendation_reason || null,
    ai_alternative_action: ai.alternative_action || null,
    ai_set_hint: ai.set_hint || null,
    ai_model: ai.model || null,
    ai_analysis_updated_at: ai.model ? new Date().toISOString() : null
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (body.photo_url) await db.from("item_photos").insert({ item_id: data.id, url: body.photo_url, sort_order: 0 });
  return NextResponse.json(data);
}
