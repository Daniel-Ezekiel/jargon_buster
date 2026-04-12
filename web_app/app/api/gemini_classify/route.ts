import { NextResponse } from "next/server";

import { GoogleGenAI } from "@google/genai";
const ai = new GoogleGenAI({});

const USE_MOCK_RESPONSE = false;

const instructions = `You are an expert commercial lawyer auditing corporate contracts. Classify the following contract segment into exactly ONE of these five categories:

USE THESE EXACT DEFINITIONS:
1. "Non-compete": This clause restricts a party from competing with the other party, operating in certain geographic regions, engaging in specific business sectors, or entering agreements with competing entities during or after the term of the agreement.
2. "Termination for Convenience": Either party may terminate this agreement without cause by providing written notice to the other party and allowing a specified notice period to expire, without the need to demonstrate breach or fault.
3. "Uncapped Liability": A party's financial liability for breach of this agreement is not limited or capped, including liability for indemnification obligations, intellectual property infringement, confidentiality breaches, or wilful misconduct.
4. "Cap on Liability": This clause limits the maximum financial liability of a party upon breach of its obligations, including caps on damages, indemnification amounts, or time limitations within which claims must be brought.
5. "None of the Above": This section covers general contract administration including governing law, jurisdiction, party definitions, document title, recitals, payment terms, warranties, representations, notices, assignment, confidentiality, intellectual property ownership, dispute resolution, force majeure, amendments, entire agreement, and other standard boilerplate provisions not related to competition restrictions, termination rights, or liability limits.

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
