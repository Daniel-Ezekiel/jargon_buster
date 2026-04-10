import { NextResponse } from "next/server";

import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({});

const USE_MOCK_RESPONSE = false;

const instructions = `You are an expert commercial lawyer auditing corporate contracts. Classify the following contract segment into exactly ONE of these five categories based on its PRIMARY legal mechanism.

CRITICAL RULE: Only classify as a named category if the segment ITSELF enacts or constitutes that legal mechanism. If the segment merely references, defines, or mentions a concept in passing, classify as "None of the above".

USE THESE DEFINITIONS:
1. "Termination for Convenience": A clause that directly grants a party the right to terminate the agreement without cause or breach. Must contain an operative termination right, not merely a reference to termination.
2. "Non-compete": A clause that directly restricts a party from engaging in competing activities, building rival products, or acting as an exclusive supplier. Must contain an operative restriction, not merely a reference to competition.
3. "Cap on Liability": A clause that directly sets a maximum financial ceiling on damages a party can be held liable for. Must contain an operative liability limit with a defined ceiling.
4. "Uncapped Liability": A clause that directly creates or preserves unlimited financial exposure for a party. Must contain an operative carve-out from a liability cap or an explicit statement of unlimited liability.
5. "None of the above": The segment is a definition, recital, boilerplate, warranty, operational obligation, or merely references one of the above concepts without itself enacting it. When in doubt, choose this.

Respond strictly with the category name followed by a confidence score (e.g., "Cap on Liability 0.95"). Do not output any explanations, formatting, or conversational text.`;

export async function POST(request: Request) {
  try {
    const { segmentText, segmentId } = await request.json();
    if (!segmentText) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    const rawEmailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    if (rawEmailRegex.test(segmentText)) {
      console.error(
        `[API Gateway] BLOCKED: Unredacted PII detected in segment ${segmentId}`,
      );
      return NextResponse.json(
        {
          error:
            "Privacy Violation: Unredacted PII detected in payload. Transmission blocked.",
        },
        { status: 403 },
      );
    }

    if (USE_MOCK_RESPONSE) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      return NextResponse.json({
        topLabel: "Termination for Convenience (MOCK CLOUD)",
        confidence: 0.95,
        source: "GPT-4o-Mock",
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: segmentText,
      config: {
        systemInstruction: instructions,
      },
    });

    // console.log(response.text);

    const topLabel = response.text?.trim().split(" ").slice(0, -1).join(" ");
    const confidence = parseFloat(response.text?.trim().split(" ").at(-1) || "0") * 100;

    return NextResponse.json({
      topLabel,
      confidence,
      source: "Gemini 2.5 Flash",
    });
  } catch (err) {
    console.error("[API Gateway] Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
