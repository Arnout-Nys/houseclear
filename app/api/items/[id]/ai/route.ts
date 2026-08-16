import { NextResponse } from "next/server";
import { isSessionValid } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { analyseHouseClearImage } from "@/lib/ai-item-analysis";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await isSessionValid())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const overwriteText = Boolean(body.overwrite_text);
    const db = getSupabaseAdmin();

    const { data: item, error: itemError } = await db.from("items")
      .select("id,title,description,photo_url,item_photos(id,url,sort_order)")
      .eq("id", id)
      .single();

    if (itemError || !item) return NextResponse.json({ error: itemError?.message || "Item not found" }, { status: 404 });

    const photos = (item.item_photos || []).slice().sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    const imageUrl = photos[0]?.url || item.photo_url;
    if (!imageUrl) return NextResponse.json({ error: "Item has no photo" }, { status: 400 });

    const ai = await analyseHouseClearImage(imageUrl);
    const update: Record<string, any> = {
      ai_category: ai.category,
      ai_material: ai.material,
      ai_condition: ai.condition,
      ai_value_min: ai.value_min,
      ai_value_max: ai.value_max,
      ai_value_currency: ai.currency,
      ai_sale_potential: ai.sale_potential,
      ai_specialist_review: ai.specialist_review,
      ai_confidence: ai.confidence,
      ai_recommended_action: ai.recommended_action,
      ai_recommendation_reason: ai.recommendation_reason,
      ai_alternative_action: ai.alternative_action,
      ai_set_hint: ai.set_hint,
      ai_model: ai.model,
      ai_analysis_updated_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (overwriteText || !item.title || item.title.toLowerCase().startsWith("untitled") || item.title === "Naamloos voorwerp") {
      update.title = ai.title;
    }
    if (overwriteText || !item.description) update.description = ai.description;

    const { data, error } = await db.from("items").update(update).eq("id", id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ item: data, analysis: ai });
  } catch (error: any) {
    console.error("Item AI analysis error:", error);
    return NextResponse.json({ error: error?.message || "AI analysis failed" }, { status: 500 });
  }
}
