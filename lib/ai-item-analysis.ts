export type AiItemAnalysis = {
  title: string;
  description: string | null;
  category: string;
  material: string | null;
  condition: "goed" | "redelijk" | "slecht" | "onbekend";
  value_min: number | null;
  value_max: number | null;
  currency: "EUR";
  sale_potential: "laag" | "middel" | "hoog";
  specialist_review: boolean;
  confidence: number;
  recommended_action:
    | "expert_review"
    | "auction"
    | "specialist_dealer"
    | "direct_buyer"
    | "online_sale"
    | "sell_as_lot"
    | "donate"
    | "clearance"
    | "recycle";
  recommendation_reason: string;
  alternative_action: string | null;
  set_hint: string | null;
  model: string;
};

const MODEL = "gpt-5.6-luna";

export async function analyseHouseClearImage(imageUrl: string): Promise<AiItemAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: MODEL,
      reasoning: { effort: "none" },
      input: [{
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Je bent de voorzichtige AI-inboedelassistent van HouseClear. Een familie maakt het huis van hun ouders leeg.

Analyseer het belangrijkste fysieke voorwerp op de foto. Schrijf ALLES in natuurlijk Nederlands (Belgisch/Vlaams waar passend), behalve zichtbare merknamen/eigennamen.

Geef ALLEEN geldige JSON terug met exact deze velden:
{
  "title": "korte duidelijke naam, 2-6 woorden",
  "description": "1-2 feitelijke zinnen",
  "category": "Nederlandse categorie",
  "material": "materiaal of null",
  "condition": "goed | redelijk | slecht | onbekend",
  "value_min": 0,
  "value_max": 0,
  "currency": "EUR",
  "sale_potential": "laag | middel | hoog",
  "specialist_review": false,
  "confidence": 0.0,
  "recommended_action": "expert_review | auction | specialist_dealer | direct_buyer | online_sale | sell_as_lot | donate | clearance | recycle",
  "recommendation_reason": "korte motivering in het Nederlands",
  "alternative_action": "alternatief in het Nederlands of null",
  "set_hint": "mogelijke set/collectie-relatie of null"
}

BELANGRIJKE BESLISREGELS:
- De verkoop/afvoer-aanbeveling geldt ALLEEN ALS GEEN FAMILIELID HET VOORWERP KIEST.
- Een foto is geen taxatie. Gebruik value_min/value_max alleen als brede ruwe marktindicatie. Zet beide op null als onvoldoende betrouwbaar.
- Verzin nooit merk, maker, kunstenaar, periode of herkomst. Zeg bij onzekerheid dat het mogelijk is.
- Zet specialist_review=true als het mogelijk antiek, design, kunst, zilver, juweel, bijzonder verzamelobject, gesigneerd/gemerkt stuk of anders potentieel waardevol/onzeker is.
- Kies expert_review als menselijke expertise nodig is vóór een verkooproute.
- Kies auction voor stukken die waarschijnlijk geschikt zijn voor een gespecialiseerd veilinghuis.
- Kies specialist_dealer voor brocante/antiek/design dat verkoopbaar is maar niet duidelijk veilingwaardig.
- Kies direct_buyer/opkoper wanneer snelheid en eenvoudige afhandeling waarschijnlijk zwaarder wegen dan maximale opbrengst.
- Kies online_sale voor courante, individueel goed verkoopbare goederen zoals recente meubels, degelijk gereedschap, elektronica en herkenbare gebruiksgoederen.
- Kies sell_as_lot als het duidelijk beter als set/lot kan worden aangeboden.
- Kies donate als bruikbaar maar individuele verkoop vermoedelijk de moeite niet waard is.
- Kies clearance voor weinig interessante gemengde inboedel met lage individuele verkoopwaarde.
- Kies recycle alleen wanneer zichtbaar onbruikbaar/beschadigd of duidelijk recycleerbaar.
- confidence is 0 tot 1 en slaat op de herkenning + geschiktheid van de aanbeveling, niet op een exacte marktprijs.
- Geef geen markdown.`
          },
          { type: "input_image", image_url: imageUrl }
        ]
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI analysis error:", errorText);
    throw new Error("AI analysis failed");
  }

  const result = await response.json();
  const outputText = result.output
    ?.flatMap((item: any) => item.content || [])
    ?.find((content: any) => content.type === "output_text")?.text;

  if (!outputText) throw new Error("AI returned no analysis");

  let parsed: any;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    console.error("Invalid AI JSON:", outputText);
    throw new Error("AI returned invalid JSON");
  }

  const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
  const numericOrNull = (value: any) => value === null || value === undefined || value === "" ? null : (Number.isFinite(Number(value)) ? Number(value) : null);

  return {
    title: String(parsed.title || "Naamloos voorwerp"),
    description: parsed.description ? String(parsed.description) : null,
    category: String(parsed.category || "Overig"),
    material: parsed.material ? String(parsed.material) : null,
    condition: ["goed", "redelijk", "slecht", "onbekend"].includes(parsed.condition) ? parsed.condition : "onbekend",
    value_min: numericOrNull(parsed.value_min),
    value_max: numericOrNull(parsed.value_max),
    currency: "EUR",
    sale_potential: ["laag", "middel", "hoog"].includes(parsed.sale_potential) ? parsed.sale_potential : "laag",
    specialist_review: Boolean(parsed.specialist_review),
    confidence,
    recommended_action: ["expert_review","auction","specialist_dealer","direct_buyer","online_sale","sell_as_lot","donate","clearance","recycle"].includes(parsed.recommended_action) ? parsed.recommended_action : "expert_review",
    recommendation_reason: String(parsed.recommendation_reason || "Menselijke beoordeling aanbevolen."),
    alternative_action: parsed.alternative_action ? String(parsed.alternative_action) : null,
    set_hint: parsed.set_hint ? String(parsed.set_hint) : null,
    model: MODEL
  };
}
