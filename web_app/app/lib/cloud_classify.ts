import { applyRegexRedaction } from "./redact";

export const cloudClassify = async (segmentText: string, segmentId: number) => {
  const regexRedactedText = applyRegexRedaction(segmentText); // cased text
  // const ner = await MultiModelSingleton.getNER(progressCallback);

  // aggregation_strategy: "simple" merges B-/I- tokens automatically
  // const entities = await ner(regexRedacted, {
  //   aggregation_strategy: "simple",
  // } as never);

  // console.log(`Entities found in segment ${segment.id}:`, entities);

  // const fullyRedacted = applyAIRedaction(
  //   regexRedacted,
  //   entities as unknown as Entity[],
  // );

//   const redactedText = regexRedacted; // For now, we only apply regex redaction before sending to the cloud. AI redaction can be added back in once we have a reliable NER solution.

  try {
    // const cloudResponse = await fetch(`http://localhost:3000/api/classify`, {
    // const cloudResponse = await fetch(`http://localhost:3000/api/gemini_classify`, {
    const cloudResponse = await fetch(`http://localhost:3000/api/claude_classify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        segmentText: regexRedactedText,
        segmentId: segmentId,
      }),
    });

    if (!cloudResponse.ok) {
      throw new Error(
        `Cloud classification failed with status ${cloudResponse.status} for segment ${segmentId}`,
      );
    }

    const cloudOutcome = await cloudResponse.json();
    return cloudOutcome;
    // console.log(data)
    //  = JSON.parse(data);
  } catch (err) {
    console.error(`Error classifying segment ${segmentId} in the cloud:`, err);
    const cloudOutcome = {
      error: `Error: ${err instanceof Error ? err.message : String(err)}`,
    };
    return cloudOutcome;
  }
};
