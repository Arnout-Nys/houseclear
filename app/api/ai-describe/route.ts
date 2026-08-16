import { NextResponse } from "next/server";
import { isSessionValid } from "@/lib/session";

export async function POST(req: Request) {
  if (!(await isSessionValid())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { image_url } = await req.json();

    if (!image_url) {
      return NextResponse.json({ error: "Missing image_url" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        reasoning: { effort: "none" },
        input: [
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: `
Je helpt bij het inventariseren van de inboedel van een familiewoning die wordt leeggemaakt.

Analyseer het belangrijkste fysieke voorwerp op deze foto.

BELANGRIJK: schrijf de titel, beschrijving en categorie ALTIJD in natuurlijk Nederlands (Belgisch/Vlaams taalgebruik waar passend). Gebruik geen Engels, behalve voor een merknaam of eigennaam die zichtbaar is.

Geef ALLEEN geldige JSON terug, exact in dit formaat:

{
  "title": "korte duidelijke Nederlandse naam van het voorwerp",
  "description": "een of twee korte feitelijke zinnen in het Nederlands",
  "category": "Nederlandse categorie",
  "condition": "goed | redelijk | slecht | onbekend"
}

Regels:
- Focus op het belangrijkste voorwerp op de foto.
- Houd de titel normaal tussen 2 en 6 woorden.
- Beschrijf alleen wat zichtbaar is.
- Vermeld materiaal, kleur, stijl en opvallende kenmerken als dat nuttig is.
- Verzin geen merk, kunstenaar, fabrikant, ouderdom of herkomst.
- Als iets onzeker is, zeg dat duidelijk in het Nederlands.
- Geef geen schatting van de geldwaarde.
- Gebruik geen markdown.
- Gebruik Nederlandse benamingen zoals kast, vaas, stoel, lamp, servies, schilderij, decoratie, enzovoort.
`
              },
              {
                type: "input_image",
                image_url
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI error:", errorText);
      return NextResponse.json({ error: "AI analysis failed" }, { status: 500 });
    }

    const result = await response.json();
    const outputText = result.output
      ?.flatMap((item: any) => item.content || [])
      ?.find((content: any) => content.type === "output_text")
      ?.text;

    if (!outputText) {
      throw new Error("AI returned no description");
    }

    let parsed;

    try {
      parsed = JSON.parse(outputText);
    } catch {
      console.error("Invalid AI JSON:", outputText);
      throw new Error("AI returned invalid JSON");
    }

    return NextResponse.json({
      title: parsed.title || "Naamloos voorwerp",
      description: parsed.description || null,
      category: parsed.category || "Overig",
      condition: parsed.condition || "onbekend"
    });
  } catch (error: any) {
    console.error("AI describe error:", error);
    return NextResponse.json(
      { error: error?.message || "AI analysis failed" },
      { status: 500 }
    );
  }
}
