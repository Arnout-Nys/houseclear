import { NextResponse } from "next/server";
import { isSessionValid } from "@/lib/session";

export async function POST(req: Request) {
  if (!(await isSessionValid())) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { image_url } = await req.json();

    if (!image_url) {
      return NextResponse.json(
        { error: "Missing image_url" },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OPENAI_API_KEY is not configured"
        },
        { status: 500 }
      );
    }

    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          model: "gpt-5.6-luna",

          reasoning: {
            effort: "none"
          },

          input: [
            {
              role: "user",

              content: [
                {
                  type: "input_text",

                  text: `
You are helping inventory the contents
of a family home that is being cleared.

Analyse the main physical object in
this photograph.

Return ONLY valid JSON in exactly
this format:

{
  "title": "short useful object name",
  "description": "one or two factual sentences",
  "category": "category",
  "condition": "good | fair | poor | unknown"
}

Rules:

- Focus on the main object.
- Title should normally be 2-6 words.
- Describe visible facts only.
- Mention material, colour, style or
  distinctive features when useful.
- Do not invent a brand, artist,
  manufacturer, age or provenance.
- If uncertain, say so.
- Do not estimate monetary value.
- Do not include markdown.
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
      }
    );

    if (!response.ok) {
      const errorText =
        await response.text();

      console.error(
        "OpenAI error:",
        errorText
      );

      return NextResponse.json(
        {
          error:
            "AI analysis failed"
        },
        { status: 500 }
      );
    }

    const result =
      await response.json();

    const outputText =
      result.output
        ?.flatMap(
          (item: any) =>
            item.content || []
        )
        ?.find(
          (content: any) =>
            content.type ===
            "output_text"
        )
        ?.text;

    if (!outputText) {
      throw new Error(
        "AI returned no description"
      );
    }

    let parsed;

    try {
      parsed =
        JSON.parse(outputText);
    } catch {
      console.error(
        "Invalid AI JSON:",
        outputText
      );

      throw new Error(
        "AI returned invalid JSON"
      );
    }

    return NextResponse.json({
      title:
        parsed.title ||
        "Untitled item",

      description:
        parsed.description ||
        null,

      category:
        parsed.category ||
        "Other",

      condition:
        parsed.condition ||
        "unknown"
    });

  } catch (error: any) {
    console.error(
      "AI describe error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error?.message ||
          "AI analysis failed"
      },
      { status: 500 }
    );
  }
}
