import { env, ProgressCallback } from "@huggingface/transformers";
import { segmentation } from "./lib/segmentation";
import { MultiModelSingleton } from "./lib/singleton";
import { applyAIRedaction, applyRegexRedaction, Entity } from "./lib/redact";

export type resultTypes = {
  segmentId: number;
  segmentSize: number;
  topLabel: string;
  topLabelScore: number;
  isConfident: boolean;
  isValidClauseForSRA: boolean;
  routeToCloud: boolean;
  allLabels: string[];
  allScores: number[];
  redactedText?: string; // Added to pass the safe text to UI
  cloudOutcome?: string;
};

// Skip local model check
env.allowLocalModels = false;

const NONE_LABEL = "Governing Law, Document Name, Parties...";

const CLAUSE_LABELS = [
  "Termination for Convenience",
  "Non-compete",
  "Uncapped Liability",
  "Cap on Liability",
  NONE_LABEL,
];

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  // Retrieve the classification pipeline. When called for the first time,
  // this will load the pipeline and save it for future use.
  const progressCallback: ProgressCallback = (x) => {
    self.postMessage({ status: "loading", data: x });
  };

  const classifier = await MultiModelSingleton.getClassifier(progressCallback);
  const legal_text: string = event.data.text;
  const segments = await segmentation(legal_text);
  const results: resultTypes[] = [];

  self.postMessage({ status: "ready" }); // UI update to indicate worker is ready to classify segments.

  for (const segment of segments) {
    // Step 1: CLASSIFY -Actually perform the classification
    const output = (await classifier(segment.text, CLAUSE_LABELS, {
      multi_label: false,
    })) as { labels: string[]; scores: number[]; sequence: string };

    const maxScore = Math.max(...output.scores);
    const topLabelIdx = output.scores.indexOf(maxScore);
    const topLabelScore = output["scores"][topLabelIdx];
    const topLabel = output["labels"][topLabelIdx];
    const isConfident = topLabelScore > 0.4;
    const isValidClauseForSRA = topLabel !== NONE_LABEL;
    const routeToCloud = isValidClauseForSRA && !isConfident;

    const finalSegmentResult: resultTypes = {
      segmentId: segment.id,
      segmentSize: segment.tokenCount,
      topLabel,
      topLabelScore,
      isConfident,
      isValidClauseForSRA,
      routeToCloud,
      allLabels: output.labels,
      allScores: output.scores,
    };

    if (routeToCloud) {
      const regexRedacted = applyRegexRedaction(segment.text); // cased text
      const ner = await MultiModelSingleton.getNER(progressCallback);

      // aggregation_strategy: "simple" merges B-/I- tokens automatically
      const entities = await ner(regexRedacted, {
        aggregation_strategy: "simple",
      } as never);

      console.log(`Entities found in segment ${segment.id}:`, entities);

      const fullyRedacted = applyAIRedaction(
        regexRedacted,
        entities as unknown as Entity[],
      );

      finalSegmentResult.redactedText = fullyRedacted;
      finalSegmentResult.cloudOutcome =
        "Segment redacted and staged for Cloud LLM processing.";
    }

    results.push(finalSegmentResult);

    // Stream this specific segment back to the React UI immediately
    self.postMessage({
      status: "segment_complete",
      result: finalSegmentResult,
      progress: `${segment.id + 1}/${segments.length}`,
    });

    console.log(`segment-${segment.id + 1}/${segments.length} complete`);

    // // Stream each result back as it completes
    // self.postMessage({
    //   status: `segment-${segment.id} complete:`,
    //   result: results.at(-1),
    //   total: segments.length,
    // });
  }

  // Send the output back to the main thread
  // Final completion signal
  self.postMessage({ status: "complete", results });
});
