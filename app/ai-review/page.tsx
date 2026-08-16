"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Nav } from "@/components/Nav";
import { GlobalMenu } from "@/components/GlobalMenu";
import type { Item } from "@/lib/types";

const actionLabels: Record<string, string> = {
  expert_review: "🔎 Eerst expert laten kijken",
  auction: "🏛️ Veilinghuis",
  specialist_dealer: "🪑 Brocante / antiek specialist",
  direct_buyer: "💶 Opkoper",
  online_sale: "🌐 Zelf online verkopen",
  sell_as_lot: "📦 Verkopen als set / lot",
  donate: "🎁 Schenken / kringwinkel",
  clearance: "🚚 Opruimer",
  recycle: "♻️ Recyclage"
};

type AiItem = Item & {
  ai_category?: string | null;
  ai_material?: string | null;
  ai_condition?: string | null;
  ai_value_min?: number | null;
  ai_value_max?: number | null;
  ai_value_currency?: string | null;
  ai_sale_potential?: string | null;
  ai_specialist_review?: boolean | null;
  ai_confidence?: number | null;
  ai_recommended_action?: string | null;
  ai_recommendation_reason?: string | null;
  ai_alternative_action?: string | null;
  ai_set_hint?: string | null;
  ai_analysis_updated_at?: string | null;
  photo_url?: string | null;
  item_photos?: Array<{ id: string; url: string; sort_order?: number }>;
};

export default function AiReviewPage() {
  const [items, setItems] = useState<AiItem[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setItems(await api<AiItem[]>("/api/items"));
  }

  useEffect(() => { load().catch(() => {}); }, []);

  const missing = useMemo(
    () => items.filter((item) => !item.ai_analysis_updated_at && (item.photo_url || item.item_photos?.length)),
    [items]
  );

  const reviewed = useMemo(
    () => items.filter((item) => item.ai_analysis_updated_at),
    [items]
  );

  const attention = useMemo(
    () => reviewed.filter((item) => item.ai_specialist_review || item.ai_recommended_action === "expert_review" || item.ai_recommended_action === "auction"),
    [reviewed]
  );

  async function analyseItems(candidates: AiItem[]) {
    if (running || !candidates.length) return;
    setRunning(true);
    setError(null);
    setProgress({ done: 0, total: candidates.length });

    let done = 0;
    for (const item of candidates) {
      try {
        await api(`/api/items/${item.id}/ai`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ overwrite_text: false })
        });
      } catch (e: any) {
        setError(e?.message || "Een AI-analyse is mislukt.");
      }
      done += 1;
      setProgress({ done, total: candidates.length });
    }

    await load();
    setRunning(false);
  }

  return (
    <main className="shell stack">
      <header className="sticky-head">
        <div className="topbar" style={{ marginBottom: 0 }}>
          <div>
            <Link className="subtle" href="/">← Overzicht</Link>
            <h1 className="title" style={{ marginTop: 3 }}>✨ AI Review</h1>
            <div className="subtle">Advies voor items die niemand uit de familie kiest</div>
          </div>
          <GlobalMenu />
        </div>
      </header>

      <section className="card stack">
        <strong>AI Decision Support</strong>
        <div className="subtle">
          AI geeft een brede waarde-indicatie en adviseert een verkoop- of afvoerroute. Dit is geen taxatie en verandert nooit automatisch de familiebeslissing.
        </div>
        <div className="badges">
          <span className="badge">✨ {reviewed.length} geanalyseerd</span>
          <span className="badge">⏳ {missing.length} nog te analyseren</span>
          <span className="badge conflict">🔎 {attention.length} extra aandacht</span>
        </div>

        {missing.length ? (
          <button className="btn primary" disabled={running} onClick={() => analyseItems(missing)}>
            {running ? `Analyseren… ${progress.done}/${progress.total}` : `Analyseer ${missing.length} bestaande items`}
          </button>
        ) : null}
        {error ? <div className="badge conflict">⚠️ {error}</div> : null}
      </section>

      {attention.length ? (
        <section className="stack">
          <h2 className="section-title">Eerst bekijken</h2>
          {attention.map((item) => <AiCard key={item.id} item={item} />)}
        </section>
      ) : null}

      <section className="stack">
        <h2 className="section-title">Alle AI-adviezen</h2>
        {reviewed.length ? reviewed.map((item) => <AiCard key={item.id} item={item} />) : (
          <div className="card empty">Nog geen uitgebreide AI-analyses.</div>
        )}
      </section>

      <Nav />
    </main>
  );
}

function AiCard({ item }: { item: AiItem }) {
  const photo = item.item_photos?.[0]?.url || item.photo_url;
  const value = item.ai_value_min != null || item.ai_value_max != null
    ? `€${item.ai_value_min ?? "?"}–€${item.ai_value_max ?? "?"}`
    : "Waarde onzeker";
  const confidence = item.ai_confidence != null ? Math.round(Number(item.ai_confidence) * 100) : null;

  return (
    <article className="card stack">
      <Link href={`/item/${item.id}`} style={{ display: "grid", gridTemplateColumns: "92px 1fr", gap: 12, alignItems: "center" }}>
        {photo ? <img src={photo} alt={item.title} style={{ width: 92, height: 92, objectFit: "contain", borderRadius: 12, background: "#eef0ed" }} /> : <div />}
        <div>
          <strong>{item.title}</strong>
          <div className="subtle" style={{ marginTop: 4 }}>{item.ai_category || "Onbekende categorie"}{item.ai_material ? ` · ${item.ai_material}` : ""}</div>
          <div className="badges" style={{ marginTop: 8 }}>
            <span className="badge">{value}</span>
            {confidence != null ? <span className="badge">AI {confidence}%</span> : null}
            {item.ai_specialist_review ? <span className="badge conflict">🔎 Specialist</span> : null}
          </div>
        </div>
      </Link>

      <div className={item.ai_specialist_review ? "decision-banner warning" : "decision-banner"}>
        <strong>{actionLabels[item.ai_recommended_action || ""] || "✨ Menselijke beoordeling"}</strong>
        <span>{item.ai_recommendation_reason || "Geen motivering beschikbaar."}</span>
      </div>

      {item.ai_set_hint ? <div className="subtle"><strong>🔗 Mogelijke set:</strong> {item.ai_set_hint}</div> : null}
      {item.ai_alternative_action ? <div className="subtle"><strong>Alternatief:</strong> {item.ai_alternative_action}</div> : null}
      <div className="subtle">Aanbeveling geldt alleen als geen familielid het item kiest.</div>
    </article>
  );
}
