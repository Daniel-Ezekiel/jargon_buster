import { env, ProgressCallback } from "@huggingface/transformers";
import { segmentation } from "./lib/segmentation";
import { MultiModelSingleton } from "./lib/singleton";
// import { applyAIRedaction, applyRegexRedaction, Entity } from "./lib/redact";
import { cloudClassify } from "./lib/cloud_classify";

export type edgeAndHybridResultTypes = {
  segmentId: number;
  segmentSize: number;
  topLabel: string;
  topLabelScore: number;
  isConfident: boolean;
  isValidClauseForSRA: boolean;
  routeToCloud: boolean;
  allLabels: string[];
  allScores: number[];
  // redactedText?: string; // Added to pass the safe text to UI
  cloudOutcome?: cloudSuccessResponse | cloudErrorResponse; // Can be the cloud response or an error message
};

export type cloudResultTypes = {
  segmentId: number;
  segmentSize: number;
  topLabel: string;
  topLabelScore: number;
  isConfident: boolean;
  // isValidClauseForSRA: boolean;
  routeToCloud: boolean;
  // allLabels: string[];
  // allScores: number[];
  redactedText?: string; // Added to pass the safe text to UI
  cloudOutcome?: cloudSuccessResponse | cloudErrorResponse; // Can be the cloud response or an error message
};

export type cloudSuccessResponse = {
  topLabel: string;
  confidence: number;
  source: string;
};

export type cloudErrorResponse = {
  error: string;
};

// Skip local model check
env.allowLocalModels = false;

// const NONE_LABEL = "Governing Law, Document Name, Parties...";

// const CLAUSE_LABELS = [
//   "Termination for Convenience",
//   "Non-compete",
//   "Uncapped Liability",
//   "Cap on Liability",
//   NONE_LABEL,
// ];

const NONE_LABEL = {
  label_title: "None of the Above",
  label_description:
    "This section covers general contract administration including governing " +
    "law, jurisdiction, party definitions, document title, recitals, payment " +
    "terms, warranties, representations, notices, assignment, confidentiality, " +
    "intellectual property ownership, dispute resolution, force majeure, " +
    "amendments, entire agreement, and other standard boilerplate provisions " +
    "not related to competition restrictions, termination rights, or liability limits.",
};

const CLAUSE_LABELS = [
  {
    label_title: "Non-compete",
    label_description:
      "This clause restricts a party from competing with the other party, " +
      "operating in certain geographic regions, engaging in specific business " +
      "sectors, or entering agreements with competing entities during or after " +
      "the term of the agreement.",
  },

  {
    label_title: "Termination for Convenience",
    label_description:
      "Either party may terminate this agreement without cause by providing " +
      "written notice to the other party and allowing a specified notice period " +
      "to expire, without the need to demonstrate breach or fault.",
  },

  {
    label_title: "Uncapped Liability",
    label_description:
      "A party's financial liability for breach of this agreement is not " +
      "limited or capped, including liability for indemnification obligations, " +
      "intellectual property infringement, confidentiality breaches, or " +
      "wilful misconduct.",
  },

  {
    label_title: "Cap on Liability",
    label_description:
      "This clause limits the maximum financial liability of a party upon " +
      "breach of its obligations, including caps on damages, indemnification " +
      "amounts, or time limitations within which claims must be brought.",
  },

  NONE_LABEL,
];

const CLAUSE_LABELS_DESC = CLAUSE_LABELS.map(
  (clause) => `${clause.label_description}`,
);

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  // Retrieve the classification pipeline. When called for the first time,
  // this will load the pipeline and save it for future use.
  const progressCallback: ProgressCallback = (x) => {
    self.postMessage({ status: "loading", data: x });
  };

  const classifier = await MultiModelSingleton.getClassifier(progressCallback);
  const { legal_text, srAction, contractFilename } = event.data;
  // console.log(srAction, "classification action chosen by user");

  const segmentStartTime = performance.now(); // Start the timer as soon as we begin processing segments for accurate latency measurement.

  const segments = await segmentation(legal_text);
  const results: (edgeAndHybridResultTypes | cloudResultTypes)[] = [];

  self.postMessage({ status: "ready" }); // UI update to indicate worker is ready to classify segments.

  for (const segment of segments) {
    const finalSegmentResult = {};

    if (srAction === "edge" || srAction === "hybrid") {
      // Step 1: CLASSIFY -Actually perform the classification
      const output = (await classifier(segment.text, CLAUSE_LABELS_DESC, {
        multi_label: false,
      })) as { labels: string[]; scores: number[]; sequence: string };

      const maxScore = Math.max(...output.scores);
      const topLabelIdx = output.scores.indexOf(maxScore);
      const topLabelScore = output["scores"][topLabelIdx];
      const topLabel =
        CLAUSE_LABELS.find(
          (clause) =>
            clause.label_description === output["labels"][topLabelIdx],
        )?.label_title ?? NONE_LABEL.label_title; // Extract the main label without the description
      const isConfident = topLabelScore > 0.5;
      const isValidClauseForSRA = topLabel !== NONE_LABEL.label_title;
      const routeToCloud =
        srAction === "cloud" ||
        (srAction === "hybrid" && isValidClauseForSRA && !isConfident);
      const allLabels = output.labels;
      const allScores = output.scores;

      if (routeToCloud) {
        const cloudOutcome = await cloudClassify(segment.text, segment.id);
        (finalSegmentResult as edgeAndHybridResultTypes).cloudOutcome =
          cloudOutcome;
      }

      (finalSegmentResult as edgeAndHybridResultTypes).segmentId = segment.id;
      (finalSegmentResult as edgeAndHybridResultTypes).segmentSize =
        segment.tokenCount;
      (finalSegmentResult as edgeAndHybridResultTypes).topLabel = topLabel;
      (finalSegmentResult as edgeAndHybridResultTypes).topLabelScore =
        +parseFloat(`${topLabelScore * 100}`).toFixed(2);
      (finalSegmentResult as edgeAndHybridResultTypes).isConfident =
        isConfident;
      (finalSegmentResult as edgeAndHybridResultTypes).isValidClauseForSRA =
        isValidClauseForSRA;
      (finalSegmentResult as edgeAndHybridResultTypes).routeToCloud =
        routeToCloud;
      (finalSegmentResult as edgeAndHybridResultTypes).allLabels = allLabels;
      (finalSegmentResult as edgeAndHybridResultTypes).allScores = allScores; // Pass the regex redacted text to the UI regardless of routing decision

      results.push(finalSegmentResult as edgeAndHybridResultTypes);
    } else {
      const cloudOutcome = await cloudClassify(segment.text, segment.id);
      // console.log(`Cloud classification completed for segment ${segment.id}:`, cloudOutcome);

      (finalSegmentResult as cloudResultTypes).segmentId = segment.id;
      (finalSegmentResult as cloudResultTypes).segmentSize = segment.tokenCount;
      (finalSegmentResult as cloudResultTypes).topLabel =
        cloudOutcome["topLabel"] || "Error";
      (finalSegmentResult as cloudResultTypes).topLabelScore =
        cloudOutcome["confidence"] || 0;
      (finalSegmentResult as cloudResultTypes).isConfident = cloudOutcome[
        "confidence"
      ]
        ? cloudOutcome["confidence"] > 0.5
        : false;
      (finalSegmentResult as cloudResultTypes).routeToCloud = true;

      // (finalSegmentResult as cloudResultTypes).redactedText = applyRegexRedaction(segment.text);

      results.push(finalSegmentResult as cloudResultTypes);
    }

    const latencyMs = parseFloat(
      (performance.now() - segmentStartTime).toFixed(2),
    );

    // Stream this specific segment back to the React UI immediately
    self.postMessage({
      status: "segment_complete",
      result: finalSegmentResult,
      progress: `${segment.id + 1}/${segments.length}`,
      telemetryPayload: {
        segmentId: segment.id,
        contractFilename,
        runMode:
          srAction === "hybrid"
            ? "HYBRID"
            : srAction === "cloud"
              ? "CLOUD_ONLY"
              : "EDGE_ONLY",
        confidenceScore: (
          finalSegmentResult as edgeAndHybridResultTypes | cloudResultTypes
        ).topLabelScore,
        routingDecision:
          srAction === "cloud"
            ? "CLOUD_BOUND"
            : (
                  finalSegmentResult as
                    | edgeAndHybridResultTypes
                    | cloudResultTypes
                ).routeToCloud
              ? "CLOUD_BOUND"
              : "EDGE_SECURED",
        redactionApplied: (
          finalSegmentResult as edgeAndHybridResultTypes | cloudResultTypes
        ).routeToCloud
          ? true
          : false,
        classificationResult: (
          finalSegmentResult as edgeAndHybridResultTypes | cloudResultTypes
        ).topLabel,
        source: (
          finalSegmentResult as edgeAndHybridResultTypes | cloudResultTypes
        ).routeToCloud
          ? "Claude Opus 4.6"
          : "distilbert",
        latencyMs,
      },
    });

    console.log(`segment-${segment.id + 1}/${segments.length} complete`);
  }

  // Send the output back to the main thread
  // Final completion signal
  self.postMessage({ status: "complete", results });
});
