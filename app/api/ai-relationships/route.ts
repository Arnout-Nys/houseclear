import { NextResponse } from "next/server";
import { isSessionValid } from "@/lib/session";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

const MODEL = "gpt-5.6-luna";

export async function GET() {
  if (!(await isSessionValid())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = getSupabaseAdmin();
  const { data, error } = await db.from("ai_relationship_suggestions")
    .select("*, item_a:items!ai_relationship_suggestions_item_a_id_fkey(id,title,photo_url,item_photos(id,url,sort_order)), item_b:items!ai_relationship_suggestions_item_b_id_fkey(id,title,photo_url,item_photos(id,url,sort_order))")
    .eq("status", "suggested")
    .order("confidence", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST() {
  if (!(await isSessionValid())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "OPENAI_API_KEY is not configured" }, { status: 500 });

  const db = getSupabaseAdmin();
  const { data: items, error } = await db.from("items")
    .select("id,title,description,ai_category,photo_url,item_photos(id,url,sort_order)")
    .order("created_at", { ascending: false })
    .limit(24);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const candidates = (items || []).map((item: any) => {
    const photos = (item.item_photos || []).slice().sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
    return { ...item, image: photos[0]?.url || item.photo_url };
  }).filter((item: any) => item.image);

  if (candidates.length < 2) return NextResponse.json({ suggestions: [], analysed: candidates.length });

  const content: any[] = [{
    type: "input_text",
    text: `Je vergelijkt foto's uit dezelfde woninginventaris. Zoek ALLEEN plausibele relaties tussen verschillende items.

Twee mogelijke types:
- duplicate: waarschijnlijk exact hetzelfde fysieke voorwerp dat per ongeluk meermaals gefotografeerd/geregistreerd is.
- set: verschillende voorwerpen die waarschijnlijk bij dezelfde set, reeks, collectie of samenhorend geheel horen.

Wees conservatief. Geen suggestie bij zwakke gelijkenis. Geef confidence 0 tot 1. Gebruik voor item_a en item_b exact de labels I1, I2, ... die hieronder bij de foto's staan.

Geef ALLEEN geldige JSON:
{"suggestions":[{"item_a":"I1","item_b":"I2","type":"duplicate|set","confidence":0.0,"reason":"korte Nederlandse uitleg"}]}

Een set kan bv. serviesdelen, identieke stoelen uit dezelfde reeks, boekenreeks, glaswerk, decoratieset of gereedschapsset zijn. Een duplicate moet waarschijnlijk hetzelfde fysieke object zijn.`
  }];

  candidates.forEach((item: any, index: number) => {
    content.push({ type: "input_text", text: `I${index + 1}: ${item.title || "Naamloos"}${item.ai_category ? ` — ${item.ai_category}` : ""}` });
    content.push({ type: "input_image", image_url: item.image });
  });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, reasoning: { effort: "none" }, input: [{ role: "user", content }] })
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("AI relationship error:", text);
    return NextResponse.json({ error: "AI relationship scan failed" }, { status: 500 });
  }

  const result = await response.json();
  const outputText = result.output?.flatMap((x: any) => x.content || []).find((x: any) => x.type === "output_text")?.text;
  if (!outputText) return NextResponse.json({ error: "AI returned no relationship result" }, { status: 500 });

  let parsed: any;
  try { parsed = JSON.parse(outputText); } catch { return NextResponse.json({ error: "AI returned invalid relationship JSON" }, { status: 500 }); }

  const rows: any[] = [];
  for (const suggestion of parsed.suggestions || []) {
    const aIndex = Number(String(suggestion.item_a || "").replace("I", "")) - 1;
    const bIndex = Number(String(suggestion.item_b || "").replace("I", "")) - 1;
    if (!Number.isInteger(aIndex) || !Number.isInteger(bIndex) || aIndex === bIndex) continue;
    const a = candidates[aIndex]; const b = candidates[bIndex];
    if (!a || !b) continue;
    const type = suggestion.type === "duplicate" ? "duplicate" : suggestion.type === "set" ? "set" : null;
    if (!type) continue;
    const confidence = Math.max(0, Math.min(1, Number(suggestion.confidence) || 0));
    if (confidence < 0.65) continue;
    const [itemA, itemB] = [a.id, b.id].sort();
    rows.push({ item_a_id: itemA, item_b_id: itemB, relationship_type: type, confidence, reason: String(suggestion.reason || "") });
  }

  if (rows.length) {
    const { error: upsertError } = await db.from("ai_relationship_suggestions")
      .upsert(rows, { onConflict: "item_a_id,item_b_id,relationship_type" });
    if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ suggestions: rows, analysed: candidates.length });
}
