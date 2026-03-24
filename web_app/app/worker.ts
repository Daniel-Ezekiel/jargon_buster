import {
  pipeline,
  env,
  PipelineType,
  ProgressCallback,
  ZeroShotClassificationPipeline,
} from "@huggingface/transformers";
import { segmentation } from "./lib/segmentation";

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

// Use the Singleton pattern to enable lazy construction of the pipeline.
class PipelineSingleton {
  static task: PipelineType = "zero-shot-classification";
  static model = "Xenova/distilbert-base-uncased-mnli";
  static instance: ZeroShotClassificationPipeline | null = null;

  static async getInstance(progress_callback: ProgressCallback | undefined) {
    if (this.instance === null) {
      this.instance = (await pipeline(this.task, this.model, {
        dtype: "q8",
        device: "webgpu",
        progress_callback,
      })) as unknown as ZeroShotClassificationPipeline;
    }
    return this.instance;
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  // Retrieve the classification pipeline. When called for the first time,
  // this will load the pipeline and save it for future use.
  const classifier = await PipelineSingleton.getInstance((x) => {
    // We also add a progress callback to the pipeline so that we can
    // track model loading.
    self.postMessage(x);
  });

  const legal_text: string = event.data.text;

  const segments = await segmentation(legal_text);

  const results = [];

  for (const segment of segments) {
    // Actually perform the classification
    const output = (await classifier(segment.text, CLAUSE_LABELS, {
      multi_label: false,
    })) as { labels: string[]; scores: number[]; sequence: string };

    const maxScore = Math.max(...output.scores);
    const topLabelIdx = output.scores.indexOf(maxScore);
    const topLabelScore = output["scores"][topLabelIdx];
    const topLabel = output["labels"][topLabelIdx];
    const isConfident = topLabelScore > 0.5;
    const isValidClauseForSRA = topLabel !== NONE_LABEL;

    results.push({
      segmentId: segment.id,
      segmentSize: segment.tokenCount,
      topLabel,
      topLabelScore,
      isConfident,
      isValidClauseForSRA,
      routeToCloud: !isValidClauseForSRA || !isConfident,
      allLabels: output.labels,
      allScores: output.scores,
    });

    console.log(`segment-${segment.id+1}/${segments.length} complete:`)

    // Stream each result back as it completes
    self.postMessage({
      status: `segment-${segment.id} complete:`,
      result: results.at(-1),
      total: segments.length,
    });
  }

  // Send the output back to the main thread
  self.postMessage({
    status: "complete",
    results,
  });
});
